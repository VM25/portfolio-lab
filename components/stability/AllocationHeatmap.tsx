"use client";

import { heatmapColor } from "@/lib/chart-utils";
import { formatPercent } from "@/lib/formatters";
import type { WeightGrid } from "@/lib/data/diagnostics";

/** CSS-grid heatmap: rows = ETF tickers, columns = monthly rebalance dates,
 * cell = portfolio weight on a deep-navy → teal scale. */
export default function AllocationHeatmap({ grid }: { grid: WeightGrid }) {
  const { dates, tickers, matrix } = grid;

  // Year markers for the x axis.
  const yearMarks: { index: number; year: string }[] = [];
  let lastYear = "";
  dates.forEach((d, i) => {
    const year = d.slice(0, 4);
    if (year !== lastYear) {
      lastYear = year;
      yearMarks.push({ index: i, year });
    }
  });
  const sparseYears = yearMarks.filter((m) => parseInt(m.year) % 2 === 0);

  return (
    <div className="thin-scroll overflow-x-auto">
      <div className="min-w-[760px]">
        <div
          className="grid gap-px"
          style={{
            gridTemplateColumns: `56px repeat(${dates.length}, minmax(2.5px, 1fr))`,
          }}
          role="img"
          aria-label={`Allocation heatmap for ${grid.strategy}: portfolio weights by asset and rebalance date. Brighter teal means higher weight, capped at 35%.`}
        >
          {tickers.map((ticker, ti) => (
            <div key={ticker} className="contents">
              <div className="flex items-center pr-2 font-mono text-[10.5px] text-ink-muted">
                {ticker}
              </div>
              {dates.map((date, di) => (
                <div
                  key={date}
                  className="h-[18px]"
                  style={{ backgroundColor: heatmapColor(matrix[ti][di]) }}
                  title={`${ticker} · ${date} · ${formatPercent(matrix[ti][di])}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div
          className="mt-1 grid"
          style={{
            gridTemplateColumns: `56px repeat(${dates.length}, minmax(2.5px, 1fr))`,
          }}
          aria-hidden
        >
          <div />
          {dates.map((d, i) => {
            const mark = sparseYears.find((m) => m.index === i);
            return (
              <div key={d} className="relative">
                {mark && (
                  <span className="absolute left-0 top-0 font-mono text-[9.5px] text-ink-faint">
                    {mark.year}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="font-mono text-[10px] text-ink-faint">0%</span>
        <div
          className="h-2 w-36 rounded-full"
          style={{
            background: `linear-gradient(to right, ${[0, 0.25, 0.5, 0.75, 1]
              .map((t) => heatmapColor(t * 0.35))
              .join(", ")})`,
          }}
          aria-hidden
        />
        <span className="font-mono text-[10px] text-ink-faint">35% (cap)</span>
      </div>
    </div>
  );
}
