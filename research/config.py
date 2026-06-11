"""Central configuration for the Portfolio Risk & Allocation Analytics research engine.

All universe definitions, thresholds, dates, and model assumptions live here.
No strategy file should hardcode thresholds, and no frontend file should
hardcode quant assumptions.
"""

from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

RESEARCH_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = RESEARCH_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"

# ---------------------------------------------------------------------------
# Asset universe
# ---------------------------------------------------------------------------

INVESTABLE_TICKERS = [
    "SPY",
    "QQQ",
    "IWM",
    "EFA",
    "EEM",
    "TLT",
    "IEF",
    "TIP",
    "HYG",
    "GLD",
    "DBC",
    "VNQ",
    "SHV",
]

SIGNAL_TICKERS = {
    "VIX": "^VIX",
}

ASSET_METADATA = {
    "SPY": ("SPDR S&P 500 ETF", "U.S. large-cap equity", "Equity benchmark", "growth"),
    "QQQ": ("Invesco QQQ Trust", "U.S. growth equity", "Growth exposure", "growth"),
    "IWM": ("iShares Russell 2000 ETF", "U.S. small-cap equity", "Size exposure", "growth"),
    "EFA": ("iShares MSCI EAFE ETF", "Developed international equity", "International diversification", "growth"),
    "EEM": ("iShares MSCI Emerging Markets ETF", "Emerging markets equity", "EM growth / risk exposure", "growth"),
    "TLT": ("iShares 20+ Year Treasury Bond ETF", "Long-duration Treasuries", "Duration exposure", "defensive"),
    "IEF": ("iShares 7-10 Year Treasury Bond ETF", "Intermediate Treasuries", "Core bond exposure", "defensive"),
    "TIP": ("iShares TIPS Bond ETF", "TIPS", "Inflation-linked bond exposure", "inflation_hedge"),
    "HYG": ("iShares iBoxx High Yield Corporate Bond ETF", "High-yield credit", "Credit risk exposure", "growth"),
    "GLD": ("SPDR Gold Shares", "Gold", "Real asset / crisis hedge", "inflation_hedge"),
    "DBC": ("Invesco DB Commodity Index Tracking Fund", "Broad commodities", "Inflation-sensitive exposure", "inflation_hedge"),
    "VNQ": ("Vanguard Real Estate ETF", "REITs", "Real estate exposure", "growth"),
    "SHV": ("iShares Short Treasury Bond ETF", "Treasury bills / cash proxy", "Defensive cash-like exposure", "defensive"),
}

# Cash proxy fallbacks for early-history calculations. Any fallback used must
# be documented in the validation summary. Never replace silently.
CASH_PROXY_FALLBACKS = ["SHY", "BIL", "FF_RF"]

# ---------------------------------------------------------------------------
# Dates and backtest calendar
# ---------------------------------------------------------------------------

PRICE_START_DATE = "2006-01-01"
PRICE_END_DATE = None  # None -> latest available

LOOKBACK_WINDOWS = {
    "6M": 126,
    "1Y": 252,
    "3Y": 756,
}

PRIMARY_LOOKBACK = "1Y"

REBALANCE_FREQUENCY = "M"
TRADING_DAYS_PER_YEAR = 252
INITIAL_WEALTH = 100.0

# ---------------------------------------------------------------------------
# Constraints
# ---------------------------------------------------------------------------

MAX_WEIGHT = 0.35
ALLOW_SHORTING = False

# ---------------------------------------------------------------------------
# Transaction cost model
# ---------------------------------------------------------------------------

TRANSACTION_COST_BPS = 5
TRANSACTION_COST_RATE = 0.0005
TURNOVER_CONVENTION = "total_absolute_turnover"

# ---------------------------------------------------------------------------
# Covariance stabilization
# ---------------------------------------------------------------------------

COVARIANCE_RIDGE_EPSILON = 1e-6

# ---------------------------------------------------------------------------
# Regime signals
# ---------------------------------------------------------------------------

CORRELATION_WINDOW = 90
CORRELATION_STRESS_THRESHOLD = 0.20
CPI_STRESS_THRESHOLD = 0.03
VIX_STRESS_THRESHOLD = 25

# CPI is released with a delay; lag the signal one month so a rebalance can
# never use a CPI print before it was public knowledge.
CPI_SIGNAL_LAG_MONTHS = 1

# ---------------------------------------------------------------------------
# Crisis windows (manually selected, documented)
# ---------------------------------------------------------------------------

CRISIS_WINDOWS = {
    "Global Financial Crisis": ("2008-01-01", "2009-12-31"),
    "COVID Market Shock": ("2020-02-01", "2020-04-30"),
    "2022 Inflation / Rate-Hike Drawdown": ("2022-01-01", "2022-12-31"),
}

# ---------------------------------------------------------------------------
# Benchmarks
# ---------------------------------------------------------------------------

BENCHMARK_6040 = {
    "SPY": 0.60,
    "IEF": 0.40,
}

BENCHMARK_NAMES = ["SPY", "60/40"]

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

STRATEGY_NAMES = [
    "Equal Weight",
    "Global Minimum Variance",
    "Max Sharpe / Risk-Adjusted Return",
    "Regime-Aware Allocation",
]

GROWTH_ASSETS = ["SPY", "QQQ", "IWM", "EFA", "EEM", "VNQ", "HYG"]
NORMAL_DEFENSIVE_ASSETS = ["IEF", "TLT", "TIP", "GLD", "SHV"]
STRESS_DEFENSIVE_ASSETS = ["TIP", "GLD", "DBC", "SHV"]

REGIME_SLEEVE_WEIGHTS = {
    "normal": {
        "growth": 0.65,
        "defensive": 0.35,
    },
    "watch": {
        "growth": 0.55,
        "defensive": 0.45,
    },
    "defensive": {
        "growth": 0.45,
        "defensive": 0.55,
    },
}

# Minimum SHV (cash proxy) weight inside the portfolio, raised under VIX stress.
MIN_SHV_WEIGHT_NORMAL = 0.05
MIN_SHV_WEIGHT_VIX_STRESS = 0.15

# ---------------------------------------------------------------------------
# Risk metrics
# ---------------------------------------------------------------------------

VAR_CONFIDENCE = 0.95

# ---------------------------------------------------------------------------
# Export downsampling (chart payload control; full daily series remain in
# data/processed/ CSVs for reproducibility)
# ---------------------------------------------------------------------------

RETURNS_EXPORT_STEP_DAYS = 5   # weekly sampling for wealth/drawdown charts
SIGNALS_EXPORT_STEP_DAYS = 5   # weekly sampling for regime signal charts
