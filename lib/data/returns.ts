import returns from "@/data/strategy-returns.json";
import { SERIES_ORDER } from "@/lib/chart-utils";
import type { LookbackWindow, StrategyReturnPoint } from "@/lib/types";

export const strategyReturns = returns as unknown as StrategyReturnPoint[];

export type WealthRow = { date: string } & Record<string, number | string>;

/** Merged chart rows for one lookback: one row per sampled date with a
 * wealth value per series. All series of a lookback share the same calendar.
 */
export function getWealthRows(
  lookback: LookbackWindow,
  basis: "net" | "gross" = "net",
): WealthRow[] {
  const byDate = new Map<string, WealthRow>();
  for (const p of strategyReturns) {
    if (p.lookback !== lookback) continue;
    let row = byDate.get(p.date);
    if (!row) {
      row = { date: p.date };
      byDate.set(p.date, row);
    }
    row[p.strategy] = basis === "net" ? p.wealthNet : p.wealthGross;
  }
  return [...byDate.values()].sort((a, b) =>
    (a.date as string) < (b.date as string) ? -1 : 1,
  );
}

export function getSeriesNames(lookback: LookbackWindow): string[] {
  const present = new Set(
    strategyReturns.filter((p) => p.lookback === lookback).map((p) => p.strategy),
  );
  return SERIES_ORDER.filter((s) => present.has(s));
}
