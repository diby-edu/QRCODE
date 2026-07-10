import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, isUnlimited } from "@/lib/plans";
import { fetchScansPerDay } from "@/lib/stats";
import { getQrType } from "@/lib/qr-types/registry";
import { formatDate, formatNumber } from "@/lib/utils";
import type { QrCode } from "@/lib/types";
import { StatTile } from "@/components/stats/StatTile";
import { ScansAreaChart } from "@/components/stats/ScansAreaChart";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const locale = await getLocale();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { count: totalQr },
    { count: dynamicQr },
    { data: totalScans },
    days,
    { data: recentRaw },
    { data: profile },
    { limits },
  ] = await Promise.all([
    supabase.from("qr_codes").select("id", { count: "exact", head: true }),
    supabase
      .from("qr_codes")
      .select("id", { count: "exact", head: true })
      .eq("is_dynamic", true),
    supabase.rpc("total_scan_count"),
    fetchScansPerDay(supabase, 30),
    supabase
      .from("qr_codes")
      .select("id, type, title, is_dynamic, is_active, scan_count, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
    getUserPlan(supabase, user!.id),
  ]);

  const recent = (recentRaw ?? []) as Pick<
    QrCode,
    "id" | "type" | "title" | "is_dynamic" | "is_active" | "scan_count" | "created_at"
  >[];
  const scans30d = days.reduce((sum, d) => sum + d.scans, 0);
  const firstName = (profile?.full_name ?? "").split(" ")[0];

  const limitHint = (limit: number) =>
    isUnlimited(limit)
      ? undefined
      : t("kpi.ofLimit", { limit: formatNumber(limit, locale) });

  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {firstName ? t("greeting", { name: firstName }) : t("title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={t("kpi.totalQr")}
          value={formatNumber(totalQr ?? 0, locale)}
          hint={limitHint(limits.max_qr_codes)}
          icon="🔳"
        />
        <StatTile
          label={t("kpi.dynamicQr")}
          value={formatNumber(dynamicQr ?? 0, locale)}
          hint={limitHint(limits.max_dynamic)}
          icon="⚡"
        />
        <StatTile
          label={t("kpi.totalScans")}
          value={formatNumber(Number(totalScans ?? 0), locale)}
          icon="📈"
        />
        <StatTile
          label={t("kpi.scans30d")}
          value={formatNumber(scans30d, locale)}
          icon="🗓️"
        />
      </div>

      {/* Graphe des scans */}
      <div className="card mt-6 p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          {t("chart.title")}
        </h2>
        {scans30d === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            {t("chart.empty")}
          </p>
        ) : (
          <ScansAreaChart data={days} locale={locale} />
        )}
      </div>

      {/* QR récents */}
      <div className="card mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            {t("recent.title")}
          </h2>
          <Link href="/qr" className="text-sm font-medium text-indigo-600 hover:underline">
            {tc("actions.seeAll")}
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-400">{t("recent.empty")}</p>
            <Link href="/qr/new" className="btn-primary mt-4">
              + {t("recent.cta")}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((qr) => {
              const type = getQrType(qr.type);
              return (
                <li key={qr.id}>
                  <Link
                    href={`/qr/${qr.id}`}
                    className="flex items-center gap-3 py-3 transition-colors hover:bg-slate-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg">
                      {type?.icon ?? "🔳"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {qr.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {type?.name[locale as "fr" | "en"] ?? qr.type} ·{" "}
                        {formatDate(qr.created_at, locale)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {qr.is_dynamic && (
                        <span className="hidden text-xs tabular-nums text-slate-500 sm:block">
                          {tc("scans", { count: qr.scan_count })}
                        </span>
                      )}
                      <span className={qr.is_active ? "badge-green" : "badge-red"}>
                        {qr.is_active ? tc("status.active") : tc("status.inactive")}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
