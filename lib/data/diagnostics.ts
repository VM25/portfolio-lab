import turnover from "@/data/turnover-diagnostics.json";
import concentration from "@/data/concentration-diagnostics.json";
import weights from "@/data/portfolio-weights.json";
import { STRATEGY_ORDER } from "@/lib/chart-utils";
import type {
  ConcentrationDiagnostic,
  LookbackWindow,
  PortfolioWeightPoint,
  TurnoverDiagnostic,
} from "@/lib/types";

export const turnoverDiagnostics = turnover as unknown as TurnoverDiagnostic[];
export const concentrationDiagnostics =
  concentration as unknown as ConcentrationDiagnostic[];
const portfolioWeights = weights as unknown as PortfolioWeightPoint[];

export type TurnoverRow = { date: string } & Record<string, number | string>;

/** Monthly turnover per strategy (benchmarks excluded — their turnover is
 * static by construction). */
export function getTurnoverRows(lookback: LookbackWindow): TurnoverRow[] {
  const strategies = new Set<string>(STRATEGY_ORDER);
  const byDate = new Map<string, TurnoverRow>();
  for (const p of turnoverDiagnostics) {
    if (p.lookback !== lookback || !strategies.has(p.strategy)) continue;
    let row = byDate.get(p.date);
    if (!row) {
      row = { date: p.date };
      byDate.set(p.date, row);
    }
    row[p.strategy] = p.turnover;
  }
  return [...byDate.values()].sort((a, b) =>
    (a.date as string) < (b.date as string) ? -1 : 1,
  );
}

export type WeightGrid = {
  strategy: string;
  lookback: LookbackWindow;
  dates: string[];
  tickers: string[];
  /** matrix[tickerIndex][dateIndex] = portfolio weight */
  matrix: number[][];
};

export function getWeightGrid(
  strategy: string,
  lookback: LookbackWindow,
): WeightGrid {
  const points = portfolioWeights.filter(
    (p) => p.strategy === strategy && p.lookback === lookback,
  );
  const dates = [...new Set(points.map((p) => p.date))].sort();
  const tickers = [...new Set(points.map((p) => p.ticker))];
  const dateIndex = new Map(dates.map((d, i) => [d, i]));
  const tickerIndex = new Map(tickers.map((t, i) => [t, i]));
  const matrix = tickers.map(() => dates.map(() => 0));
  for (const p of points) {
    matrix[tickerIndex.get(p.ticker)!][dateIndex.get(p.date)!] = p.weight;
  }
  return { strategy, lookback, dates, tickers, matrix };
}
