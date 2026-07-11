"use client";

import type { DayPoint } from "@/lib/stats";
import { AreaTrendChart } from "./AreaTrendChart";

/** Aire des scans/jour — habillage de AreaTrendChart pour la forme {day, scans}. */
export function ScansAreaChart({
  data,
  locale,
}: {
  data: DayPoint[];
  locale: string;
}) {
  return (
    <AreaTrendChart
      data={data}
      locale={locale}
      dataKey="scans"
      formatValue={(v, l) => new Intl.NumberFormat(l).format(v)}
    />
  );
}
