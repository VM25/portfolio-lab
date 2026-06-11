# Research Engine

Python research layer for **Portfolio Risk & Allocation Analytics**. It loads
market data, runs every strategy/benchmark backtest, computes risk analytics,
validates the results, and exports all frontend-ready JSON into `../data/`.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Regenerating outputs

```bash
python generate_outputs.py                 # uses cached raw data when present
python generate_outputs.py --force-download
```

Expected end of output:

```
Validation status: WARNING.   # or PASS
  [ok ] data_completeness
  ...
Exported frontend data files.
```

The `gfc_partial_data` warning is expected: the common ETF history begins in
2007 (SHV inception 2007-01, HYG inception 2007-04), so lookbacks longer than
6M cannot fully cover the 2008–2009 GFC window. Those combinations are exported
as `insufficient_data`.

## Modules

| Module | Responsibility |
| --- | --- |
| `config.py` | Universe, thresholds, dates, constraints — single source of truth |
| `data_loader.py` | Load/download prices, VIX, CPI, Fama-French factors (cached in `../data/raw/`) |
| `preprocessing.py` | Price cleaning, simple returns, common-history alignment |
| `signals.py` | SPY-TLT rolling correlation, lagged CPI YoY, VIX stress, regime labels |
| `estimators.py` | Expected returns, ridge-stabilized covariance, realized vol, risk-free |
| `optimizers.py` | GMV (cvxpy, scipy fallback) and Max Sharpe (SLSQP + γ-grid fallback) |
| `strategies.py` | The four strategy weight rules and benchmark weights |
| `backtest.py` | Monthly rolling backtest engine with weight drift and costs |
| `metrics.py` | Performance and risk metrics from daily net returns |
| `drawdowns.py` | Wealth index and drawdown series |
| `crisis.py` | Crisis-window slicing, metrics, and rebased wealth paths |
| `factors.py` | Fama-French 5-factor OLS exposure diagnostics |
| `diagnostics.py` | Turnover, HHI concentration, effective positions, cumulative cost drag |
| `validation.py` | The automated integrity checks |
| `static_content.py` | Hand-authored descriptive exports (universe, factsheets, sourced market context) |
| `export.py` | JSON/CSV writers with NaN-safe sanitization |
| `generate_outputs.py` | Master script — runs everything above in order |

## Backtest conventions

- Rebalance decisions at the close of each month-end trading day `t`, using
  returns/signals through `t-1` only; CPI lagged one further month.
- New weights earn returns from `t+1`; weights drift with daily returns until
  the next rebalance.
- Turnover = `sum(|target − drifted|)`; cost = 5 bps × turnover, charged on the
  first day of the new holding period. The initial cash buy-in (turnover = 1)
  is excluded from both costs and turnover statistics, so a 100% SPY benchmark
  shows zero cumulative cost drag.
- VaR/CVaR are daily historical loss estimates at 95% confidence, reported as
  positive loss magnitudes (CVaR ≥ VaR enforced by validation); drawdowns are
  negative. Annualized returns are geometric from daily net returns; volatility
  and Sharpe scale daily figures by √252. Sharpe uses daily excess returns over
  the Fama-French RF; the Max Sharpe optimizer's risk-free input is the
  annualized SHV return over its lookback (investable cash proxy vs
  standardized reporting convention).

## Validation checks

Data completeness · return integrity · weight sums and bounds · no look-ahead ·
transaction-cost application · turnover validity · VaR/CVaR sign convention and
CVaR ≥ VaR · factor regression fit ranges · regime signal availability · CPI lag
verification · benchmark construction (SPY series replication, 60/40 weights) ·
export completeness. Results land in `../data/validation-summary.json` and are
surfaced on the site.

## Known limitations

See the root README and the dashboard's Assumptions & Limitations section —
simplified linear costs, no taxes/spreads/impact, noisy estimates, manually
selected crisis windows, equity-centric factor model, ETF proxy imperfection.
