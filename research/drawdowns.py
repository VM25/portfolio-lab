"""Wealth index and drawdown calculations."""

import pandas as pd

import config


def calculate_wealth_index(returns: pd.Series,
                           initial_wealth: float = config.INITIAL_WEALTH) -> pd.Series:
    return initial_wealth * (1 + returns).cumprod()


def calculate_drawdown_series(wealth: pd.Series) -> pd.DataFrame:
    peak = wealth.cummax()
    drawdown = wealth / peak - 1
    return pd.DataFrame({"wealth": wealth, "runningPeak": peak, "drawdown": drawdown})


def calculate_max_drawdown(drawdowns: pd.Series) -> float:
    return float(drawdowns.min())


def generate_drawdown_data(results: dict) -> dict:
    """Drawdown frames for every (name, lookback) BacktestResult."""
    out = {}
    for key, result in results.items():
        wealth = calculate_wealth_index(result.net)
        out[key] = calculate_drawdown_series(wealth)
    return out
