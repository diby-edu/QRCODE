"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayPoint } from "@/lib/stats";

const ACCENT = "#4f46e5"; // indigo-600 — série unique, pas de légende

function formatDay(iso: string, locale: string, long = false) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: long ? "long" : "short",
  }).format(new Date(`${iso}T00:00:00`));
}

interface TooltipPayload {
  value?: number | string;
  payload?: DayPoint;
}

function ChartTooltip({
  active,
  payload,
  locale,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  locale: string;
}) {
  const point = payload?.[0];
  if (!active || !point?.payload) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="text-slate-500">{formatDay(point.payload.day, locale, true)}</p>
      <p className="mt-0.5 flex items-center gap-1.5 font-semibold text-slate-900">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: ACCENT }}
        />
        {new Intl.NumberFormat(locale).format(Number(point.value ?? 0))}
      </p>
    </div>
  );
}

/** Aire mono-série des scans/jour : ligne 2px, remplissage 10%, grille discrète. */
export function ScansAreaChart({
  data,
  locale,
}: {
  data: DayPoint[];
  locale: string;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={(d: string) => formatDay(d, locale)}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            minTickGap={32}
          />
          <YAxis
            allowDecimals={false}
            width={36}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<ChartTooltip locale={locale} />}
            cursor={{ stroke: "#c7d2fe", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="scans"
            stroke={ACCENT}
            strokeWidth={2}
            fill={ACCENT}
            fillOpacity={0.1}
            activeDot={{ r: 4, fill: ACCENT, stroke: "#ffffff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
