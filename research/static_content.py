"""Static, hand-authored content exported alongside generated analytics:
asset universe descriptions, strategy factsheets, benchmark definitions,
backtest configuration, and sourced market context.

These are descriptive records, not computed results. Every current-market
claim in MARKET_CONTEXT carries a credible source.
"""

import config


# Specific model role per asset: how each series is actually used across the
# benchmarks and the Regime-Aware sleeve construction. Displayed in the Asset
# Role Matrix instead of a generic "sleeve member" label.
MODEL_ROLES = {
    "SPY": "Benchmark + growth/risk sleeve",
    "QQQ": "Growth/risk sleeve",
    "IWM": "Growth/risk sleeve",
    "EFA": "Growth/risk sleeve",
    "EEM": "Growth/risk sleeve",
    "HYG": "Credit/risk sleeve",
    "VNQ": "Listed real estate / risk sleeve",
    "TLT": "Duration sleeve",
    "IEF": "60/40 benchmark + duration sleeve",
    "TIP": "Inflation hedge sleeve",
    "GLD": "Real asset hedge sleeve",
    "DBC": "Commodity stress basket",
    "SHV": "Cash proxy / defensive sleeve",
}


def asset_universe() -> list:
    rows = []
    for ticker in config.INVESTABLE_TICKERS:
        name, category, role, bucket = config.ASSET_METADATA[ticker]
        rows.append({
            "ticker": ticker,
            "name": name,
            "category": category,
            "role": role,
            "bucket": bucket,
            "investable": True,
            "modelRole": MODEL_ROLES[ticker],
            "usedInRegimeStrategy": (
                ticker in config.GROWTH_ASSETS
                or ticker in config.NORMAL_DEFENSIVE_ASSETS
                or ticker in config.STRESS_DEFENSIVE_ASSETS
            ),
        })
    rows.extend([
        {
            "ticker": "VIX",
            "name": "CBOE Volatility Index",
            "category": "Implied volatility index",
            "role": "Market stress indicator (signal only, never an allocation)",
            "bucket": "signal",
            "investable": False,
            "modelRole": "Signal only",
            "usedInRegimeStrategy": True,
        },
        {
            "ticker": "CPI YoY",
            "name": "U.S. CPI year-over-year (FRED CPIAUCSL)",
            "category": "Inflation series",
            "role": "Inflation regime indicator (lagged one month, signal only)",
            "bucket": "signal",
            "investable": False,
            "modelRole": "Signal only",
            "usedInRegimeStrategy": True,
        },
        {
            "ticker": "SPY-TLT corr",
            "name": "90-day SPY-TLT rolling correlation",
            "category": "Derived diversification signal",
            "role": "Stock-bond diversification indicator (signal only)",
            "bucket": "signal",
            "investable": False,
            "modelRole": "Signal only (calculated from ETF returns)",
            "usedInRegimeStrategy": True,
        },
    ])
    return rows


def strategy_summary() -> list:
    return [
        {
            "strategy": "Equal Weight",
            "category": "benchmark",
            "description": "Allocates equally across the 13-ETF investable universe, rebalanced monthly.",
            "objective": "Naive diversification baseline with no optimization.",
            "inputs": ["Asset universe only"],
            "constraints": ["Fully invested", "Long-only", "Monthly rebalance"],
            "strengths": [
                "No estimation risk",
                "Low turnover",
                "Transparent and hard to overfit",
            ],
            "weaknesses": [
                "Ignores risk differences across assets",
                "Equity-heavy risk profile despite equal capital weights",
            ],
            "expectedBehavior": "Steady diversified exposure; risk dominated by the equity sleeve.",
            "knownWeakness": "Treats a T-bill ETF and emerging-market equity as equally deserving of capital.",
            "primaryDiagnostic": "Benchmark-relative drawdown",
        },
        {
            "strategy": "Global Minimum Variance",
            "category": "optimized",
            "description": "Minimizes estimated portfolio variance subject to long-only weights and a 35% per-asset cap.",
            "objective": "Covariance-driven defensive allocation.",
            "inputs": ["Rolling covariance matrix (6M / 1Y / 3Y lookbacks)"],
            "constraints": ["Fully invested", "Long-only", "Max 35% per asset"],
            "strengths": [
                "No expected-return estimates required",
                "Historically lower volatility and drawdowns",
            ],
            "weaknesses": [
                "Crowds into low-volatility assets (cash, short Treasuries)",
                "Sensitive to the covariance estimation window",
            ],
            "expectedBehavior": "Defensive, bond- and cash-heavy allocations; low participation in equity rallies.",
            "knownWeakness": "Can concentrate in whatever looked calm during the lookback window.",
            "primaryDiagnostic": "Concentration and weight stability",
        },
        {
            "strategy": "Max Sharpe / Risk-Adjusted Return",
            "category": "optimized",
            "description": "Maximizes estimated excess return per unit of estimated volatility using sample means and covariances.",
            "objective": "Return-risk optimization, and a live demonstration of its input sensitivity.",
            "inputs": [
                "Sample expected returns over the lookback",
                "Rolling covariance matrix",
                "Risk-free rate (annualized SHV return over the lookback)",
            ],
            "constraints": ["Fully invested", "Long-only", "Max 35% per asset"],
            "strengths": [
                "Directly targets risk-adjusted return",
                "Textbook mean-variance tangency logic",
            ],
            "weaknesses": [
                "Highly sensitive to noisy expected-return estimates",
                "High turnover and concentration without constraints",
            ],
            "expectedBehavior": "Chases whatever had the best recent risk-adjusted run; allocation shifts sharply across lookbacks.",
            "knownWeakness": "Expected returns estimated from short windows are noise-dominated; instability is the lesson, not a bug.",
            "primaryDiagnostic": "Turnover and lookback sensitivity",
        },
        {
            "strategy": "Regime-Aware Allocation",
            "category": "rule_based",
            "description": "Splits the portfolio into growth and defensive sleeves whose sizes respond to SPY-TLT correlation, lagged CPI inflation, and VIX stress signals.",
            "objective": "Test how conditional defensive allocation behaves across changing regimes; the purpose is comparison, not proof of superiority.",
            "inputs": [
                "90-day SPY-TLT rolling correlation (> +0.20 stress)",
                "CPI YoY, lagged one month (> 3% stress)",
                "VIX level (> 25 stress, signal only)",
                "Inverse-volatility weights within sleeves",
            ],
            "constraints": ["Fully invested", "Long-only", "Max 35% per asset", "SHV floor 5% (15% under VIX stress)"],
            "strengths": [
                "Transparent, interpretable rules",
                "Defensive basket shifts toward TIPS, gold, commodities, and cash under stress",
            ],
            "weaknesses": [
                "Signals are reactive, not predictive",
                "Thresholds are judgment calls that may overfit past crises",
            ],
            "expectedBehavior": "Holds more defensive assets when multiple stress signals are active; lags fast reversals.",
            "knownWeakness": "A rules-based framework tested on the same history that motivated its rules.",
            "primaryDiagnostic": "Crisis-window drawdown vs. benchmarks",
        },
    ]


def benchmark_definitions() -> list:
    return [
        {
            "name": "SPY",
            "description": "U.S. large-cap equity market proxy, buy-and-hold.",
            "weights": {"SPY": 1.0},
            "rebalance": "none",
            "role": "Primary visual benchmark and equity market reference.",
        },
        {
            "name": "60/40",
            "description": "Traditional balanced allocation: 60% SPY / 40% IEF, rebalanced monthly with transaction costs.",
            "weights": dict(config.BENCHMARK_6040),
            "rebalance": "monthly",
            "role": "Traditional stock-bond allocation benchmark. IEF (intermediate Treasuries) is used rather than TLT to avoid an overly duration-sensitive benchmark.",
        },
        {
            "name": "Equal Weight",
            "description": "Equal allocation across all 13 investable ETFs, rebalanced monthly. Also evaluated as Strategy 1.",
            "weights": {t: round(1 / len(config.INVESTABLE_TICKERS), 6) for t in config.INVESTABLE_TICKERS},
            "rebalance": "monthly",
            "role": "Internal diversified baseline.",
        },
    ]


def backtest_config() -> dict:
    return {
        "rebalanceFrequency": "monthly",
        "lookbackWindows": list(config.LOOKBACK_WINDOWS.keys()),
        "lookbackTradingDays": dict(config.LOOKBACK_WINDOWS),
        "primaryLookback": config.PRIMARY_LOOKBACK,
        "transactionCostBps": config.TRANSACTION_COST_BPS,
        "turnoverConvention": config.TURNOVER_CONVENTION,
        "initialBuyInExcludedFromCosts": True,
        "maxWeight": config.MAX_WEIGHT,
        "allowShorting": config.ALLOW_SHORTING,
        "initialWealth": config.INITIAL_WEALTH,
        "tradingDaysPerYear": config.TRADING_DAYS_PER_YEAR,
        "correlationWindow": config.CORRELATION_WINDOW,
        "correlationStressThreshold": config.CORRELATION_STRESS_THRESHOLD,
        "cpiStressThreshold": config.CPI_STRESS_THRESHOLD,
        "vixStressThreshold": config.VIX_STRESS_THRESHOLD,
        "cpiSignalLagMonths": config.CPI_SIGNAL_LAG_MONTHS,
        "weightDriftModeled": True,
        "riskFreeForSharpe": "Fama-French daily RF",
        "riskFreeForMaxSharpe": "Annualized SHV return over lookback",
        "crisisWindows": {
            name: {"start": w[0], "end": w[1]}
            for name, w in config.CRISIS_WINDOWS.items()
        },
    }


def market_context() -> list:
    return [
        {
            "id": "stock-bond-correlation",
            "title": "The stock-bond correlation is not structurally stable",
            "summary": "Research on long-run U.S. data shows the stock-bond correlation flipped from mostly positive (1970s-1990s) to mostly negative (2000s-2010s), and rose again as inflation returned in 2021-2022, meaning the diversification benefit of Treasuries is regime-dependent, not guaranteed.",
            "sourceName": "AQR, A Changing Stock-Bond Correlation: Drivers and Implications (Journal of Portfolio Management, 2023)",
            "sourceUrl": "https://www.aqr.com/Insights/Research/Journal-Article/A-Changing-Stock-Bond-Correlation-Drivers-and-Implications",
            "date": "2023-04-01",
            "relevance": "Source supports the broader correlation-regime relationship. The SPY-TLT 90-day rolling correlation used in this analysis is calculated from ETF return data, not taken from the source.",
        },
        {
            "id": "inflation-regime",
            "title": "Inflation regimes reshape asset relationships",
            "summary": "U.S. CPI inflation (FRED series CPIAUCSL) exceeded 3% year-over-year for an extended stretch in 2021-2023 after a decade mostly below it. Inflation persistence is a key driver of how stocks, nominal bonds, TIPS, and real assets co-move.",
            "sourceName": "Federal Reserve Bank of St. Louis, FRED, CPIAUCSL",
            "sourceUrl": "https://fred.stlouisfed.org/series/CPIAUCSL",
            "date": "2026-05-01",
            "relevance": "CPI levels are sourced from FRED; the year-over-year transformation, one-month lag, and 3% stress threshold are calculations and assumptions of this analysis.",
        },
        {
            "id": "vix-stress",
            "title": "VIX as a market stress gauge",
            "summary": "The CBOE Volatility Index measures 30-day expected S&P 500 volatility implied by option prices. It is widely used as a market stress indicator; it is an index, not a directly investable asset.",
            "sourceName": "Cboe Global Markets, VIX Index",
            "sourceUrl": "https://www.cboe.com/tradable_products/vix/",
            "date": "2026-01-01",
            "relevance": "VIX levels come from the published index; the 25 stress threshold is an assumption of this analysis. The strategies never allocate to VIX.",
        },
        {
            "id": "multi-asset-context",
            "title": "Institutional allocators monitor cross-asset behavior continuously",
            "summary": "Standard institutional references such as J.P. Morgan's quarterly Guide to the Markets track asset-class returns, valuations, and correlations across cycles, reflecting that allocation decisions are evaluated against changing market conditions, not a single historical average.",
            "sourceName": "J.P. Morgan Asset Management, Guide to the Markets",
            "sourceUrl": "https://am.jpmorgan.com/us/en/asset-management/adv/insights/market-insights/guide-to-the-markets/",
            "date": "2026-04-01",
            "relevance": "Used as context for why the analysis reviews returns, correlations, and risks together rather than treating allocation as a static average, a smaller-scale version of standard institutional allocation review practice.",
        },
        {
            "id": "factor-data",
            "title": "Factor exposures are a standard return diagnostic",
            "summary": "The Fama-French research factors (market, size, value, profitability, investment) from the Kenneth French Data Library are the standard academic benchmark for decomposing portfolio returns into systematic exposures.",
            "sourceName": "Kenneth R. French, Data Library, Dartmouth",
            "sourceUrl": "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html",
            "date": "2026-05-01",
            "relevance": "Factor return data comes from the library; the regressions themselves are computed by this analysis as an exposure diagnostic, not as proof of alpha.",
        },
    ]
