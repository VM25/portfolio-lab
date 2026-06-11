import Section from "@/components/layout/Section";
import SectionHeader from "@/components/layout/SectionHeader";
import ResearchNote from "@/components/layout/ResearchNote";
import { getTurnoverRows, getWeightGrid } from "@/lib/data/diagnostics";
import { getMetricsByLookback } from "@/lib/data/metrics";
import { STRATEGY_ORDER } from "@/lib/chart-utils";
import type { LookbackWindow, StrategyName } from "@/lib/types";
import StabilityExplorer, { type StabilityData } from "./StabilityExplorer";

const LOOKBACKS: LookbackWindow[] = ["6M", "1Y", "3Y"];

export default function StabilityDiagnosticsSection() {
  const data = Object.fromEntries(
    LOOKBACKS.map((lb) => [
      lb,
      {
        grids: Object.fromEntries(
          STRATEGY_ORDER.map((s) => [s, getWeightGrid(s, lb)]),
        ) as Record<StrategyName, never>,
        turnoverRows: getTurnoverRows(lb),
        metrics: getMetricsByLookback(lb),
      },
    ]),
  ) as unknown as StabilityData;

  return (
    <Section id="implementation">
      <SectionHeader
        moduleId="implementation"
        title="Turnover, concentration, and feasibility"
        thesis="Backtest-attractive is not the same as implementable. Weights through time, turnover, and concentration reveal whether a strategy could actually be run."
      />
      <StabilityExplorer data={data} />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ResearchNote
          finding="Max Sharpe is more sensitive to estimated returns than any other strategy."
          evidence="Its heatmap shows vertical striping, allocations jump between assets month to month, and its turnover runs materially higher than the baselines, especially at the 6M lookback."
          interpretation="Return-risk optimization needs constraints and transaction-cost adjustment to be taken seriously; without them the backtest flatters a portfolio nobody could run."
          limitation="Historical estimated returns are noisy and should not be treated as forecasts."
        />
        <ResearchNote
          finding="The 35% weight cap binds, and that is working as intended."
          evidence="GMV repeatedly sits at the cap in SHV and IEF, suggesting the cap is actively preventing further concentration in the lowest-volatility assets."
          interpretation="Constraints trade a worse in-sample objective for diversification and implementability, visible here as flatter, more stable weight bands."
          limitation="The cap level is a design choice; different caps produce different concentration profiles."
        />
      </div>
    </Section>
  );
}
