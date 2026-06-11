"""Performance and risk metrics, computed from daily net returns.

Conventions:
  * Annualization uses 252 trading days.
  * Sharpe uses daily excess returns over the Fama-French risk-free rate:
    mean(r - rf) / std(r - rf) * sqrt(252), consistently for all series.
  * VaR and CVaR are reported as positive loss numbers at 95% confidence.
  * Drawdowns are negative numbers (peak-to-trough losses).
"""

import numpy as np
import pandas as pd
from scipy import stats

import config

TDY = config.TRADING_DAYS_PER_YEAR


def cumulative_return(returns: pd.Series) -> float:
    return float((1 + returns).prod() - 1)


def annualized_return(returns: pd.Series) -> float:
    total = cumulative_return(returns)
    return float((1 + total) ** (TDY / len(returns)) - 1)


def annualized_volatility(returns: pd.Series) -> float:
    return float(returns.std() * np.sqrt(TDY))


def sharpe_ratio(returns: pd.Series, rf_daily: pd.Series = None) -> float:
    excess = returns if rf_daily is None else returns - rf_daily.reindex(returns.index).fillna(0.0)
    sd = excess.std()
    if sd == 0:
        return float("nan")
    return float(excess.mean() / sd * np.sqrt(TDY))


def sortino_ratio(returns: pd.Series, target: float = 0.0) -> float:
    downside = np.minimum(returns - target, 0.0)
    dd = float(np.sqrt((downside ** 2).mean()) * np.sqrt(TDY))
    if dd == 0:
        return float("nan")
    return float((annualized_return(returns) - target * TDY) / dd)


def max_drawdown(returns: pd.Series) -> float:
    wealth = (1 + returns).cumprod()
    peak = wealth.cummax()
    return float((wealth / peak - 1).min())


def max_10_day_drawdown(returns: pd.Series) -> float:
    rolling = (1 + returns).rolling(10).apply(np.prod, raw=True) - 1
    return float(rolling.min())


def historical_var(returns: pd.Series, alpha: float = config.VAR_CONFIDENCE) -> float:
    return float(-np.quantile(returns, 1 - alpha))


def historical_cvar(returns: pd.Series, alpha: float = config.VAR_CONFIDENCE) -> float:
    threshold = np.quantile(returns, 1 - alpha)
    tail = returns[returns <= threshold]
    if tail.empty:
        return historical_var(returns, alpha)
    return float(-tail.mean())


def skewness(returns: pd.Series) -> float:
    return float(stats.skew(returns, bias=False))


def kurtosis(returns: pd.Series) -> float:
    """Excess kurtosis (Fisher)."""
    return float(stats.kurtosis(returns, fisher=True, bias=False))


def worst_daily_return(returns: pd.Series) -> float:
    return float(returns.min())


def transaction_cost_drag(gross: pd.Series, net: pd.Series) -> float:
    w_gross = float((1 + gross).prod())
    w_net = float((1 + net).prod())
    return w_net / w_gross - 1


def calculate_performance_metrics(result, rf_daily: pd.Series, diagnostics: dict) -> dict:
    """Full metric block for one BacktestResult.

    `diagnostics` carries turnover/concentration summaries computed in
    diagnostics.py so the numbers come from a single source.
    """
    net = result.net
    return {
        "strategy": result.name,
        "lookback": result.lookback,
        "cumulativeReturn": cumulative_return(net),
        "annualizedReturn": annualized_return(net),
        "annualizedVolatility": annualized_volatility(net),
        "sharpeRatio": sharpe_ratio(net, rf_daily),
        "sortinoRatio": sortino_ratio(net),
        "maxDrawdown": max_drawdown(net),
        "max10DayDrawdown": max_10_day_drawdown(net),
        "historicalVaR95": historical_var(net),
        "historicalCVaR95": historical_cvar(net),
        "skewness": skewness(net),
        "kurtosis": kurtosis(net),
        "worstDailyReturn": worst_daily_return(net),
        "averageTurnover": diagnostics["averageTurnover"],
        "annualizedTurnover": diagnostics["annualizedTurnover"],
        "maxTurnover": diagnostics["maxTurnover"],
        "transactionCostDrag": transaction_cost_drag(result.gross, net),
        "averageConcentration": diagnostics["averageConcentration"],
        "averageEffectivePositions": diagnostics["averageEffectivePositions"],
        "maxSingleAssetWeight": diagnostics["maxSingleAssetWeight"],
        "startDate": net.index[0].strftime("%Y-%m-%d"),
        "endDate": net.index[-1].strftime("%Y-%m-%d"),
        "observations": int(len(net)),
    }
