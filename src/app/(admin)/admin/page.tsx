import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { fetchScansPerDay } from "@/lib/stats";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/utils";
import type { Payment, Profile } from "@/lib/types";
import { StatTile } from "@/components/stats/StatTile";
import { ScansAreaChart } from "@/components/stats/ScansAreaChart";

export default async function AdminOverviewPage() {
  const t = await getTranslations("admin.overview");
  const tNav = await getTranslations("admin.nav");
  const locale = await getLocale();
  const supabase = await createClient();

  const [
    { count: users },
    { count: qrCodes },
    { data: totalScans },
    { data: revenue },
    days,
    { data: latestUsersRaw },
    { data: latestPaymentsRaw },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("qr_codes").select("id", { count: "exact", head: true }),
    supabase.rpc("total_scan_count"),
    supabase.rpc("total_revenue"),
    fetchScansPerDay(supabase, 30),
    supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("payments")
      .select("id, user_id, amount, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const latestUsers = (latestUsersRaw ?? []) as Pick<
    Profile,
    "id" | "email" | "full_name" | "created_at"
  >[];
  const latestPayments = (latestPaymentsRaw ?? []) as (Pick<
    Payment,
    "id" | "user_id" | "amount" | "currency" | "status" | "created_at"
  >)[];
  const scans30d = days.reduce((sum, d) => sum + d.scans, 0);

  return (
    <div className="animate-fade-up">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{tNav("overview")}</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label={t("users")} value={formatNumber(users ?? 0, locale)} icon="👥" />
        <StatTile label={t("qrcodes")} value={formatNumber(qrCodes ?? 0, locale)} icon="🔳" />
        <StatTile
          label={t("scans")}
          value={formatNumber(Number(totalScans ?? 0), locale)}
          icon="📈"
        />
        <StatTile
          label={t("revenue")}
          value={formatMoney(Number(revenue ?? 0), "XOF", locale)}
          icon="💰"
        />
      </div>

      <div className="card mt-6 p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          {t("chartTitle")}
        </h2>
        {scans30d === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">—</p>
        ) : (
          <ScansAreaChart data={days} locale={locale} />
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            {t("latestUsers")}
          </h2>
          <ul className="divide-y divide-slate-100">
            {latestUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {u.full_name || u.email || u.id}
                  </p>
                  {u.full_name && (
                    <p className="truncate text-xs text-slate-400">{u.email}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatDate(u.created_at, locale)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            {t("latestPayments")}
          </h2>
          <ul className="divide-y divide-slate-100">
            {latestPayments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {formatMoney(Number(p.amount), p.currency, locale)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(p.created_at, locale)}
                  </p>
                </div>
                <span
                  className={
                    p.status === "completed"
                      ? "badge-green"
                      : p.status === "pending"
                        ? "badge-amber"
                        : "badge-red"
                  }
                >
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
