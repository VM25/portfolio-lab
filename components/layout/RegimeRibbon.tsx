import { config } from "@/lib/data/benchmarks";
import { getRegimeShares, regimeSignals } from "@/lib/data/regimes";
import { REGIME_COLORS } from "@/lib/chart-utils";
import { formatPercent } from "@/lib/formatters";

type Segment = { regime: string; frac: number };

/** The daily regime classification collapsed into contiguous segments.
 * Computed once; shared by every variant. */
function segments(): { segs: Segment[]; n: number; first: string; last: string } {
  const points = regimeSignals;
  const n = points.length;
  const segs: { regime: string; from: number; to: number }[] = [];
  for (let i = 0; i < n; i++) {
    const r = points[i].regimeLabel;
    const last = segs[segs.length - 1];
    if (last && last.regime === r) last.to = i + 1;
    else segs.push({ regime: r, from: i, to: i + 1 });
  }
  return {
    segs: segs.map((s) => ({ regime: s.regime, frac: (s.to - s.from) / n })),
    n,
    first: points[0].date,
    last: points[n - 1].date,
  };
}

function indexFraction(date: string): number {
  const points = regimeSignals;
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].date < date) lo = mid + 1;
    else hi = mid;
  }
  return lo / points.length;
}

/** The signature identity element: regime change rendered as a colored record.
 * `marker` is a thin recurring accent; `full` is the hero exhibit with crisis
 * brackets, a year scale, and the mix legend. */
export default function RegimeRibbon({
  variant = "marker",
  className,
}: {
  variant?: "full" | "marker";
  className?: string;
}) {
  const { segs, first, last } = segments();

  if (variant === "marker") {
    return (
      <div
        className={`flex h-1.5 w-full overflow-hidden ${className ?? ""}`}
        role="img"
        aria-label="Regime classification record: normal, watch, and defensive periods across the backtest sample."
      >
        {segs.map((s, i) => (
          <span
            key={i}
            style={{
              width: `${s.frac * 100}%`,
              backgroundColor: REGIME_COLORS[s.regime],
              opacity: 0.9,
            }}
          />
        ))}
      </div>
    );
  }

  const shares = getRegimeShares();
  const crises = Object.entries(config.crisisWindows).map(([name, w]) => ({
    name:
      name === "Global Financial Crisis"
        ? "2008 GFC"
        : name === "COVID Market Shock"
          ? "2020 COVID"
          : "2022 inflation",
    left: indexFraction(w.start) * 100,
    width: Math.max((indexFraction(w.end) - indexFraction(w.start)) * 100, 0.5),
  }));

  const yearMarks: { left: number; year: string }[] = [];
  let lastYear = "";
  regimeSignals.forEach((p, i) => {
    const y = p.date.slice(0, 4);
    if (y !== lastYear) {
      lastYear = y;
      if (parseInt(y) % 3 === 0)
        yearMarks.push({ left: (i / regimeSignals.length) * 100, year: y });
    }
  });

  return (
    <figure className={`w-full ${className ?? ""}`}>
      <div className="relative h-6" aria-hidden>
        {crises.map((c) => (
          <div
            key={c.name}
            className="absolute bottom-0 border-x border-t border-ink-muted pt-0.5"
            style={{ left: `${c.left}%`, width: `${c.width}%`, height: "14px" }}
          >
            <span className="absolute -top-3.5 left-0 whitespace-nowrap font-mono text-[10px] text-ink-muted">
              {c.name}
            </span>
          </div>
        ))}
      </div>

      <div
        className="flex h-11 w-full overflow-hidden border border-border-strong"
        role="img"
        aria-label={`Daily regime classification from ${first} to ${last}: ${shares
          .map((s) => `${s.regime} ${formatPercent(s.share, 0)} of valid strategy trading days`)
          .join(", ")}.`}
      >
        {segs.map((s, i) => (
          <span
            key={i}
            style={{
              width: `${s.frac * 100}%`,
              backgroundColor: REGIME_COLORS[s.regime],
              opacity: 0.85,
            }}
          />
        ))}
      </div>

      <div className="relative mt-1 h-4" aria-hidden>
        {yearMarks.map((m) => (
          <span
            key={m.year}
            className="absolute top-0 font-mono text-[10px] text-ink-faint"
            style={{ left: `${m.left}%` }}
          >
            {m.year}
          </span>
        ))}
      </div>

      <figcaption className="mt-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5">
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          {shares.map((s) => (
            <span key={s.regime} className="flex items-center gap-1.5 text-[12px] text-ink-muted">
              <span
                aria-hidden
                className="h-2 w-2"
                style={{ backgroundColor: REGIME_COLORS[s.regime] }}
              />
              {s.regime}{" "}
              <span className="tabular font-mono text-ink-secondary">
                {formatPercent(s.share, 0)}
              </span>
            </span>
          ))}
        </span>
        <span className="text-[11.5px] text-ink-faint">
          Daily regime classification, share of valid strategy trading days (1Y sample)
        </span>
      </figcaption>
    </figure>
  );
}
