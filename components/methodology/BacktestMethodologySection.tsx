import Section from "@/components/layout/Section";
import SectionHeader from "@/components/layout/SectionHeader";
import ValidationLedger from "@/components/layout/ValidationLedger";
import { config } from "@/lib/data/benchmarks";
import { formatPercent } from "@/lib/formatters";

const FLOW_STEPS = [
  { label: "Historical data", detail: "Daily adjusted-close returns up to t−1" },
  { label: "Estimate inputs", detail: "Means, covariances, signals on the lookback" },
  { label: "Solve weights", detail: "Strategy rule or optimizer, capped long-only" },
  { label: "Apply costs", detail: "5 bps × turnover vs drifted weights" },
  { label: "Compute returns", detail: "Hold weights until next month-end" },
  { label: "Measure risk", detail: "Drawdowns, VaR/CVaR, turnover, factors" },
];

export default function BacktestMethodologySection() {
  const grid: [string, string][] = [
    ["Rebalancing", "Monthly (month-end trading day)"],
    ["Lookbacks", config.lookbackWindows.join(" / ")],
    ["Costs", `${config.transactionCostBps} bps per unit turnover`],
    ["Constraints", `Long-only · ${formatPercent(config.maxWeight, 0)} per-asset cap`],
    ["Initial wealth", `$${config.initialWealth.toFixed(0)} index`],
    ["Bias control", "No look-ahead; CPI lagged 1 month"],
  ];

  return (
    <Section id="protocol">
      <SectionHeader
        moduleId="protocol"
        title="Rolling backtest construction"
        thesis="At each rebalance date, the model uses only historical data available before that date to estimate inputs, choose weights, and hold the portfolio until the next rebalance."
        note="Monthly rebalancing is a historical simulation rule, it does not mean the published figures update monthly."
      />

      <div className="mb-8 overflow-x-auto">
        <div className="mb-2">
          <span className="font-subhead text-[14px] font-semibold text-ink">Backtest process flow
          </span>
        </div>
        <ol className="flex min-w-[760px] items-stretch gap-0" aria-label="Backtest process flow">
          {FLOW_STEPS.map((step, i) => (
            <li key={step.label} className="flex flex-1 items-center">
              <div className="h-full flex-1 border border-border-soft bg-panel px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-strat-ra">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[12.5px] font-semibold text-ink">
                    {step.label}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-ink-muted">
                  {step.detail}
                </p>
              </div>
              {i < FLOW_STEPS.length - 1 && (
                <span aria-hidden className="px-1 font-mono text-strat-ra">→</span>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {grid.map(([label, value]) => (
              <div
                key={label}
                className="border border-border-soft bg-panel-deep px-3.5 py-3"
              >
                <div className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                  {label}
                </div>
                <div className="mt-1 font-mono text-[12px] leading-snug text-ink">
                  {value}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-ink-secondary">
            <p>
              <span className="font-semibold text-ink">No look-ahead bias.</span>{" "}
              A rebalance at month-end <span className="font-mono text-[12px]">t</span> sees
              returns and signals only through{" "}
              <span className="font-mono text-[12px]">t−1</span>. CPI is additionally lagged
              one month so the strategy never reacts to a print before its
              public release. New weights earn returns starting the next
              trading day.
            </p>
            <p>
              <span className="font-semibold text-ink">Costs and drift.</span>{" "}
              Weights drift with daily returns between rebalances. Turnover is
              measured against those drifted pre-trade weights, so even Equal
              Weight pays realistic rebalancing costs. The initial cash buy-in
              is excluded from costs and turnover statistics, which is why the
              100% SPY benchmark shows zero cumulative cost drag.
            </p>
            <p>
              <span className="font-semibold text-ink">Metric conventions.</span>{" "}
              Annualized returns are geometric annualized returns from daily
              net returns. Annualized volatility is daily return volatility
              scaled by √252. Sharpe ratios use daily excess returns scaled by
              √252; Sortino uses downside deviation relative to a zero daily
              return threshold. VaR and CVaR are daily historical loss
              estimates at 95% confidence, reported as positive loss
              magnitudes.
            </p>
            <p>
              <span className="font-semibold text-ink">Risk-free conventions.</span>{" "}
              The Max Sharpe optimizer uses the annualized SHV return over its
              lookback; reported Sharpe ratios use the daily Fama-French
              risk-free series. SHV is used inside the optimizer as an
              investable cash proxy, while Fama-French RF is used for
              standardized performance reporting, two conventions, each fit
              for its purpose.
            </p>
          </div>
        </div>
        <ValidationLedger />
      </div>
    </Section>
  );
}
