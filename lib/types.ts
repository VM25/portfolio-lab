export type LookbackWindow = "6M" | "1Y" | "3Y";

export type StrategyName =
  | "Equal Weight"
  | "Global Minimum Variance"
  | "Max Sharpe / Risk-Adjusted Return"
  | "Regime-Aware Allocation";

export type SeriesName = StrategyName | "SPY" | "60/40";

export type RegimeLabel = "normal" | "watch" | "defensive";

export type AssetUniverseItem = {
  ticker: string;
  name: string;
  category: string;
  role: string;
  bucket: "growth" | "defensive" | "inflation_hedge" | "signal";
  investable: boolean;
  /** Specific role in the model: benchmark membership, sleeve, or signal. */
  modelRole: string;
  usedInRegimeStrategy: boolean;
};

export type StrategySummary = {
  strategy: StrategyName;
  category: "benchmark" | "optimized" | "rule_based";
  description: string;
  objective: string;
  inputs: string[];
  constraints: string[];
  strengths: string[];
  weaknesses: string[];
  expectedBehavior: string;
  knownWeakness: string;
  primaryDiagnostic: string;
};

export type BenchmarkDefinition = {
  name: string;
  description: string;
  weights: Record<string, number>;
  rebalance: string;
  role: string;
};

export type StrategyReturnPoint = {
  date: string;
  strategy: string;
  lookback: LookbackWindow;
  grossReturn: number;
  netReturn: number;
  wealthGross: number;
  wealthNet: number;
};

export type PerformanceMetric = {
  strategy: string;
  lookback: LookbackWindow;
  cumulativeReturn: number;
  annualizedReturn: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  max10DayDrawdown: number;
  historicalVaR95: number;
  historicalCVaR95: number;
  skewness: number;
  kurtosis: number;
  worstDailyReturn: number;
  averageTurnover: number;
  annualizedTurnover: number;
  maxTurnover: number;
  transactionCostDrag: number;
  averageConcentration: number;
  averageEffectivePositions: number;
  maxSingleAssetWeight: number;
  startDate: string;
  endDate: string;
  observations: number;
};

export type PortfolioWeightPoint = {
  date: string;
  strategy: string;
  lookback: LookbackWindow;
  ticker: string;
  weight: number;
};

export type CrisisMetric = {
  crisisName: string;
  startDate: string;
  endDate: string;
  strategy: string;
  lookback: LookbackWindow;
  status: "valid" | "insufficient_data";
  cumulativeReturn?: number;
  annualizedVolatility?: number;
  maxDrawdown?: number;
  max10DayDrawdown?: number;
  historicalVaR95?: number;
  historicalCVaR95?: number;
  worstDailyReturn?: number;
  benchmarkRelativeReturn?: number;
};

export type CrisisWealthPoint = {
  crisisName: string;
  strategy: string;
  lookback: LookbackWindow;
  date: string;
  wealth: number;
};

export type FactorExposure = {
  strategy: string;
  lookback: LookbackWindow;
  alphaAnnualized: number;
  marketBeta: number;
  smb: number;
  hml: number;
  rmw: number;
  cma: number;
  rSquared: number;
  observations: number;
  alphaTStat?: number;
  marketBetaTStat?: number;
};

export type RegimeSignalPoint = {
  date: string;
  spyTltCorr90d: number;
  cpiYoy: number | null;
  vix: number;
  corrStress: boolean;
  inflationStress: boolean;
  vixStress: boolean;
  regimeScore: number;
  regimeLabel: RegimeLabel;
};

export type DrawdownPoint = {
  date: string;
  strategy: string;
  lookback: LookbackWindow;
  wealthNet: number;
  runningPeak: number;
  drawdown: number;
};

export type TurnoverDiagnostic = {
  date: string;
  strategy: string;
  lookback: LookbackWindow;
  turnover: number;
  transactionCost: number;
};

export type ConcentrationDiagnostic = {
  date: string;
  strategy: string;
  lookback: LookbackWindow;
  hhi: number;
  effectivePositions: number;
  maxSingleAssetWeight: number;
};

export type ValidationCheck = {
  name: string;
  status: "pass" | "fail";
  details: string;
  maxError?: number;
};

export type ValidationWarning = {
  name: string;
  message: string;
};

export type ValidationSummary = {
  status: "pass" | "warning" | "fail";
  generatedAt: string;
  checks: ValidationCheck[];
  warnings: ValidationWarning[];
};

export type MarketContextItem = {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl?: string;
  date?: string;
  relevance: string;
};

export type BacktestConfig = {
  rebalanceFrequency: string;
  lookbackWindows: LookbackWindow[];
  lookbackTradingDays: Record<LookbackWindow, number>;
  primaryLookback: LookbackWindow;
  transactionCostBps: number;
  turnoverConvention: string;
  maxWeight: number;
  allowShorting: boolean;
  initialWealth: number;
  tradingDaysPerYear: number;
  correlationWindow: number;
  correlationStressThreshold: number;
  cpiStressThreshold: number;
  vixStressThreshold: number;
  cpiSignalLagMonths: number;
  weightDriftModeled: boolean;
  riskFreeForSharpe: string;
  riskFreeForMaxSharpe: string;
  crisisWindows: Record<string, { start: string; end: string }>;
};

/** Compact chart series shape: parallel date/value arrays keep the payload
 * passed to client chart components small. */
export type CompactSeries = {
  name: string;
  dates: string[];
  values: number[];
};
