import type { SeriesName, StrategyName } from "./types";

/** One muted color per strategy, identical in method sheets, charts, tables,
 * and legends. Benchmarks render dashed in time-series figures. */
export const STRATEGY_COLORS: Record<string, string> = {
  "Equal Weight": "#6B7280",
  "Global Minimum Variance": "#2563A8",
  "Max Sharpe / Risk-Adjusted Return": "#7C3AED",
  "Regime-Aware Allocation": "#0F766E",
  SPY: "#B45309",
  "60/40": "#475569",
};

/** Brighter variants used only inside the dark stress block. */
export const STRATEGY_COLORS_DARK: Record<string, string> = {
  "Equal Weight": "#9CA3AF",
  "Global Minimum Variance": "#5B9BD5",
  "Max Sharpe / Risk-Adjusted Return": "#A78BFA",
  "Regime-Aware Allocation": "#2DD4BF",
  SPY: "#F59E0B",
  "60/40": "#94A3B8",
};

export const SHORT_NAMES: Record<string, string> = {
  "Equal Weight": "Equal Weight",
  "Global Minimum Variance": "GMV",
  "Max Sharpe / Risk-Adjusted Return": "Max Sharpe",
  "Regime-Aware Allocation": "Regime-Aware",
  SPY: "SPY",
  "60/40": "60/40",
};

export const STRATEGY_ORDER: StrategyName[] = [
  "Equal Weight",
  "Global Minimum Variance",
  "Max Sharpe / Risk-Adjusted Return",
  "Regime-Aware Allocation",
];

export const SERIES_ORDER: SeriesName[] = [...STRATEGY_ORDER, "SPY", "60/40"];

export const BENCHMARKS: SeriesName[] = ["SPY", "60/40"];

export const REGIME_COLORS: Record<string, string> = {
  normal: "#2F855A",
  watch: "#B7791F",
  defensive: "#B91C1C",
};

export const REGIME_COLORS_DARK: Record<string, string> = {
  normal: "#34D399",
  watch: "#FBBF24",
  defensive: "#F87171",
};

export type ChartTone = "light" | "dark";

/** Ink-on-cool-ground figure styling shared by every chart. */
export const CHART_STYLE = {
  grid: "#D8DDDF",
  axis: "#8B9499",
  tick: { fill: "#646C72", fontSize: 11 },
  referenceLine: "#B91C1C",
  zeroLine: "#8B9499",
  legendText: "#3A4046",
  cursorFill: "rgba(20,23,26,0.05)",
} as const;

export const CHART_STYLE_DARK = {
  grid: "#28323A",
  axis: "#5C666D",
  tick: { fill: "#828D94", fontSize: 11 },
  referenceLine: "#F87171",
  zeroLine: "#5C666D",
  legendText: "#B6BEC4",
  cursorFill: "rgba(232,236,238,0.06)",
} as const;

export function chartStyle(tone: ChartTone = "light") {
  return tone === "dark" ? CHART_STYLE_DARK : CHART_STYLE;
}

export function seriesColor(name: string, tone: ChartTone = "light"): string {
  return tone === "dark"
    ? STRATEGY_COLORS_DARK[name] ?? STRATEGY_COLORS[name]
    : STRATEGY_COLORS[name];
}

export function isBenchmark(name: string): boolean {
  return name === "SPY" || name === "60/40";
}

/** One muted color per estimation lookback, used where several lookbacks share
 * a single figure (e.g. effective bets through time). */
export const LOOKBACK_COLORS: Record<string, string> = {
  "6M": "#0F766E",
  "1Y": "#2563A8",
  "3Y": "#7C3AED",
};

function lerpRgb(a: number[], b: number[], f: number): number[] {
  return a.map((c, i) => Math.round(c + (b[i] - c) * f));
}

export function rgbCss(c: number[]): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Multiply an rgb tuple toward black — used for isometric side faces. */
export function shadeRgb(c: number[], factor: number): number[] {
  return c.map((x) => Math.round(x * factor));
}

const CORR_GROUND = [233, 237, 237]; // cool neutral (zero correlation)
const CORR_TEAL = [12, 84, 78]; // strong positive co-movement
const CORR_BLUE = [37, 99, 168]; // strong negative (diversifying)
const STRESS_AMBER = [183, 121, 31];
const STRESS_RED = [153, 27, 27];

/** Diverging correlation scale: blue (negative) → cool ground (0) → teal
 * (positive), in the site's own palette. */
export function correlationRgb(v: number): number[] {
  const t = Math.max(-1, Math.min(1, v));
  return lerpRgb(CORR_GROUND, t >= 0 ? CORR_TEAL : CORR_BLUE, Math.abs(t));
}

/** Stress/uplift scale: blue (correlation fell) → ground (0) → amber → deep
 * red (correlation rose most under stress). The amber→red ramp is the site's
 * regime-stress identity, not a generic trading red. */
export function upliftRgb(v: number, max = 0.5): number[] {
  const t = Math.max(-1, Math.min(1, v / max));
  if (t < 0) return lerpRgb(CORR_GROUND, CORR_BLUE, Math.min(1, -t));
  const f = Math.min(1, t);
  return f <= 0.5
    ? lerpRgb(CORR_GROUND, STRESS_AMBER, f / 0.5)
    : lerpRgb(STRESS_AMBER, STRESS_RED, (f - 0.5) / 0.5);
}

export function correlationColor(v: number): string {
  return rgbCss(correlationRgb(v));
}

export function upliftColor(v: number, max = 0.5): string {
  return rgbCss(upliftRgb(v, max));
}

/** Allocation heatmap scale: cool ground -> deep teal ink. */
export function heatmapColor(weight: number, maxWeight = 0.35): string {
  const t = Math.max(0, Math.min(1, weight / maxWeight));
  if (t === 0) return "#E9EDED";
  const stops: [number, [number, number, number]][] = [
    [0.0, [228, 233, 234]],
    [0.25, [186, 205, 207]],
    [0.5, [120, 167, 165]],
    [0.75, [52, 120, 113]],
    [1.0, [12, 84, 78]],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const f = (t - t0) / (t1 - t0);
      const rgb = c0.map((c, j) => Math.round(c + (c1[j] - c) * f));
      return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    }
  }
  return "rgb(12,84,78)";
}
