import context from "@/data/market-context.json";
import type { MarketContextItem } from "@/lib/types";

export const marketContext = context as unknown as MarketContextItem[];
