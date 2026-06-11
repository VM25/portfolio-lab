import Section from "@/components/layout/Section";
import SectionHeader from "@/components/layout/SectionHeader";
import ValidationLedger from "@/components/layout/ValidationLedger";

const PANELS: { title: string; items: string[] }[] = [
  {
    title: "Backtest assumptions",
    items: [
      "Historical ETF adjusted-close data (Yahoo Finance)",
      "Monthly rebalancing at month-end trading days",
      "Long-only portfolios, 35% per-asset weight cap",
      "5 bps transaction cost per unit of turnover, measured against drifted pre-trade weights; initial cash buy-in excluded",
      "Geometric annualized returns; volatility and Sharpe scaled by √252 from daily figures",
      "VaR/CVaR reported as positive daily loss magnitudes at 95% confidence; drawdowns reported as negative values",
      "SHV as the optimizer's investable cash proxy; Fama-French RF for standardized performance reporting",
      "CPI signal lagged one month to avoid look-ahead",
      "VIX used as a signal only, never an allocation",
      "Crisis windows selected manually and documented",
    ],
  },
  {
    title: "Data limitations",
    items: [
      "Common ETF history begins 2007 (SHV, HYG inceptions), limiting GFC coverage for longer lookbacks",
      "ETF proxies imperfectly represent asset classes",
      "CPI data is released with delay and may be revised",
      "Yahoo Finance adjusted prices can be restated",
    ],
  },
  {
    title: "Model limitations",
    items: [
      "Expected-return estimates are noisy; sample means are used deliberately to expose this",
      "Covariance estimates are unstable across windows",
      "Regime thresholds are judgment calls that may overfit past crises",
      "The Fama-French model is an equity-factor diagnostic: it does not fully explain strategies holding bonds, TIPS, gold, commodities, credit, REITs, and cash; a fuller attribution would add term, credit, inflation, commodity, and real-asset factors",
      "Regression intercepts are residual returns under this limited model, not proof of alpha or skill",
      "Results are sensitive to start date, end date, and lookback choice",
    ],
  },
  {
    title: "Implementation limitations",
    items: [
      "Linear cost model ignores spreads, market impact, and capacity",
      "Taxes are ignored",
      "Liquidity is assumed sufficient at all rebalances",
      "No shorting, leverage, or derivatives are modeled",
    ],
  },
];

export default function AssumptionsLimitationsSection() {
  return (
    <Section id="limits">
      <SectionHeader
        moduleId="limits"
        title="Boundary conditions"
        thesis="These results are historical and assumption-dependent. The analysis is only as good as its assumptions, so they are stated here rather than buried."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {PANELS.map((panel) => (
          <div key={panel.title} className="border border-border-soft bg-panel p-5">
            <h3 className="text-[13.5px] font-semibold uppercase tracking-wider text-ink-secondary">
              {panel.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {panel.items.map((item) => (
                <li key={item} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-muted">
                  <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <ValidationLedger />
      </div>
    </Section>
  );
}
