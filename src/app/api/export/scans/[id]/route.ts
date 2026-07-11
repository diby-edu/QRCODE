// Export CSV de l'historique des scans d'un QR — réservé au plan avec
// statistiques détaillées (même limite que la page /qr/[id]/stats).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plans";
import type { QrScan } from "@/lib/types";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { limits } = await getUserPlan(supabase, user.id);
  if (limits.stats_level !== "full") {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  // RLS (qr_scans_select) limite déjà aux scans d'un QR appartenant à l'appelant.
  const { data: scansRaw } = await supabase
    .from("qr_scans")
    .select("scanned_at, country, city, device, browser, operating_system")
    .eq("qr_code_id", id)
    .order("scanned_at", { ascending: false })
    .limit(5000);

  const scans = (scansRaw ?? []) as Pick<
    QrScan,
    "scanned_at" | "country" | "city" | "device" | "browser" | "operating_system"
  >[];

  const header = ["Date", "Pays", "Ville", "Appareil", "Navigateur", "Système"];
  const rows = scans.map((s) => [
    new Date(s.scanned_at).toISOString(),
    s.country ?? "",
    s.city ?? "",
    s.device ?? "",
    s.browser ?? "",
    s.operating_system ?? "",
  ]);

  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="scans-${id}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
