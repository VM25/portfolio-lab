import Section from "@/components/layout/Section";
import SectionHeader from "@/components/layout/SectionHeader";
import { strategySummaries } from "@/lib/data/strategies";
import { SHORT_NAMES, STRATEGY_COLORS } from "@/lib/chart-utils";
import type { StrategySummary } from "@/lib/types";
import type { ReactNode } from "react";

const CATEGORY_LABEL: Record<string, string> = {
  benchmark: "Baseline",
  optimized: "Optimized",
  rule_based: "Rule-based",
};

/** One attribute row of the comparison matrix. */
function MatrixRow({
  label,
  render,
  strategies,
  muted = false,
}: {
  label: string;
  render: (s: StrategySummary) => ReactNode;
  strategies: StrategySummary[];
  muted?: boolean;
}) {
  return (
    <tr className="border-t border-divider align-top">
      <th
        scope="row"
        className="w-[120px] py-3 pr-4 text-left text-[11px] font-semibold leading-snug text-ink-muted"
      >
        {label}
      </th>
      {strategies.map((s) => (
        <td
          key={s.strategy}
          className={`py-3 pr-5 text-[12px] leading-relaxed ${
            muted ? "text-ink-muted" : "text-ink-secondary"
          }`}
        >
          {render(s)}
        </td>
      ))}
    </tr>
  );
}

/** The four allocation rules as one comparable specification matrix:
 * attributes as rows, rules as columns, so mechanics line up side by side. */
export default function StrategyFrameworkSection() {
  const strategies = strategySummaries;

  return (
    <Section id="methods">
      <SectionHeader
        moduleId="methods"
        title="Four allocation rules, one specification"
        thesis="Every rule runs on the same universe, rebalance calendar, constraints, and transaction-cost model. The matrix lines up their mechanics so differences in behavior can be traced to differences in inputs."
      />

      <div className="thin-scroll overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr>
              <th className="w-[120px]" aria-hidden />
              {strategies.map((s) => (
                <th
                  key={s.strategy}
                  scope="col"
                  className="pb-3 pr-5 text-left align-bottom"
                  style={{ borderTop: `3px solid ${STRATEGY_COLORS[s.strategy]}` }}
                >
                  <div className="pt-2.5">
                    <span className="font-mono text-[10px] font-normal text-ink-faint">
                      {CATEGORY_LABEL[s.category]}
                    </span>
                    <div className="text-[15px] font-semibold leading-snug text-ink">
                      {SHORT_NAMES[s.strategy]}
                    </div>
                    <p className="mt-1 max-w-[26ch] text-[11.5px] font-normal leading-snug text-ink-muted">
                      {s.objective}
                    </p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <MatrixRow
              label="Inputs"
              strategies={strategies}
              render={(s) => (
                <ul className="space-y-1">
                  {s.inputs.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
            />
            <MatrixRow
              label="Constraints"
              strategies={strategies}
              render={(s) => (
                <ul className="space-y-1">
                  {s.constraints.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
            />
            <MatrixRow
              label="Expected behavior"
              strategies={strategies}
              render={(s) => s.expectedBehavior}
            />
            <MatrixRow
              label="Known weakness"
              strategies={strategies}
              muted
              render={(s) => s.knownWeakness}
            />
            <MatrixRow
              label="Primary diagnostic"
              strategies={strategies}
              muted
              render={(s) => s.primaryDiagnostic}
            />
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-[88ch] text-[11.5px] leading-relaxed text-ink-faint">
        The regime-aware rule is one specification among four. The comparison
        is the output; no rule is presented as a recommendation.
      </p>
    </Section>
  );
}
