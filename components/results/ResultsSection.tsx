import Section from "@/components/layout/Section";
import SectionHeader from "@/components/layout/SectionHeader";
import ResearchNote from "@/components/layout/ResearchNote";
import { getMetricsByLookback } from "@/lib/data/metrics";
import { getSeriesNames, getWealthRows } from "@/lib/data/returns";
import type { LookbackWindow } from "@/lib/types";
import ResultsExplorer, { type ResultsData } from "./ResultsExplorer";

const LOOKBACKS: LookbackWindow[] = ["6M", "1Y", "3Y"];

export default function ResultsSection() {
  const data = Object.fromEntries(
    LOOKBACKS.map((lb) => [
      lb,
      {
        net: getWealthRows(lb, "net"),
        gross: getWealthRows(lb, "gross"),
        metrics: getMetricsByLookback(lb),
        series: getSeriesNames(lb),
      },
    ]),
  ) as ResultsData;

  return (
    <Section id="evidence">
      <SectionHeader
        moduleId="evidence"
        title="Full-sample performance and risk"
        thesis="Cumulative wealth and risk metrics over the full available sample, net of transaction costs by default. Historical results under these assumptions, not a promise about the future."
      />
      <ResultsExplorer data={data} />
      <div className="mt-8 max-w-[640px]">
        <ResearchNote
          finding="No rule dominates on every dimension, and the most aggressive one is the most expensive to run."
          evidence="SPY leads on raw return with the deepest drawdown of the sample; GMV cuts volatility to roughly a third of SPY's at the cost of most of the upside. Max Sharpe's turnover runs materially above the baselines, producing the largest cumulative cost drag at every lookback."
          interpretation="Allocation choice trades return against drawdown, tail risk, and implementability; estimated-return noise converts directly into trading costs."
          limitation="Rankings shift with the lookback window and sample period, and the 5 bps linear cost model is a simplification."
        />
      </div>
    </Section>
  );
}
