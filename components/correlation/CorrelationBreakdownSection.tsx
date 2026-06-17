import Section from "@/components/layout/Section";
import SectionHeader from "@/components/layout/SectionHeader";
import {
  CRISES,
  getCorrelationGrid,
  getCorrelationSummary,
  getCrisisCorrelationDossiers,
  getCrisisWindows,
  getEffectiveBetsSeries,
  getHedgeEffectiveness,
  getPcaSeries,
} from "@/lib/data/correlation";
import type { CrisisId, LookbackWindow } from "@/lib/types";
import CorrelationLab, {
  type CorrelationLabData,
  type LookbackBundle,
} from "./CorrelationLab";

const LOOKBACKS: LookbackWindow[] = ["6M", "1Y", "3Y"];

/** Module 09 (Diagnostics). The Python engine pre-computes every correlation,
 * eigenvalue, PCA share, and hedge-overlay number; this server component only
 * reshapes the exported JSON into serializable props. No finance logic runs in
 * the client. */
export default function CorrelationBreakdownSection() {
  const byLookback = Object.fromEntries(
    LOOKBACKS.map((lb): [LookbackWindow, LookbackBundle] => [
      lb,
      {
        normal: getCorrelationGrid(lb, "normal"),
        defensive: getCorrelationGrid(lb, "defensive"),
        crisisGrids: Object.fromEntries(
          CRISES.map((c) => [c.id, getCorrelationGrid(lb, "crisis", c.id)]),
        ) as Record<CrisisId, ReturnType<typeof getCorrelationGrid>>,
        summary: getCorrelationSummary(lb),
        pca: getPcaSeries(lb, "Full universe"),
        dossiers: getCrisisCorrelationDossiers(lb),
        hedges: getHedgeEffectiveness(lb),
      },
    ]),
  ) as CorrelationLabData["byLookback"];

  const effectiveBets = Object.fromEntries(
    LOOKBACKS.map((lb) => [lb, getEffectiveBetsSeries(lb, "Full universe")]),
  ) as CorrelationLabData["effectiveBets"];

  const data: CorrelationLabData = {
    byLookback,
    effectiveBets,
    crisisWindows: getCrisisWindows(),
  };

  return (
    <Section id="correlation">
      <SectionHeader
        moduleId="correlation"
        title="Correlation Breakdown & Crisis Hedge Lab"
        thesis="Diversification is conditional. This module measures when cross-asset correlations rise, how many independent bets remain under stress, whether portfolio risk collapses into one dominant factor, and which hedge sleeves actually reduce crisis drawdowns."
        note="A portfolio can hold many tickers and still behave like one concentrated trade. Correlation estimates are sample-sensitive, crisis windows are historical observations, and hedge behavior is regime-dependent — this lab is a diagnostic, not a forecast or recommendation. VIX remains signal-only and is never used as an investable hedge."
      />
      <CorrelationLab data={data} />
    </Section>
  );
}
