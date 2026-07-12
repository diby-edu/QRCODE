"use client";

import type { VisitDayPoint } from "@/lib/stats";
import { AreaTrendChart } from "./AreaTrendChart";

/** Aire des visites/jour — habillage de AreaTrendChart pour la forme {day, visits}. */
export function VisitsAreaChart({
  data,
  locale,
}: {
  data: VisitDayPoint[];
  locale: string;
}) {
  return (
    <AreaTrendChart
      data={data}
      locale={locale}
      dataKey="visits"
      formatValue={(v, l) => new Intl.NumberFormat(l).format(v)}
    />
  );
}
