import Badge from "@/components/layout/Badge";
import DataTable, { type Column } from "@/components/layout/DataTable";
import { SHORT_NAMES } from "@/lib/chart-utils";
import { formatPercent, formatSignedPercent } from "@/lib/formatters";
import type { HedgeEffectivenessRecord } from "@/lib/types";

function gainLoss(value: number | undefined, decimals = 1) {
  if (value == null) return <span className="text-ink-faint">—</span>;
  const cls = value > 0 ? "text-risk-positive" : value < 0 ? "text-risk-loss" : "text-ink-secondary";
  const pct = value * 100;
  return (
    <span className={cls}>
      {pct > 0 ? "+" : ""}
      {pct.toFixed(decimals)}%
    </span>
  );
}

const columns: Column<HedgeEffectivenessRecord>[] = [
  {
    key: "base",
    header: "Base",
    render: (r) => <span className="text-ink">{SHORT_NAMES[r.basePortfolio] ?? r.basePortfolio}</span>,
  },
  {
    key: "hedge",
    header: "Hedge",
    render: (r) => <span className="font-mono text-ink-secondary">{r.hedge}</span>,
  },
  {
    key: "ret",
    header: "Return Δ",
    align: "right",
    render: (r) => (r.status === "ok" ? gainLoss(r.returnDelta) : <span className="text-ink-faint">—</span>),
  },
  {
    key: "dd",
    header: "Drawdown reduction",
    align: "right",
    render: (r) => (r.status === "ok" ? gainLoss(r.drawdownReduction) : <span className="text-ink-faint">—</span>),
  },
  {
    key: "cvar",
    header: "CVaR reduction",
    align: "right",
    render: (r) => (r.status === "ok" ? gainLoss(r.cvarReduction, 2) : <span className="text-ink-faint">—</span>),
  },
  {
    key: "impact",
    header: "Full-sample impact",
    align: "right",
    render: (r) => (r.status === "ok" ? gainLoss(r.hedgeDrag, 2) : <span className="text-ink-faint">—</span>),
  },
  {
    key: "status",
    header: "Status",
    align: "right",
    render: (r) =>
      r.status === "ok" ? (
        <span className="font-mono text-[10px] uppercase text-regime-normal">ok</span>
      ) : (
        <Badge tone="muted">insufficient</Badge>
      ),
  },
];

/** 90/10 hedge overlays for the selected crisis and lookback, sorted by
 * drawdown reduction. A hedge earns its place only if it improves the downside
 * enough to justify its normal-period drag. */
export default function HedgeEffectivenessTable({
  rows,
}: {
  rows: HedgeEffectivenessRecord[];
}) {
  const sorted = [...rows].sort((a, b) => {
    const av = a.status === "ok" ? a.drawdownReduction ?? -Infinity : -Infinity;
    const bv = b.status === "ok" ? b.drawdownReduction ?? -Infinity : -Infinity;
    return bv - av;
  });

  return (
    <div>
      <DataTable
        columns={columns}
        rows={sorted}
        rowKey={(r) => `${r.basePortfolio}-${r.hedge}`}
        dense
      />
      <p className="mt-3 max-w-[80ch] text-[11.5px] leading-relaxed text-ink-faint">
        A 10% sleeve is overlaid on a 90% base portfolio, rebalanced monthly and
        charged the same 5 bps turnover cost. Cash-like and duration hedges tend
        to help in equity-led crises; an inflation and rate shock favors
        different sleeves. Full-sample impact is the overlay's effect on
        full-period annualized return — positive when the sleeve adds return over
        the whole sample, negative when it costs return. A hedge is only useful
        when its crisis-window downside improvement justifies that full-sample
        impact.
      </p>
    </div>
  );
}
