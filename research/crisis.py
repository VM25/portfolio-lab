"""Crisis-period analysis.

For each configured crisis window, strategy returns are sliced to the window
and risk metrics are recomputed. A (strategy, lookback, crisis) combination is
reported as "insufficient_data" when the strategy's return series does not
cover the full crisis window — typically because the lookback window plus ETF
inception dates push the backtest start past the crisis start. No values are
fabricated for those combinations.
"""

import pandas as pd

import config
import metrics

# Allow a few days of calendar slack at the window edges (the configured
# window boundaries may not be trading days).
EDGE_TOLERANCE_DAYS = 7


def slice_crisis_returns(returns: pd.Series, crisis_window) -> pd.Series:
    start, end = pd.Timestamp(crisis_window[0]), pd.Timestamp(crisis_window[1])
    return returns.loc[(returns.index >= start) & (returns.index <= end)]


def covers_full_window(returns: pd.Series, crisis_window) -> bool:
    start, end = pd.Timestamp(crisis_window[0]), pd.Timestamp(crisis_window[1])
    if returns.empty:
        return False
    starts_ok = returns.index[0] <= start + pd.Timedelta(days=EDGE_TOLERANCE_DAYS)
    ends_ok = returns.index[-1] >= end - pd.Timedelta(days=EDGE_TOLERANCE_DAYS)
    return bool(starts_ok and ends_ok)


def calculate_crisis_metrics(returns: pd.Series) -> dict:
    return {
        "cumulativeReturn": metrics.cumulative_return(returns),
        "annualizedVolatility": metrics.annualized_volatility(returns),
        "maxDrawdown": metrics.max_drawdown(returns),
        "max10DayDrawdown": metrics.max_10_day_drawdown(returns),
        "historicalVaR95": metrics.historical_var(returns),
        "historicalCVaR95": metrics.historical_cvar(returns),
        "worstDailyReturn": metrics.worst_daily_return(returns),
    }


def generate_crisis_metrics(results: dict) -> list:
    """Crisis metric records for every (series, lookback, crisis window)."""
    records = []
    for crisis_name, window in config.CRISIS_WINDOWS.items():
        # Benchmark-relative comparisons use SPY over the same window.
        for (name, lookback), result in results.items():
            sliced = slice_crisis_returns(result.net, window)
            record = {
                "crisisName": crisis_name,
                "startDate": window[0],
                "endDate": window[1],
                "strategy": name,
                "lookback": lookback,
            }
            if not covers_full_window(result.net, window):
                record["status"] = "insufficient_data"
                records.append(record)
                continue

            record["status"] = "valid"
            record.update(calculate_crisis_metrics(sliced))

            spy_result = results.get(("SPY", lookback))
            spy_sliced = slice_crisis_returns(spy_result.net, window)
            if covers_full_window(spy_result.net, window) and not spy_sliced.empty:
                spy_cum = metrics.cumulative_return(spy_sliced)
                record["benchmarkRelativeReturn"] = record["cumulativeReturn"] - spy_cum
            records.append(record)
    return records


def generate_crisis_wealth(results: dict) -> list:
    """Daily wealth paths (rebased to 100 at crisis start) for crisis charts."""
    rows = []
    for crisis_name, window in config.CRISIS_WINDOWS.items():
        for (name, lookback), result in results.items():
            if not covers_full_window(result.net, window):
                continue
            sliced = slice_crisis_returns(result.net, window)
            wealth = config.INITIAL_WEALTH * (1 + sliced).cumprod()
            for date, value in wealth.items():
                rows.append({
                    "crisisName": crisis_name,
                    "strategy": name,
                    "lookback": lookback,
                    "date": date.strftime("%Y-%m-%d"),
                    "wealth": round(float(value), 2),
                })
    return rows
