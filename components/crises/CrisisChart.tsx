"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ResponsiveChart from "@/components/charts/ResponsiveChart";
import { AXIS_PROPS, ChartTooltip, tickMonthYear } from "@/components/charts/chart-helpers";
import { CHART_STYLE, SHORT_NAMES, STRATEGY_COLORS, isBenchmark } from "@/lib/chart-utils";
import { formatWealth } from "@/lib/formatters";
import type { CrisisWealthRow } from "@/lib/data/crisis";

export default function CrisisChart({
  rows,
  series,
}: {
  rows: CrisisWealthRow[];
  series: string[];
}) {
  // Month boundaries as ticks (crisis windows span 3-24 months).
  const dates = rows.map((r) => r.date as string);
  const ticks: string[] = [];
  let lastMonth = "";
  for (const d of dates) {
    const month = d.slice(0, 7);
    if (month !== lastMonth) {
      lastMonth = month;
      ticks.push(d);
    }
  }
  const step = Math.max(1, Math.ceil(ticks.length / 8));
  const sparseTicks = ticks.filter((_, i) => i % step === 0);

  return (
    <ResponsiveChart height={320} ariaLabel="Cumulative wealth during the selected crisis window, rebased to 100 at the crisis start">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_STYLE.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            ticks={sparseTicks}
            tickFormatter={tickMonthYear}
            {...AXIS_PROPS}
          />
          <YAxis
            width={52}
            tickFormatter={(v: number) => `$${v}`}
            domain={["auto", "auto"]}
            {...AXIS_PROPS}
          />
          <ReferenceLine y={100} stroke="#948C7D" strokeDasharray="4 4" />
          <Tooltip
            content={<ChartTooltip formatter={formatWealth} />}
            cursor={{ stroke: CHART_STYLE.axis, strokeDasharray: "3 3" }}
          />
          <Legend
            formatter={(value: string) => (
              <span style={{ color: "#3F3F3F", fontSize: 12 }}>
                {SHORT_NAMES[value] ?? value}
              </span>
            )}
            iconType="plainline"
            wrapperStyle={{ paddingTop: 10 }}
          />
          {series.map((s) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              stroke={STRATEGY_COLORS[s]}
              strokeWidth={isBenchmark(s) ? 1.4 : 1.9}
              strokeDasharray={isBenchmark(s) ? "6 4" : undefined}
              strokeOpacity={isBenchmark(s) ? 0.75 : 1}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveChart>
  );
}
