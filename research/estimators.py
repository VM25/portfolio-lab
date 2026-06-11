"""Expected return, covariance, volatility, and risk-free estimators.

All estimators consume a lookback window of daily simple returns and
annualize with 252 trading days. Sample estimates are used deliberately —
their instability is part of what the project studies.
"""

import numpy as np
import pandas as pd

import config


def estimate_expected_returns(lookback_returns: pd.DataFrame) -> pd.Series:
    mu_annual = lookback_returns.mean() * config.TRADING_DAYS_PER_YEAR
    if not np.isfinite(mu_annual).all():
        raise ValueError("Non-finite expected return estimates.")
    return mu_annual


def estimate_covariance_matrix(lookback_returns: pd.DataFrame) -> pd.DataFrame:
    sigma_annual = lookback_returns.cov() * config.TRADING_DAYS_PER_YEAR
    # Small ridge keeps the matrix numerically well-conditioned for solvers.
    n = sigma_annual.shape[0]
    sigma_annual = sigma_annual + config.COVARIANCE_RIDGE_EPSILON * np.eye(n)
    values = sigma_annual.values
    if not np.isfinite(values).all():
        raise ValueError("Non-finite covariance estimates.")
    if not np.allclose(values, values.T, atol=1e-10):
        raise ValueError("Covariance matrix is not symmetric.")
    return sigma_annual


def estimate_realized_volatility(lookback_returns: pd.DataFrame) -> pd.Series:
    vol = lookback_returns.std() * np.sqrt(config.TRADING_DAYS_PER_YEAR)
    if (vol <= 0).any() or not np.isfinite(vol).all():
        raise ValueError("Invalid realized volatility estimates.")
    return vol


def estimate_risk_free_rate(lookback_returns: pd.DataFrame) -> float:
    """Risk-free proxy for the Max Sharpe optimizer.

    Default per spec: annualized SHV (T-bill ETF) return over the lookback.
    """
    shv = lookback_returns["SHV"]
    cumulative = float((1 + shv).prod() - 1)
    periods = len(shv)
    rf = (1 + cumulative) ** (config.TRADING_DAYS_PER_YEAR / periods) - 1
    if not np.isfinite(rf):
        raise ValueError("Non-finite risk-free estimate.")
    return rf
