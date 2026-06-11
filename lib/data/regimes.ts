import signals from "@/data/regime-signals.json";
import { getMetric } from "@/lib/data/metrics";
import type { RegimeSignalPoint } from "@/lib/types";

export const regimeSignals = signals as unknown as RegimeSignalPoint[];

export type RegimeShare = { regime: string; share: number };

/** Regime mix over the valid backtest sample (primary 1Y lookback), so the
 * displayed shares refer to the same trading days the strategies actually
 * ran on — not the longer signal-only history. */
export function getRegimeShares(): RegimeShare[] {
  const sample = getMetric("Equal Weight", "1Y");
  const start = sample?.startDate ?? "";
  const end = sample?.endDate ?? "9999-12-31";
  const inSample = regimeSignals.filter((p) => p.date >= start && p.date <= end);
  const counts = new Map<string, number>();
  for (const p of inSample) {
    counts.set(p.regimeLabel, (counts.get(p.regimeLabel) ?? 0) + 1);
  }
  const total = inSample.length || 1;
  return ["normal", "watch", "defensive"].map((regime) => ({
    regime,
    share: (counts.get(regime) ?? 0) / total,
  }));
}

export function getLatestSignal(): RegimeSignalPoint {
  return regimeSignals[regimeSignals.length - 1];
}
