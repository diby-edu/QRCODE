// Export CSV de la liste des QR codes de l'utilisateur connecté.
//
// Le fichier est conçu pour faire l'aller-retour avec l'import CSV
// (/qr/import) : les quatre premières colonnes portent exactement les noms
// que celui-ci attend — title, url, folder, is_dynamic — et `url` contient la
// DESTINATION, pas le lien court. Auparavant l'export était un simple rapport
// aux en-têtes français, avec le lien court en guise d'URL : le réimporter
// aurait créé des QR pointant vers nos propres liens courts, donc des boucles
// de redirection.
//
// Les colonnes suivantes sont informatives. L'import les ignore (il lit les
// colonnes par nom), ce qui permet de garder un fichier lisible sans casser
// la réutilisation.
//
// Limite assumée : l'import ne sait créer que des QR de type « Site web ».
// Les lignes des types sans destination unique (Entreprise, Liste de liens,
// vCard…) ont donc une colonne `url` vide et seront simplement ignorées à la
// réimportation, sans erreur — l'import ne retient que les lignes ayant un
// titre ET une URL.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQrType } from "@/lib/qr-types/registry";
import { qrShortUrl } from "@/lib/url";
import { resolveQrDomainsBatch } from "@/lib/domains";
import type { QrCode, QrCodeData } from "@/lib/types";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: qrRaw }, { data: folderRaw }] = await Promise.all([
    supabase
      .from("qr_codes")
      .select(
        "title, type, slug, is_dynamic, is_active, scan_count, created_at, custom_domain_id, folder_id, qr_code_data(data)"
      )
      // Sans ce filtre, un admin exportait les QR de TOUS les clients dans un
      // fichier intitulé « mes QR codes » (policy qr_codes_admin_select).
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("folders").select("id, name").eq("user_id", user.id),
  ]);

  type Row = Pick<
    QrCode,
    | "title" | "type" | "slug" | "is_dynamic" | "is_active" | "scan_count"
    | "created_at" | "custom_domain_id" | "folder_id"
  > & { qr_code_data: QrCodeData[] };

  const qrCodes = (qrRaw ?? []) as Row[];
  const folderById = new Map(
    ((folderRaw ?? []) as { id: string; name: string }[]).map((f) => [f.id, f.name])
  );
  const domainById = await resolveQrDomainsBatch(
    supabase,
    qrCodes.map((qr) => qr.custom_domain_id)
  );

  const header = [
    // Colonnes réutilisables par /qr/import — ne pas renommer sans adapter
    // CsvImportForm.tsx, qui lit ces noms exacts.
    "title",
    "url",
    "folder",
    "is_dynamic",
    // Colonnes informatives, ignorées à la réimportation
    "type",
    "short_url",
    "status",
    "scans",
    "created_at",
  ];

  const rows = qrCodes.map((qr) => {
    const domain = qr.custom_domain_id ? domainById.get(qr.custom_domain_id) : undefined;
    const type = getQrType(qr.type);
    const data = (qr.qr_code_data?.[0]?.data ?? {}) as Record<string, unknown>;
    // Destination réelle : seuls les types « redirection » en ont une.
    const destination = type?.getRedirectUrl?.(data) ?? "";

    return [
      qr.title,
      destination,
      qr.folder_id ? (folderById.get(qr.folder_id) ?? "") : "",
      qr.is_dynamic ? "true" : "false",
      type?.name.fr ?? qr.type,
      qr.is_dynamic ? qrShortUrl(qr.slug, domain) : "",
      qr.is_active ? "Actif" : "Désactivé",
      String(qr.scan_count),
      new Date(qr.created_at).toISOString().slice(0, 10),
    ];
  });

  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");

  // BOM UTF-8 : sans lui, Excel affiche « CrÃ©Ã© le » au lieu des accents.
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="qr-codes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
