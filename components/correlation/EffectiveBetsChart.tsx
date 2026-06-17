"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ResponsiveChart from "@/components/charts/ResponsiveChart";
import { AXIS_PROPS, ChartTooltip, tickYear, yearTicks } from "@/components/charts/chart-helpers";
import { CHART_STYLE, LOOKBACK_COLORS } from "@/lib/chart-utils";
import { formatNumber } from "@/lib/formatters";
import type { LookbackWindow } from "@/lib/types";
import type { Series } from "@/lib/data/correlation";
import CrisisBandLegend from "./CrisisBandLegend";

const LOOKBACKS: LookbackWindow[] = ["6M", "1Y", "3Y"];
const THRESHOLD = 3;

type Row = { date: string } & Partial<Record<LookbackWindow, number>>;

/** Effective independent bets through time, one line per lookback, full
 * universe. Crisis windows are shaded; a reference line marks the point below
 * which the 13-asset portfolio behaves like fewer than three independent bets. */
export default function EffectiveBetsChart({
  series,
  crisisWindows,
}: {
  series: Record<LookbackWindow, Series>;
  crisisWindows: { shortName: string; start: string; end: string }[];
}) {
  const byDate = new Map<string, Row>();
  let min = Infinity;
  let max = -Infinity;
  for (const lb of LOOKBACKS) {
    const s = series[lb];
    s.dates.forEach((d, i) => {
      const row = byDate.get(d) ?? { date: d };
      row[lb] = s.values[i];
      byDate.set(d, row);
      min = Math.min(min, s.values[i]);
      max = Math.max(max, s.values[i]);
    });
  }
  const rows = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  const dates = rows.map((r) => r.date);
  const yMin = Math.max(1, Math.floor(min));
  const yMax = Math.ceil(max);

  const shaded = crisisWindows
    .map((w) => {
      const x1 = dates.find((d) => d >= w.start);
      const within = dates.filter((d) => d <= w.end);
      const x2 = within.length ? within[within.length - 1] : undefined;
      return x1 && x2 && x1 <= x2 ? { ...w, x1, x2 } : null;
    })
    .filter((w): w is NonNullable<typeof w> => w !== null);

  return (
    <div>
    <ResponsiveChart
      height={300}
      ariaLabel="Effective number of independent bets through time, by estimation lookback, with crisis windows shaded."
    >
      <LineChart data={rows} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART_STYLE.grid} strokeDasharray="2 4" vertical={false} />
        {shaded.map((w) => (
          <ReferenceArea
            key={w.shortName}
            x1={w.x1}
            x2={w.x2}
            fill="#11161a"
            fillOpacity={0.05}
          />
        ))}
        <XAxis dataKey="date" ticks={yearTicks(dates, 2)} tickFormatter={tickYear} {...AXIS_PROPS} />
        <YAxis
          width={30}
          domain={[yMin, yMax]}
          allowDecimals={false}
          {...AXIS_PROPS}
        />
        <ReferenceLine
          y={THRESHOLD}
          stroke="#b91c1c"
          strokeDasharray="5 4"
          label={{
            value: "3 — few independent bets",
            position: "insideBottomRight",
            fontSize: 9.5,
            fill: "#b91c1c",
          }}
        />
        <Tooltip
          content={<ChartTooltip formatter={(v) => formatNumber(v, 2)} />}
          cursor={{ stroke: CHART_STYLE.axis, strokeDasharray: "3 3" }}
        />
        {LOOKBACKS.map((lb) => (
          <Line
            key={lb}
            type="monotone"
            dataKey={lb}
            name={lb}
            stroke={LOOKBACK_COLORS[lb]}
            strokeWidth={1.8}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveChart>
    <CrisisBandLegend windows={crisisWindows} />
    </div>
  );
}
