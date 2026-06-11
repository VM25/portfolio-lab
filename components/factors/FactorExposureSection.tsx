import Section from "@/components/layout/Section";
import SectionHeader from "@/components/layout/SectionHeader";
import { getFactorExposures } from "@/lib/data/factors";
import type { LookbackWindow } from "@/lib/types";
import FactorExplorer, { type FactorData } from "./FactorExplorer";

const LOOKBACKS: LookbackWindow[] = ["6M", "1Y", "3Y"];

export default function FactorExposureSection() {
  const data = Object.fromEntries(
    LOOKBACKS.map((lb) => [lb, getFactorExposures(lb)]),
  ) as FactorData;

  return (
    <Section id="factors">
      <SectionHeader
        moduleId="factors"
        title="Systematic factor exposure"
        thesis="Factor regressions help diagnose whether strategy returns reflect exposure to common risk factors. They do not prove investment skill by themselves."
      />
      <FactorExplorer data={data} />
    </Section>
  );
}
