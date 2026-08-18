import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BILLING_PERIODS, periodDiscount } from "@/lib/billing-period";
import type { BillingPeriod, Plan } from "@/lib/types";

/**
 * Choix de la durée d'abonnement, partagé par /billing et la section tarifs
 * de la landing.
 *
 * Passe par des liens plutôt que par de l'état client : PlanCard est un
 * composant serveur, et l'URL reste partageable (`?period=yearly` envoie
 * directement quelqu'un sur l'offre annuelle).
 *
 * La remise est affichée SUR l'onglet concerné : c'est l'argument de vente,
 * il doit se voir avant le clic, pas après. Sans elle, rien n'indique que
 * l'annuel vaut mieux que le mensuel.
 */
export async function PeriodSwitcher({
  current,
  plans,
  hrefFor,
}: {
  current: BillingPeriod;
  plans: Plan[];
  /** Construit le lien d'un onglet — diffère entre /billing et la landing,
   *  qui doit revenir à l'ancre #pricing. */
  hrefFor: (period: BillingPeriod) => string;
}) {
  const t = await getTranslations("billing.plans");

  /** Meilleure remise proposée pour cette durée, tous plans confondus. */
  const bestDiscount = (period: BillingPeriod): number | null => {
    const values = plans
      .map((p) => periodDiscount(p, period)?.percent ?? 0)
      .filter((v) => v > 0);
    return values.length ? Math.max(...values) : null;
  };

  return (
    <div className="flex justify-center">
      <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-2xl bg-slate-100 p-1.5">
        {BILLING_PERIODS.map((p) => {
          const active = current === p;
          const discount = bestDiscount(p);
          return (
            <Link
              key={p}
              href={hrefFor(p)}
              scroll={false}
              aria-current={active ? "true" : undefined}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                active
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t(`periods.${p}`)}
              {discount !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  −{discount}%
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
