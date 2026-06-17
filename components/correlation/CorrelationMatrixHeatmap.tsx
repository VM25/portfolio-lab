"use client";

import { useState } from "react";
import Tabs from "@/components/layout/Tabs";
import { correlationColor, upliftColor } from "@/lib/chart-utils";
import { CORRELATION_GROUP_BREAKS } from "@/lib/data/correlation";
import type { CorrelationGrid } from "@/lib/data/correlation";

type HeatMode = "normal" | "defensive" | "difference";

const MODE_LABELS: Record<HeatMode, string> = {
  difference: "Difference",
  defensive: "Defensive",
  normal: "Normal",
};

const CELL = 17; // px — keeps the 13x13 grid card-sized, not a scroll block

/** Compact 2D correlation heatmap (rows = columns = ETF tickers). The
 * difference matrix — defensive minus normal, a pure cell-by-cell subtraction
 * of the two exported grids — is the most important view and the default. It is
 * also the exhaustive, accessible companion to the isometric cube above. */
export default function CorrelationMatrixHeatmap({
  normal,
  defensive,
}: {
  normal: CorrelationGrid | null;
  defensive: CorrelationGrid | null;
}) {
  const [mode, setMode] = useState<HeatMode>("difference");

  const order = (normal ?? defensive)?.order ?? [];
  const hasBoth = normal && defensive;

  function cellValue(i: number, j: number): number | null {
    if (mode === "normal") return normal?.matrix[i][j] ?? null;
    if (mode === "defensive") return defensive?.matrix[i][j] ?? null;
    const d = defensive?.matrix[i][j];
    const n = normal?.matrix[i][j];
    return d == null || n == null ? null : d - n;
  }

  function cellColor(v: number): string {
    return mode === "difference" ? upliftColor(v, 0.5) : correlationColor(v);
  }

  const modes: HeatMode[] = hasBoth
    ? ["difference", "defensive", "normal"]
    : ["normal", "defensive"];

  return (
    <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[auto_minmax(0,1fr)]">
      <div>
        <Tabs
          options={modes}
          value={mode}
          onChange={setMode}
          labels={MODE_LABELS}
          ariaLabel="Correlation heatmap view"
        />
        {order.length === 0 ? (
          <p className="mt-4 text-[12.5px] text-ink-muted">
            No regime-averaged correlation matrix is available at this lookback.
          </p>
        ) : (
          <div className="thin-scroll mt-3 overflow-x-auto">
            <div
              className="grid w-max"
              style={{
                gridTemplateColumns: `26px repeat(${order.length}, ${CELL}px)`,
              }}
              role="img"
              aria-label={`Correlation ${mode} matrix across ${order.length} ETFs.`}
            >
              <div />
              {order.map((t, j) => (
                <div
                  key={`col-${t}`}
                  className={
                    "pb-1 text-center font-mono text-[8px] text-ink-muted" +
                    (CORRELATION_GROUP_BREAKS.includes(j)
                      ? " border-l border-border-strong"
                      : "")
                  }
                >
                  {t}
                </div>
              ))}

              {order.map((rowT, i) => (
                <div key={`row-${rowT}`} className="contents">
                  <div
                    className={
                      "flex items-center justify-end pr-1 font-mono text-[8px] text-ink-muted" +
                      (CORRELATION_GROUP_BREAKS.includes(i)
                        ? " border-t border-border-strong"
                        : "")
                    }
                    style={{ height: CELL }}
                  >
                    {rowT}
                  </div>
                  {order.map((colT, j) => {
                    const v = cellValue(i, j);
                    return (
                      <div
                        key={`${rowT}-${colT}`}
                        style={{
                          height: CELL,
                          backgroundColor: v == null ? "#e9eded" : cellColor(v),
                        }}
                        title={`${rowT} · ${colT} · ${v == null ? "—" : v.toFixed(2)}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
        <Legend mode={mode} />
      </div>

      <p className="max-w-[46ch] self-center text-[12px] leading-relaxed text-ink-muted">
        The difference matrix shows where diversification changed most under
        stress. Positive (warm) values mean the pair moved more together in
        defensive regimes than in normal ones; negative (blue) values mean the
        pair diversified better under stress. The strongest warm band sits where
        Treasuries meet equities — duration's hedge weakened — while broad
        commodities (DBC) cool, decoupling from the rest of the book.
      </p>
    </div>
  );
}

function Legend({ mode }: { mode: HeatMode }) {
  const gradient =
    mode === "difference"
      ? `linear-gradient(to right, ${upliftColor(-0.5)}, ${upliftColor(0)}, ${upliftColor(0.25)}, ${upliftColor(0.5)})`
      : `linear-gradient(to right, ${correlationColor(-1)}, ${correlationColor(0)}, ${correlationColor(1)})`;
  const lo = mode === "difference" ? "-0.5" : "-1";
  const hi = mode === "difference" ? "+0.5" : "+1";
  return (
    <div className="mt-3 flex items-center gap-1.5">
      <span className="font-mono text-[9.5px] text-ink-faint">{lo}</span>
      <div className="h-2 w-24 rounded-full" style={{ background: gradient }} aria-hidden />
      <span className="font-mono text-[9.5px] text-ink-faint">{hi}</span>
    </div>
  );
}
