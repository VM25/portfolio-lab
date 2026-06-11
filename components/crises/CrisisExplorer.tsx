"use client";

import { useState } from "react";
import ExhibitPanel from "@/components/layout/ExhibitPanel";
import Badge from "@/components/layout/Badge";
import DataTable, { type Column } from "@/components/layout/DataTable";
import Tabs from "@/components/layout/Tabs";
import { SHORT_NAMES, STRATEGY_COLORS, isBenchmark } from "@/lib/chart-utils";
import { formatFullDate, formatLoss, formatPercent, formatSignedPercent } from "@/lib/formatters";
import type { CrisisMetric, LookbackWindow } from "@/lib/types";
import type { CrisisWealthRow } from "@/lib/data/crisis";
import CrisisChart from "./CrisisChart";

const LOOKBACKS: LookbackWindow[] = ["6M", "1Y", "3Y"];

export type CrisisDossierContent = {
  name: string;
  shortName: string;
  period: string;
  stressMechanism: string;
  whyItMatters: string;
  mainLesson: string;
};

export type CrisisData = Record<
  string,
  Record<
    LookbackWindow,
    { metrics: CrisisMetric[]; rows: CrisisWealthRow[]; series: string[] }
  >
>;

const columns: Column<CrisisMetric>[] = [
  {
    key: "strategy",
    header: "Strategy",
    render: (m) => (
      <span className="flex items-center gap-2 text-ink">
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-sm"
          style={{ backgroundColor: STRATEGY_COLORS[m.strategy] }}
        />
        {SHORT_NAMES[m.strategy] ?? m.strategy}
        {isBenchmark(m.strategy) && (
          <span className="font-mono text-[9.5px] uppercase text-ink-faint">bench</span>
        )}
      </span>
    ),
  },
  {
    key: "ret",
    header: "Crisis return",
    align: "right",
    render: (m) =>
      m.status === "valid" ? (
        <span className={m.cumulativeReturn! < 0 ? "text-risk-loss" : "text-risk-positive"}>
          {formatSignedPercent(m.cumulativeReturn)}
        </span>
      ) : (
        <Badge tone="muted">insufficient data</Badge>
      ),
  },
  {
    key: "vol",
    header: "Volatility",
    align: "right",
    render: (m) => (m.status === "valid" ? formatPercent(m.annualizedVolatility) : "-"),
  },
  {
    key: "mdd",
    header: "Max DD",
    align: "right",
    render: (m) =>
      m.status === "valid" ? (
        <span className="text-risk-loss">{formatPercent(m.maxDrawdown)}</span>
      ) : (
        "-"
      ),
  },
  {
    key: "cvar",
    header: "CVaR 95",
    align: "right",
    render: (m) => (m.status === "valid" ? formatLoss(m.historicalCVaR95) : "-"),
  },
  {
    key: "worst",
    header: "Worst day",
    align: "right",
    render: (m) => (m.status === "valid" ? formatPercent(m.worstDailyReturn, 2) : "-"),
  },
  {
    key: "rel",
    header: "vs SPY",
    align: "right",
    render: (m) =>
      m.status === "valid" && m.benchmarkRelativeReturn != null
        ? formatSignedPercent(m.benchmarkRelativeReturn)
        : "-",
  },
];

export default function CrisisExplorer({
  dossiers,
  data,
}: {
  dossiers: CrisisDossierContent[];
  data: CrisisData;
}) {
  // Default to 6M: the only lookback with full 2008 GFC coverage, so the
  // first dossier a visitor sees opens with data rather than an empty state.
  const [crisis, setCrisis] = useState(dossiers[0].name);
  const [lookback, setLookback] = useState<LookbackWindow>("6M");
  const dossier = dossiers.find((d) => d.name === crisis)!;
  const current = data[crisis][lookback];
  const validStrategies = current.metrics.filter(
    (m) => m.status === "valid" && !isBenchmark(m.strategy),
  );
  const hasChart = current.rows.length > 0;

  const bestDD = validStrategies.length
    ? validStrategies.reduce((a, b) => (b.maxDrawdown! > a.maxDrawdown! ? b : a))
    : null;
  const worstDD = validStrategies.length
    ? validStrategies.reduce((a, b) => (b.maxDrawdown! < a.maxDrawdown! ? b : a))
    : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          options={dossiers.map((d) => d.name)}
          value={crisis}
          onChange={setCrisis}
          labels={Object.fromEntries(dossiers.map((d) => [d.name, d.shortName]))}
          ariaLabel="Crisis window"
          size="md"
        />
        <Tabs
          options={LOOKBACKS}
          value={lookback}
          onChange={setLookback}
          ariaLabel="Estimation lookback window for crisis analysis"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_1fr_280px]">
        {/* Left: context */}
        <div className="border border-border-strong bg-panel p-5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-regime-defensive">
            Stress dossier
          </span>
          <h3 className="font-subhead mt-2 text-[18px] font-semibold leading-snug text-ink">
            {dossier.name}
          </h3>
          <p className="mt-1 font-mono text-[11.5px] text-ink-muted">{dossier.period}</p>
          <dl className="mt-4 space-y-3.5">
            <div>
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-faint">
                Stress mechanism
              </dt>
              <dd className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
                {dossier.stressMechanism}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-faint">
                Why it matters
              </dt>
              <dd className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
                {dossier.whyItMatters}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-faint">
                Main lesson
              </dt>
              <dd className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
                {dossier.mainLesson}
              </dd>
            </div>
          </dl>
        </div>

        {/* Center: chart */}
        <ExhibitPanel
          title="Cumulative wealth through the crisis"
          subtitle={`Rebased to $100 at crisis start · ${lookback} lookback · net of costs`}
          note={
            hasChart
              ? "Only series with full coverage of the crisis window are shown. Strategy rankings during one crisis are historical observations, not predictions."
              : undefined
          }
        >
          {hasChart ? (
            <CrisisChart rows={current.rows} series={current.series} />
          ) : (
            <div className="flex h-[320px] flex-col items-center justify-center gap-2 text-center">
              <Badge tone="amber">insufficient data</Badge>
              <p className="max-w-[380px] text-[12.5px] leading-relaxed text-ink-muted">
                No strategy has a full return history for this crisis window at
                the {lookback} lookback, the common ETF history begins in 2007,
                so longer estimation windows start after the crisis began.
                Shorter lookbacks are reported instead of fabricated values.
              </p>
            </div>
          )}
        </ExhibitPanel>

        {/* Right: key outcomes */}
        <div className="flex flex-col gap-3">
          {bestDD && (
            <div className="border border-border-soft bg-panel px-4 py-3.5">
              <span className="text-[10.5px] font-medium uppercase tracking-wider text-ink-muted">
                Shallowest strategy drawdown
              </span>
              <div
                className="mt-1 text-[18px] font-semibold"
                style={{ color: STRATEGY_COLORS[bestDD.strategy] }}
              >
                {SHORT_NAMES[bestDD.strategy]}
              </div>
              <p className="tabular mt-0.5 font-mono text-[12px] text-ink-secondary">
                max drawdown {formatPercent(bestDD.maxDrawdown)}
              </p>
            </div>
          )}
          {worstDD && worstDD !== bestDD && (
            <div className="border border-border-soft bg-panel px-4 py-3.5">
              <span className="text-[10.5px] font-medium uppercase tracking-wider text-ink-muted">
                Deepest strategy drawdown
              </span>
              <div
                className="mt-1 text-[18px] font-semibold"
                style={{ color: STRATEGY_COLORS[worstDD.strategy] }}
              >
                {SHORT_NAMES[worstDD.strategy]}
              </div>
              <p className="tabular mt-0.5 font-mono text-[12px] text-ink-secondary">
                max drawdown {formatPercent(worstDD.maxDrawdown)}
              </p>
            </div>
          )}
          {(() => {
            const spy = current.metrics.find((m) => m.strategy === "SPY" && m.status === "valid");
            const b6040 = current.metrics.find((m) => m.strategy === "60/40" && m.status === "valid");
            return (
              <div className="border border-border-soft bg-panel-deep px-4 py-3.5">
                <span className="text-[10.5px] font-medium uppercase tracking-wider text-ink-faint">
                  Benchmark reference
                </span>
                <div className="mt-2 space-y-1.5 font-mono text-[12px]">
                  <p className="flex justify-between text-ink-secondary">
                    <span>SPY crisis return</span>
                    <span className="tabular">
                      {spy ? formatSignedPercent(spy.cumulativeReturn) : "-"}
                    </span>
                  </p>
                  <p className="flex justify-between text-ink-secondary">
                    <span>60/40 crisis return</span>
                    <span className="tabular">
                      {b6040 ? formatSignedPercent(b6040.cumulativeReturn) : "-"}
                    </span>
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <ExhibitPanel
        title="Crisis risk metrics"
        subtitle={`${dossier.shortName} · ${lookback} lookback · daily net returns within the window`}
      >
        <DataTable columns={columns} rows={current.metrics} rowKey={(m) => m.strategy} dense />
      </ExhibitPanel>
    </div>
  );
}
