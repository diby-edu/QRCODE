import { getTranslations } from "next-intl/server";
import { normalizeLimits, isUnlimited } from "@/lib/plans";
import { formatMoney, formatNumber } from "@/lib/utils";
import type { Plan } from "@/lib/types";

/** Liste des caractéristiques d'un plan, dérivée de ses limites JSONB. */
async function featureList(plan: Plan, locale: string): Promise<string[]> {
  const t = await getTranslations("billing.plans.features");
  const limits = normalizeLimits(plan.limits);
  const n = (v: number) => formatNumber(v, locale);

  const features = [
    isUnlimited(limits.max_qr_codes)
      ? t("qrCodesUnlimited")
      : t("qrCodes", { count: n(limits.max_qr_codes) }),
    isUnlimited(limits.max_dynamic)
      ? t("dynamicUnlimited")
      : t("dynamic", { count: n(limits.max_dynamic) }),
    isUnlimited(limits.max_storage_mb)
      ? t("storageUnlimited")
      : t("storage", { count: n(limits.max_storage_mb) }),
    t("formats", { formats: limits.formats.map((f) => f.toUpperCase()).join(", ") }),
    limits.stats_level === "full" ? t("statsFull") : t("statsBasic"),
  ];
  if (limits.video_enabled) features.push(t("videoHosting"));
  if (limits.logo_enabled) features.push(t("logo"));
  if (limits.folders_enabled) features.push(t("folders"));
  if (limits.password_enabled) features.push(t("password"));
  if (limits.custom_domain_enabled) features.push(t("customDomain"));
  return features;
}

/**
 * Carte de plan, réutilisée sur /billing et /pricing.
 * `action` : bouton de paiement (billing), lien (pricing) ou rien.
 */
export async function PlanCard({
  plan,
  locale,
  isCurrent = false,
  action,
}: {
  plan: Plan;
  locale: string;
  isCurrent?: boolean;
  action?: React.ReactNode;
}) {
  const t = await getTranslations("billing.plans");
  const tCurrent = await getTranslations("billing.current");
  const isFree = Number(plan.price_monthly) <= 0;
  const highlighted = !isFree;
  const features = await featureList(plan, locale);

  return (
    <div
      className={`card relative flex flex-col p-6 ${
        highlighted ? "border-indigo-200 shadow-md ring-1 ring-indigo-100" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
          {plan.description && (
            <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
          )}
        </div>
        {isCurrent && <span className="badge-indigo shrink-0">{t("current")}</span>}
      </div>

      <p className="mt-4 text-3xl font-extrabold text-slate-900">
        {isFree ? formatMoney(0, plan.currency, locale) : formatMoney(Number(plan.price_monthly), plan.currency, locale)}
        <span className="text-sm font-medium text-slate-400">
          {tCurrent("perMonth")}
        </span>
      </p>

      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
            <span className="mt-0.5 text-emerald-500">✓</span>
            {f}
          </li>
        ))}
      </ul>

      {!isCurrent && action && <div className="mt-6">{action}</div>}
    </div>
  );
}
