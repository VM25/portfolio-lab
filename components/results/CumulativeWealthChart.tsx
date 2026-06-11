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
import { CHART_STYLE, SHORT_NAMES, STRATEGY_COLORS, isBenchmark } from "@/lib/chart-utils";
import { formatWealth } from "@/lib/formatters";
import type { WealthRow } from "@/lib/data/returns";

export default function CumulativeWealthChart({
  rows,
  series,
}: {
  rows: WealthRow[];
  series: string[];
}) {
  const dates = rows.map((r) => r.date as string);
  return (
    <ResponsiveChart height={380} ariaLabel="Growth of $100 by strategy over the full sample">
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
            tickFormatter={(v: number) => `$${v}`}
            domain={["auto", "auto"]}
            {...AXIS_PROPS}
          />
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
