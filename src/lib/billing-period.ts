import type { BillingPeriod, Plan } from "@/lib/types";

/**
 * Source unique pour les durées d'abonnement.
 *
 * Jusqu'à la migration 020, « +30 jours » était écrit en dur à trois endroits
 * (setUserPlan, recordManualPayment, verifyAndActivate) : trois occasions de
 * diverger. Tout passe désormais par ici, et par la fonction SQL jumelle
 * public.billing_period_days() pour le côté base.
 */
export const BILLING_PERIODS: BillingPeriod[] = ["monthly", "quarterly", "yearly"];

const DAYS: Record<BillingPeriod, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export function isBillingPeriod(value: unknown): value is BillingPeriod {
  return typeof value === "string" && (BILLING_PERIODS as string[]).includes(value);
}

export function periodDays(period: BillingPeriod): number {
  return DAYS[period];
}

/** Fin de période à partir d'une date de départ (défaut : maintenant). */
export function periodEnd(period: BillingPeriod, from: Date = new Date()): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + periodDays(period));
  return end;
}

/**
 * Prix du plan pour la durée demandée. `null` signifie que le plan ne propose
 * pas cette durée — l'appelant doit refuser plutôt que de retomber sur le
 * tarif mensuel, qui facturerait trois mois au prix d'un.
 */
export function planPrice(
  plan: Pick<Plan, "price_monthly" | "price_quarterly" | "price_yearly">,
  period: BillingPeriod
): number | null {
  const raw =
    period === "yearly"
      ? plan.price_yearly
      : period === "quarterly"
        ? plan.price_quarterly
        : plan.price_monthly;
  return raw === null || raw === undefined ? null : Number(raw);
}

/** Durées réellement disponibles pour un plan (celles qui ont un prix). */
export function availablePeriods(
  plan: Pick<Plan, "price_monthly" | "price_quarterly" | "price_yearly">
): BillingPeriod[] {
  return BILLING_PERIODS.filter((p) => planPrice(plan, p) !== null);
}

/**
 * Économie par rapport au même nombre de mois payés au tarif mensuel.
 * Sert à afficher « −30% » ou « 3 mois offerts » sur la page tarifs.
 */
export function periodDiscount(
  plan: Pick<Plan, "price_monthly" | "price_quarterly" | "price_yearly">,
  period: BillingPeriod
): { percent: number; monthsFree: number } | null {
  const price = planPrice(plan, period);
  const monthly = Number(plan.price_monthly);
  if (price === null || monthly <= 0 || period === "monthly") return null;

  const months = period === "yearly" ? 12 : 3;
  const full = monthly * months;
  if (price >= full) return null;

  return {
    // Le pourcentage s'arrondit normalement, mais les « mois offerts » sont
    // arrondis vers le BAS : une remise de 3,6 mois annoncée « 4 mois
    // offerts » serait une promesse commerciale supérieure à la réalité.
    // Mieux vaut sous-promettre sur un argument de prix.
    percent: Math.round((1 - price / full) * 100),
    monthsFree: Math.floor((full - price) / monthly),
  };
}
