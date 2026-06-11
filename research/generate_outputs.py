"""Master generation script for Portfolio Risk & Allocation Analytics.

Usage:
    python research/generate_outputs.py [--force-download]

Loads (or downloads) raw data, runs every strategy and benchmark backtest
across all lookback windows, computes risk/crisis/factor/stability analytics,
runs validation, and exports every frontend-ready JSON file into data/.

The frontend never computes finance logic: if a number appears on the
deployed site, it is traceable to a file generated here.
"""

import sys
import warnings

warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd

import config
import data_loader
import preprocessing
import signals as signals_mod
import backtest
import metrics as metrics_mod
import drawdowns as drawdowns_mod
import crisis as crisis_mod
import factors as factors_mod
import diagnostics as diagnostics_mod
import validation as validation_mod
import static_content
from export import export_json, export_csv, round_records

REQUIRED_EXPORTS = [
    "asset-universe.json",
    "benchmark-definitions.json",
    "strategy-summary.json",
    "strategy-returns.json",
    "portfolio-weights.json",
    "performance-metrics.json",
    "crisis-metrics.json",
    "factor-exposures.json",
    "regime-signals.json",
    "drawdowns.json",
    "turnover-diagnostics.json",
    "concentration-diagnostics.json",
    "market-context.json",
    "validation-summary.json",
    "backtest-config.json",
]


def _sample_positions(n: int, step: int) -> list:
    pos = list(range(0, n, step))
    if pos[-1] != n - 1:
        pos.append(n - 1)
    return pos


def export_strategy_returns(results) -> list:
    rows = []
    for (name, lookback), res in results.items():
        wealth_net = res.wealth(net=True)
        wealth_gross = res.wealth(net=False)
        idx = res.net.index
        for p in _sample_positions(len(idx), config.RETURNS_EXPORT_STEP_DAYS):
            d = idx[p]
            rows.append({
                "date": d.strftime("%Y-%m-%d"),
                "strategy": name,
                "lookback": lookback,
                "grossReturn": round(float(res.gross.iloc[p]), 6),
                "netReturn": round(float(res.net.iloc[p]), 6),
                "wealthGross": round(float(wealth_gross.iloc[p]), 3),
                "wealthNet": round(float(wealth_net.iloc[p]), 3),
            })
    return rows


def export_drawdowns(results, dd_frames) -> list:
    rows = []
    for (name, lookback), frame in dd_frames.items():
        idx = frame.index
        for p in _sample_positions(len(idx), config.RETURNS_EXPORT_STEP_DAYS):
            d = idx[p]
            rows.append({
                "date": d.strftime("%Y-%m-%d"),
                "strategy": name,
                "lookback": lookback,
                "wealthNet": round(float(frame["wealth"].iloc[p]), 3),
                "runningPeak": round(float(frame["runningPeak"].iloc[p]), 3),
                "drawdown": round(float(frame["drawdown"].iloc[p]), 5),
            })
    return rows


def export_portfolio_weights(results) -> list:
    rows = []
    for (name, lookback), res in results.items():
        if name not in config.STRATEGY_NAMES:
            continue  # benchmark weights are static and documented separately
        for date, w in res.weights.iterrows():
            for ticker, weight in w.items():
                rows.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "strategy": name,
                    "lookback": lookback,
                    "ticker": ticker,
                    "weight": round(float(weight), 5),
                })
    return rows


def export_regime_signals(signal_frame) -> list:
    frame = signal_frame.dropna(subset=["spy_tlt_corr_90d", "vix"])
    idx = frame.index
    rows = []
    for p in _sample_positions(len(idx), config.SIGNALS_EXPORT_STEP_DAYS):
        r = frame.iloc[p]
        cpi = r["cpi_yoy"]
        rows.append({
            "date": idx[p].strftime("%Y-%m-%d"),
            "spyTltCorr90d": round(float(r["spy_tlt_corr_90d"]), 4),
            "cpiYoy": None if pd.isna(cpi) else round(float(cpi), 5),
            "vix": round(float(r["vix"]), 2),
            "corrStress": bool(r["corr_stress"]),
            "inflationStress": bool(r["inflation_stress"]),
            "vixStress": bool(r["vix_stress"]),
            "regimeScore": int(r["regime_score"]),
            "regimeLabel": str(r["regime_label"]),
        })
    return rows


def main():
    force = "--force-download" in sys.argv
    print("Portfolio Risk & Allocation Analytics\n")

    # ------------------------------------------------------------------ data
    prices = data_loader.load_price_data(force_download=force)
    vix = data_loader.load_vix_data(force_download=force)
    cpi = data_loader.load_cpi_data(force_download=force)
    ff = data_loader.load_fama_french_factors(force_download=force)
    print(f"Loaded {len(config.INVESTABLE_TICKERS)} investable assets.")

    clean = preprocessing.clean_prices(prices)
    returns_full = preprocessing.calculate_simple_returns(clean)
    returns = preprocessing.common_history_returns(returns_full)
    export_csv(clean, config.PROCESSED_DIR / "clean_prices.csv")
    export_csv(returns, config.PROCESSED_DIR / "asset_returns.csv")
    print(f"Generated daily return matrix: {returns.index[0].date()} to "
          f"{returns.index[-1].date()} ({len(returns)} days).")

    # --------------------------------------------------------------- signals
    signal_frame = signals_mod.generate_regime_signals(returns, cpi, vix)
    export_csv(signal_frame, config.PROCESSED_DIR / "signal_data.csv")
    export_csv(ff, config.PROCESSED_DIR / "factor_returns.csv")
    print("Generated regime signals (SPY-TLT correlation, lagged CPI YoY, VIX).")

    # ------------------------------------------------------------- backtests
    results = backtest.run_all_backtests(returns, signal_frame)
    print("Ran strategies:")
    for s in config.STRATEGY_NAMES:
        print(f"  - {s}")
    print(f"Ran benchmarks: {', '.join(config.BENCHMARK_NAMES)}.")
    print(f"Applied transaction costs: {config.TRANSACTION_COST_BPS} bps per unit turnover.")

    # ------------------------------------------------------------ analytics
    rf_daily = ff["RF"]
    diag_summaries = {k: diagnostics_mod.summarize_result(r) for k, r in results.items()}
    performance = [
        metrics_mod.calculate_performance_metrics(r, rf_daily, diag_summaries[k])
        for k, r in results.items()
    ]
    performance = round_records(
        performance,
        [f for f in performance[0] if f not in ("strategy", "lookback", "startDate", "endDate")],
        6,
    )
    print("Computed performance metrics.")

    dd_frames = drawdowns_mod.generate_drawdown_data(results)
    print("Computed drawdowns.")

    crisis_records = crisis_mod.generate_crisis_metrics(results)
    crisis_records = round_records(
        crisis_records,
        ["cumulativeReturn", "annualizedVolatility", "maxDrawdown", "max10DayDrawdown",
         "historicalVaR95", "historicalCVaR95", "worstDailyReturn", "benchmarkRelativeReturn"],
        6,
    )
    crisis_wealth = crisis_mod.generate_crisis_wealth(results)
    print("Computed crisis metrics.")

    factor_records = factors_mod.generate_factor_exposures(results, ff)
    factor_records = round_records(
        factor_records,
        ["alphaAnnualized", "marketBeta", "smb", "hml", "rmw", "cma",
         "rSquared", "alphaTStat", "marketBetaTStat"],
        6,
    )
    print("Computed factor exposures.")

    turnover_diag = diagnostics_mod.generate_turnover_diagnostics(results)
    concentration_diag = diagnostics_mod.generate_concentration_diagnostics(results)
    print("Computed turnover and concentration diagnostics.")

    # --------------------------------------------------------------- exports
    written = []
    written.append(export_json(static_content.asset_universe(), config.DATA_DIR / "asset-universe.json"))
    written.append(export_json(static_content.benchmark_definitions(), config.DATA_DIR / "benchmark-definitions.json"))
    written.append(export_json(static_content.strategy_summary(), config.DATA_DIR / "strategy-summary.json"))
    written.append(export_json(static_content.backtest_config(), config.DATA_DIR / "backtest-config.json"))
    written.append(export_json(static_content.market_context(), config.DATA_DIR / "market-context.json"))
    written.append(export_json(export_strategy_returns(results), config.DATA_DIR / "strategy-returns.json"))
    written.append(export_json(export_portfolio_weights(results), config.DATA_DIR / "portfolio-weights.json"))
    written.append(export_json(performance, config.DATA_DIR / "performance-metrics.json"))
    written.append(export_json(crisis_records, config.DATA_DIR / "crisis-metrics.json"))
    written.append(export_json(crisis_wealth, config.DATA_DIR / "crisis-wealth.json"))
    written.append(export_json(factor_records, config.DATA_DIR / "factor-exposures.json"))
    written.append(export_json(export_regime_signals(signal_frame), config.DATA_DIR / "regime-signals.json"))
    written.append(export_json(export_drawdowns(results, dd_frames), config.DATA_DIR / "drawdowns.json"))
    written.append(export_json(turnover_diag, config.DATA_DIR / "turnover-diagnostics.json"))
    written.append(export_json(concentration_diag, config.DATA_DIR / "concentration-diagnostics.json"))

    # ------------------------------------------------------------ validation
    cpi_yoy = signals_mod.compute_cpi_yoy(cpi)
    cpi_yoy_lagged = signals_mod.apply_cpi_signal_lag(cpi_yoy)
    checks = [
        validation_mod.validate_data_completeness(returns),
        validation_mod.validate_returns(returns),
        validation_mod.validate_weights(results),
        validation_mod.validate_no_lookahead(returns, results),
        validation_mod.validate_transaction_costs(results),
        validation_mod.validate_turnover(results),
        validation_mod.validate_var_cvar(performance),
        validation_mod.validate_factor_outputs(factor_records),
        validation_mod.validate_regime_signals(signal_frame),
        validation_mod.validate_cpi_lag(cpi_yoy, cpi_yoy_lagged),
        validation_mod.validate_benchmarks(results, returns),
        validation_mod.validate_exports(written + ["validation-summary.json"], REQUIRED_EXPORTS),
    ]

    warnings_list = []
    insufficient = [
        f"{r['strategy']} ({r['lookback']})"
        for r in crisis_records
        if r["status"] == "insufficient_data" and r["crisisName"] == "Global Financial Crisis"
    ]
    if insufficient:
        warnings_list.append({
            "name": "gfc_partial_data",
            "message": (
                "The common ETF history begins in 2007 (SHV inception 2007-01, "
                "HYG inception 2007-04), so longer lookback windows do not cover "
                "the full 2008-2009 GFC window. For consistency, crisis "
                "comparisons use the common valid start date required by the "
                "selected strategy universe and lookback window; benchmarks are "
                "also aligned to that common sample and marked insufficient when "
                "they cannot be compared over the same full aligned window. "
                "Affected and reported as insufficient_data: "
                + ", ".join(insufficient) + "."
            ),
        })

    summary = validation_mod.generate_validation_summary(checks, warnings_list)
    export_json(summary, config.DATA_DIR / "validation-summary.json")
    print(f"Validation status: {summary['status'].upper()}.")
    for c in checks:
        flag = "ok " if c["status"] == "pass" else "FAIL"
        print(f"  [{flag}] {c['name']}")
    for w in warnings_list:
        print(f"  [warn] {w['name']}")
    print("Exported frontend data files.")

    if summary["status"] == "fail":
        sys.exit(1)


if __name__ == "__main__":
    main()
