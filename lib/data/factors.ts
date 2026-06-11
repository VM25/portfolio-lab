import factors from "@/data/factor-exposures.json";
import type { FactorExposure, LookbackWindow } from "@/lib/types";

export const factorExposures = factors as unknown as FactorExposure[];

export function getFactorExposures(lookback: LookbackWindow): FactorExposure[] {
  return factorExposures.filter((f) => f.lookback === lookback);
}
