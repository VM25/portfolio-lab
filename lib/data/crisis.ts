import crisisMetrics from "@/data/crisis-metrics.json";
import crisisWealth from "@/data/crisis-wealth.json";
import type { CrisisMetric, CrisisWealthPoint, LookbackWindow } from "@/lib/types";

export const allCrisisMetrics = crisisMetrics as unknown as CrisisMetric[];
const allCrisisWealth = crisisWealth as unknown as CrisisWealthPoint[];

export const crisisNames = [...new Set(allCrisisMetrics.map((c) => c.crisisName))];

export function getCrisisMetrics(crisisName: string, lookback: LookbackWindow) {
  return allCrisisMetrics.filter(
    (c) => c.crisisName === crisisName && c.lookback === lookback,
  );
}

export type CrisisWealthRow = { date: string } & Record<string, number | string>;

export function getCrisisWealthRows(
  crisisName: string,
  lookback: LookbackWindow,
): CrisisWealthRow[] {
  const byDate = new Map<string, CrisisWealthRow>();
  for (const p of allCrisisWealth) {
    if (p.crisisName !== crisisName || p.lookback !== lookback) continue;
    let row = byDate.get(p.date);
    if (!row) {
      row = { date: p.date };
      byDate.set(p.date, row);
    }
    row[p.strategy] = p.wealth;
  }
  return [...byDate.values()].sort((a, b) =>
    (a.date as string) < (b.date as string) ? -1 : 1,
  );
}
