"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ResponsiveChart from "@/components/charts/ResponsiveChart";
import { AXIS_PROPS, ChartTooltip, tickYear, yearTicks } from "@/components/charts/chart-helpers";
import { CHART_STYLE, REGIME_COLORS } from "@/lib/chart-utils";
import { formatNumber, formatPercent } from "@/lib/formatters";

export type StackRow = {
  date: string;
  corr?: number | null;
  cpi?: number | null;
  vix?: number | null;
  normal?: number;
  watch?: number;
  defensive?: number;
  growthW?: number | null;
  defensiveW?: number | null;
  hedgeW?: number | null;
};

const MARGIN = { top: 6, right: 12, bottom: 0, left: 0 };
const Y_WIDTH = 56;
const SYNC = "signal-stack";

function PanelLabel({ title, threshold }: { title: string; threshold?: string }) {
  return (
    <div className="flex items-baseline justify-between px-1 pb-1">
      <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink-secondary">
        {title}
      </span>
      {threshold && (
        <span className="font-mono text-[10px] text-regime-defensive/90">
          stress threshold {threshold}
        </span>
      )}
    </div>
  );
}

function SignalPanel({
  rows,
  dataKey,
  color,
  threshold,
  format,
  height,
  domain,
}: {
  rows: StackRow[];
  dataKey: "corr" | "cpi" | "vix";
  color: string;
  threshold: number;
  format: (v: number) => string;
  height: number;
  domain?: [number | string, number | string];
}) {
  return (
    <ResponsiveChart height={height}>
        <LineChart data={rows} margin={MARGIN} syncId={SYNC}>
          <CartesianGrid stroke={CHART_STYLE.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="date" hide />
          <YAxis
            width={Y_WIDTH}
            tickFormatter={(v: number) => format(v)}
            domain={domain ?? ["auto", "auto"]}
            tickCount={4}
            {...AXIS_PROPS}
          />
          <ReferenceLine
            y={threshold}
            stroke={CHART_STYLE.referenceLine}
            strokeDasharray="5 4"
            strokeOpacity={0.7}
          />
          <Tooltip
            content={
              <ChartTooltip
                formatter={format}
                sortDesc={false}
                names={{
                  corr: "SPY-TLT corr (90d)",
                  cpi: "CPI YoY (lagged)",
                  vix: "VIX",
                }}
              />
            }
            cursor={{ stroke: CHART_STYLE.axis, strokeDasharray: "3 3" }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
    </ResponsiveChart>
  );
}

export default function SignalStackCharts({ rows }: { rows: StackRow[] }) {
  const dates = rows.map((r) => r.date);
  const ticks = yearTicks(dates, 2);

  return (
    <div className="space-y-4">
      <div>
        <PanelLabel title="SPY-TLT rolling correlation · 90d" threshold="> +0.20" />
        <SignalPanel
          rows={rows}
          dataKey="corr"
          color="#2563A8"
          threshold={0.2}
          format={(v) => formatNumber(v, 2)}
          height={130}
          domain={[-1, 1]}
        />
      </div>

      <div>
        <PanelLabel title="CPI inflation YoY · lagged 1 month" threshold="> 3%" />
        <SignalPanel
          rows={rows}
          dataKey="cpi"
          color="#B7791F"
          threshold={0.03}
          format={(v) => formatPercent(v, 1)}
          height={130}
        />
      </div>

      <div>
        <PanelLabel title="VIX level" threshold="> 25" />
        <SignalPanel
          rows={rows}
          dataKey="vix"
          color="#7C3AED"
          threshold={25}
          format={(v) => formatNumber(v, 0)}
          height={130}
        />
      </div>

      <div>
        <PanelLabel title="Regime classification" />
        <ResponsiveChart height={46}>
            <AreaChart data={rows} margin={MARGIN} syncId={SYNC} stackOffset="expand">
              <XAxis dataKey="date" hide />
              <YAxis width={Y_WIDTH} hide={false} tick={false} axisLine={{ stroke: CHART_STYLE.grid }} tickLine={false} />
              {(["normal", "watch", "defensive"] as const).map((regime) => (
                <Area
                  key={regime}
                  type="step"
                  dataKey={regime}
                  stackId="regime"
                  stroke="none"
                  fill={REGIME_COLORS[regime]}
                  fillOpacity={0.75}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
        </ResponsiveChart>
        <div className="mt-1.5 flex gap-4 px-1">
          {(["normal", "watch", "defensive"] as const).map((regime) => (
            <span key={regime} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: REGIME_COLORS[regime] }}
              />
              {regime}
            </span>
          ))}
          <span className="ml-auto font-mono text-[10px] text-ink-faint">
            0 signals = normal · 1 = watch · ≥2 = defensive
          </span>
        </div>
      </div>

      <div>
        <PanelLabel title="Regime-Aware allocation response · 1Y lookback · sleeve weights" />
        <ResponsiveChart height={200}>
            <AreaChart data={rows} margin={MARGIN} syncId={SYNC}>
              <CartesianGrid stroke={CHART_STYLE.grid} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="date" ticks={ticks} tickFormatter={tickYear} {...AXIS_PROPS} />
              <YAxis
                width={Y_WIDTH}
                tickFormatter={(v: number) => formatPercent(v, 0)}
                domain={[0, 1]}
                tickCount={5}
                {...AXIS_PROPS}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(v) => formatPercent(v, 1)}
                    sortDesc={false}
                    names={{
                      growthW: "Growth / risk sleeve",
                      defensiveW: "Duration / cash",
                      hedgeW: "Inflation hedges",
                    }}
                  />
                }
                cursor={{ stroke: CHART_STYLE.axis, strokeDasharray: "3 3" }}
              />
              <Area
                type="step"
                dataKey="growthW"
                stackId="w"
                stroke="#6B7280"
                fill="#6B7280"
                fillOpacity={0.35}
                connectNulls
                isAnimationActive={false}
              />
              <Area
                type="step"
                dataKey="defensiveW"
                stackId="w"
                stroke="#2563A8"
                fill="#2563A8"
                fillOpacity={0.4}
                connectNulls
                isAnimationActive={false}
              />
              <Area
                type="step"
                dataKey="hedgeW"
                stackId="w"
                stroke="#0F766E"
                fill="#0F766E"
                fillOpacity={0.45}
                connectNulls
                isAnimationActive={false}
              />
            </AreaChart>
        </ResponsiveChart>
        <div className="mt-1.5 flex flex-wrap gap-4 px-1">
          {[
            ["#6B7280", "Growth / risk (SPY QQQ IWM EFA EEM VNQ HYG)"],
            ["#2563A8", "Duration / cash (TLT IEF SHV)"],
            ["#0F766E", "Inflation hedges (TIP GLD DBC)"],
          ].map(([color, label]) => (
            <span key={label} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
              <span aria-hidden className="h-1.5 w-2.5" style={{ backgroundColor: color, opacity: 0.7 }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
