import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchSiteVisitBreakdowns,
  fetchSiteVisitsPerDay,
  fetchSiteVisitsSummary,
} from "@/lib/stats";
import { formatNumber } from "@/lib/utils";
import { StatTile } from "@/components/stats/StatTile";
import { VisitsAreaChart } from "@/components/stats/VisitsAreaChart";
import { BarRows } from "@/components/stats/BarRows";

export default async function AdminTrafficPage() {
  const t = await getTranslations("admin.traffic");
  const tNav = await getTranslations("admin.nav");
  const locale = await getLocale();
  const supabase = await createClient();

  const [days, breakdowns, summary] = await Promise.all([
    fetchSiteVisitsPerDay(supabase, 30),
    fetchSiteVisitBreakdowns(supabase, 30),
    fetchSiteVisitsSummary(supabase, 30),
  ]);

  const today = days.at(-1)?.visits ?? 0;

  const deviceLabels: Record<string, string> = {
    desktop: t("devices.desktop"),
    mobile: t("devices.mobile"),
    tablet: t("devices.tablet"),
  };

  return (
    <div className="animate-fade-up">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">{tNav("traffic")}</h1>
      <p className="mb-6 text-sm text-slate-500">{t("subtitle")}</p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={t("kpi.uniqueVisitors30d")}
          value={formatNumber(summary.uniqueVisitors, locale)}
          hint={t("kpi.uniqueVisitorsHint")}
          icon="🧑‍🤝‍🧑"
        />
        <StatTile
          label={t("kpi.visits30d")}
          value={formatNumber(summary.totalVisits, locale)}
          icon="👁️"
        />
        <StatTile label={t("kpi.today")} value={formatNumber(today, locale)} icon="☀️" />
        <StatTile
          label={t("kpi.allTime")}
          value={formatNumber(summary.totalVisitsAllTime, locale)}
          icon="🗂️"
        />
      </div>

      <div className="card mt-6 p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">{t("chart.title")}</h2>
        {summary.totalVisits === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">{t("breakdown.empty")}</p>
        ) : (
          <VisitsAreaChart data={days} locale={locale} />
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BarRows
          title={t("breakdown.pages")}
          items={breakdowns.paths}
          emptyLabel={t("breakdown.empty")}
          locale={locale}
        />
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
        <BarRows
          title={t("breakdown.referrers")}
          items={breakdowns.referrers}
          emptyLabel={t("breakdown.empty")}
          locale={locale}
        />
      </div>
    </div>
  );
}
