"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ResponsiveChart from "@/components/charts/ResponsiveChart";
import { AXIS_PROPS, ChartTooltip } from "@/components/charts/chart-helpers";
import { CHART_STYLE, SHORT_NAMES, STRATEGY_COLORS } from "@/lib/chart-utils";
import { formatNumber } from "@/lib/formatters";
import type { FactorExposure } from "@/lib/types";

const FACTORS: { key: keyof FactorExposure; label: string }[] = [
  { key: "marketBeta", label: "Market" },
  { key: "smb", label: "SMB" },
  { key: "hml", label: "HML" },
  { key: "rmw", label: "RMW" },
  { key: "cma", label: "CMA" },
];

export default function FactorExposureChart({
  exposures,
  series,
}: {
  exposures: FactorExposure[];
  series: string[];
}) {
  const rows = FACTORS.map((f) => {
    const row: Record<string, number | string> = { factor: f.label };
    for (const e of exposures) {
      row[e.strategy] = e[f.key] as number;
    }
    return row;
  });

  return (
    <ResponsiveChart height={340} ariaLabel="Fama-French factor loadings by strategy, grouped bars per factor with a visible zero line">
        <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid stroke={CHART_STYLE.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="factor" {...AXIS_PROPS} />
          <YAxis
            width={48}
            tickFormatter={(v: number) => formatNumber(v, 1)}
            {...AXIS_PROPS}
          />
          <ReferenceLine y={0} stroke="#948C7D" strokeWidth={1.2} />
          <Tooltip
            content={<ChartTooltip formatter={(v) => formatNumber(v, 3)} sortDesc={false} />}
            cursor={{ fill: "rgba(23,23,23,0.05)" }}
          />
          <Legend
            formatter={(value: string) => (
              <span style={{ color: "#3F3F3F", fontSize: 12 }}>
                {SHORT_NAMES[value] ?? value}
              </span>
            )}
            wrapperStyle={{ paddingTop: 10 }}
          />
          {series.map((s) => (
            <Bar
              key={s}
              dataKey={s}
              fill={STRATEGY_COLORS[s]}
              fillOpacity={0.85}
              isAnimationActive={false}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveChart>
  );
}
