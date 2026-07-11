"use client";

import type { RevenueDayPoint } from "@/lib/stats";
import { formatMoney } from "@/lib/utils";
import { AreaTrendChart } from "./AreaTrendChart";

/** Aire des revenus/jour — habillage de AreaTrendChart pour la forme {day, amount}. */
export function RevenueAreaChart({
  data,
  locale,
}: {
  data: RevenueDayPoint[];
  locale: string;
}) {
  return (
    <AreaTrendChart
      data={data}
      locale={locale}
      dataKey="amount"
      color="#10b981"
      formatValue={(v, l) => formatMoney(v, "XOF", l)}
    />
  );
}
