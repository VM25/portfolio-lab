"""Fama-French 5-factor exposure diagnostics.

Daily strategy excess returns are regressed on the five Fama-French factors:

    Rp - Rf = alpha + b_mkt*(Mkt-RF) + b_smb*SMB + b_hml*HML
                    + b_rmw*RMW + b_cma*CMA + e

The output is an exposure diagnostic, not a claim of alpha or skill. The
factor set is equity-centric; a multi-asset ETF portfolio will not be fully
explained by it, and R-squared is reported as model fit only.
"""

import numpy as np
import pandas as pd
import statsmodels.api as sm

import config

FACTOR_COLUMNS = ["Mkt-RF", "SMB", "HML", "RMW", "CMA"]
MIN_OBSERVATIONS = 252


def align_strategy_returns_with_factors(strategy_returns: pd.Series,
                                        factors: pd.DataFrame) -> pd.DataFrame:
    joined = pd.concat([strategy_returns.rename("strategy"), factors], axis=1, join="inner")
    return joined.dropna()


def run_factor_regression(strategy_returns: pd.Series, factors: pd.DataFrame) -> dict:
    data = align_strategy_returns_with_factors(strategy_returns, factors)
    if len(data) < MIN_OBSERVATIONS:
        raise ValueError(f"Only {len(data)} aligned observations; need {MIN_OBSERVATIONS}.")

    y = data["strategy"] - data["RF"]
    X = sm.add_constant(data[FACTOR_COLUMNS])
    model = sm.OLS(y, X).fit()

    alpha_daily = float(model.params["const"])
    out = {
        "alphaAnnualized": float((1 + alpha_daily) ** config.TRADING_DAYS_PER_YEAR - 1),
        "marketBeta": float(model.params["Mkt-RF"]),
        "smb": float(model.params["SMB"]),
        "hml": float(model.params["HML"]),
        "rmw": float(model.params["RMW"]),
        "cma": float(model.params["CMA"]),
        "rSquared": float(model.rsquared),
        "observations": int(model.nobs),
        "alphaTStat": float(model.tvalues["const"]),
        "marketBetaTStat": float(model.tvalues["Mkt-RF"]),
    }
    for key, value in out.items():
        if isinstance(value, float) and not np.isfinite(value):
            raise ValueError(f"Non-finite factor output {key}.")
    return out


def generate_factor_exposures(results: dict, factors: pd.DataFrame) -> list:
    records = []
    for (name, lookback), result in results.items():
        rec = {"strategy": name, "lookback": lookback}
        rec.update(run_factor_regression(result.net, factors))
        records.append(rec)
    return records
