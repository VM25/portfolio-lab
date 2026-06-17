"use client";

import { useState } from "react";
import ExhibitPanel from "@/components/layout/ExhibitPanel";
import Tabs from "@/components/layout/Tabs";
import { CRISES } from "@/lib/data/correlation";
import type { CorrelationGrid, Series } from "@/lib/data/correlation";
import type {
  CorrelationSummaryRecord,
  CrisisCorrelationDossier as Dossier,
  CrisisId,
  HedgeEffectivenessRecord,
  LookbackWindow,
  PcaConcentrationRecord,
} from "@/lib/types";
import CorrelationStressCube from "./CorrelationStressCube";
import CorrelationSummaryCards from "./CorrelationSummaryCards";
import CorrelationMatrixHeatmap from "./CorrelationMatrixHeatmap";
import EffectiveBetsChart from "./EffectiveBetsChart";
import PcaConcentrationChart from "./PcaConcentrationChart";
import CrisisCorrelationDossier from "./CrisisCorrelationDossier";
import HedgeEffectivenessTable from "./HedgeEffectivenessTable";

const LOOKBACKS: LookbackWindow[] = ["6M", "1Y", "3Y"];

export type LookbackBundle = {
  normal: CorrelationGrid | null;
  defensive: CorrelationGrid | null;
  crisisGrids: Record<CrisisId, CorrelationGrid | null>;
  summary: CorrelationSummaryRecord[];
  pca: PcaConcentrationRecord[];
  dossiers: Dossier[];
  hedges: HedgeEffectivenessRecord[];
};

export type CorrelationLabData = {
  byLookback: Record<LookbackWindow, LookbackBundle>;
  effectiveBets: Record<LookbackWindow, Series>;
  crisisWindows: {
    id: CrisisId;
    name: string;
    shortName: string;
    start: string;
    end: string;
  }[];
};

export default function CorrelationLab({ data }: { data: CorrelationLabData }) {
  const [lookback, setLookback] = useState<LookbackWindow>("1Y");
  const [crisisId, setCrisisId] = useState<CrisisId>("2022_inflation");

  const bundle = data.byLookback[lookback];
  const crisis = CRISES.find((c) => c.id === crisisId)!;
  const crisisGrid = bundle.crisisGrids[crisisId];
  const dossier = bundle.dossiers.find((d) => d.crisisId === crisisId);
  const crisisHedges = bundle.hedges.filter((h) => h.crisisId === crisisId);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            Lookback
          </span>
          <Tabs
            options={LOOKBACKS}
            value={lookback}
            onChange={setLookback}
            ariaLabel="Estimation lookback window"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            Crisis
          </span>
          <Tabs
            options={CRISES.map((c) => c.id)}
            value={crisisId}
            onChange={(v) => setCrisisId(v as CrisisId)}
            labels={Object.fromEntries(CRISES.map((c) => [c.id, c.shortName]))}
            ariaLabel="Crisis window"
            size="md"
          />
        </div>
      </div>

      <CorrelationStressCube
        normal={bundle.normal}
        defensive={bundle.defensive}
        crisisGrid={crisisGrid}
        crisisLabel={crisis.shortName}
      />

      <CorrelationSummaryCards
        summary={bundle.summary}
        dossier={dossier}
        crisisShort={crisis.shortName}
        allDossiers={bundle.dossiers}
        allHedges={bundle.hedges}
      />

      <ExhibitPanel
        title="Regime correlation matrices"
        subtitle={`Average pairwise correlation, normal vs defensive regimes · ${lookback} lookback`}
      >
        <CorrelationMatrixHeatmap normal={bundle.normal} defensive={bundle.defensive} />
      </ExhibitPanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <ExhibitPanel
          title="Effective independent bets"
          subtitle="Full universe · 1 / Σ pᵢ² from correlation eigenvalues · by lookback"
          note="The portfolio holds 13 assets, but the correlation structure can collapse the number of independent bets to only a few during stress."
        >
          <EffectiveBetsChart series={data.effectiveBets} crisisWindows={data.crisisWindows} />
        </ExhibitPanel>
        <ExhibitPanel
          title="Common-factor concentration"
          subtitle={`Stacked PC1 / PC2 / PC3 variance share (top of stack = top-3 cumulative) · full universe · ${lookback} lookback`}
          note="When the PC1 band widens, cross-asset returns are being driven by a more concentrated common factor."
        >
          <PcaConcentrationChart records={bundle.pca} crisisWindows={data.crisisWindows} />
        </ExhibitPanel>
      </div>

      <CrisisCorrelationDossier
        dossier={dossier}
        crisisId={crisisId}
        crisisName={crisis.name}
        lookback={lookback}
      />

      <ExhibitPanel
        title="Hedge effectiveness"
        subtitle={`90/10 crisis-window overlays · ${crisis.shortName} · ${lookback} lookback · sorted by drawdown reduction`}
      >
        <HedgeEffectivenessTable rows={crisisHedges} />
      </ExhibitPanel>
    </div>
  );
}
