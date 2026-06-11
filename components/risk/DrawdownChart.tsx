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
import { AXIS_PROPS, ChartTooltip, tickYear, yearTicks } from "@/components/charts/chart-helpers";
import { CHART_STYLE, SHORT_NAMES, STRATEGY_COLORS, isBenchmark } from "@/lib/chart-utils";
import { formatPercent } from "@/lib/formatters";
import type { DrawdownRow } from "@/lib/data/drawdowns";

export default function DrawdownChart({
  rows,
  series,
}: {
  rows: DrawdownRow[];
  series: string[];
}) {
  const dates = rows.map((r) => r.date as string);
  return (
    <ResponsiveChart height={360} ariaLabel="Drawdown from running peak by strategy; values below zero are peak-to-trough losses">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_STYLE.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            ticks={yearTicks(dates, 2)}
            tickFormatter={tickYear}
            {...AXIS_PROPS}
          />
          <YAxis
            width={52}
            tickFormatter={(v: number) => formatPercent(v, 0)}
            domain={["auto", 0.005]}
            {...AXIS_PROPS}
          />
          <ReferenceLine y={0} stroke="#948C7D" strokeWidth={1} />
          <Tooltip
            content={<ChartTooltip formatter={(v) => formatPercent(v, 1)} />}
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
              strokeWidth={isBenchmark(s) ? 1.3 : 1.7}
              strokeDasharray={isBenchmark(s) ? "6 4" : undefined}
              strokeOpacity={isBenchmark(s) ? 0.7 : 1}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveChart>
  );
}
