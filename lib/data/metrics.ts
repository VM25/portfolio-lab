import metrics from "@/data/performance-metrics.json";
import type { LookbackWindow, PerformanceMetric } from "@/lib/types";

export const performanceMetrics = metrics as unknown as PerformanceMetric[];

export function getMetricsByLookback(lookback: LookbackWindow): PerformanceMetric[] {
  return performanceMetrics.filter((m) => m.lookback === lookback);
}

export function getMetric(strategy: string, lookback: LookbackWindow) {
  return performanceMetrics.find(
    (m) => m.strategy === strategy && m.lookback === lookback,
  );
}
