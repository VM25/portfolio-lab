"""Portfolio optimizers: Global Minimum Variance and Max Sharpe.

GMV is a convex QP solved with cvxpy (scipy SLSQP fallback).
Max Sharpe is nonlinear; solved with scipy SLSQP on the negative Sharpe,
with a mean-variance risk-aversion grid fallback.

All portfolios are long-only, fully invested, with a per-asset weight cap.
"""

import numpy as np
import pandas as pd
from scipy.optimize import minimize

import config

try:
    import cvxpy as cp
    HAS_CVXPY = True
except ImportError:  # pragma: no cover
    HAS_CVXPY = False

WEIGHT_TOL = 1e-8


def normalize_weights(weights: np.ndarray) -> np.ndarray:
    weights = np.clip(weights, 0.0, None)
    total = weights.sum()
    if total <= 0:
        raise ValueError("Cannot normalize non-positive weight vector.")
    return weights / total


def project_weights_to_bounds(weights: np.ndarray, max_weight: float) -> np.ndarray:
    """Cap weights at max_weight and redistribute the excess proportionally
    across uncapped assets, iterating until feasible."""
    w = normalize_weights(np.asarray(weights, dtype=float))
    for _ in range(100):
        over = w > max_weight + WEIGHT_TOL
        if not over.any():
            break
        excess = (w[over] - max_weight).sum()
        w[over] = max_weight
        under = ~over
        room = w[under].sum()
        if room <= 0:
            # Spread excess equally across assets with remaining capacity.
            capacity = max_weight - w
            capacity[capacity < 0] = 0
            w = w + capacity / capacity.sum() * excess
            continue
        w[under] = w[under] + w[under] / room * excess
    return w


def validate_weights(weights: np.ndarray, max_weight: float) -> None:
    if not np.isfinite(weights).all():
        raise ValueError("Weights contain non-finite values.")
    if abs(weights.sum() - 1.0) > 1e-6:
        raise ValueError(f"Weights sum to {weights.sum():.8f}, not 1.")
    if (weights < -WEIGHT_TOL).any():
        raise ValueError("Negative weight in long-only portfolio.")
    if (weights > max_weight + 1e-6).any():
        raise ValueError(f"Weight exceeds cap {max_weight}.")


def solve_global_min_variance(
    cov_matrix: pd.DataFrame, max_weight: float = config.MAX_WEIGHT
) -> pd.Series:
    """minimize wᵀΣw  s.t.  1ᵀw = 1,  0 <= w_i <= max_weight"""
    sigma = cov_matrix.values
    n = sigma.shape[0]

    if HAS_CVXPY:
        w = cp.Variable(n)
        objective = cp.Minimize(cp.quad_form(w, cp.psd_wrap(sigma)))
        constraints = [cp.sum(w) == 1, w >= 0, w <= max_weight]
        problem = cp.Problem(objective, constraints)
        try:
            problem.solve()
            if w.value is not None and np.isfinite(w.value).all():
                weights = project_weights_to_bounds(w.value, max_weight)
                validate_weights(weights, max_weight)
                return pd.Series(weights, index=cov_matrix.index)
        except cp.error.SolverError:
            pass  # fall through to scipy

    weights = _solve_gmv_scipy(sigma, max_weight)
    weights = project_weights_to_bounds(weights, max_weight)
    validate_weights(weights, max_weight)
    return pd.Series(weights, index=cov_matrix.index)


def _solve_gmv_scipy(sigma: np.ndarray, max_weight: float) -> np.ndarray:
    n = sigma.shape[0]
    x0 = np.full(n, 1.0 / n)
    result = minimize(
        lambda w: w @ sigma @ w,
        x0,
        jac=lambda w: 2 * sigma @ w,
        method="SLSQP",
        bounds=[(0.0, max_weight)] * n,
        constraints=[{"type": "eq", "fun": lambda w: w.sum() - 1.0}],
        options={"maxiter": 500, "ftol": 1e-12},
    )
    if not result.success:
        raise ValueError(f"GMV optimization failed: {result.message}")
    return result.x


def solve_max_sharpe(
    mu: pd.Series,
    cov_matrix: pd.DataFrame,
    rf: float,
    max_weight: float = config.MAX_WEIGHT,
) -> pd.Series:
    """maximize (μᵀw - rf) / sqrt(wᵀΣw)  s.t.  1ᵀw = 1, 0 <= w_i <= max_weight

    Primary: SLSQP on negative Sharpe from an equal-weight start.
    Fallback: mean-variance utility grid over risk aversion γ, keeping the
    candidate with the highest estimated Sharpe.
    """
    mu_v = mu.values
    sigma = cov_matrix.values
    n = len(mu_v)

    def neg_sharpe(w):
        vol = np.sqrt(max(w @ sigma @ w, 1e-12))
        return -((mu_v @ w - rf) / vol)

    x0 = np.full(n, 1.0 / n)
    result = minimize(
        neg_sharpe,
        x0,
        method="SLSQP",
        bounds=[(0.0, max_weight)] * n,
        constraints=[{"type": "eq", "fun": lambda w: w.sum() - 1.0}],
        options={"maxiter": 1000, "ftol": 1e-12},
    )

    candidates = []
    if result.success and np.isfinite(result.x).all():
        candidates.append(result.x)

    # Risk-aversion grid fallback (also run when SLSQP succeeds but lands on
    # a poor local solution; keep the best Sharpe overall).
    if not candidates:
        for gamma in [0.5, 1, 2, 5, 10, 20, 50]:
            res = minimize(
                lambda w: -(mu_v @ w - gamma * (w @ sigma @ w)),
                x0,
                method="SLSQP",
                bounds=[(0.0, max_weight)] * n,
                constraints=[{"type": "eq", "fun": lambda w: w.sum() - 1.0}],
                options={"maxiter": 500, "ftol": 1e-12},
            )
            if res.success and np.isfinite(res.x).all():
                candidates.append(res.x)

    if not candidates:
        raise ValueError("Max Sharpe optimization failed in all attempts.")

    best = min(candidates, key=neg_sharpe)
    weights = project_weights_to_bounds(best, max_weight)
    validate_weights(weights, max_weight)
    return pd.Series(weights, index=mu.index)
