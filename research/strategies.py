"""Strategy weight generation.

Four strategies share the same investable universe, rebalance calendar,
constraints, and transaction-cost model:

  1. Equal Weight                       — naive diversification baseline
  2. Global Minimum Variance            — covariance-driven defensive allocation
  3. Max Sharpe / Risk-Adjusted Return  — return-risk optimization (deliberately
                                          exposes expected-return sensitivity)
  4. Regime-Aware Allocation            — rule-based growth/defensive sleeves
                                          driven by correlation, CPI, and VIX
"""

import numpy as np
import pandas as pd

import config
import estimators
import optimizers


def equal_weight_strategy(tickers) -> pd.Series:
    n = len(tickers)
    return pd.Series(1.0 / n, index=list(tickers))


def gmv_strategy(
    lookback_returns: pd.DataFrame, max_weight: float = config.MAX_WEIGHT
) -> pd.Series:
    sigma = estimators.estimate_covariance_matrix(lookback_returns)
    return optimizers.solve_global_min_variance(sigma, max_weight)


def max_sharpe_strategy(
    lookback_returns: pd.DataFrame,
    rf: float = None,
    max_weight: float = config.MAX_WEIGHT,
) -> pd.Series:
    mu = estimators.estimate_expected_returns(lookback_returns)
    sigma = estimators.estimate_covariance_matrix(lookback_returns)
    if rf is None:
        rf = estimators.estimate_risk_free_rate(lookback_returns)
    return optimizers.solve_max_sharpe(mu, sigma, rf, max_weight)


def regime_aware_strategy(
    lookback_returns: pd.DataFrame,
    regime_label: str,
    vix_stress: bool,
    max_weight: float = config.MAX_WEIGHT,
) -> pd.Series:
    """Two-sleeve conditional allocation.

    Sleeve split comes from the regime label. Within each sleeve, assets are
    weighted by inverse realized volatility over the lookback window. Under
    VIX stress the SHV (cash proxy) floor inside the defensive sleeve rises.
    The stress defensive basket (TIP/GLD/DBC/SHV) replaces the normal
    defensive basket once the regime leaves "normal".
    """
    if regime_label not in config.REGIME_SLEEVE_WEIGHTS:
        raise ValueError(f"Invalid regime label: {regime_label}")

    sleeve_targets = config.REGIME_SLEEVE_WEIGHTS[regime_label]
    growth_assets = config.GROWTH_ASSETS
    defensive_assets = (
        config.NORMAL_DEFENSIVE_ASSETS
        if regime_label == "normal"
        else config.STRESS_DEFENSIVE_ASSETS
    )

    vol = estimators.estimate_realized_volatility(lookback_returns)

    weights = pd.Series(0.0, index=lookback_returns.columns)
    weights.loc[growth_assets] = _inverse_vol_sleeve(
        vol.loc[growth_assets], sleeve_targets["growth"]
    )
    defensive = _inverse_vol_sleeve(
        vol.loc[defensive_assets], sleeve_targets["defensive"]
    )

    # SHV floor (raised under VIX stress), funded from the rest of the sleeve.
    min_shv = (
        config.MIN_SHV_WEIGHT_VIX_STRESS
        if vix_stress
        else config.MIN_SHV_WEIGHT_NORMAL
    )
    if defensive.get("SHV", 0.0) < min_shv:
        others = defensive.index.difference(["SHV"])
        room = sleeve_targets["defensive"] - min_shv
        defensive.loc[others] = (
            defensive.loc[others] / defensive.loc[others].sum() * room
        )
        defensive.loc["SHV"] = min_shv
    weights.loc[defensive.index] = defensive

    capped = optimizers.project_weights_to_bounds(weights.values, max_weight)
    optimizers.validate_weights(capped, max_weight)
    return pd.Series(capped, index=weights.index)


def _inverse_vol_sleeve(vols: pd.Series, sleeve_target: float) -> pd.Series:
    raw = 1.0 / vols
    return raw / raw.sum() * sleeve_target


def generate_strategy_weights(
    strategy_name: str,
    lookback_returns: pd.DataFrame,
    regime_label: str = None,
    vix_stress: bool = False,
) -> pd.Series:
    if strategy_name == "Equal Weight":
        return equal_weight_strategy(lookback_returns.columns)
    if strategy_name == "Global Minimum Variance":
        return gmv_strategy(lookback_returns)
    if strategy_name == "Max Sharpe / Risk-Adjusted Return":
        return max_sharpe_strategy(lookback_returns)
    if strategy_name == "Regime-Aware Allocation":
        return regime_aware_strategy(lookback_returns, regime_label, vix_stress)
    raise ValueError(f"Unknown strategy: {strategy_name}")


# ---------------------------------------------------------------------------
# Benchmarks
# ---------------------------------------------------------------------------

def spy_benchmark_weights(tickers) -> pd.Series:
    w = pd.Series(0.0, index=list(tickers))
    w.loc["SPY"] = 1.0
    return w


def benchmark_6040_weights(tickers) -> pd.Series:
    w = pd.Series(0.0, index=list(tickers))
    for ticker, weight in config.BENCHMARK_6040.items():
        w.loc[ticker] = weight
    return w
