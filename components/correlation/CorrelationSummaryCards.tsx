import MetricCard from "@/components/layout/MetricCard";
import { formatPercent } from "@/lib/formatters";
import type {
  CorrelationSummaryRecord,
  CrisisCorrelationDossier,
  HedgeEffectivenessRecord,
} from "@/lib/types";

/** Four headline figures. The stress uplift is a regime average that follows
 * the lookback; the effective-bets, PC1-concentration, and best-hedge cards
 * follow the selected crisis tab (and lookback) via that crisis's dossier. When
 * the selected crisis is not covered at the lookback, each card falls back to an
 * all-crisis figure and says so explicitly, so a 2022 tab never shows a 2020
 * number unlabeled. */
export default function CorrelationSummaryCards({
  summary,
  dossier,
  crisisShort,
  allDossiers,
  allHedges,
}: {
  summary: CorrelationSummaryRecord[];
  dossier: CrisisCorrelationDossier | undefined;
  crisisShort: string;
  allDossiers: CrisisCorrelationDossier[];
  allHedges: HedgeEffectivenessRecord[];
}) {
  const full = summary.find((s) => s.group === "Full universe");
  const uplift = full?.correlationUplift ?? null;
  const normalCorr = full?.normalAverageCorrelation ?? null;
  const defensiveCorr = full?.defensiveAverageCorrelation ?? null;

  const valid = allDossiers.filter((d) => d.status === "valid");
  const selectedValid = dossier?.status === "valid";

  // Effective bets: selected crisis when covered, else fewest across crises.
  const betsFallback = valid
    .filter((d) => d.effectiveBets != null)
    .reduce<CrisisCorrelationDossier | null>(
      (a, b) => (a == null || b.effectiveBets! < a.effectiveBets! ? b : a),
      null,
    );
  const bets = selectedValid ? dossier!.effectiveBets : betsFallback?.effectiveBets;
  const betsStatus = selectedValid ? crisisShort : "across tested crises";

  // PC1 concentration: selected crisis when covered, else highest across crises.
  const pc1Fallback = valid
    .filter((d) => d.pc1Share != null)
    .reduce<CrisisCorrelationDossier | null>(
      (a, b) => (a == null || b.pc1Share! > a.pc1Share! ? b : a),
      null,
    );
  const pc1 = selectedValid ? dossier!.pc1Share : pc1Fallback?.pc1Share;
  const pc1Status = selectedValid ? crisisShort : "across tested crises";

  // Best hedge: take the selected crisis's dossier value directly so the card
  // always matches the dossier panel; otherwise rank across all tested crises.
  const hedgeAvg = new Map<string, number[]>();
  for (const h of allHedges) {
    if (h.status !== "ok" || h.drawdownReduction == null) continue;
    const arr = hedgeAvg.get(h.hedge) ?? [];
    arr.push(h.drawdownReduction);
    hedgeAvg.set(h.hedge, arr);
  }
  let fallbackHedge: string | null = null;
  let bestAvg = -Infinity;
  for (const [hedge, arr] of hedgeAvg) {
    const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
    if (avg > bestAvg) {
      bestAvg = avg;
      fallbackHedge = hedge;
    }
  }
  const bestHedge = selectedValid ? dossier!.bestHedge ?? null : fallbackHedge;

  const signed = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`;

  return (
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Stress correlation uplift"
        value={uplift == null ? "—" : signed(uplift)}
        accentColor={uplift != null && uplift > 0 ? "#b91c1c" : undefined}
        context={
          normalCorr != null && defensiveCorr != null
            ? `Average pairwise correlation across the full book rose from ${normalCorr.toFixed(2)} to ${defensiveCorr.toFixed(2)} from normal to defensive regimes.`
            : "Average pairwise correlation across the full book rose from normal to defensive regimes."
        }
      />
      <MetricCard
        label="Effective bets under stress"
        value={bets != null ? `${bets.toFixed(1)} / 13` : "—"}
        status={bets != null ? betsStatus : undefined}
        context="13 assets, but the correlation structure leaves only a few independent bets at the depth of this crisis."
      />
      <MetricCard
        label="PC1 risk concentration"
        value={pc1 != null ? formatPercent(pc1, 0) : "—"}
        status={pc1 != null ? pc1Status : undefined}
        context="Share of cross-asset variance explained by a single dominant factor in this crisis window."
      />
      <MetricCard
        label={selectedValid ? "Best crisis hedge" : "Best hedge across tested crises"}
        value={bestHedge ?? "—"}
        accentColor="#0f766e"
        status={selectedValid ? crisisShort : undefined}
        context={
          selectedValid
            ? `Largest crisis-window drawdown reduction in ${crisisShort}, matching the dossier below.`
            : "Largest average crisis-window drawdown reduction across all tested windows at this lookback."
        }
      />
    </div>
  );
}
