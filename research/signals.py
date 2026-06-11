"""Regime signal engine.

Three signals drive the Regime-Aware Allocation strategy:

  1. SPY-TLT 90-day rolling correlation  (stress when > +0.20)
  2. CPI year-over-year inflation        (stress when > 3%), lagged one month
     so a rebalance can never see a CPI print before its public release
  3. VIX level                           (stress when > 25), signal only —
     VIX is never an investable asset in this project

Regime score = number of active stress conditions:
  0 -> "normal", 1 -> "watch", >=2 -> "defensive"
"""

import pandas as pd

import config


def compute_spy_tlt_rolling_correlation(returns: pd.DataFrame) -> pd.Series:
    corr = (
        returns["SPY"]
        .rolling(config.CORRELATION_WINDOW)
        .corr(returns["TLT"])
    )
    corr.name = "spy_tlt_corr"
    return corr


def compute_cpi_yoy(cpi: pd.Series) -> pd.Series:
    cpi_yoy = cpi / cpi.shift(12) - 1
    cpi_yoy.name = "cpi_yoy"
    return cpi_yoy


def apply_cpi_signal_lag(cpi_yoy: pd.Series) -> pd.Series:
    """Shift the monthly CPI YoY series forward by the configured lag.

    After the shift, the value indexed at month M is the CPI YoY of month
    M - lag, i.e. the latest print an investor could actually have known.
    """
    lagged = cpi_yoy.shift(config.CPI_SIGNAL_LAG_MONTHS)
    lagged.name = "cpi_yoy_lagged"
    return lagged


def compute_vix_signal(vix: pd.Series) -> pd.Series:
    vix = vix.copy()
    vix.name = "vix"
    return vix


def generate_regime_signals(
    returns: pd.DataFrame, cpi: pd.Series, vix: pd.Series
) -> pd.DataFrame:
    """Build the daily regime signal frame aligned to the return calendar."""
    corr = compute_spy_tlt_rolling_correlation(returns)

    cpi_yoy_lagged = apply_cpi_signal_lag(compute_cpi_yoy(cpi))
    # Monthly -> daily: each day carries the most recent *lagged* CPI print.
    cpi_daily = cpi_yoy_lagged.reindex(
        cpi_yoy_lagged.index.union(returns.index)
    ).ffill().reindex(returns.index)

    vix_daily = compute_vix_signal(vix).reindex(returns.index).ffill()

    frame = pd.DataFrame(
        {
            "spy_tlt_corr_90d": corr,
            "cpi_yoy": cpi_daily,
            "vix": vix_daily,
        },
        index=returns.index,
    )
    frame["corr_stress"] = frame["spy_tlt_corr_90d"] > config.CORRELATION_STRESS_THRESHOLD
    frame["inflation_stress"] = frame["cpi_yoy"] > config.CPI_STRESS_THRESHOLD
    frame["vix_stress"] = frame["vix"] > config.VIX_STRESS_THRESHOLD

    frame["regime_score"] = (
        frame["corr_stress"].astype(int)
        + frame["inflation_stress"].astype(int)
        + frame["vix_stress"].astype(int)
    )
    frame["regime_label"] = frame["regime_score"].map(classify_regime)
    return frame


def classify_regime(score: int) -> str:
    if score == 0:
        return "normal"
    if score == 1:
        return "watch"
    return "defensive"
