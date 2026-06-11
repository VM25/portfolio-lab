"use client";

import { useState } from "react";
import ExhibitPanel from "@/components/layout/ExhibitPanel";
import DataTable, { type Column } from "@/components/layout/DataTable";
import Tabs from "@/components/layout/Tabs";
import { SHORT_NAMES, STRATEGY_COLORS, STRATEGY_ORDER } from "@/lib/chart-utils";
import { formatNumber, formatPercent, formatSignedPercent } from "@/lib/formatters";
import type { LookbackWindow, PerformanceMetric, StrategyName } from "@/lib/types";
import type { TurnoverRow, WeightGrid } from "@/lib/data/diagnostics";
import AllocationHeatmap from "./AllocationHeatmap";
import TurnoverChart from "./TurnoverChart";

const LOOKBACKS: LookbackWindow[] = ["6M", "1Y", "3Y"];

export type StabilityData = Record<
  LookbackWindow,
  {
    grids: Record<StrategyName, WeightGrid>;
    turnoverRows: TurnoverRow[];
    metrics: PerformanceMetric[];
  }
>;

const columns: Column<PerformanceMetric>[] = [
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
      </span>
    ),
  },
  {
    key: "effN",
    header: "Avg effective positions",
    align: "right",
    render: (m) => formatNumber(m.averageEffectivePositions, 1),
  },
  {
    key: "maxW",
    header: "Max single weight",
    align: "right",
    render: (m) => formatPercent(m.maxSingleAssetWeight),
  },
  {
    key: "avgTurn",
    header: "Avg turnover /mo",
    align: "right",
    render: (m) => formatPercent(m.averageTurnover),
  },
  {
    key: "maxTurn",
    header: "Max turnover",
    align: "right",
    render: (m) => formatPercent(m.maxTurnover),
  },
  {
    key: "annTurn",
    header: "Annualized turnover",
    align: "right",
    render: (m) => formatPercent(m.annualizedTurnover, 0),
  },
  {
    key: "drag",
    header: "Cumulative cost drag",
    align: "right",
    render: (m) => formatSignedPercent(m.transactionCostDrag, 2),
  },
];

export default function StabilityExplorer({ data }: { data: StabilityData }) {
  const [lookback, setLookback] = useState<LookbackWindow>("1Y");
  const [strategy, setStrategy] = useState<StrategyName>("Max Sharpe / Risk-Adjusted Return");
  const current = data[lookback];
  const strategyMetrics = current.metrics.filter((m) =>
    (STRATEGY_ORDER as string[]).includes(m.strategy),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          options={STRATEGY_ORDER}
          value={strategy}
          onChange={setStrategy}
          labels={SHORT_NAMES as Record<StrategyName, string>}
          ariaLabel="Strategy for allocation heatmap"
          size="md"
        />
        <Tabs
          options={LOOKBACKS}
          value={lookback}
          onChange={setLookback}
          ariaLabel="Estimation lookback window for stability diagnostics"
        />
      </div>

      <ExhibitPanel
        title={`Allocation heatmap, ${SHORT_NAMES[strategy]}`}
        subtitle={`Target weights at each monthly rebalance · ${lookback} lookback · rows are assets, columns are time`}
        note="Brighter teal = higher weight (scale capped at the 35% constraint). Stable strategies show long horizontal bands; unstable ones show vertical striping as the optimizer jumps between assets."
      >
        <AllocationHeatmap grid={current.grids[strategy]} />
      </ExhibitPanel>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <ExhibitPanel
          title="Monthly turnover"
          subtitle={`Total absolute weight change at each rebalance · ${lookback} lookback`}
          note="Turnover is measured against drifted pre-trade weights; the initial cash buy-in is excluded. Each unit of turnover costs 5 bps."
        >
          <TurnoverChart rows={current.turnoverRows} series={STRATEGY_ORDER} />
        </ExhibitPanel>

        <ExhibitPanel
          title="Concentration & implementability"
          subtitle={`Averages across all rebalances · ${lookback} lookback`}
          note="Effective positions = 1 / HHI of weights. Optimized portfolios can look attractive in return metrics yet become unrealistic if they demand excessive turnover or concentration."
        >
          <DataTable
            columns={columns}
            rows={strategyMetrics}
            rowKey={(m) => m.strategy}
            dense
            className="min-w-0"
          />
        </ExhibitPanel>
      </div>
    </div>
  );
}
