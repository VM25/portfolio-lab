"""Price cleaning and return calculation.

Portfolio backtest returns use simple daily returns on adjusted close prices:

    r_t = P_t / P_{t-1} - 1
"""

import numpy as np
import pandas as pd

import config

# Single-day moves beyond this are treated as data errors for liquid ETFs.
MAX_PLAUSIBLE_DAILY_RETURN = 0.50


def clean_prices(prices: pd.DataFrame) -> pd.DataFrame:
    prices = prices.copy()
    prices = prices[~prices.index.duplicated(keep="first")]
    prices = prices.sort_index()

    all_null = [c for c in prices.columns if prices[c].dropna().empty]
    if all_null:
        raise ValueError(f"Assets with no usable price data: {all_null}")

    if (prices.fillna(1) <= 0).any().any():
        bad = prices.columns[(prices.fillna(1) <= 0).any()].tolist()
        raise ValueError(f"Non-positive prices found in: {bad}")

    # Forward-fill isolated missing observations (holiday mismatches etc.).
    prices = prices.ffill(limit=5)
    return prices


def calculate_simple_returns(prices: pd.DataFrame) -> pd.DataFrame:
    returns = prices.pct_change()
    returns = returns.replace([np.inf, -np.inf], np.nan)
    if (returns.abs() > MAX_PLAUSIBLE_DAILY_RETURN).any().any():
        bad = returns.columns[(returns.abs() > MAX_PLAUSIBLE_DAILY_RETURN).any()].tolist()
        raise ValueError(f"Implausible daily returns (>50%) found in: {bad}")
    return returns


def common_history_returns(returns: pd.DataFrame) -> pd.DataFrame:
    """Restrict to the period where every investable asset has return data.

    The universe includes ETFs with later inceptions (SHV: 2007-01,
    HYG: 2007-04), so the common backtest history begins at the latest
    first-valid date across assets. This constraint is reported honestly in
    the validation summary rather than papered over.
    """
    first_valid = returns.apply(lambda s: s.first_valid_index())
    start = first_valid.max()
    out = returns.loc[start:].dropna(how="any")
    return out


def align_returns_and_signals(returns: pd.DataFrame, signals: pd.DataFrame) -> pd.DataFrame:
    """Reindex daily signal data onto the return calendar (forward-filled)."""
    return signals.reindex(returns.index).ffill()
