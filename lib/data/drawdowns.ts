import drawdowns from "@/data/drawdowns.json";
import type { DrawdownPoint, LookbackWindow } from "@/lib/types";

export const drawdownPoints = drawdowns as unknown as DrawdownPoint[];

export type DrawdownRow = { date: string } & Record<string, number | string>;

export function getDrawdownRows(lookback: LookbackWindow): DrawdownRow[] {
  const byDate = new Map<string, DrawdownRow>();
  for (const p of drawdownPoints) {
    if (p.lookback !== lookback) continue;
    let row = byDate.get(p.date);
    if (!row) {
      row = { date: p.date };
      byDate.set(p.date, row);
    }
    row[p.strategy] = p.drawdown;
  }
  return [...byDate.values()].sort((a, b) =>
    (a.date as string) < (b.date as string) ? -1 : 1,
  );
}
