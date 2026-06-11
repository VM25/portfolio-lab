import Section from "@/components/layout/Section";
import SectionHeader from "@/components/layout/SectionHeader";
import ResearchNote from "@/components/layout/ResearchNote";
import { getDrawdownRows } from "@/lib/data/drawdowns";
import { getMetricsByLookback } from "@/lib/data/metrics";
import { getSeriesNames } from "@/lib/data/returns";
import type { LookbackWindow } from "@/lib/types";
import RiskExplorer, { type RiskData } from "./RiskExplorer";

const LOOKBACKS: LookbackWindow[] = ["6M", "1Y", "3Y"];

export default function RiskDashboardSection() {
  const data = Object.fromEntries(
    LOOKBACKS.map((lb) => [
      lb,
      {
        rows: getDrawdownRows(lb),
        metrics: getMetricsByLookback(lb),
        series: getSeriesNames(lb),
      },
    ]),
  ) as RiskData;

  return (
    <Section id="risk">
      <SectionHeader
        moduleId="risk"
        title="Drawdown paths and tail loss"
        thesis="Volatility measures dispersion, but drawdown shows the path of losses from peak to trough. VaR and CVaR summarize downside tail risk."
      />
      <RiskExplorer
        data={data}
        aside={
          <ResearchNote
            finding="Drawdowns show what volatility alone hides."
            evidence="Peak-to-trough paths reveal whether returns came with long, deep loss periods. SPY's 2008-09 drawdown exceeded -50% while GMV stayed near -11% over the same sample."
            interpretation="A rule with attractive returns but severe drawdowns may be unusable under realistic risk constraints; the downside path matters as much as the endpoint."
            limitation="VaR is a historical threshold estimate, not a worst-case guarantee, and daily tail estimates are sensitive to the sample."
          />
        }
      />
    </Section>
  );
}
