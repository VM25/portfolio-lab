"use client";

import { useState, type ReactNode } from "react";
import ExhibitPanel from "@/components/layout/ExhibitPanel";
import Tabs from "@/components/layout/Tabs";
import { SHORT_NAMES, STRATEGY_COLORS, isBenchmark } from "@/lib/chart-utils";
import { formatLoss, formatPercent } from "@/lib/formatters";
import type { LookbackWindow, PerformanceMetric } from "@/lib/types";
import type { DrawdownRow } from "@/lib/data/drawdowns";
import DrawdownChart from "./DrawdownChart";

const LOOKBACKS: LookbackWindow[] = ["6M", "1Y", "3Y"];

export type RiskData = Record<
  LookbackWindow,
  { rows: DrawdownRow[]; metrics: PerformanceMetric[]; series: string[] }
>;

export default function RiskExplorer({
  data,
  aside,
}: {
  data: RiskData;
  aside?: ReactNode;
}) {
  const [lookback, setLookback] = useState<LookbackWindow>("1Y");
  const current = data[lookback];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          options={LOOKBACKS}
          value={lookback}
          onChange={setLookback}
          ariaLabel="Estimation lookback window for the drawdown and tail-risk section"
          size="md"
        />
        <span className="font-mono text-[11px] text-ink-faint">
          Drawdown = wealth ÷ running peak − 1, from daily net returns
        </span>
      </div>

      <ExhibitPanel
        title="Drawdown from running peak"
        subtitle={`Peak-to-trough losses through time · ${lookback} lookback · net of costs`}
        note="Values below zero are losses from the prior wealth peak. Volatility measures dispersion; drawdown shows the actual path of losses an investor would have lived through."
      >
        <DrawdownChart rows={current.rows} series={current.series} />
      </ExhibitPanel>

      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <ExhibitPanel
        title="Downside and tail risk"
        subtitle={`Historical daily measures at 95% confidence · ${lookback} lookback`}
        note="VaR and CVaR are daily historical loss estimates at the 95% confidence level, reported as positive loss magnitudes; drawdowns and worst-day returns are shown as negative values. VaR is a historical threshold estimate, not a worst-case guarantee; CVaR is the average loss beyond VaR, so CVaR ≥ VaR by construction. Max 10-day drawdown is the worst rolling two-week cumulative return."
      >
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-border-strong">
                <th className="px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                  Series
                </th>
                {current.metrics.map((m) => (
                  <th
                    key={m.strategy}
                    className="px-3 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-wider"
                    style={{ color: STRATEGY_COLORS[m.strategy] }}
                  >
                    {SHORT_NAMES[m.strategy]}
                    {isBenchmark(m.strategy) ? " *" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {(
                [
                  ["Max drawdown", (m: PerformanceMetric) => formatPercent(m.maxDrawdown), true],
                  ["Max 10-day drawdown", (m: PerformanceMetric) => formatPercent(m.max10DayDrawdown), true],
                  ["Historical VaR 95 (daily)", (m: PerformanceMetric) => formatLoss(m.historicalVaR95), false],
                  ["Historical CVaR 95 (daily)", (m: PerformanceMetric) => formatLoss(m.historicalCVaR95), false],
                  ["Worst daily return", (m: PerformanceMetric) => formatPercent(m.worstDailyReturn, 2), true],
                  ["Annualized volatility", (m: PerformanceMetric) => formatPercent(m.annualizedVolatility), false],
                ] as [string, (m: PerformanceMetric) => string, boolean][]
              ).map(([label, fn]) => (
                <tr key={label} className="transition-colors hover:bg-panel-elevated/50">
                  <td className="px-3 py-2.5 text-ink-secondary">{label}</td>
                  {current.metrics.map((m) => (
                    <td key={m.strategy} className="tabular px-3 py-2.5 text-right font-mono text-[12px] text-ink">
                      {fn(m)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 font-mono text-[10px] text-ink-faint">* benchmark series</p>
      </ExhibitPanel>
      {aside && <div className="lg:pt-10">{aside}</div>}
      </div>
    </div>
  );
}
