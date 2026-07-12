import type { SupabaseClient } from "@supabase/supabase-js";

export interface DayPoint {
  day: string; // ISO date (yyyy-mm-dd)
  scans: number;
}

export interface RevenueDayPoint {
  day: string;
  amount: number;
}

export interface VisitDayPoint {
  day: string;
  visits: number;
}

export interface BreakdownItem {
  label: string;
  count: number;
}

export interface ScanBreakdowns {
  total: number;
  countries: BreakdownItem[];
  cities: BreakdownItem[];
  devices: BreakdownItem[];
  browsers: BreakdownItem[];
  os: BreakdownItem[];
}

const EMPTY_BREAKDOWNS: ScanBreakdowns = {
  total: 0,
  countries: [],
  cities: [],
  devices: [],
  browsers: [],
  os: [],
};

/** Scans par jour (jours vides à 0) via la RPC scans_per_day — RLS appliquée. */
export async function fetchScansPerDay(
  supabase: SupabaseClient,
  days = 30,
  qrCodeId?: string
): Promise<DayPoint[]> {
  const { data } = await supabase.rpc("scans_per_day", {
    p_days: days,
    p_qr_code_id: qrCodeId ?? null,
  });
  return ((data ?? []) as { day: string; scans: number }[]).map((r) => ({
    day: r.day,
    scans: Number(r.scans),
  }));
}

/** Revenus (paiements complétés) par jour — RLS de payments (admin voit tout). */
export async function fetchRevenuePerDay(
  supabase: SupabaseClient,
  days = 30
): Promise<RevenueDayPoint[]> {
  const { data } = await supabase.rpc("revenue_per_day", { p_days: days });
  return ((data ?? []) as { day: string; amount: number }[]).map((r) => ({
    day: r.day,
    amount: Number(r.amount),
  }));
}

/** Visites du site par jour (jours vides à 0) — réservé admin (RLS de site_visits). */
export async function fetchSiteVisitsPerDay(
  supabase: SupabaseClient,
  days = 30
): Promise<VisitDayPoint[]> {
  const { data } = await supabase.rpc("site_visits_per_day", { p_days: days });
  return ((data ?? []) as { day: string; visits: number }[]).map((r) => ({
    day: r.day,
    visits: Number(r.visits),
  }));
}

/** Répartitions pays/villes/appareils/navigateurs/OS via la RPC scan_breakdowns. */
export async function fetchScanBreakdowns(
  supabase: SupabaseClient,
  days = 30,
  qrCodeId?: string
): Promise<ScanBreakdowns> {
  const { data } = await supabase.rpc("scan_breakdowns", {
    p_days: days,
    p_qr_code_id: qrCodeId ?? null,
  });
  if (!data || typeof data !== "object") return EMPTY_BREAKDOWNS;
  const raw = data as Partial<ScanBreakdowns>;
  return {
    total: Number(raw.total ?? 0),
    countries: raw.countries ?? [],
    cities: raw.cities ?? [],
    devices: raw.devices ?? [],
    browsers: raw.browsers ?? [],
    os: raw.os ?? [],
  };
}
