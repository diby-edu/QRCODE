import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plans";
import { getQrType } from "@/lib/qr-types/registry";
import { fetchScanBreakdowns, fetchScansPerDay } from "@/lib/stats";
import { formatNumber } from "@/lib/utils";
import type { QrCode } from "@/lib/types";
import { StatTile } from "@/components/stats/StatTile";
import { ScansAreaChart } from "@/components/stats/ScansAreaChart";
import { BarRows } from "@/components/stats/BarRows";

export default async function GlobalStatsPage() {
  const t = await getTranslations("stats");
  const tc = await getTranslations("common");
  const locale = (await getLocale()) as "fr" | "en";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ limits }, { count: dynamicCount }, { data: totalScans }, days] = await Promise.all([
    getUserPlan(supabase, user!.id),
    supabase
      .from("qr_codes")
      .select("id", { count: "exact", head: true })
      .eq("is_dynamic", true),
    supabase.rpc("total_scan_count"),
    fetchScansPerDay(supabase, 30),
  ]);

  const header = (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
    </div>
  );

  if (!dynamicCount) {
    return (
      <div className="animate-fade-up">
        {header}
        <div className="card p-12 text-center">
          <span className="text-4xl">📊</span>
          <h2 className="mt-4 text-base font-semibold text-slate-900">
            {t("noDynamic.title")}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {t("noDynamic.message")}
          </p>
          <Link href="/qr/new" className="btn-primary mt-5">
            + {tc("nav.create")}
          </Link>
        </div>
      </div>
    );
  }

  const fullStats = limits.stats_level === "full";
  const scans30d = days.reduce((sum, d) => sum + d.scans, 0);
  const today = days.at(-1)?.scans ?? 0;

  const deviceLabels: Record<string, string> = {
    desktop: t("devices.desktop"),
    mobile: t("devices.mobile"),
    tablet: t("devices.tablet"),
  };

  const [breakdowns, { data: topQrRaw }] = await Promise.all([
    fullStats ? fetchScanBreakdowns(supabase, 30) : Promise.resolve(null),
    supabase
      .from("qr_codes")
      .select("id, type, title, scan_count")
      .eq("is_dynamic", true)
      .order("scan_count", { ascending: false })
      .limit(10),
  ]);

  const topQr = (topQrRaw ?? []) as Pick<QrCode, "id" | "type" | "title" | "scan_count">[];

  return (
    <div className="animate-fade-up">
      {header}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        <StatTile label={t("kpi.today")} value={formatNumber(today, locale)} icon="☀️" />
        <StatTile
          label={t("kpi.topDevice")}
          value={
            breakdowns?.devices[0]?.label
              ? (deviceLabels[breakdowns.devices[0].label] ?? breakdowns.devices[0].label)
              : "—"
          }
          icon="📱"
        />
      </div>

      <div className="card mt-6 p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">{t("chart.title")}</h2>
        {scans30d === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">{t("table.empty")}</p>
        ) : (
          <ScansAreaChart data={days} locale={locale} />
        )}
      </div>

      <div className="card mt-6 overflow-hidden">
        <h2 className="px-6 pt-6 text-base font-semibold text-slate-900">
          {t("topQr.title")}
        </h2>
        {topQr.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">{t("topQr.empty")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {topQr.map((qr) => {
              const type = getQrType(qr.type);
              return (
                <li key={qr.id}>
                  <Link
                    href={`/qr/${qr.id}/stats`}
                    className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-base">
                      {type?.icon ?? "🔳"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                      {qr.title}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-slate-500">
                      {formatNumber(qr.scan_count, locale)} {t("topQr.scans")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {fullStats && breakdowns ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <BarRows
            title={t("breakdown.countries")}
            items={breakdowns.countries}
            emptyLabel={t("breakdown.empty")}
            locale={locale}
          />
          <BarRows
            title={t("breakdown.cities")}
            items={breakdowns.cities}
            emptyLabel={t("breakdown.empty")}
            locale={locale}
          />
          <BarRows
            title={t("breakdown.devices")}
            items={breakdowns.devices}
            emptyLabel={t("breakdown.empty")}
            locale={locale}
            labelMap={deviceLabels}
          />
          <BarRows
            title={t("breakdown.os")}
            items={breakdowns.os}
            emptyLabel={t("breakdown.empty")}
            locale={locale}
          />
          <BarRows
            title={t("breakdown.browsers")}
            items={breakdowns.browsers}
            emptyLabel={t("breakdown.empty")}
            locale={locale}
          />
        </div>
      ) : (
        <div className="card mt-6 flex flex-col items-center gap-3 bg-gradient-to-br from-indigo-50 to-violet-50 p-8 text-center">
          <span className="text-3xl">🔓</span>
          <h2 className="text-base font-semibold text-slate-900">{t("upgrade.title")}</h2>
          <p className="max-w-md text-sm text-slate-500">{t("upgrade.message")}</p>
          <Link href="/billing" className="btn-primary mt-2">
            {tc("actions.upgrade")}
          </Link>
        </div>
      )}
    </div>
  );
}
