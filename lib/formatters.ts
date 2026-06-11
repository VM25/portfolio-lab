/** Display formatting. Conventions:
 *  - returns / weights as percentages
 *  - drawdowns as negative percentages (shown below zero)
 *  - VaR/CVaR as positive loss magnitudes (research-engine sign convention)
 *  - ratios with two decimals
 */

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || !isFinite(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatSignedPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || !isFinite(value)) return "—";
  const pct = value * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(decimals)}%`;
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null || !isFinite(value)) return "—";
  return value.toFixed(decimals);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "—";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatRatio(value: number | null | undefined): string {
  return formatNumber(value, 2);
}

export function formatDate(value: string): string {
  const d = new Date(value + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

export function formatFullDate(value: string): string {
  const d = new Date(value + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDrawdown(value: number | null | undefined, decimals = 1): string {
  if (value == null || !isFinite(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatLoss(value: number | null | undefined, decimals = 2): string {
  // VaR/CVaR arrive as positive loss numbers and are displayed as positive
  // loss magnitudes (the stated convention); drawdowns stay negative.
  if (value == null || !isFinite(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatWealth(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "—";
  return `$${value.toFixed(0)}`;
}
