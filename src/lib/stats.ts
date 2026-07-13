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

export interface SiteVisitBreakdowns {
  total: number;
  paths: BreakdownItem[];
  referrers: BreakdownItem[];
  devices: BreakdownItem[];
  countries: BreakdownItem[];
  cities: BreakdownItem[];
  os: BreakdownItem[];
  browsers: BreakdownItem[];
}

export interface SiteVisitsSummary {
  totalVisits: number;
  uniqueVisitors: number;
  totalVisitsAllTime: number;
}

const EMPTY_BREAKDOWNS: ScanBreakdowns = {
  total: 0,
  countries: [],
  cities: [],
  devices: [],
  browsers: [],
  os: [],
};

const EMPTY_VISIT_BREAKDOWNS: SiteVisitBreakdowns = {
  total: 0,
  paths: [],
  referrers: [],
  devices: [],
  countries: [],
  cities: [],
  os: [],
  browsers: [],
};

const EMPTY_VISITS_SUMMARY: SiteVisitsSummary = {
  totalVisits: 0,
  uniqueVisitors: 0,
  totalVisitsAllTime: 0,
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

/** Répartitions pages/référents/appareils/pays via la RPC site_visits_breakdowns. */
export async function fetchSiteVisitBreakdowns(
  supabase: SupabaseClient,
  days = 30
): Promise<SiteVisitBreakdowns> {
  const { data } = await supabase.rpc("site_visits_breakdowns", { p_days: days });
  if (!data || typeof data !== "object") return EMPTY_VISIT_BREAKDOWNS;
  const raw = data as Partial<SiteVisitBreakdowns>;
  return {
    total: Number(raw.total ?? 0),
    paths: raw.paths ?? [],
    referrers: raw.referrers ?? [],
    devices: raw.devices ?? [],
    countries: raw.countries ?? [],
    cities: raw.cities ?? [],
    os: raw.os ?? [],
    browsers: raw.browsers ?? [],
  };
}

/** Total de visites, visiteurs uniques (hash anonyme) et total sur toute la
 * période — via la RPC site_visits_summary. */
export async function fetchSiteVisitsSummary(
  supabase: SupabaseClient,
  days = 30
): Promise<SiteVisitsSummary> {
  const { data } = await supabase.rpc("site_visits_summary", { p_days: days });
  if (!data || typeof data !== "object") return EMPTY_VISITS_SUMMARY;
  const raw = data as Partial<SiteVisitsSummary>;
  return {
    totalVisits: Number(raw.totalVisits ?? 0),
    uniqueVisitors: Number(raw.uniqueVisitors ?? 0),
    totalVisitsAllTime: Number(raw.totalVisitsAllTime ?? 0),
  };
}
