import universe from "@/data/asset-universe.json";
import type { AssetUniverseItem } from "@/lib/types";

export const assetUniverse = universe as unknown as AssetUniverseItem[];

export const investableAssets = assetUniverse.filter((a) => a.investable);
export const signalSeries = assetUniverse.filter((a) => !a.investable);

export function getAssetsByBucket(bucket: AssetUniverseItem["bucket"]) {
  return assetUniverse.filter((a) => a.bucket === bucket);
}
