import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plans";
import { fetchScansPerDay } from "@/lib/stats";
import { verifyAndActivate } from "@/lib/payments/activate";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import type { Payment, Plan } from "@/lib/types";
import { PlanCard } from "@/components/billing/PlanCard";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { UsageMeter } from "@/components/billing/UsageMeter";

type Banner = "success" | "pending" | "cancelled" | "error" | null;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; token?: string }>;
}) {
  const { status, token } = await searchParams;
  const t = await getTranslations("billing");
  const locale = await getLocale();

  // Retour de PayDunya : vérifie et active immédiatement (idempotent —
  // l'IPN peut être déjà passé ou passer ensuite, sans double activation).
  let banner: Banner = status === "cancelled" ? "cancelled" : null;
  if (token) {
    try {
      const result = await verifyAndActivate(token);
      banner = result === "invalid" ? "pending" : "success";
    } catch {
      banner = "error";
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [userPlan, { count: totalQr }, { count: dynamicQr }, { data: storageBytes }, days, { data: plansRaw }, { data: paymentsRaw }] =
    await Promise.all([
      getUserPlan(supabase, user!.id),
      supabase.from("qr_codes").select("id", { count: "exact", head: true }),
      supabase
        .from("qr_codes")
        .select("id", { count: "exact", head: true })
        .eq("is_dynamic", true),
      supabase.rpc("user_storage_bytes"),
      fetchScansPerDay(supabase, 30),
      supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("payments")
        .select("id, amount, currency, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const { plan, subscription, limits, isFree } = userPlan;
  const plans = (plansRaw ?? []) as Plan[];
  const payments = (paymentsRaw ?? []) as Pick<
    Payment,
    "id" | "amount" | "currency" | "status" | "created_at"
  >[];
  const scans30d = days.reduce((sum, d) => sum + d.scans, 0);
  const storageMb = Math.round((Number(storageBytes ?? 0) / 1024 / 1024) * 10) / 10;

  const bannerStyles: Record<Exclude<Banner, null>, string> = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
    cancelled: "bg-slate-100 text-slate-600 ring-slate-500/20",
    error: "bg-red-50 text-red-700 ring-red-600/20",
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      {banner && (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium ring-1 ${bannerStyles[banner]}`}
        >
          {t(`banners.${banner}`)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Plan actuel */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-slate-900">
            {t("current.title")}
          </h2>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {plan?.name ?? "—"}
            </span>
            <span className="text-sm text-slate-500">
              {plan
                ? `${formatMoney(Number(plan.price_monthly), plan.currency, locale)}${t("current.perMonth")}`
                : ""}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {isFree || !subscription?.current_period_end
              ? t("current.free")
              : t("current.renewsOn", {
                  date: formatDate(subscription.current_period_end, locale),
                })}
          </p>
        </div>

        {/* Consommation */}
        <div className="card space-y-4 p-6">
          <h2 className="text-base font-semibold text-slate-900">
            {t("usage.title")}
          </h2>
          <UsageMeter
            label={t("usage.qrCodes")}
            used={totalQr ?? 0}
            limit={limits.max_qr_codes}
            locale={locale}
          />
          <UsageMeter
            label={t("usage.dynamic")}
            used={dynamicQr ?? 0}
            limit={limits.max_dynamic}
            locale={locale}
          />
          <UsageMeter
            label={t("usage.scansMonth")}
            used={scans30d}
            limit={limits.max_scans_month}
            locale={locale}
          />
          <UsageMeter
            label={t("usage.storage")}
            used={storageMb}
            limit={limits.max_storage_mb}
            locale={locale}
          />
        </div>
      </div>

      {/* Plans disponibles */}
      <h2 className="mb-4 mt-8 text-base font-semibold text-slate-900">
        {t("plans.title")}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            locale={locale}
            isCurrent={p.id === plan?.id}
            action={
              Number(p.price_monthly) > 0 ? (
                <CheckoutButton planId={p.id} highlighted />
              ) : null
            }
          />
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-slate-400">
        💳 {t("plans.payWith")}
      </p>

      {/* Historique */}
      <div className="card mt-8 overflow-hidden">
        <h2 className="px-6 pt-6 text-base font-semibold text-slate-900">
          {t("history.title")}
        </h2>
        {payments.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-400">
            {t("history.empty")}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-2.5 font-medium">{t("history.date")}</th>
                  <th className="px-6 py-2.5 font-medium">{t("history.amount")}</th>
                  <th className="px-6 py-2.5 font-medium">{t("history.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="text-slate-700">
                    <td className="whitespace-nowrap px-6 py-3">
                      {formatDateTime(payment.created_at, locale)}
                    </td>
                    <td className="px-6 py-3 font-medium">
                      {formatMoney(Number(payment.amount), payment.currency, locale)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={
                          payment.status === "completed"
                            ? "badge-green"
                            : payment.status === "pending"
                              ? "badge-amber"
                              : "badge-red"
                        }
                      >
                        {t(`history.statuses.${payment.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
