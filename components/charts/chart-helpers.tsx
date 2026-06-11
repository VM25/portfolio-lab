"use client";

import { chartStyle, SHORT_NAMES, type ChartTone } from "@/lib/chart-utils";

/** Tick values at the first sample of each year (every `step` years). */
export function yearTicks(dates: string[], step = 1): string[] {
  const ticks: string[] = [];
  let lastYear = "";
  for (const d of dates) {
    const year = d.slice(0, 4);
    if (year !== lastYear) {
      lastYear = year;
      if (parseInt(year) % step === 0) ticks.push(d);
    }
  }
  return ticks;
}

export function tickYear(value: string): string {
  return value.slice(0, 4);
}

export function tickMonthYear(value: string): string {
  const d = new Date(value + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

type TooltipItem = {
  dataKey?: string | number;
  value?: number | string;
  color?: string;
};

/** Token-class styling means the tooltip re-themes automatically inside the
 * dark stress block; no tone prop needed. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  sortDesc = true,
  names,
}: {
  active?: boolean;
  payload?: ReadonlyArray<TooltipItem>;
  label?: string | number;
  formatter: (value: number) => string;
  sortDesc?: boolean;
  names?: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  const items = [...payload].filter((p) => typeof p.value === "number");
  if (sortDesc) items.sort((a, b) => (b.value as number) - (a.value as number));
  return (
    <div
      className="border border-border-strong bg-panel-elevated px-3 py-2 shadow-sm"
      style={{ fontSize: 12 }}
    >
      <div className="mb-1 font-mono text-[10.5px] text-ink-muted">{String(label)}</div>
      {items.map((p) => (
        <div key={p.dataKey as string} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-ink-secondary">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: p.color }}
            />
            {names?.[p.dataKey as string] ??
              SHORT_NAMES[p.dataKey as string] ??
              (p.dataKey as string)}
          </span>
          <span className="tabular font-mono text-[11.5px] text-ink">
            {formatter(p.value as number)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function axisProps(tone: ChartTone = "light") {
  const s = chartStyle(tone);
  return {
    stroke: s.axis,
    tick: s.tick,
    tickLine: false as const,
    axisLine: { stroke: s.grid },
  };
}

/** Back-compat default axis props for light-tone figures. */
export const AXIS_PROPS = axisProps("light");

export function legendStyle(tone: ChartTone = "light") {
  return { color: chartStyle(tone).legendText, fontSize: 12 };
}
