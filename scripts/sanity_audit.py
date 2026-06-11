"""Numerical sanity audit for the deployed analytics.

Verifies the generated data files actually consumed by the frontend (data/*.json
plus data/raw/cpi.csv), not hardcoded values. Run:

    research/.venv/bin/python scripts/sanity_audit.py
    # or, with pandas available on PATH:
    python scripts/sanity_audit.py

Exit code 0 = all checks pass; 1 = at least one failure.
"""

from pathlib import Path
import json
import math
import sys
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

SIGNAL_ONLY = {
    "VIX", "^VIX", "CPI", "CPI YoY", "CPI_YOY", "CPIAUCSL",
    "SPY-TLT corr", "SPY_TLT_CORR", "SPY-TLT", "SPYTLT",
}
INVESTABLE = {
    "SPY", "QQQ", "IWM", "EFA", "EEM", "TLT", "IEF", "TIP",
    "HYG", "GLD", "DBC", "VNQ", "SHV",
}
BENCHMARKS = {"SPY", "60/40"}
MAX_WEIGHT = 0.35
WEIGHT_TOL = 1e-5
COST_TOL = 2e-3
SIGN_TOL = 1e-9

failures = []
notes = []


def fail(msg):
    failures.append(msg)


def note(msg):
    notes.append(msg)


def load(name):
    return json.loads((DATA / name).read_text())


def approx(a, b, tol):
    return abs(float(a) - float(b)) <= tol


weights = load("portfolio-weights.json")
metrics = load("performance-metrics.json")
returns = load("strategy-returns.json")
turnover = load("turnover-diagnostics.json")
crisis = load("crisis-metrics.json")
benchmarks = load("benchmark-definitions.json")
config = load("backtest-config.json")
validation = load("validation-summary.json")

# ---------------------------------------------------------------------------
# 1-3. Weights: sum to 1, <= 35% cap, long-only, no signal-only holdings
# ---------------------------------------------------------------------------
grouped = defaultdict(dict)  # (strategy, lookback, date) -> {ticker: weight}
weight_tickers = set()
for row in weights:
    key = (row["strategy"], row["lookback"], row["date"])
    grouped[key][row["ticker"]] = float(row["weight"])
    weight_tickers.add(row["ticker"])

for key, w in grouped.items():
    total = sum(w.values())
    if not approx(total, 1.0, 1e-4):
        fail(f"[1] weights sum to {total:.6f} != 1.0 at {key}")
    for ticker, val in w.items():
        if ticker in SIGNAL_ONLY:
            fail(f"[3] signal-only series appears as a holding: {ticker} at {key}")
        if val > MAX_WEIGHT + WEIGHT_TOL:
            fail(f"[2] weight {val:.6f} exceeds {MAX_WEIGHT:.0%} cap: {ticker} at {key}")
        if val < -WEIGHT_TOL:
            fail(f"[2] negative weight {val:.6f} in long-only portfolio: {ticker} at {key}")

stray_signal = weight_tickers & SIGNAL_ONLY
if stray_signal:
    fail(f"[3] signal-only tickers present in portfolio-weights: {sorted(stray_signal)}")
if not weight_tickers <= INVESTABLE:
    fail(f"[3] non-investable tickers held: {sorted(weight_tickers - INVESTABLE)}")
note(f"[1-3] checked {len(grouped)} (strategy, lookback, date) weight vectors; "
     f"tickers held = {len(weight_tickers)}, all investable.")

# ---------------------------------------------------------------------------
# 4. CPI signal lagged at least one month before use in regime logic, with
#    zero look-ahead. The engine applies a positional one-month shift, so the
#    interior matches month M-1 exactly; at the tail the newest print is held
#    back one extra step (so a date in month M may carry month M-2's YoY).
#    Both are >= 1-month lags. The hard requirement is that the signal NEVER
#    uses the contemporaneous (month M) or any future print.
# ---------------------------------------------------------------------------
lag = int(config["cpiSignalLagMonths"])
try:
    import pandas as pd

    cpi_raw = pd.read_csv(DATA / "raw" / "cpi.csv", index_col=0, parse_dates=True).iloc[:, 0]
    cpi_raw.index = pd.to_datetime(cpi_raw.index)
    yoy = (cpi_raw / cpi_raw.shift(12) - 1)
    yoy_by_month = {ts.strftime("%Y-%m"): v for ts, v in yoy.items()}

    def valid_yoy(period):
        v = yoy_by_month.get(str(period))
        return None if v is None or (isinstance(v, float) and math.isnan(v)) else v

    signals = load("regime-signals.json")
    checked = interior_match = lookahead = lag_proven = 0
    for p in signals:
        cpi_used = p.get("cpiYoy")
        if cpi_used is None:
            continue
        month = pd.Timestamp(p["date"]).to_period("M")
        contemporaneous = valid_yoy(month)
        m1 = valid_yoy(month - 1)
        if m1 is None:
            continue
        checked += 1
        # interior expectation: matches the one-month-lagged YoY
        if approx(cpi_used, m1, 5e-4):
            interior_match += 1
        # NO LOOK-AHEAD: must never equal the contemporaneous print when that
        # print differs materially from the lagged value
        if (contemporaneous is not None
                and abs(contemporaneous - m1) > 1e-3
                and approx(cpi_used, contemporaneous, 5e-4)):
            lookahead += 1
        # positively prove a >=1-month lag: the used value equals a prior month
        # (M-1 or M-2) and differs from the contemporaneous print
        m2 = valid_yoy(month - 2)
        used_is_lagged = approx(cpi_used, m1, 5e-4) or (m2 is not None and approx(cpi_used, m2, 5e-4))
        if (contemporaneous is not None
                and abs(contemporaneous - m1) > 1e-3
                and used_is_lagged
                and not approx(cpi_used, contemporaneous, 5e-4)):
            lag_proven += 1

    if checked == 0:
        fail("[4] could not verify CPI lag: no comparable months found.")
    if lookahead > 0:
        fail(f"[4] CPI look-ahead detected: signal equals the contemporaneous "
             f"(month M) print in {lookahead}/{checked} points.")
    if lag_proven == 0:
        fail("[4] CPI lag could not be positively confirmed (signal never "
             "diverged from the contemporaneous print).")
    if interior_match < 0.95 * checked:
        fail(f"[4] CPI signal matches the 1-month-lagged YoY in only "
             f"{interior_match}/{checked} points (< 95%).")
    if not failures or all("[4]" not in f for f in failures):
        tail = checked - interior_match
        note(f"[4] CPI lag >= {lag} month(s) with zero look-ahead: {interior_match}/"
             f"{checked} points match month M-{lag} exactly; {tail} tail point(s) "
             f"carry the prior month (newest print held back one extra step); "
             f"{lag_proven} points prove divergence from the contemporaneous print.")
except ImportError:
    fail("[4] pandas unavailable; run with research/.venv/bin/python to verify CPI lag.")

# ---------------------------------------------------------------------------
# 5. Turnover excludes the initial cash buy-in
#    Per (strategy, lookback): turnover rows == (#rebalance dates - 1), and the
#    first rebalance date never appears in turnover diagnostics.
# ---------------------------------------------------------------------------
if not config.get("initialBuyInExcludedFromCosts"):
    fail("[5] backtest-config does not declare initialBuyInExcludedFromCosts=true.")

weight_dates = defaultdict(set)   # (strategy, lookback) -> {dates}
for row in weights:
    weight_dates[(row["strategy"], row["lookback"])].add(row["date"])
turnover_dates = defaultdict(set)
turnover_vals = defaultdict(list)
for row in turnover:
    turnover_dates[(row["strategy"], row["lookback"])].add(row["date"])
    turnover_vals[(row["strategy"], row["lookback"])].append(float(row["turnover"]))

for key, wd in weight_dates.items():
    td = turnover_dates.get(key, set())
    if len(td) != len(wd) - 1:
        fail(f"[5] {key}: turnover rows ({len(td)}) != rebalances-1 ({len(wd) - 1}); "
             "initial buy-in may be included.")
    first_rebalance = min(wd)
    if first_rebalance in td:
        fail(f"[5] {key}: first rebalance {first_rebalance} appears in turnover "
             "(buy-in not excluded).")
note(f"[5] turnover excludes the initial buy-in for all {len(weight_dates)} "
     "(strategy, lookback) series.")

# ---------------------------------------------------------------------------
# 6. Cumulative cost drag == terminal net/gross wealth ratio - 1
# ---------------------------------------------------------------------------
last_wealth = {}  # (strategy, lookback) -> (date, gross, net)
for row in returns:
    key = (row["strategy"], row["lookback"])
    prev = last_wealth.get(key)
    if prev is None or row["date"] > prev[0]:
        last_wealth[key] = (row["date"], float(row["wealthGross"]), float(row["wealthNet"]))

drag_by_key = {(m["strategy"], m["lookback"]): float(m["transactionCostDrag"]) for m in metrics}
checked_drag = 0
for key, reported in drag_by_key.items():
    lw = last_wealth.get(key)
    if lw is None:
        continue
    _, gross, net = lw
    expected = net / gross - 1.0
    checked_drag += 1
    if not approx(reported, expected, COST_TOL):
        fail(f"[6] {key}: cumulative cost drag {reported:.6f} != net/gross-1 "
             f"{expected:.6f} (terminal wealth).")
note(f"[6] cumulative cost drag matches terminal net/gross wealth ratio for "
     f"{checked_drag} series (tol {COST_TOL}).")

# ---------------------------------------------------------------------------
# 7. VaR/CVaR positive loss magnitudes; drawdowns & worst returns negative
# ---------------------------------------------------------------------------
def check_signs(record, label):
    var = record.get("historicalVaR95")
    cvar = record.get("historicalCVaR95")
    mdd = record.get("maxDrawdown")
    m10 = record.get("max10DayDrawdown")
    worst = record.get("worstDailyReturn")
    if var is not None and float(var) < -SIGN_TOL:
        fail(f"[7] {label}: VaR95 {var} should be a positive loss magnitude.")
    if cvar is not None and float(cvar) < -SIGN_TOL:
        fail(f"[7] {label}: CVaR95 {cvar} should be a positive loss magnitude.")
    if var is not None and cvar is not None and float(cvar) + 1e-9 < float(var):
        fail(f"[7] {label}: CVaR {cvar} < VaR {var}.")
    if mdd is not None and float(mdd) > SIGN_TOL:
        fail(f"[7] {label}: maxDrawdown {mdd} should be negative.")
    if m10 is not None and float(m10) > SIGN_TOL:
        fail(f"[7] {label}: max10DayDrawdown {m10} should be negative.")
    if worst is not None and float(worst) > SIGN_TOL:
        fail(f"[7] {label}: worstDailyReturn {worst} should be negative.")


for m in metrics:
    check_signs(m, f"metrics[{m['strategy']}/{m['lookback']}]")
for c in crisis:
    if c.get("status") == "valid":
        check_signs(c, f"crisis[{c['crisisName']}/{c['strategy']}/{c['lookback']}]")
note(f"[7] sign conventions verified across {len(metrics)} full-sample and "
     f"{sum(1 for c in crisis if c.get('status') == 'valid')} valid crisis records.")

# ---------------------------------------------------------------------------
# 8. Benchmark cost treatment is intentional and documented
#    SPY (no rebalancing) -> 0.00% drag; 60/40 (monthly rebalance) -> nonzero.
# ---------------------------------------------------------------------------
bench_rebal = {b["name"]: b["rebalance"] for b in benchmarks}
for key, drag in drag_by_key.items():
    name, lookback = key
    if name == "SPY":
        if abs(drag) > 5e-5:
            fail(f"[8] SPY ({lookback}) has nonzero cost drag {drag:.6f}; "
                 "a buy-and-hold benchmark should be 0.00%.")
    if name == "60/40":
        if bench_rebal.get("60/40") == "monthly" and abs(drag) <= SIGN_TOL:
            note(f"[8] 60/40 ({lookback}) drag is ~0 despite monthly rebalance; "
                 "acceptable only if turnover is genuinely negligible.")
spy_rebal = bench_rebal.get("SPY")
if spy_rebal not in {"none", None}:
    fail(f"[8] SPY benchmark rebalance is '{spy_rebal}', expected 'none'.")
note(f"[8] benchmark cost treatment intentional: SPY rebalance='{spy_rebal}' -> "
     f"0.00% drag; 60/40 rebalance='{bench_rebal.get('60/40')}' may carry drag.")

# ---------------------------------------------------------------------------
# 9. 2008 insufficient-data logic consistent across lookbacks/strategies/benchmarks
# ---------------------------------------------------------------------------
gfc = [c for c in crisis if c["crisisName"] == "Global Financial Crisis"]
by_lookback = defaultdict(dict)  # lookback -> {series: status}
for c in gfc:
    by_lookback[c["lookback"]][c["strategy"]] = c["status"]

expected_series = INVESTABLE_SERIES = {
    "Equal Weight", "Global Minimum Variance",
    "Max Sharpe / Risk-Adjusted Return", "Regime-Aware Allocation",
} | BENCHMARKS

for lookback, series_status in by_lookback.items():
    if set(series_status) != expected_series:
        fail(f"[9] GFC {lookback}: series set {sorted(series_status)} != expected "
             f"{sorted(expected_series)}.")
    statuses = set(series_status.values())
    if len(statuses) != 1:
        fail(f"[9] GFC {lookback}: inconsistent status across series: {series_status}")
gfc_status = {lb: next(iter(s.values())) for lb, s in by_lookback.items()}
if gfc_status.get("6M") != "valid":
    fail(f"[9] GFC 6M expected 'valid', got {gfc_status.get('6M')}.")
for lb in ("1Y", "3Y"):
    if gfc_status.get(lb) != "insufficient_data":
        fail(f"[9] GFC {lb} expected 'insufficient_data', got {gfc_status.get(lb)}.")
if "gfc_partial_data" not in {w["name"] for w in validation["warnings"]}:
    fail("[9] gfc_partial_data warning missing from validation summary.")
note(f"[9] GFC status uniform per lookback across all 6 series: {gfc_status}; "
     "documented via gfc_partial_data warning.")

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
print("\nSANITY AUDIT RESULTS")
print("--------------------")
for n in notes:
    print(f"ok   {n}")
print()
if failures:
    for f in failures:
        print(f"FAIL {f}")
    print(f"\n{len(failures)} failure(s). Fix before deployment.")
    sys.exit(1)
print(f"PASS: all 9 checks passed across the generated data files "
      f"(validation summary status: {validation['status']}).")
