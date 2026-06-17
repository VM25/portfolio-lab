import Badge from "@/components/layout/Badge";
import { formatNumber, formatPercent } from "@/lib/formatters";
import type { CrisisCorrelationDossier as Dossier, CrisisId } from "@/lib/types";

/** Descriptive copy mirrors the stress-window section so the two modules read
 * as one interface. Only the numbers come from the engine. */
const COPY: Record<CrisisId, { period: string; mechanism: string; lesson: string }> = {
  gfc_2008: {
    period: "Jan 2008 – Dec 2009",
    mechanism:
      "A credit and banking crisis. Equity, credit, real estate, and commodities sold off together while Treasuries rallied — correlations among risk assets converged toward one.",
    lesson:
      "Duration was the hedge that worked: a flight to quality lifted Treasuries while everything risky fell as one trade.",
  },
  covid_2020: {
    period: "Feb 2020 – Apr 2020",
    mechanism:
      "A liquidity-driven crash. In the dash for cash almost everything fell at once, including briefly some defensive assets, before policy support reversed it.",
    lesson:
      "Independent bets nearly vanished at the trough; cash-like and duration sleeves cushioned the path that reactive monthly rules could not dodge.",
  },
  "2022_inflation": {
    period: "Jan 2022 – Dec 2022",
    mechanism:
      "An inflation and rate shock. Stocks and bonds fell together as the stock-bond correlation turned positive — the exact regime that breaks static 60/40 diversification.",
    lesson:
      "Duration added to losses instead of offsetting them; inflation-sensitive real assets and cash were the sleeves that actually defended.",
  },
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border-soft pt-1.5">
      <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </dt>
      <dd className="tabular mt-0.5 font-mono text-[16px] font-semibold text-ink">{value}</dd>
    </div>
  );
}

export default function CrisisCorrelationDossier({
  dossier,
  crisisId,
  crisisName,
  lookback,
}: {
  dossier: Dossier | undefined;
  crisisId: CrisisId;
  crisisName: string;
  lookback: string;
}) {
  const copy = COPY[crisisId];
  const valid = dossier?.status === "valid";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="border border-border-strong bg-panel p-5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-regime-defensive">
          Crisis correlation dossier
        </span>
        <h3 className="font-subhead mt-2 text-[18px] font-semibold leading-snug text-ink">
          {crisisName}
        </h3>
        <p className="mt-1 font-mono text-[11.5px] text-ink-muted">
          {copy.period} · {lookback} lookback
        </p>
        <dl className="mt-4 space-y-3.5">
          <div>
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-faint">
              Stress mechanism
            </dt>
            <dd className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
              {copy.mechanism}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-faint">
              Main lesson
            </dt>
            <dd className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
              {copy.lesson}
            </dd>
          </div>
        </dl>
      </div>

      <div className="border border-border-soft bg-panel-deep p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
            Measured structure
          </span>
          {!valid && <Badge tone="amber">insufficient data</Badge>}
        </div>

        {valid ? (
          <>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
              <Stat label="Avg correlation" value={formatNumber(dossier!.averageCorrelation, 2)} />
              <Stat label="Growth/risk corr" value={formatNumber(dossier!.growthRiskCorrelation, 2)} />
              <Stat label="Effective bets" value={`${formatNumber(dossier!.effectiveBets, 1)} / 13`} />
              <Stat label="PC1 share" value={formatPercent(dossier!.pc1Share, 0)} />
            </dl>
            <div className="mt-4 flex items-center justify-between border-t border-border-soft pt-3">
              <div>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-faint">
                  Best hedge
                </span>
                <div className="mt-0.5 text-[15px] font-semibold text-strat-ra">
                  {dossier!.bestHedge ?? "—"}
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-faint">
                  Worst hedge
                </span>
                <div className="mt-0.5 text-[15px] font-semibold text-regime-defensive">
                  {dossier!.worstHedge ?? "—"}
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
            The {crisisName} window is not fully covered at the {lookback}{" "}
            lookback — the common ETF history begins in 2007, so longer
            estimation windows start after the crisis began. Switch to a shorter
            lookback to read this dossier; values are never interpolated.
          </p>
        )}
      </div>
    </div>
  );
}
