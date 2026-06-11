"""Implementation-realism diagnostics: turnover, cost, and concentration.

Conventions:
  * Turnover at a rebalance is total absolute turnover sum(|w_new - w_old|),
    measured against drifted (pre-trade) weights.
  * The first rebalance is a cash buy-in (turnover = 1); it is charged a
    transaction cost but excluded from average/max turnover summaries so the
    summaries describe ongoing strategy behavior.
  * Concentration uses the Herfindahl-Hirschman Index of target weights;
    effective positions = 1 / HHI.
"""

import pandas as pd

import config


def calculate_concentration(weights: pd.DataFrame) -> pd.Series:
    """HHI per rebalance date."""
    return (weights ** 2).sum(axis=1)


def calculate_effective_positions(weights: pd.DataFrame) -> pd.Series:
    return 1.0 / calculate_concentration(weights)


def calculate_turnover_series(result) -> pd.Series:
    """Ongoing turnover (initial buy-in excluded)."""
    return result.turnover.iloc[1:]


def calculate_transaction_cost_drag(gross: pd.Series, net: pd.Series) -> float:
    return float((1 + net).prod() / (1 + gross).prod() - 1)


def summarize_result(result) -> dict:
    turnover = calculate_turnover_series(result)
    hhi = calculate_concentration(result.weights)
    eff = calculate_effective_positions(result.weights)
    avg_turnover = float(turnover.mean()) if len(turnover) else 0.0
    return {
        "averageTurnover": avg_turnover,
        "maxTurnover": float(turnover.max()) if len(turnover) else 0.0,
        "annualizedTurnover": avg_turnover * 12,
        "averageConcentration": float(hhi.mean()),
        "averageEffectivePositions": float(eff.mean()),
        "maxSingleAssetWeight": float(result.weights.max().max()),
        "averageMaxAssetWeight": float(result.weights.max(axis=1).mean()),
    }


def generate_turnover_diagnostics(results: dict) -> list:
    rows = []
    for (name, lookback), result in results.items():
        for date in result.turnover.index[1:]:
            rows.append({
                "date": date.strftime("%Y-%m-%d"),
                "strategy": name,
                "lookback": lookback,
                "turnover": round(float(result.turnover.loc[date]), 6),
                "transactionCost": round(float(result.costs.loc[date]), 8),
            })
    return rows


def generate_concentration_diagnostics(results: dict) -> list:
    rows = []
    for (name, lookback), result in results.items():
        hhi = calculate_concentration(result.weights)
        eff = calculate_effective_positions(result.weights)
        max_w = result.weights.max(axis=1)
        for date in result.weights.index:
            rows.append({
                "date": date.strftime("%Y-%m-%d"),
                "strategy": name,
                "lookback": lookback,
                "hhi": round(float(hhi.loc[date]), 6),
                "effectivePositions": round(float(eff.loc[date]), 4),
                "maxSingleAssetWeight": round(float(max_w.loc[date]), 6),
            })
    return rows
