import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, PlanLimits, Subscription } from "./types";

export const DEFAULT_LIMITS: PlanLimits = {
  max_qr_codes: 5,
  max_dynamic: 3,
  max_scans_month: 300,
  logo_enabled: false,
  formats: ["png"],
  stats_level: "basic",
  folders_enabled: false,
  password_enabled: false,
};

export function normalizeLimits(raw: unknown): PlanLimits {
  const r = (raw ?? {}) as Partial<PlanLimits>;
  return {
    max_qr_codes: typeof r.max_qr_codes === "number" ? r.max_qr_codes : DEFAULT_LIMITS.max_qr_codes,
    max_dynamic: typeof r.max_dynamic === "number" ? r.max_dynamic : DEFAULT_LIMITS.max_dynamic,
    max_scans_month: typeof r.max_scans_month === "number" ? r.max_scans_month : DEFAULT_LIMITS.max_scans_month,
    logo_enabled: r.logo_enabled === true,
    formats: Array.isArray(r.formats) && r.formats.length > 0 ? r.formats : DEFAULT_LIMITS.formats,
    stats_level: r.stats_level === "full" ? "full" : "basic",
    folders_enabled: r.folders_enabled === true,
    password_enabled: r.password_enabled === true,
  };
}

export const isUnlimited = (n: number) => n < 0;

export interface UserPlan {
  plan: Plan | null;
  subscription: Subscription | null;
  limits: PlanLimits;
  isFree: boolean;
}

/**
 * Plan effectif de l'utilisateur. Un abonnement payant dont la période est
 * échue retombe sur le plan gratuit (évalué à la lecture, pas de cron requis).
 */
export async function getUserPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPlan> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*, plans(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const subscription = sub as (Subscription & { plans: Plan }) | null;
  let plan = subscription?.plans ?? null;

  const isExpired =
    subscription?.current_period_end != null &&
    new Date(subscription.current_period_end) < new Date();

  if (!plan || isExpired) {
    const { data: freePlan } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .eq("price_monthly", 0)
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    plan = (freePlan as Plan | null) ?? null;
    return {
      plan,
      subscription: isExpired ? subscription : null,
      limits: normalizeLimits(plan?.limits),
      isFree: true,
    };
  }

  return {
    plan,
    subscription,
    limits: normalizeLimits(plan.limits),
    isFree: Number(plan.price_monthly) === 0,
  };
}
