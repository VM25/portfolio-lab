import correlationMatrix from "@/data/correlation-matrix.json";
import correlationSummary from "@/data/correlation-summary.json";
import effectiveBets from "@/data/effective-bets.json";
import pcaConcentration from "@/data/pca-concentration.json";
import crisisCorrelationDossiers from "@/data/crisis-correlation-dossiers.json";
import hedgeEffectiveness from "@/data/hedge-effectiveness.json";
import backtestConfig from "@/data/backtest-config.json";
import type {
  BacktestConfig,
  CorrelationGroup,
  CorrelationMatrixRecord,
  CorrelationSummaryRecord,
  CorrelationView,
  CrisisCorrelationDossier,
  CrisisId,
  EffectiveBetsRecord,
  HedgeEffectivenessRecord,
  LookbackWindow,
  PcaConcentrationRecord,
} from "@/lib/types";

export const allCorrelationMatrix =
  correlationMatrix as unknown as CorrelationMatrixRecord[];
export const allCorrelationSummary =
  correlationSummary as unknown as CorrelationSummaryRecord[];
export const allEffectiveBets = effectiveBets as unknown as EffectiveBetsRecord[];
export const allPcaConcentration =
  pcaConcentration as unknown as PcaConcentrationRecord[];
export const allCrisisDossiers =
  crisisCorrelationDossiers as unknown as CrisisCorrelationDossier[];
export const allHedgeEffectiveness =
  hedgeEffectiveness as unknown as HedgeEffectivenessRecord[];

/** Axis order for the heatmap and the isometric cube. Clustered by sleeve so
 * the block structure (equity/credit/real estate, then duration/cash, then
 * inflation/real assets) is visible rather than alphabetical noise. */
export const CORRELATION_ASSET_ORDER = [
  "SPY", "QQQ", "IWM", "EFA", "EEM", "HYG", "VNQ",
  "TLT", "IEF", "SHV",
  "TIP", "GLD", "DBC",
];

/** Sleeve break indices (after VNQ, after SHV) for hairline group dividers. */
export const CORRELATION_GROUP_BREAKS = [7, 10];

export const CORRELATION_GROUPS: CorrelationGroup[] = [
  "Full universe",
  "Growth / risk",
  "Duration / defensive",
  "Inflation / real assets",
];

/** Crisis identity, shared with the existing stress-window section's framing. */
export const CRISES: { id: CrisisId; name: string; shortName: string }[] = [
  { id: "gfc_2008", name: "Global Financial Crisis", shortName: "2008 GFC" },
  { id: "covid_2020", name: "COVID Market Shock", shortName: "2020 COVID" },
  {
    id: "2022_inflation",
    name: "2022 Inflation / Rate-Hike Drawdown",
    shortName: "2022 Inflation",
  },
];

export function crisisShortName(id: CrisisId): string {
  return CRISES.find((c) => c.id === id)?.shortName ?? id;
}

const config = backtestConfig as unknown as BacktestConfig;

/** Crisis window date ranges (for shading time-series charts), joined from the
 * backtest config by crisis name. */
export function getCrisisWindows(): {
  id: CrisisId;
  name: string;
  shortName: string;
  start: string;
  end: string;
}[] {
  return CRISES.map((c) => {
    const w = config.crisisWindows[c.name];
    return { ...c, start: w?.start ?? "", end: w?.end ?? "" };
  }).filter((c) => c.start && c.end);
}

// ---------------------------------------------------------------------------
// Getters
// ---------------------------------------------------------------------------

/** Flattened cells for one matrix, or null if that view was not exported (e.g.
 * a crisis window the lookback cannot cover). */
export function getCorrelationCells(
  lookback: LookbackWindow,
  view: CorrelationView,
  crisisId?: CrisisId,
): CorrelationMatrixRecord[] {
  return allCorrelationMatrix.filter(
    (r) =>
      r.lookback === lookback &&
      r.view === view &&
      (view === "crisis" ? r.crisisId === crisisId : true),
  );
}

export type CorrelationGrid = {
  order: string[];
  /** matrix[i][j] = corr(order[i], order[j]); null where unavailable. */
  matrix: (number | null)[][];
};

/** Build a square grid (in CORRELATION_ASSET_ORDER) from flattened cells.
 * Returns null when the requested view has no records. */
export function getCorrelationGrid(
  lookback: LookbackWindow,
  view: CorrelationView,
  crisisId?: CrisisId,
): CorrelationGrid | null {
  const cells = getCorrelationCells(lookback, view, crisisId);
  if (!cells.length) return null;
  const order = CORRELATION_ASSET_ORDER;
  const idx = new Map(order.map((t, i) => [t, i]));
  const matrix: (number | null)[][] = order.map(() =>
    order.map(() => null as number | null),
  );
  for (const c of cells) {
    const i = idx.get(c.assetX);
    const j = idx.get(c.assetY);
    if (i == null || j == null) continue;
    matrix[i][j] = c.correlation;
  }
  return { order, matrix };
}

export function getCorrelationSummary(
  lookback: LookbackWindow,
): CorrelationSummaryRecord[] {
  return allCorrelationSummary.filter((r) => r.lookback === lookback);
}

export function getSummaryFor(
  lookback: LookbackWindow,
  group: CorrelationGroup,
): CorrelationSummaryRecord | undefined {
  return allCorrelationSummary.find(
    (r) => r.lookback === lookback && r.group === group,
  );
}

export type Series = { dates: string[]; values: number[] };

export function getEffectiveBetsSeries(
  lookback: LookbackWindow,
  group: CorrelationGroup = "Full universe",
): Series {
  const rows = allEffectiveBets
    .filter((r) => r.lookback === lookback && r.group === group)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return { dates: rows.map((r) => r.date), values: rows.map((r) => r.effectiveBets) };
}

export function getPcaSeries(
  lookback: LookbackWindow,
  group: CorrelationGroup = "Full universe",
): PcaConcentrationRecord[] {
  return allPcaConcentration
    .filter((r) => r.lookback === lookback && r.group === group)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function getCrisisCorrelationDossiers(
  lookback: LookbackWindow,
): CrisisCorrelationDossier[] {
  return allCrisisDossiers.filter((r) => r.lookback === lookback);
}

export function getCrisisDossier(
  lookback: LookbackWindow,
  crisisId: CrisisId,
): CrisisCorrelationDossier | undefined {
  return allCrisisDossiers.find(
    (r) => r.lookback === lookback && r.crisisId === crisisId,
  );
}

export function getHedgeEffectiveness(
  lookback: LookbackWindow,
  crisisId?: CrisisId,
): HedgeEffectivenessRecord[] {
  return allHedgeEffectiveness.filter(
    (r) => r.lookback === lookback && (crisisId ? r.crisisId === crisisId : true),
  );
}
