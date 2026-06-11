import Section from "@/components/layout/Section";
import SectionHeader from "@/components/layout/SectionHeader";
import { marketContext } from "@/lib/data/market-context";
import { formatDate } from "@/lib/formatters";

const CLAIMS: { lead: string; body: string }[] = [
  {
    lead: "Stock-bond diversification is conditional.",
    body: "When equity and Treasury returns turn positively correlated, the hedge that most allocation frameworks rely on weakens at exactly the wrong time.",
  },
  {
    lead: "Inflation regimes move both legs at once.",
    body: "Persistent inflation and rate shocks can push equities and nominal bonds down together, as both did through 2022.",
  },
  {
    lead: "So allocation rules are tested across regimes.",
    body: "Correlation, inflation, and volatility stress are classified explicitly, and every rule is evaluated inside and outside those states using liquid ETF proxies.",
  },
];

/** Premise: the argument in three claims, then the sources that support the
 * market-level statements, with calculation provenance noted per source. */
export default function MarketContextSection() {
  return (
    <Section id="premise">
      <SectionHeader
        moduleId="premise"
        title="The diversification assumption under test"
        thesis="Static diversification assumes asset relationships stay useful. The analysis treats that assumption as the variable under test."
      />

      <div className="grid gap-x-10 gap-y-5 md:grid-cols-3">
        {CLAIMS.map((c, i) => (
          <div key={c.lead} className="border-t border-border-strong pt-3">
            <span className="font-mono text-[11px] text-ink-faint">{i + 1}</span>
            <p className="mt-1.5 text-[15px] font-semibold leading-snug text-ink">
              {c.lead}
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{c.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <h3 className="font-subhead text-[14px] font-semibold text-ink">Sources and provenance</h3>
        <ol className="mt-3 grid gap-x-10 border-t border-divider md:grid-cols-2">
          {marketContext.map((item, i) => (
            <li key={item.id} className="flex gap-3 border-b border-divider py-3">
              <span className="shrink-0 font-mono text-[11px] text-ink-faint">
                [{i + 1}]
              </span>
              <div>
                <p className="text-[12.5px] font-medium leading-snug text-ink">
                  {item.title}
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
                  {item.summary}
                </p>
                <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-ink-faint">
                  {item.sourceUrl ? (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-border-strong underline-offset-2 transition-colors hover:text-strat-gmv"
                    >
                      {item.sourceName}
                    </a>
                  ) : (
                    item.sourceName
                  )}
                  {item.date && `, ${formatDate(item.date)}`}
                </p>
                <p className="mt-0.5 text-[11px] italic leading-snug text-ink-faint">
                  {item.relevance}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
