"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ResponsiveChart from "@/components/charts/ResponsiveChart";
import { AXIS_PROPS, ChartTooltip, tickYear, yearTicks } from "@/components/charts/chart-helpers";
import { CHART_STYLE, SHORT_NAMES, STRATEGY_COLORS } from "@/lib/chart-utils";
import { formatPercent } from "@/lib/formatters";
import type { TurnoverRow } from "@/lib/data/diagnostics";

export default function TurnoverChart({
  rows,
  series,
}: {
  rows: TurnoverRow[];
  series: string[];
}) {
  const dates = rows.map((r) => r.date as string);
  return (
    <ResponsiveChart height={280} ariaLabel="Monthly turnover by strategy: total absolute weight change at each rebalance">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_STYLE.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            ticks={yearTicks(dates, 2)}
            tickFormatter={tickYear}
            {...AXIS_PROPS}
          />
          <YAxis
            width={48}
            tickFormatter={(v: number) => formatPercent(v, 0)}
            {...AXIS_PROPS}
          />
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
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveChart>
  );
}
