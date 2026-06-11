import Badge from "@/components/layout/Badge";
import DataTable, { type Column } from "@/components/layout/DataTable";
import Section from "@/components/layout/Section";
import SectionHeader from "@/components/layout/SectionHeader";
import { assetUniverse, investableAssets, signalSeries } from "@/lib/data/asset-universe";
import type { AssetUniverseItem } from "@/lib/types";

const BUCKETS: { key: AssetUniverseItem["bucket"]; label: string; blurb: string }[] = [
  {
    key: "growth",
    label: "Growth / risk assets",
    blurb: "Equity, credit, and listed real estate exposure",
  },
  {
    key: "defensive",
    label: "Duration / defensive",
    blurb: "Treasuries across the curve plus a T-bill cash proxy",
  },
  {
    key: "inflation_hedge",
    label: "Inflation / real-asset hedges",
    blurb: "TIPS, gold, and broad commodities",
  },
  {
    key: "signal",
    label: "Signal-only indicators",
    blurb: "Inputs to the regime engine, never allocations",
  },
];

const columns: Column<AssetUniverseItem>[] = [
  {
    key: "ticker",
    header: "Ticker",
    render: (a) => (
      <span className="font-mono text-[12px] font-semibold text-ink">{a.ticker}</span>
    ),
  },
  { key: "category", header: "Asset class", render: (a) => a.category },
  { key: "role", header: "Role", render: (a) => a.role },
  {
    key: "investable",
    header: "Investable?",
    render: (a) =>
      a.investable ? (
        <Badge tone="teal">Investable</Badge>
      ) : (
        <Badge tone="amber">Signal only</Badge>
      ),
  },
  {
    key: "modelRole",
    header: "Model role",
    render: (a) => a.modelRole,
  },
];

export default function AssetUniverseSection() {
  return (
    <Section id="universe">
      <SectionHeader
        moduleId="universe"
        title="Investable assets and signal series"
        thesis="Thirteen liquid ETFs serve as transparent public-market proxies. VIX, CPI, and the SPY-TLT correlation enter as signals only, never as holdings."
      />

      {/* Allocation map: one lane per role, the signal lane visibly set apart */}
      <div className="mb-10 divide-y divide-divider border-y border-divider">
        {BUCKETS.map((bucket) => {
          const members = assetUniverse.filter((a) => a.bucket === bucket.key);
          const signal = bucket.key === "signal";
          return (
            <div
              key={bucket.key}
              className={`grid items-baseline gap-x-6 gap-y-2 py-3.5 sm:grid-cols-[230px_minmax(0,1fr)] ${
                signal ? "bg-panel-deep/60" : ""
              }`}
            >
              <div>
                <div className="text-[12.5px] font-semibold text-ink">
                  {bucket.label}
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">
                  {bucket.blurb}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {members.map((a) => (
                  <span
                    key={a.ticker}
                    title={a.name}
                    className={
                      signal
                        ? "border border-dashed border-regime-watch/50 px-2 py-0.5 font-mono text-[11.5px] text-regime-watch"
                        : "border border-border-strong bg-panel px-2 py-0.5 font-mono text-[11.5px] text-ink-secondary"
                    }
                  >
                    {a.ticker}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border border-border-soft bg-panel">
        <div className="border-b border-divider px-5 py-3">
          <h3 className="font-subhead text-[16px] font-semibold text-ink">
            Asset role matrix
          </h3>
        </div>
        <DataTable
          columns={columns}
          rows={[...investableAssets, ...signalSeries]}
          rowKey={(a) => a.ticker}
        />
      </div>

      <p className="mt-4 border border-regime-watch/25 bg-regime-watch/5 px-4 py-3 text-[12.5px] leading-relaxed text-ink-secondary">
        <span className="font-semibold text-regime-watch">Signal-only rule:</span>{" "}
        VIX is used as a market stress indicator only. The strategies never
        allocate directly to VIX, volatility-linked products behave very
        differently from the spot index and are out of scope here.
      </p>
    </Section>
  );
}
