import definitions from "@/data/benchmark-definitions.json";
import backtestConfig from "@/data/backtest-config.json";
import type { BacktestConfig, BenchmarkDefinition } from "@/lib/types";

export const benchmarkDefinitions = definitions as unknown as BenchmarkDefinition[];
export const config = backtestConfig as unknown as BacktestConfig;
