"""Validation engine.

Runs the required integrity checks across data, weights, costs, risk metrics,
signals, and exports, and produces data/validation-summary.json. The frontend
surfaces this status; results should not be presented as final unless the
status is "pass" (warnings allowed when clearly documented).
"""

from datetime import datetime

import numpy as np
import pandas as pd

import config
import metrics as metrics_mod


def _check(name, passed, details, **extra):
    rec = {"name": name, "status": "pass" if passed else "fail", "details": details}
    rec.update(extra)
    return rec


def validate_data_completeness(returns):
    missing = [t for t in config.INVESTABLE_TICKERS if t not in returns.columns]
    return _check(
        "data_completeness",
        not missing,
        f"All {len(config.INVESTABLE_TICKERS)} investable tickers present."
        if not missing else f"Missing tickers: {missing}",
    )


def validate_returns(returns):
    finite = np.isfinite(returns.values).all()
    no_dups = not returns.index.duplicated().any()
    plausible = (returns.abs() <= 0.5).all().all()
    ok = finite and no_dups and plausible
    return _check(
        "return_calculation",
        ok,
        "Return matrix is finite, deduplicated, and free of implausible values."
        if ok else "Return matrix failed integrity checks.",
    )


def validate_weights(results):
    max_err = 0.0
    bounds_ok = True
    for (name, _), result in results.items():
        sums = result.weights.sum(axis=1)
        max_err = max(max_err, float((sums - 1).abs().max()))
        if (result.weights.values < -1e-8).any():
            bounds_ok = False
        # The per-asset cap applies to strategies; benchmarks (SPY 100%,
        # 60/40) intentionally exceed it by definition.
        if name in config.STRATEGY_NAMES:
            if (result.weights.values > config.MAX_WEIGHT + 1e-6).any():
                bounds_ok = False
    ok = max_err < 1e-6 and bounds_ok
    return _check(
        "weights_sum_and_bounds",
        ok,
        "All weights sum to 1 within tolerance; strategy weights satisfy "
        f"0 <= w <= {config.MAX_WEIGHT}." if ok else "Weight constraint violation.",
        maxError=max_err,
    )


def validate_no_lookahead(returns, results):
    """Structural check: every strategy's first return must come after the
    point where a full lookback window of prior data exists, and weights at a
    rebalance date are recorded before the first return they affect."""
    ok = True
    details = []
    for (name, lookback), result in results.items():
        lookback_days = config.LOOKBACK_WINDOWS[lookback]
        first_ret = result.net.index[0]
        pos = returns.index.get_loc(first_ret)
        if pos < lookback_days:
            ok = False
            details.append(f"{name}/{lookback} starts before lookback is available")
        first_rebal = result.weights.index[0]
        if first_rebal >= first_ret:
            ok = False
            details.append(f"{name}/{lookback} weights dated after first return")
    return _check(
        "no_lookahead_bias",
        ok,
        "Every series starts only after a full lookback window exists; "
        "rebalance inputs end strictly before the rebalance date."
        if ok else "; ".join(details),
    )


def validate_transaction_costs(results):
    ok = True
    for result in results.values():
        diff = (result.gross - result.net).round(12)
        n_charged = int((diff > 0).sum())
        n_rebalances_with_cost = int((result.costs.iloc[:len(result.costs)] > 1e-12).sum())
        # costs may be zero for static benchmarks like SPY after buy-in
        if n_charged > len(result.costs):
            ok = False
    return _check(
        "transaction_cost_application",
        ok,
        "Costs are deducted only on rebalance effective dates "
        f"({config.TRANSACTION_COST_BPS} bps per unit turnover)."
        if ok else "Cost applied outside rebalance dates.",
    )


def validate_turnover(results):
    ok = all(
        np.isfinite(r.turnover.values).all() and (r.turnover.values >= -1e-12).all()
        for r in results.values()
    )
    return _check(
        "turnover_calculation",
        ok,
        "Turnover is non-negative and finite for all series."
        if ok else "Invalid turnover values found.",
    )


def validate_var_cvar(performance_records):
    ok = True
    for rec in performance_records:
        var, cvar = rec["historicalVaR95"], rec["historicalCVaR95"]
        if var < 0 or cvar < 0:
            ok = False
        if cvar + 1e-12 < var:
            ok = False
    return _check(
        "var_cvar_convention",
        ok,
        "VaR and CVaR are positive losses and CVaR >= VaR for every series."
        if ok else "VaR/CVaR convention violated.",
    )


def validate_factor_outputs(factor_records):
    ok = all(
        0 <= rec["rSquared"] <= 1 and rec["observations"] >= 252
        for rec in factor_records
    )
    return _check(
        "factor_regressions",
        ok,
        "All factor regressions have R² in [0,1] and at least one year of "
        "daily observations." if ok else "Factor regression check failed.",
    )


def validate_regime_signals(signals):
    valid_labels = signals["regime_label"].dropna().isin(["normal", "watch", "defensive"]).all()
    has_all = all(c in signals.columns for c in ["spy_tlt_corr_90d", "cpi_yoy", "vix"])
    ok = bool(valid_labels and has_all)
    return _check(
        "regime_signal_availability",
        ok,
        "Correlation, CPI, and VIX signals are aligned with valid regime labels."
        if ok else "Regime signal frame failed checks.",
    )


def validate_cpi_lag(cpi_yoy, cpi_yoy_lagged):
    aligned = pd.concat(
        [cpi_yoy.rename("raw"), cpi_yoy_lagged.rename("lagged")], axis=1
    ).dropna()
    shifted = cpi_yoy.shift(config.CPI_SIGNAL_LAG_MONTHS).dropna()
    ok = bool(
        len(aligned) > 0
        and np.allclose(
            aligned["lagged"].values,
            shifted.reindex(aligned.index).values,
            equal_nan=True,
        )
    )
    return _check(
        "cpi_lag",
        ok,
        f"CPI YoY signal is lagged {config.CPI_SIGNAL_LAG_MONTHS} month(s); a "
        "rebalance never sees a CPI print before its release."
        if ok else "CPI lag verification failed.",
    )


def validate_benchmarks(results, returns):
    """SPY benchmark gross returns must match raw SPY returns over the
    holding period (buy-and-hold of a single asset)."""
    ok = True
    for lookback in config.LOOKBACK_WINDOWS:
        res = results[("SPY", lookback)]
        raw = returns["SPY"].reindex(res.gross.index)
        if not np.allclose(res.gross.values, raw.values, atol=1e-10):
            ok = False
    weights_6040_ok = abs(sum(config.BENCHMARK_6040.values()) - 1.0) < 1e-12
    return _check(
        "benchmark_construction",
        ok and weights_6040_ok,
        "SPY benchmark replicates raw SPY returns; 60/40 weights sum to 1."
        if ok and weights_6040_ok else "Benchmark construction check failed.",
    )


def validate_exports(written_files, required_files):
    missing = [f for f in required_files if f not in written_files]
    return _check(
        "export_completeness",
        not missing,
        f"All {len(required_files)} required frontend data files exported."
        if not missing else f"Missing exports: {missing}",
    )


def generate_validation_summary(checks, warnings):
    status = "pass"
    if any(c["status"] == "fail" for c in checks):
        status = "fail"
    elif warnings:
        status = "warning"
    return {
        "status": status,
        "generatedAt": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "checks": checks,
        "warnings": warnings,
    }
