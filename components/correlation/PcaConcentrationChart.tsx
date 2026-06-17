"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ResponsiveChart from "@/components/charts/ResponsiveChart";
import { AXIS_PROPS, ChartTooltip, tickYear, yearTicks } from "@/components/charts/chart-helpers";
import { CHART_STYLE } from "@/lib/chart-utils";
import { formatPercent } from "@/lib/formatters";
import type { PcaConcentrationRecord } from "@/lib/types";
import CrisisBandLegend from "./CrisisBandLegend";

const SHARE_NAMES = { pc1Share: "PC1", pc2Share: "PC2", pc3Share: "PC3" };
const SHARE_COLORS = { pc1Share: "#0c544e", pc2Share: "#3a7873", pc3Share: "#7aa7a5" };

/** Top-three principal-component variance shares through time, stacked. A
 * rising PC1 band means cross-asset returns are increasingly driven by one
 * common factor — risk concentrating rather than diversifying. */
export default function PcaConcentrationChart({
  records,
  crisisWindows,
}: {
  records: PcaConcentrationRecord[];
  crisisWindows: { shortName: string; start: string; end: string }[];
}) {
  const rows = [...records].sort((a, b) => (a.date < b.date ? -1 : 1));
  const dates = rows.map((r) => r.date);

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
      ariaLabel="Top-three principal-component variance shares through time, stacked, with crisis windows shaded."
    >
      <AreaChart data={rows} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART_STYLE.grid} strokeDasharray="2 4" vertical={false} />
        {shaded.map((w) => (
          <ReferenceArea
            key={w.shortName}
            x1={w.x1}
            x2={w.x2}
            fill="#11161a"
            fillOpacity={0.06}
          />
        ))}
        <XAxis dataKey="date" ticks={yearTicks(dates, 2)} tickFormatter={tickYear} {...AXIS_PROPS} />
        <YAxis
          width={36}
          domain={[0, 1]}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          {...AXIS_PROPS}
        />
        <Tooltip
          content={<ChartTooltip formatter={(v) => formatPercent(v, 0)} names={SHARE_NAMES} sortDesc={false} />}
          cursor={{ stroke: CHART_STYLE.axis, strokeDasharray: "3 3" }}
        />
        {(["pc1Share", "pc2Share", "pc3Share"] as const).map((k) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            name={SHARE_NAMES[k]}
            stackId="pca"
            stroke={SHARE_COLORS[k]}
            fill={SHARE_COLORS[k]}
            fillOpacity={0.85}
            strokeWidth={0.8}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveChart>
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        Stacked
      </span>
      {(["pc1Share", "pc2Share", "pc3Share"] as const).map((k) => (
        <span key={k} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
          <span aria-hidden className="h-2.5 w-3" style={{ background: SHARE_COLORS[k] }} />
          {SHARE_NAMES[k]}
        </span>
      ))}
    </div>
    <CrisisBandLegend windows={crisisWindows} />
    </div>
  );
}
