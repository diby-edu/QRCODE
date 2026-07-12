// Export CSV de la liste des QR codes de l'utilisateur connecté.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQrType } from "@/lib/qr-types/registry";
import { qrShortUrl } from "@/lib/url";
import type { QrCode } from "@/lib/types";

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

  const [{ data: qrRaw }, { data: customDomain }] = await Promise.all([
    supabase
      .from("qr_codes")
      .select("title, type, slug, is_dynamic, is_active, scan_count, created_at")
      .order("created_at", { ascending: false }),
    supabase.rpc("active_custom_domain_for_user", { p_user_id: user.id }),
  ]);

  const qrCodes = (qrRaw ?? []) as Pick<
    QrCode,
    "title" | "type" | "slug" | "is_dynamic" | "is_active" | "scan_count" | "created_at"
  >[];

  const header = ["Titre", "Type", "URL", "Dynamique", "Statut", "Scans", "Créé le"];
  const rows = qrCodes.map((qr) => [
    qr.title,
    getQrType(qr.type)?.name.fr ?? qr.type,
    qr.is_dynamic ? qrShortUrl(qr.slug, customDomain) : "",
    qr.is_dynamic ? "Oui" : "Non",
    qr.is_active ? "Actif" : "Désactivé",
    String(qr.scan_count),
    new Date(qr.created_at).toISOString().slice(0, 10),
  ]);

  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="qr-codes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
