"use client";

import { useState } from "react";
import ExhibitPanel from "@/components/layout/ExhibitPanel";
import DataTable, { type Column } from "@/components/layout/DataTable";
import MetricCard from "@/components/layout/MetricCard";
import Tabs from "@/components/layout/Tabs";
import { SHORT_NAMES, STRATEGY_COLORS, isBenchmark } from "@/lib/chart-utils";
import {
  formatLoss,
  formatPercent,
  formatRatio,
  formatSignedPercent,
} from "@/lib/formatters";
import type { LookbackWindow, PerformanceMetric } from "@/lib/types";
import type { WealthRow } from "@/lib/data/returns";
import CumulativeWealthChart from "./CumulativeWealthChart";

const LOOKBACKS: LookbackWindow[] = ["6M", "1Y", "3Y"];
const BASES = ["net", "gross"] as const;

type Basis = (typeof BASES)[number];

export type ResultsData = Record<
  LookbackWindow,
  { net: WealthRow[]; gross: WealthRow[]; metrics: PerformanceMetric[]; series: string[] }
>;

function StrategyCell({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2 text-ink">
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-sm"
        style={{ backgroundColor: STRATEGY_COLORS[name] }}
      />
      {SHORT_NAMES[name] ?? name}
      {isBenchmark(name) && (
        <span className="font-mono text-[9.5px] uppercase text-ink-faint">bench</span>
      )}
    </span>
  );
}

const columns: Column<PerformanceMetric>[] = [
  { key: "strategy", header: "Strategy", render: (m) => <StrategyCell name={m.strategy} /> },
  { key: "ret", header: "Ann. return", align: "right", render: (m) => formatPercent(m.annualizedReturn) },
  { key: "vol", header: "Ann. vol", align: "right", render: (m) => formatPercent(m.annualizedVolatility) },
  { key: "sharpe", header: "Sharpe", align: "right", render: (m) => formatRatio(m.sharpeRatio) },
  { key: "sortino", header: "Sortino", align: "right", render: (m) => formatRatio(m.sortinoRatio) },
  {
    key: "mdd",
    header: "Max DD",
    align: "right",
    render: (m) => <span className="text-risk-loss">{formatPercent(m.maxDrawdown)}</span>,
  },
  { key: "var", header: "VaR 95", align: "right", render: (m) => formatLoss(m.historicalVaR95) },
  { key: "cvar", header: "CVaR 95", align: "right", render: (m) => formatLoss(m.historicalCVaR95) },
  { key: "turn", header: "Turnover /mo", align: "right", render: (m) => formatPercent(m.averageTurnover) },
  { key: "drag", header: "Cumulative cost drag", align: "right", render: (m) => formatSignedPercent(m.transactionCostDrag, 2) },
];

export default function ResultsExplorer({ data }: { data: ResultsData }) {
  const [lookback, setLookback] = useState<LookbackWindow>("1Y");
  const [basis, setBasis] = useState<Basis>("net");
  const current = data[lookback];
  const rows = current[basis];

  const strategiesOnly = current.metrics.filter((m) => !isBenchmark(m.strategy));
  const best = {
    return: strategiesOnly.reduce((a, b) => (b.cumulativeReturn > a.cumulativeReturn ? b : a)),
    drawdown: strategiesOnly.reduce((a, b) => (b.maxDrawdown > a.maxDrawdown ? b : a)),
    sharpe: strategiesOnly.reduce((a, b) => (b.sharpeRatio > a.sharpeRatio ? b : a)),
    drag: strategiesOnly.reduce((a, b) => (b.transactionCostDrag > a.transactionCostDrag ? b : a)),
  };
  const start = current.metrics[0]?.startDate?.slice(0, 4);
  const end = current.metrics[0]?.endDate?.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          options={LOOKBACKS}
          value={lookback}
          onChange={setLookback}
          ariaLabel="Estimation lookback window"
          size="md"
        />
        <Tabs
          options={BASES}
          value={basis}
          onChange={setBasis}
          labels={{ net: "Net of costs", gross: "Gross" }}
          ariaLabel="Return basis"
          size="md"
        />
        <span className="font-mono text-[11px] text-ink-faint">
          {basis === "net"
            ? "Returns shown net of 5 bps transaction costs (default)"
            : "Gross returns before transaction costs"}
          {" · "}sample {start}-{end}
        </span>
      </div>

      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_232px]">
        <ExhibitPanel
          title="Cumulative wealth, growth of $100"
          subtitle={`${lookback} estimation lookback · monthly rebalancing · ${basis === "net" ? "net of transaction costs" : "gross of transaction costs"}`}
          note="Benchmarks shown dashed. Series start when a full lookback window of common ETF history is available, so longer lookbacks begin later. Historical simulation, not a forecast."
        >
          <CumulativeWealthChart rows={rows} series={current.series} />
        </ExhibitPanel>

        <div className="space-y-5 lg:pt-1">
          <p className="text-[11px] font-medium leading-snug text-ink-faint">
            Rankings within this sample, among allocation strategies
            (benchmarks excluded)
          </p>
          <MetricCard
            label="Highest net cumulative return"
            value={SHORT_NAMES[best.return.strategy]}
            context={`${formatSignedPercent(best.return.cumulativeReturn, 0)} cumulative`}
            accentColor={STRATEGY_COLORS[best.return.strategy]}
          />
          <MetricCard
            label="Shallowest max drawdown"
            value={SHORT_NAMES[best.drawdown.strategy]}
            context={`${formatPercent(best.drawdown.maxDrawdown)} peak-to-trough`}
            accentColor={STRATEGY_COLORS[best.drawdown.strategy]}
          />
          <MetricCard
            label="Best Sharpe ratio"
            value={SHORT_NAMES[best.sharpe.strategy]}
            context={`${formatRatio(best.sharpe.sharpeRatio)} vs FF risk-free`}
            accentColor={STRATEGY_COLORS[best.sharpe.strategy]}
          />
          <MetricCard
            label="Lowest cumulative cost drag"
            value={SHORT_NAMES[best.drag.strategy]}
            context={`${formatSignedPercent(best.drag.transactionCostDrag, 2)} cumulative cost drag`}
            accentColor={STRATEGY_COLORS[best.drag.strategy]}
          />
        </div>
      </div>

      <ExhibitPanel
        title="Full-sample risk and performance"
        subtitle={`All metrics computed from daily net returns · ${lookback} lookback`}
        note="VaR and CVaR are daily historical loss estimates at the 95% confidence level, reported as positive loss magnitudes; drawdowns are shown as negative values. Annualized returns are geometric, from daily net returns; volatility and Sharpe scale daily figures by √252; Sortino uses downside deviation relative to a zero daily return threshold. Turnover is the monthly average of total absolute weight changes vs drifted pre-trade weights (initial cash buy-in excluded). Benchmarks are shown net of the same turnover cost model where rebalancing applies, the 100% SPY benchmark has no ongoing rebalancing turnover, so its cumulative cost drag is 0.00%."
      >
        <DataTable
          columns={columns}
          rows={current.metrics}
          rowKey={(m) => m.strategy}
        />
      </ExhibitPanel>
    </div>
  );
}
