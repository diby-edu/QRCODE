import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plans";
import { getQrType } from "@/lib/qr-types/registry";
import { fetchScanBreakdowns, fetchScansPerDay } from "@/lib/stats";
import { formatDateTime, formatNumber } from "@/lib/utils";
import type { QrCode, QrScan } from "@/lib/types";
import { StatTile } from "@/components/stats/StatTile";
import { ScansAreaChart } from "@/components/stats/ScansAreaChart";
import { BarRows } from "@/components/stats/BarRows";

export default async function QrStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("stats");
  const tc = await getTranslations("common");
  const locale = await getLocale();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: qrRaw } = await supabase
    .from("qr_codes")
    .select("id, type, title, is_dynamic, scan_count")
    .eq("id", id)
    .single();
  if (!qrRaw) notFound();

  const qr = qrRaw as Pick<QrCode, "id" | "type" | "title" | "is_dynamic" | "scan_count">;
  const type = getQrType(qr.type);

  const header = (
    <div className="mb-6">
      <Link
        href={`/qr/${qr.id}`}
        className="text-sm font-medium text-indigo-600 hover:underline"
      >
        ← {t("backToQr")}
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl">
          {type?.icon ?? "🔳"}
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {t("title")} — {qr.title}
          </h1>
          <p className="text-sm text-slate-500">
            {type?.name[locale as "fr" | "en"] ?? qr.type}
          </p>
        </div>
      </div>
    </div>
  );

  // Un QR statique ne passe pas par nos serveurs : rien à mesurer.
  if (!qr.is_dynamic) {
    return (
      <div className="animate-fade-up">
        {header}
        <div className="card p-8 text-center">
          <span className="text-3xl">ℹ️</span>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-500">
            {t("staticNote")}
          </p>
        </div>
      </div>
    );
  }

  const { limits } = await getUserPlan(supabase, user!.id);
  const fullStats = limits.stats_level === "full";

  const deviceLabels: Record<string, string> = {
    desktop: t("devices.desktop"),
    mobile: t("devices.mobile"),
    tablet: t("devices.tablet"),
  };

  const [days, breakdowns, scansResult] = await Promise.all([
    fetchScansPerDay(supabase, 30, qr.id),
    fullStats ? fetchScanBreakdowns(supabase, 30, qr.id) : Promise.resolve(null),
    fullStats
      ? supabase
          .from("qr_scans")
          .select("id, country, city, device, browser, operating_system, scanned_at")
          .eq("qr_code_id", qr.id)
          .order("scanned_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: null }),
  ]);

  const scans30d = days.reduce((sum, d) => sum + d.scans, 0);
  const today = days.at(-1)?.scans ?? 0;
  const topDevice = breakdowns?.devices[0]?.label;
  const recentScans = (scansResult.data ?? []) as Pick<
    QrScan,
    "id" | "country" | "city" | "device" | "browser" | "operating_system" | "scanned_at"
  >[];
  const unknown = t("table.unknown");

  return (
    <div className="animate-fade-up">
      {header}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={t("kpi.totalScans")}
          value={formatNumber(qr.scan_count, locale)}
          icon="📈"
        />
        <StatTile
          label={t("kpi.scans30d")}
          value={formatNumber(scans30d, locale)}
          icon="🗓️"
        />
        <StatTile
          label={t("kpi.today")}
          value={formatNumber(today, locale)}
          icon="☀️"
        />
        <StatTile
          label={t("kpi.topDevice")}
          value={topDevice ? (deviceLabels[topDevice] ?? topDevice) : "—"}
          icon="📱"
        />
      </div>

      {/* Graphe scans/jour */}
      <div className="card mt-6 p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          {t("chart.title")}
        </h2>
        {scans30d === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            {t("table.empty")}
          </p>
        ) : (
          <ScansAreaChart data={days} locale={locale} />
        )}
      </div>

      {fullStats && breakdowns ? (
        <>
          {/* Répartitions */}
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

          {/* Derniers scans */}
          <div className="card mt-6 overflow-hidden">
            <h2 className="px-6 pt-6 text-base font-semibold text-slate-900">
              {t("table.title")}
            </h2>
            {recentScans.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-400">
                {t("table.empty")}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-6 py-2.5 font-medium">{t("table.date")}</th>
                      <th className="px-6 py-2.5 font-medium">{t("table.location")}</th>
                      <th className="px-6 py-2.5 font-medium">{t("table.device")}</th>
                      <th className="px-6 py-2.5 font-medium">{t("table.os")}</th>
                      <th className="px-6 py-2.5 font-medium">{t("table.browser")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentScans.map((scan) => (
                      <tr key={scan.id} className="text-slate-700">
                        <td className="whitespace-nowrap px-6 py-3">
                          {formatDateTime(scan.scanned_at, locale)}
                        </td>
                        <td className="px-6 py-3">
                          {[scan.city, scan.country].filter(Boolean).join(", ") ||
                            unknown}
                        </td>
                        <td className="px-6 py-3">
                          {scan.device ? (deviceLabels[scan.device] ?? scan.device) : unknown}
                        </td>
                        <td className="px-6 py-3">{scan.operating_system ?? unknown}</td>
                        <td className="px-6 py-3">{scan.browser ?? unknown}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Bannière d'upgrade (stats basiques) */
        <div className="card mt-6 flex flex-col items-center gap-3 bg-gradient-to-br from-indigo-50 to-violet-50 p-8 text-center">
          <span className="text-3xl">🔓</span>
          <h2 className="text-base font-semibold text-slate-900">
            {t("upgrade.title")}
          </h2>
          <p className="max-w-md text-sm text-slate-500">{t("upgrade.message")}</p>
          <Link href="/billing" className="btn-primary mt-2">
            {tc("actions.upgrade")}
          </Link>
        </div>
      )}
    </div>
  );
}
