"""Rolling backtest engine.

Mechanics (identical for every strategy and benchmark):

  * Rebalance decisions occur at the close of each month-end trading day t.
  * Inputs use only data strictly before t (returns through t-1, signals
    through t-1, CPI additionally lagged one month). No look-ahead.
  * New target weights take effect on the first trading day after t and are
    held until the next rebalance, drifting with daily returns in between.
  * Turnover at a rebalance is sum(|target - drifted current weights|);
    transaction cost = TRANSACTION_COST_RATE * turnover, deducted from the
    first day's net return of the new holding period.
  * The first rebalance buys in from cash (turnover = 1). This initial
    buy-in is EXCLUDED from transaction costs and turnover statistics so
    ongoing cost drag is comparable across strategies and benchmarks — a
    100% SPY benchmark therefore shows zero cost drag.
"""

import numpy as np
import pandas as pd

import config
import strategies


class BacktestResult:
    def __init__(self, name, lookback, gross, net, weights, turnover, costs, regimes=None):
        self.name = name
        self.lookback = lookback
        self.gross = gross          # daily gross returns (pd.Series)
        self.net = net              # daily net returns (pd.Series)
        self.weights = weights      # target weights at each rebalance (pd.DataFrame)
        self.turnover = turnover    # turnover at each rebalance (pd.Series)
        self.costs = costs          # cost at each rebalance (pd.Series)
        self.regimes = regimes      # regime label at each rebalance (pd.Series or None)

    def wealth(self, net=True, initial=config.INITIAL_WEALTH) -> pd.Series:
        r = self.net if net else self.gross
        return build_wealth_index(r, initial)


def build_wealth_index(returns: pd.Series, initial_wealth: float = config.INITIAL_WEALTH) -> pd.Series:
    return initial_wealth * (1 + returns).cumprod()


def get_month_end_rebalance_dates(returns: pd.DataFrame) -> pd.DatetimeIndex:
    """Last trading day of each calendar month in the return index."""
    idx = returns.index
    months = idx.to_period("M")
    # a date is a month-end trading day when the next date falls in a new month;
    # the final observation closes the last period
    flags = list(months[:-1] != months[1:]) + [True]
    return idx[flags]


def calculate_turnover(current_weights: pd.Series, previous_weights: pd.Series) -> float:
    return float((current_weights - previous_weights).abs().sum())


def apply_transaction_cost(portfolio_return: float, turnover: float,
                           cost_rate: float = config.TRANSACTION_COST_RATE) -> float:
    return portfolio_return - cost_rate * turnover


def run_strategy_backtest(
    strategy_name: str,
    returns: pd.DataFrame,
    signals: pd.DataFrame,
    lookback_label: str,
) -> BacktestResult:
    weight_fn = _strategy_weight_fn(strategy_name)
    return _run_backtest(strategy_name, weight_fn, returns, signals, lookback_label)


def run_benchmark_backtest(
    benchmark_name: str,
    returns: pd.DataFrame,
    lookback_label: str,
) -> BacktestResult:
    """Benchmarks run on the same calendar/cost engine as strategies so that
    comparisons are fair. They have no lookback dependence, but each lookback
    slice starts at the same base date as the strategies it is charted with."""
    if benchmark_name == "SPY":
        weight_fn = lambda lb, sig: strategies.spy_benchmark_weights(returns.columns)
    elif benchmark_name == "60/40":
        weight_fn = lambda lb, sig: strategies.benchmark_6040_weights(returns.columns)
    else:
        raise ValueError(f"Unknown benchmark: {benchmark_name}")
    return _run_backtest(benchmark_name, weight_fn, returns, None, lookback_label)


def _strategy_weight_fn(strategy_name: str):
    def fn(lookback_returns: pd.DataFrame, signal_row):
        regime_label = None
        vix_stress = False
        if signal_row is not None:
            regime_label = signal_row.get("regime_label", "normal")
            vix_stress = bool(signal_row.get("vix_stress", False))
        return strategies.generate_strategy_weights(
            strategy_name, lookback_returns, regime_label, vix_stress
        )
    return fn


def _run_backtest(name, weight_fn, returns, signals, lookback_label) -> BacktestResult:
    lookback_days = config.LOOKBACK_WINDOWS[lookback_label]
    idx = returns.index
    rebal_dates = get_month_end_rebalance_dates(returns)
    positions = {d: idx.get_loc(d) for d in rebal_dates}

    # First rebalance requires a full lookback window strictly before it.
    valid_rebal = [d for d in rebal_dates if positions[d] >= lookback_days]
    if len(valid_rebal) < 2:
        raise ValueError(f"Not enough history for {name} at {lookback_label}.")

    gross_parts, net_parts = [], []
    weight_rows, turnover_vals, cost_vals, regime_vals = {}, {}, {}, {}
    drifted = pd.Series(0.0, index=returns.columns)  # start in cash

    for k, t in enumerate(valid_rebal):
        pos = positions[t]
        lookback_returns = returns.iloc[pos - lookback_days: pos]  # ends at t-1
        signal_row = None
        if signals is not None:
            signal_row = signals.iloc[pos - 1]  # signals through t-1 only

        target = weight_fn(lookback_returns, signal_row)
        weight_rows[t] = target
        turnover = calculate_turnover(target, drifted)
        turnover_vals[t] = turnover
        # Initial cash buy-in (k == 0) is excluded from costs by convention.
        cost_vals[t] = config.TRANSACTION_COST_RATE * turnover if k > 0 else 0.0
        if signal_row is not None:
            regime_vals[t] = signal_row.get("regime_label")

        # Holding period: first trading day after t through next rebalance.
        end_pos = positions[valid_rebal[k + 1]] if k + 1 < len(valid_rebal) else len(idx) - 1
        period = returns.iloc[pos + 1: end_pos + 1]
        if period.empty:
            continue

        growth = (1 + period).cumprod()
        value = growth.mul(target, axis=1).sum(axis=1)  # portfolio value, start 1.0
        gross = value / value.shift(1).fillna(1.0) - 1
        net = gross.copy()
        net.iloc[0] = gross.iloc[0] - cost_vals[t]

        gross_parts.append(gross)
        net_parts.append(net)
        drifted = (growth.iloc[-1] * target) / value.iloc[-1]  # drifted end weights

    gross_all = pd.concat(gross_parts)
    net_all = pd.concat(net_parts)
    weights_df = pd.DataFrame(weight_rows).T
    weights_df.index.name = "date"

    return BacktestResult(
        name=name,
        lookback=lookback_label,
        gross=gross_all,
        net=net_all,
        weights=weights_df,
        turnover=pd.Series(turnover_vals),
        costs=pd.Series(cost_vals),
        regimes=pd.Series(regime_vals) if regime_vals else None,
    )


def run_all_backtests(returns: pd.DataFrame, signals: pd.DataFrame) -> dict:
    """Run every strategy and benchmark for every lookback window.

    Returns {(name, lookback): BacktestResult}.
    """
    results = {}
    for lookback in config.LOOKBACK_WINDOWS:
        for strat in config.STRATEGY_NAMES:
            results[(strat, lookback)] = run_strategy_backtest(
                strat, returns, signals, lookback
            )
        for bench in config.BENCHMARK_NAMES:
            results[(bench, lookback)] = run_benchmark_backtest(
                bench, returns, lookback
            )
    return results
