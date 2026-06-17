"use client";

import { useRef, useState } from "react";
import Tabs from "@/components/layout/Tabs";
import { correlationRgb, rgbCss, shadeRgb, upliftRgb } from "@/lib/chart-utils";
import type { CorrelationGrid } from "@/lib/data/correlation";

type CubeMode = "uplift" | "defensive" | "normal" | "crisis";

const MODE_LABELS: Record<CubeMode, string> = {
  uplift: "Uplift",
  defensive: "Defensive",
  normal: "Normal",
  crisis: "Crisis",
};

// Isometric geometry (coordinate space; the SVG scales to its container).
const TILE_W = 26;
const TILE_H = 13;
const MAX_BAR = 72;
const PAD_X = 52;
const PAD_TOP = 8;
const PAD_BOTTOM = 12;

type Hover = { i: number; j: number; x: number; y: number; w: number };

/** Data-bound isometric correlation field: one block per asset pair, height and
 * color both driven by the selected correlation metric. The opening exhibit of
 * the module — it shows correlations climbing under stress before the reader
 * moves into the exact heatmap and tables, which carry every precise value. */
export default function CorrelationStressCube({
  normal,
  defensive,
  crisisGrid,
  crisisLabel,
}: {
  normal: CorrelationGrid | null;
  defensive: CorrelationGrid | null;
  crisisGrid: CorrelationGrid | null;
  crisisLabel: string;
}) {
  const [mode, setMode] = useState<CubeMode>("uplift");
  const [hover, setHover] = useState<Hover | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const order = (defensive ?? normal ?? crisisGrid)?.order ?? [];
  const n = order.length;

  const availableModes: CubeMode[] = [
    ...((defensive && normal ? ["uplift"] : []) as CubeMode[]),
    ...((defensive ? ["defensive"] : []) as CubeMode[]),
    ...((normal ? ["normal"] : []) as CubeMode[]),
    ...((crisisGrid ? ["crisis"] : []) as CubeMode[]),
  ];
  const activeMode = availableModes.includes(mode) ? mode : availableModes[0];

  function value(i: number, j: number): number | null {
    if (activeMode === "normal") return normal?.matrix[i][j] ?? null;
    if (activeMode === "defensive") return defensive?.matrix[i][j] ?? null;
    if (activeMode === "crisis") return crisisGrid?.matrix[i][j] ?? null;
    const d = defensive?.matrix[i][j];
    const nv = normal?.matrix[i][j];
    return d == null || nv == null ? null : d - nv;
  }

  const isUplift = activeMode === "uplift";
  const originX = PAD_X + TILE_W / 2 + ((n - 1) * TILE_W) / 2;
  const originY = PAD_TOP + MAX_BAR;
  const width = n * TILE_W + PAD_X * 2;
  const height = (n - 1) * TILE_H + TILE_H + MAX_BAR + PAD_TOP + PAD_BOTTOM;

  // Painter's order: back (small i+j) first, front drawn on top.
  const cells: { i: number; j: number }[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cells.push({ i, j });
  cells.sort((a, b) => a.i + a.j - (b.i + b.j));

  const ready = order.length > 0 && (activeMode !== "crisis" || crisisGrid);

  function trackHover(i: number, j: number, e: React.MouseEvent) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ i, j, x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width });
  }

  // Tooltip values (always normal / defensive / uplift, plus the crisis value
  // when the crisis view is active).
  const hNorm = hover ? normal?.matrix[hover.i][hover.j] ?? null : null;
  const hDef = hover ? defensive?.matrix[hover.i][hover.j] ?? null : null;
  const hUplift = hNorm != null && hDef != null ? hDef - hNorm : null;
  const hCrisis =
    hover && activeMode === "crisis" ? crisisGrid?.matrix[hover.i][hover.j] ?? null : null;
  const fmt = (v: number | null) => (v == null ? "—" : v.toFixed(2));
  const signed = (v: number | null) =>
    v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}`;
  const tipFlip = hover ? hover.x > hover.w - 150 : false;

  return (
    <figure className="border-t-2 border-ink pt-2.5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-3">
        <div>
          <h3 className="font-subhead text-[14.5px] font-semibold leading-snug text-ink">
            Stress rising — correlations climbing
          </h3>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            {isUplift
              ? "Defensive minus normal correlation, per asset pair"
              : activeMode === "crisis"
                ? `Realized correlation through ${crisisLabel}`
                : `Average ${MODE_LABELS[activeMode].toLowerCase()}-regime correlation`}
          </p>
        </div>
        <Tabs
          options={availableModes}
          value={activeMode}
          onChange={setMode}
          labels={MODE_LABELS}
          ariaLabel="Correlation cube display mode"
        />
      </figcaption>

      <div
        ref={wrapRef}
        className="relative border border-border-soft bg-panel px-1 py-1"
        onMouseLeave={() => setHover(null)}
      >
        {ready ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="mx-auto block h-auto w-full max-w-[720px]"
            role="img"
            aria-label={`Isometric correlation field, ${MODE_LABELS[activeMode]} view: taller, warmer blocks mark asset pairs that moved more together. Hover a block for its normal, defensive, and uplift correlation; exact values also appear in the heatmap and tables below.`}
          >
            {cells.map(({ i, j }) => {
              const v = value(i, j);
              if (v == null) return null;
              const rgb = isUplift ? upliftRgb(v, 0.5) : correlationRgb(v);
              const magnitude = isUplift ? Math.max(0, v) / 0.5 : Math.max(0, v);
              const h = Math.max(0, Math.min(1, magnitude)) * MAX_BAR;
              const cx = originX + (j - i) * (TILE_W / 2);
              const cyBase = originY + (i + j) * (TILE_H / 2);
              const cyTop = cyBase - h;
              const top = rgbCss(rgb);
              const left = rgbCss(shadeRgb(rgb, 0.72));
              const right = rgbCss(shadeRgb(rgb, 0.85));
              const stroke = "rgba(17,22,26,0.10)";
              const active = hover && hover.i === i && hover.j === j;
              return (
                <g
                  key={`${i}-${j}`}
                  onMouseMove={(e) => trackHover(i, j, e)}
                  style={{ cursor: "pointer" }}
                >
                  {h > 0.5 && (
                    <>
                      <polygon
                        points={`${cx - TILE_W / 2},${cyTop} ${cx},${cyTop + TILE_H / 2} ${cx},${cyBase + TILE_H / 2} ${cx - TILE_W / 2},${cyBase}`}
                        fill={left}
                        stroke={stroke}
                        strokeWidth={0.4}
                      />
                      <polygon
                        points={`${cx + TILE_W / 2},${cyTop} ${cx},${cyTop + TILE_H / 2} ${cx},${cyBase + TILE_H / 2} ${cx + TILE_W / 2},${cyBase}`}
                        fill={right}
                        stroke={stroke}
                        strokeWidth={0.4}
                      />
                    </>
                  )}
                  <polygon
                    points={`${cx},${cyTop - TILE_H / 2} ${cx + TILE_W / 2},${cyTop} ${cx},${cyTop + TILE_H / 2} ${cx - TILE_W / 2},${cyTop}`}
                    fill={top}
                    stroke={active ? "#11161a" : stroke}
                    strokeWidth={active ? 1 : 0.4}
                  />
                </g>
              );
            })}

            {/* External axis rails: small mono tickers in translucent capsules,
                along the two unoccluded back edges. */}
            {order.map((t, i) => {
              const tw = t.length * 5.6 + 8;
              const xEnd = originX - i * (TILE_W / 2) - TILE_W / 2 - 3;
              const y = originY + i * (TILE_H / 2);
              return (
                <g key={`ri-${t}`}>
                  <rect
                    x={xEnd - tw}
                    y={y - 8.5}
                    width={tw}
                    height={12}
                    rx={2.5}
                    fill="rgba(251,252,252,0.74)"
                    stroke="rgba(169,178,182,0.5)"
                    strokeWidth={0.4}
                  />
                  <text
                    x={xEnd - 4}
                    y={y + 0.5}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="#5e676d"
                    style={{ fontSize: 8.5, fontFamily: "var(--font-mono)" }}
                  >
                    {t}
                  </text>
                </g>
              );
            })}
            {order.map((t, j) => {
              const tw = t.length * 5.6 + 8;
              const xStart = originX + j * (TILE_W / 2) + TILE_W / 2 + 3;
              const y = originY + j * (TILE_H / 2);
              return (
                <g key={`cj-${t}`}>
                  <rect
                    x={xStart}
                    y={y - 8.5}
                    width={tw}
                    height={12}
                    rx={2.5}
                    fill="rgba(251,252,252,0.74)"
                    stroke="rgba(169,178,182,0.5)"
                    strokeWidth={0.4}
                  />
                  <text
                    x={xStart + 4}
                    y={y + 0.5}
                    textAnchor="start"
                    dominantBaseline="middle"
                    fill="#5e676d"
                    style={{ fontSize: 8.5, fontFamily: "var(--font-mono)" }}
                  >
                    {t}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : (
          <p className="py-14 text-center text-[12.5px] text-ink-muted">
            No correlation matrix is available for this view at the selected
            lookback. The {crisisLabel} window is only covered at shorter
            lookbacks; switch the lookback or mode above.
          </p>
        )}

        {hover && (
          <div
            className="pointer-events-none absolute z-10 border border-border-strong bg-panel-elevated px-2.5 py-1.5 shadow-sm"
            style={{
              left: tipFlip ? undefined : hover.x + 14,
              right: tipFlip ? hover.w - hover.x + 14 : undefined,
              top: hover.y + 14,
            }}
          >
            <div className="font-mono text-[11px] font-semibold text-ink">
              {order[hover.i]} × {order[hover.j]}
            </div>
            <dl className="mt-1 space-y-0.5 font-mono text-[10.5px]">
              <Row label="Normal" value={fmt(hNorm)} />
              <Row label="Defensive" value={fmt(hDef)} />
              <Row
                label="Uplift"
                value={signed(hUplift)}
                color={hUplift != null && hUplift > 0 ? "#b91c1c" : "#2563a8"}
              />
              {hCrisis != null && <Row label={crisisLabel} value={fmt(hCrisis)} />}
            </dl>
          </div>
        )}
      </div>

      <p className="mt-2 max-w-[80ch] text-[11.5px] leading-relaxed text-ink-faint">
        Each block is one asset-pair relationship; rows and columns are ETFs.
        Taller, warmer blocks mean the pair moved more together in the selected
        view, and the uplift view isolates where diversification weakened most
        under stress. Hover a block for the pair's normal, defensive, and uplift
        correlation — the exact values also appear in the heatmap and tables below.
      </p>
    </figure>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="tabular" style={{ color: color ?? "#11161a" }}>
        {value}
      </dd>
    </div>
  );
}
