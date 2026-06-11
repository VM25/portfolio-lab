import Section from "@/components/layout/Section";
import SectionHeader from "@/components/layout/SectionHeader";

const TAKEAWAYS = [
  {
    title: "Diversification is conditional",
    body: "Stock-bond relationships change with the inflation and rate regime. A mix that hedged well for two decades added to losses in 2022. Diversification should be evaluated across regimes, not assumed from a long-run average.",
  },
  {
    title: "Drawdowns matter more than averages",
    body: "Two strategies with similar annualized returns can differ enormously in peak-to-trough losses. For most investors the path, and whether they can stay invested through it, matters as much as the endpoint.",
  },
  {
    title: "Constraints make models usable",
    body: "Unconstrained optimizers concentrate and churn. Weight caps, long-only rules, and transaction-cost awareness are not afterthoughts; they are what separates a paper portfolio from an implementable one.",
  },
];

export default function InvestorInterpretationSection() {
  return (
    <Section id="interpretation">
      <SectionHeader
        moduleId="interpretation"
        title="Transferable findings"
        thesis="This is a comparison, not a recommendation. The analysis studies how allocation rules behave under stated historical assumptions; the transferable lessons are about process."
      />

      <div className="grid gap-x-10 gap-y-6 border-t-2 border-ink pt-6 md:grid-cols-3">
        {TAKEAWAYS.map((t, i) => (
          <div key={t.title}>
            <span className="text-[13px] italic text-ink-muted">
              {["I.", "II.", "III."][i]}
            </span>
            <h3 className="mt-1 text-[16px] font-semibold leading-snug text-ink">
              {t.title}
            </h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{t.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 max-w-[760px] text-[13px] leading-relaxed text-ink-muted">
        Real-world individual, HNI, and institutional portfolios often consider
        diversifiers beyond public equities and bonds, cash, real assets,
        private credit, hedge funds, commodities, structured products. This
        analysis deliberately uses liquid ETFs as transparent public-market
        proxies rather than modeling illiquid private assets, whose data,
        valuation, and liquidity characteristics require different methods. The
        ETF proxies are imperfect representations of those broader exposures.
      </p>
    </Section>
  );
}
