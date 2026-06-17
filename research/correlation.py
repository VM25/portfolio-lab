"""Correlation Breakdown & Crisis Hedge Lab analytics.

Deepens the project's central thesis — diversification is conditional — by
quantifying four things the rest of the engine only implies:

  1. How cross-asset correlations change between normal and stress regimes.
  2. How many independent bets remain once correlations rise
     (effective bets from the correlation-matrix eigenvalues).
  3. Whether portfolio risk collapses into one dominant factor under stress
     (PCA / largest-eigenvalue variance share).
  4. Which simple hedge sleeves actually reduce crisis drawdowns
     (90/10 crisis-window overlays charged the same 5 bps turnover cost).

Conventions are inherited from the rest of the engine: the same 13-ETF
investable universe, the same 6M / 1Y / 3Y lookbacks, the same month-end
rebalance calendar, the same crisis windows, the same no-look-ahead rule
(rolling windows end at t-1; the regime label at a rebalance uses signals
through t-1), and the same insufficient_data convention (a (crisis, lookback)
that the strategy backtest cannot fully cover is reported, never interpolated).

Effective *bets* (correlation/eigenstructure concentration) are deliberately
kept separate from effective *positions* (weight concentration, in
diagnostics.py): they answer different questions.

VIX remains signal-only here as everywhere else — it is never used as an
investable hedge sleeve.
"""

from collections import defaultdict

import numpy as np
import pandas as pd

import config
import backtest
import crisis as crisis_mod
import metrics as metrics_mod

# ---------------------------------------------------------------------------
# Module configuration
# ---------------------------------------------------------------------------

# Asset groups for off-diagonal averages and eigen diagnostics.
CORRELATION_GROUPS = {
    "Full universe": ["SPY", "QQQ", "IWM", "EFA", "EEM", "TLT", "IEF", "TIP",
                      "HYG", "GLD", "DBC", "VNQ", "SHV"],
    "Growth / risk": ["SPY", "QQQ", "IWM", "EFA", "EEM", "HYG", "VNQ"],
    "Duration / defensive": ["TLT", "IEF", "SHV"],
    "Inflation / real assets": ["TIP", "GLD", "DBC"],
}

# Groups carried as time series in the effective-bets / PCA exports. The full
# universe is the headline; growth/risk is offered as a focused comparison.
TIMESERIES_GROUPS = ["Full universe", "Growth / risk"]

# Stable, human-readable identifiers for the crisis windows defined in config.
CRISIS_IDS = {
    "Global Financial Crisis": "gfc_2008",
    "COVID Market Shock": "covid_2020",
    "2022 Inflation / Rate-Hike Drawdown": "2022_inflation",
}

# Hedge overlay test. VIX is intentionally absent — it is signal-only.
HEDGE_SLEEVES = ["SHV", "TLT", "IEF", "TIP", "GLD", "DBC"]
HEDGE_BASE_PORTFOLIOS = ["Equal Weight", "60/40", "Regime-Aware Allocation"]
HEDGE_WEIGHT = 0.10  # 90% base / 10% hedge sleeve

# Reference series used only to decide crisis coverage for a lookback. Every
# strategy at a given lookback shares the same valid start date (it depends on
# the lookback length and the common ETF history, not the strategy), so a
# single strategy answers "is this (crisis, lookback) covered?" for all of
# them — consistent with the existing crisis-metrics insufficient_data logic.
COVERAGE_REFERENCE = "Equal Weight"


# ---------------------------------------------------------------------------
# Matrix / eigenstructure helpers
# ---------------------------------------------------------------------------

def _rolling_points(returns: pd.DataFrame, signal_frame, lookback_label: str):
    """Yield (date, correlation_matrix, regime_label) at every month-end
    rebalance date that has a full lookback window strictly before it.

    The window ends at t-1 (returns.iloc[pos - L: pos]) and the regime label
    is read at t-1 — the same no-look-ahead convention the backtest uses.
    """
    lookback_days = config.LOOKBACK_WINDOWS[lookback_label]
    idx = returns.index
    points = []
    for d in backtest.get_month_end_rebalance_dates(returns):
        pos = idx.get_loc(d)
        if pos < lookback_days:
            continue
        window = returns.iloc[pos - lookback_days: pos]
        corr = window.corr()
        regime = None
        if signal_frame is not None:
            regime = signal_frame["regime_label"].iloc[pos - 1]
        points.append((d, corr, regime))
    return points


def _mean_matrix(matrices, columns) -> pd.DataFrame:
    """Element-wise mean of correlation matrices that share `columns`."""
    if not matrices:
        return None
    arr = np.mean([m.loc[columns, columns].values for m in matrices], axis=0)
    return pd.DataFrame(arr, index=columns, columns=columns)


def _regime_average_matrices(returns, signal_frame, columns, lookback_label):
    """Average the rolling correlation matrices over normal- and defensive-
    regime rebalance dates for one lookback. 'watch' dates sit between the two
    and are excluded from both averages, matching the normal-vs-stress framing.
    """
    points = _rolling_points(returns, signal_frame, lookback_label)
    normal = [c for (_, c, r) in points if r == "normal"]
    defensive = [c for (_, c, r) in points if r == "defensive"]
    return (
        _mean_matrix(normal, columns),
        _mean_matrix(defensive, columns),
        len(normal),
        len(defensive),
    )


def _crisis_corr_matrix(returns: pd.DataFrame, window) -> pd.DataFrame:
    start, end = pd.Timestamp(window[0]), pd.Timestamp(window[1])
    sliced = returns.loc[(returns.index >= start) & (returns.index <= end)]
    return sliced.corr()


def _off_diagonal_mean(corr_df: pd.DataFrame, tickers) -> float:
    """Average pairwise correlation over a group, excluding the diagonal."""
    if corr_df is None:
        return float("nan")
    sub = corr_df.loc[tickers, tickers].values
    n = len(tickers)
    if n < 2:
        return float("nan")
    mask = ~np.eye(n, dtype=bool)
    return float(sub[mask].mean())


def _eigen_metrics(corr_df: pd.DataFrame, tickers) -> dict:
    """Effective bets and PCA variance shares from a correlation submatrix.

    For a correlation matrix the eigenvalues sum to the number of assets, so
    PC1 share = lambda_1 / n and effective_bets = 1 / sum(p_i^2) where
    p_i = lambda_i / sum(lambda). Effective bets lie in [1, n] by construction.
    """
    if corr_df is None:
        return None
    sub = corr_df.loc[tickers, tickers].values
    sub = (sub + sub.T) / 2.0  # enforce exact symmetry for eigvalsh
    vals = np.linalg.eigvalsh(sub)
    vals = np.clip(vals, 0.0, None)  # tiny negative round-off -> 0
    total = float(vals.sum())
    if total <= 0:
        return None
    p = vals / total
    effective_bets = 1.0 / float((p ** 2).sum())
    desc = np.sort(vals)[::-1]
    pc1 = float(desc[0] / total)
    pc2 = float(desc[1] / total) if len(desc) > 1 else 0.0
    pc3 = float(desc[2] / total) if len(desc) > 2 else 0.0
    top3 = float(desc[:3].sum() / total)
    return {
        "effectiveBets": effective_bets,
        "pc1Share": pc1,
        "pc2Share": pc2,
        "pc3Share": pc3,
        "top3Share": top3,
    }


def _matrix_records(df, columns, lookback, view, crisis_id) -> list:
    """Flatten a correlation matrix into one record per ordered asset pair.

    Every ordered pair (including the diagonal) is emitted so the frontend can
    render a full grid directly without reconstructing the mirror.
    """
    rows = []
    for ax in columns:
        for ay in columns:
            rows.append({
                "lookback": lookback,
                "view": view,
                "crisisId": crisis_id,
                "assetX": ax,
                "assetY": ay,
                "correlation": round(float(df.loc[ax, ay]), 4),
            })
    return rows


def _is_crisis_covered(results, lookback, window) -> bool:
    ref = results.get((COVERAGE_REFERENCE, lookback))
    if ref is None:
        return False
    return crisis_mod.covers_full_window(ref.net, window)


# ---------------------------------------------------------------------------
# 1 + 3. Correlation matrices (regime-averaged + crisis-window)
# ---------------------------------------------------------------------------

def generate_correlation_matrix_records(returns, signal_frame, results) -> list:
    """Regime-averaged (normal / defensive) and crisis-window correlation
    matrices, flattened per asset pair. The uplift / difference view is a pure
    cell-by-cell subtraction (defensive - normal) derived on the frontend, so
    it is not duplicated here. Crisis matrices are emitted only where the
    lookback fully covers the window."""
    columns = list(returns.columns)
    records = []
    for lookback in config.LOOKBACK_WINDOWS:
        normal_avg, defensive_avg, _, _ = _regime_average_matrices(
            returns, signal_frame, columns, lookback
        )
        if normal_avg is not None:
            records += _matrix_records(normal_avg, columns, lookback, "normal", None)
        if defensive_avg is not None:
            records += _matrix_records(defensive_avg, columns, lookback, "defensive", None)
        for crisis_name, window in config.CRISIS_WINDOWS.items():
            if not _is_crisis_covered(results, lookback, window):
                continue
            cm = _crisis_corr_matrix(returns, window)
            records += _matrix_records(
                cm, columns, lookback, "crisis", CRISIS_IDS[crisis_name]
            )
    return records


# ---------------------------------------------------------------------------
# 2 + 3. Off-diagonal averages by group, conditioned on regime
# ---------------------------------------------------------------------------

def generate_correlation_summary(returns, signal_frame) -> list:
    """Average off-diagonal correlation by group in normal vs defensive
    regimes, plus the stress uplift (defensive - normal). One record per
    (lookback, group)."""
    columns = list(returns.columns)
    records = []
    for lookback in config.LOOKBACK_WINDOWS:
        normal_avg, defensive_avg, _, _ = _regime_average_matrices(
            returns, signal_frame, columns, lookback
        )
        for group, tickers in CORRELATION_GROUPS.items():
            n_val = _off_diagonal_mean(normal_avg, tickers)
            d_val = _off_diagonal_mean(defensive_avg, tickers)
            uplift = d_val - n_val
            records.append({
                "lookback": lookback,
                "group": group,
                "normalAverageCorrelation": _round_or_none(n_val, 4),
                "defensiveAverageCorrelation": _round_or_none(d_val, 4),
                "correlationUplift": _round_or_none(uplift, 4),
            })
    return records


# ---------------------------------------------------------------------------
# 4. Effective number of independent bets (time series)
# ---------------------------------------------------------------------------

def generate_effective_bets(returns) -> list:
    """Effective bets through time, per lookback and group, sampled at
    month-end rebalance dates. Lower values mean fewer independent bets."""
    records = []
    for lookback in config.LOOKBACK_WINDOWS:
        for d, corr, _ in _rolling_points(returns, None, lookback):
            for group in TIMESERIES_GROUPS:
                m = _eigen_metrics(corr, CORRELATION_GROUPS[group])
                if m is None:
                    continue
                records.append({
                    "date": d.strftime("%Y-%m-%d"),
                    "lookback": lookback,
                    "group": group,
                    "effectiveBets": round(m["effectiveBets"], 3),
                })
    return records


# ---------------------------------------------------------------------------
# 5. PCA risk concentration (time series)
# ---------------------------------------------------------------------------

def generate_pca_concentration(returns) -> list:
    """PC1/PC2/PC3 and cumulative top-3 variance share through time, per
    lookback and group. A rising PC1 share means one common factor is taking
    over portfolio risk."""
    records = []
    for lookback in config.LOOKBACK_WINDOWS:
        for d, corr, _ in _rolling_points(returns, None, lookback):
            for group in TIMESERIES_GROUPS:
                m = _eigen_metrics(corr, CORRELATION_GROUPS[group])
                if m is None:
                    continue
                records.append({
                    "date": d.strftime("%Y-%m-%d"),
                    "lookback": lookback,
                    "group": group,
                    "pc1Share": round(m["pc1Share"], 4),
                    "pc2Share": round(m["pc2Share"], 4),
                    "pc3Share": round(m["pc3Share"], 4),
                    "top3Share": round(m["top3Share"], 4),
                })
    return records


# ---------------------------------------------------------------------------
# 7. Hedge effectiveness (90/10 crisis-window overlays)
# ---------------------------------------------------------------------------

def _overlay_daily_returns(base_returns, hedge_returns, hedge_weight, cost_rate):
    """Daily net returns of a base/hedge overlay rebalanced monthly to a fixed
    (1 - w, w) target, drifting within each month, charged `cost_rate` per unit
    of overlay turnover at each rebalance. The first month is the entry buy-in
    and is excluded from costs, matching the project's turnover convention.

    The base portfolio is treated as one synthetic asset (its daily net return)
    and the hedge as another (a single ETF's daily return) — a deliberately
    simple overlay, not a full re-optimization.
    """
    df = pd.concat(
        [base_returns.rename("base"), hedge_returns.rename("hedge")],
        axis=1,
    ).dropna()
    if df.empty:
        return pd.Series(dtype=float)

    target = np.array([1.0 - hedge_weight, hedge_weight])
    prev_weights = target.copy()
    first_month = True
    out_index, out_values = [], []

    for _, month_df in df.groupby(df.index.to_period("M"), sort=True):
        rets = month_df[["base", "hedge"]].values
        turnover = float(np.abs(target - prev_weights).sum())
        cost = 0.0 if first_month else cost_rate * turnover
        first_month = False

        weights = target.copy()  # rebalance to target at the month's first day
        for i in range(len(rets)):
            r = rets[i]
            port_r = float((weights * r).sum())
            if i == 0:
                port_r -= cost
            out_index.append(month_df.index[i])
            out_values.append(port_r)
            grown = weights * (1.0 + r)  # intra-month drift
            weights = grown / grown.sum()
        prev_weights = weights.copy()

    return pd.Series(out_values, index=pd.DatetimeIndex(out_index))


def generate_hedge_effectiveness(results, returns) -> list:
    """Test each hedge sleeve as a 90/10 overlay on each base portfolio across
    each crisis window and lookback. Crisis return/drawdown/CVaR are measured
    inside the window; hedge drag is the full-sample annualized-return cost of
    carrying the overlay. Combinations the base cannot fully cover at a lookback
    are reported as insufficient_data."""
    cost_rate = config.TRANSACTION_COST_RATE
    records = []
    for crisis_name, window in config.CRISIS_WINDOWS.items():
        crisis_id = CRISIS_IDS[crisis_name]
        for lookback in config.LOOKBACK_WINDOWS:
            for base in HEDGE_BASE_PORTFOLIOS:
                base_res = results[(base, lookback)]
                base_net = base_res.net
                covered = crisis_mod.covers_full_window(base_net, window)
                for hedge in HEDGE_SLEEVES:
                    rec = {
                        "crisisId": crisis_id,
                        "crisisName": crisis_name,
                        "basePortfolio": base,
                        "hedge": hedge,
                        "lookback": lookback,
                    }
                    base_win = crisis_mod.slice_crisis_returns(base_net, window)
                    hedge_full = returns[hedge]
                    hedge_win = crisis_mod.slice_crisis_returns(hedge_full, window)
                    hedged_win = _overlay_daily_returns(
                        base_win, hedge_win, HEDGE_WEIGHT, cost_rate
                    )
                    if not covered or base_win.empty or hedged_win.empty:
                        rec["status"] = "insufficient_data"
                        records.append(rec)
                        continue

                    hedged_return = metrics_mod.cumulative_return(hedged_win)
                    unhedged_return = metrics_mod.cumulative_return(base_win)
                    hedged_mdd = metrics_mod.max_drawdown(hedged_win)
                    unhedged_mdd = metrics_mod.max_drawdown(base_win)
                    hedged_cvar = metrics_mod.historical_cvar(hedged_win)
                    unhedged_cvar = metrics_mod.historical_cvar(base_win)

                    overlay_full = _overlay_daily_returns(
                        base_net, hedge_full, HEDGE_WEIGHT, cost_rate
                    )
                    hedge_drag = (
                        metrics_mod.annualized_return(overlay_full)
                        - metrics_mod.annualized_return(base_net)
                    )

                    rec.update({
                        "status": "ok",
                        "hedgedReturn": round(hedged_return, 6),
                        "unhedgedReturn": round(unhedged_return, 6),
                        "returnDelta": round(hedged_return - unhedged_return, 6),
                        "hedgedMaxDrawdown": round(hedged_mdd, 6),
                        "unhedgedMaxDrawdown": round(unhedged_mdd, 6),
                        "drawdownReduction": round(
                            abs(unhedged_mdd) - abs(hedged_mdd), 6
                        ),
                        "hedgedCVaR95": round(hedged_cvar, 6),
                        "unhedgedCVaR95": round(unhedged_cvar, 6),
                        "cvarReduction": round(unhedged_cvar - hedged_cvar, 6),
                        "hedgeDrag": round(hedge_drag, 6),
                    })
                    records.append(rec)
    return records


# ---------------------------------------------------------------------------
# 6. Crisis correlation dossiers
# ---------------------------------------------------------------------------

def generate_crisis_correlation_dossiers(returns, results, hedge_records) -> list:
    """One dossier per (crisis, lookback): full-universe and growth/risk
    correlation, effective bets, PC1 share, and the best/worst hedge by average
    drawdown reduction (drawn from the hedge-effectiveness records). Lookbacks
    that cannot fully cover the window are reported as insufficient_data."""
    best_worst = _aggregate_hedge_ranking(hedge_records)
    records = []
    for crisis_name, window in config.CRISIS_WINDOWS.items():
        crisis_id = CRISIS_IDS[crisis_name]
        for lookback in config.LOOKBACK_WINDOWS:
            rec = {
                "crisisId": crisis_id,
                "crisisName": crisis_name,
                "lookback": lookback,
            }
            if not _is_crisis_covered(results, lookback, window):
                rec["status"] = "insufficient_data"
                records.append(rec)
                continue

            cm = _crisis_corr_matrix(returns, window)
            full_avg = _off_diagonal_mean(cm, CORRELATION_GROUPS["Full universe"])
            growth_avg = _off_diagonal_mean(cm, CORRELATION_GROUPS["Growth / risk"])
            em = _eigen_metrics(cm, CORRELATION_GROUPS["Full universe"])
            best, worst = best_worst.get((crisis_id, lookback), (None, None))

            rec.update({
                "status": "valid",
                "averageCorrelation": _round_or_none(full_avg, 4),
                "growthRiskCorrelation": _round_or_none(growth_avg, 4),
                "effectiveBets": round(em["effectiveBets"], 3) if em else None,
                "pc1Share": round(em["pc1Share"], 4) if em else None,
                "bestHedge": best,
                "worstHedge": worst,
            })
            records.append(rec)
    return records


def _aggregate_hedge_ranking(hedge_records) -> dict:
    """(crisisId, lookback) -> (best_hedge, worst_hedge) by mean drawdown
    reduction across base portfolios."""
    bucket = defaultdict(lambda: defaultdict(list))
    for h in hedge_records:
        if h.get("status") != "ok":
            continue
        bucket[(h["crisisId"], h["lookback"])][h["hedge"]].append(
            h["drawdownReduction"]
        )
    ranking = {}
    for key, by_hedge in bucket.items():
        means = {hk: float(np.mean(v)) for hk, v in by_hedge.items()}
        if not means:
            continue
        ranking[key] = (
            max(means, key=means.get),
            min(means, key=means.get),
        )
    return ranking


# ---------------------------------------------------------------------------
# small utilities
# ---------------------------------------------------------------------------

def _round_or_none(value, decimals):
    if value is None or (isinstance(value, float) and not np.isfinite(value)):
        return None
    return round(float(value), decimals)
