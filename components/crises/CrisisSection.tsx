import Section from "@/components/layout/Section";
import SectionHeader from "@/components/layout/SectionHeader";
import {
  crisisNames,
  getCrisisMetrics,
  getCrisisWealthRows,
} from "@/lib/data/crisis";
import { SERIES_ORDER } from "@/lib/chart-utils";
import type { LookbackWindow } from "@/lib/types";
import CrisisExplorer, {
  type CrisisData,
  type CrisisDossierContent,
} from "./CrisisExplorer";

const LOOKBACKS: LookbackWindow[] = ["6M", "1Y", "3Y"];

const DOSSIERS: CrisisDossierContent[] = [
  {
    name: "Global Financial Crisis",
    shortName: "2008 GFC",
    period: "Jan 2008 - Dec 2009",
    stressMechanism:
      "A credit and banking crisis: equity, credit, real estate, and commodities sold off together while Treasuries rallied hard.",
    whyItMatters:
      "The classic test of whether duration actually diversifies an equity shock, and in this window, it did.",
    mainLesson:
      "In this window, defensive allocations built on Treasuries held up; diversification across risk assets alone did not.",
  },
  {
    name: "COVID Market Shock",
    shortName: "2020 COVID",
    period: "Feb 2020 - Apr 2020",
    stressMechanism:
      "A rapid liquidity-driven equity crash followed by a sharp rebound; in the dash for cash, traditionally defensive assets also came under brief selling pressure.",
    whyItMatters:
      "Tests strategy behavior in a fast crash where monthly rebalancing and reactive signals inevitably lag.",
    mainLesson:
      "Pre-positioned defensiveness mattered more than reaction speed; rules that respond monthly cannot dodge a three-week crash.",
  },
  {
    name: "2022 Inflation / Rate-Hike Drawdown",
    shortName: "2022 Inflation",
    period: "Jan 2022 - Dec 2022",
    stressMechanism:
      "Persistent inflation and aggressive rate hikes pushed stocks and bonds down together, the stock-bond correlation turned positive.",
    whyItMatters:
      "A clear stress case for static 60/40 diversification, both legs fell together, and the regime the stress signals were designed to detect.",
    mainLesson:
      "When correlation flips positive, duration adds to losses instead of offsetting them; in this window, inflation hedges and cash provided the stronger defense.",
  },
];

export default function CrisisSection() {
  const data = Object.fromEntries(
    crisisNames.map((crisis) => [
      crisis,
      Object.fromEntries(
        LOOKBACKS.map((lb) => {
          const rows = getCrisisWealthRows(crisis, lb);
          const present = new Set(
            rows.length ? Object.keys(rows[0]).filter((k) => k !== "date") : [],
          );
          return [
            lb,
            {
              metrics: getCrisisMetrics(crisis, lb),
              rows,
              series: SERIES_ORDER.filter((s) => present.has(s)),
            },
          ];
        }),
      ),
    ]),
  ) as CrisisData;

  return (
    <Section id="stress">
      <SectionHeader
        moduleId="stress"
        title="Crisis-window behavior"
        thesis="Strategy behavior during 2008, 2020, and 2022, periods chosen because each broke a different assumption. Rankings can change across regimes; that is the finding."
        note="Combinations without full crisis coverage are labeled insufficient_data rather than estimated. The 2008 window is only fully covered at the 6M lookback because the common ETF history begins in 2007. Benchmarks are aligned to the same common strategy sample so crisis comparisons remain like-for-like, SPY is marked insufficient at longer lookbacks for alignment, not because SPY lacks data."
      />
      <CrisisExplorer dossiers={DOSSIERS} data={data} />
    </Section>
  );
}
