import ExhibitPanel from "@/components/layout/ExhibitPanel";
import ResearchNote from "@/components/layout/ResearchNote";
import Section from "@/components/layout/Section";
import SectionHeader from "@/components/layout/SectionHeader";
import { assetUniverse } from "@/lib/data/asset-universe";
import { getWeightGrid } from "@/lib/data/diagnostics";
import { regimeSignals } from "@/lib/data/regimes";
import SignalStackCharts, { type StackRow } from "./SignalStackCharts";

function buildStackRows(): StackRow[] {
  const byDate = new Map<string, StackRow>();

  for (const p of regimeSignals) {
    byDate.set(p.date, {
      date: p.date,
      corr: p.spyTltCorr90d,
      cpi: p.cpiYoy,
      vix: p.vix,
      normal: p.regimeLabel === "normal" ? 1 : 0,
      watch: p.regimeLabel === "watch" ? 1 : 0,
      defensive: p.regimeLabel === "defensive" ? 1 : 0,
    });
  }

  // Regime-Aware sleeve weights (1Y primary lookback), grouped by asset bucket.
  const grid = getWeightGrid("Regime-Aware Allocation", "1Y");
  const bucketOf = new Map(assetUniverse.map((a) => [a.ticker, a.bucket]));
  const weightAt = new Map<string, { g: number; d: number; h: number }>();
  grid.dates.forEach((date, di) => {
    let g = 0;
    let d = 0;
    let h = 0;
    grid.tickers.forEach((ticker, ti) => {
      const w = grid.matrix[ti][di];
      const bucket = bucketOf.get(ticker);
      if (bucket === "growth") g += w;
      else if (bucket === "defensive") d += w;
      else if (bucket === "inflation_hedge") h += w;
    });
    weightAt.set(date, { g, d, h });
    if (!byDate.has(date)) byDate.set(date, { date });
  });

  // Forward-fill sleeve weights onto every row so the stacked step area is
  // continuous (weights are monthly; signals are weekly).
  const rows = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  const weightDates = grid.dates;
  let wi = -1;
  for (const row of rows) {
    while (wi + 1 < weightDates.length && weightDates[wi + 1] <= row.date) wi++;
    if (wi >= 0) {
      const w = weightAt.get(weightDates[wi])!;
      row.growthW = Number(w.g.toFixed(4));
      row.defensiveW = Number(w.d.toFixed(4));
      row.hedgeW = Number(w.h.toFixed(4));
    }
  }
  return rows;
}

export default function RegimeAnalysisSection() {
  const rows = buildStackRows();

  return (
    <Section id="regimes">
      <SectionHeader
        moduleId="regimes"
        title="Signal classification and allocation response"
        thesis="The regime engine tracks stock-bond correlation, CPI inflation, and VIX stress to classify allocation conditions. The panels below share one time axis: signal changed → regime changed → weights changed."
      />

      <ExhibitPanel
        title="Signal-to-Allocation Stack"
        subtitle="Three stress signals, the resulting regime classification, and the Regime-Aware strategy's allocation response"
        note="CPI YoY is lagged one month in the backtest to avoid look-ahead bias. The regime-aware strategy does not forecast stress, it reacts to observed, lagged indicators and changes defensive exposure when multiple signals are active. The bottom panel shows final capped sleeve weights after inverse-volatility allocation, so realized weights can differ slightly from the raw regime target. When the defensive regime is active, the growth sleeve target moves toward 45%; across the full sample, realized allocation shifts gradually because regimes change through time."
      >
        <SignalStackCharts rows={rows} />
      </ExhibitPanel>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ResearchNote
          finding="The three signals rarely agree, which is the point."
          evidence="Correlation stress appeared in several pre-2020 episodes without sustained inflation stress, while 2021-2023 combined inflation pressure with more frequent correlation and volatility stress."
          interpretation="A single-indicator rule would whipsaw; requiring multiple simultaneous signals makes the defensive shift more selective."
          limitation="Thresholds (+0.20 correlation, 3% CPI, VIX 25) are judgment calls; different values would shift regime boundaries."
        />
        <ResearchNote
          finding="Allocation response is mechanical and traceable."
          evidence="In the bottom panel, the growth/risk sleeve target steps from 65% (normal) to 55% (watch) and 45% (defensive), and the defensive and hedge bands widen where the regime ribbon turns amber and red."
          interpretation="The strategy's behavior is explainable from its inputs, there is no black box between signal and weight."
          limitation="Reactive rules lag fast reversals such as the 2020 crash-and-rebound; final weights are capped and inverse-volatility weighted, so they can differ slightly from raw sleeve targets."
        />
      </div>
    </Section>
  );
}
