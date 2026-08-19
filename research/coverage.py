"""Data coverage: what each upstream source is actually current through.

The four sources do not share a publication calendar. ETF prices and VIX are
daily and current to the last close; CPI is monthly and released with a lag
(and lagged a further month before it is used as a signal); the Fama-French
library posts daily factors on its own update cycle.

Reporting a single "data through" date for all four would overstate the
freshness of the slower series, so the coverage record carries one honest
boundary per source, derived from the loaded data itself. Nothing here is
hand-entered, and the record deliberately contains no generation timestamp:
it changes only when the underlying data changes.
"""

import pandas as pd


def _last_valid(obj) -> pd.Timestamp:
    """Last index date carrying an observation, for a Series or a DataFrame."""
    cleaned = obj.dropna(how="all") if isinstance(obj, pd.DataFrame) else obj.dropna()
    return pd.Timestamp(cleaned.index.max())


def _iso(ts: pd.Timestamp) -> str:
    return ts.strftime("%Y-%m-%d")


def data_coverage(prices, vix, cpi, ff, returns) -> dict:
    """Per-source coverage boundaries plus the backtest sample window."""
    price_end = _last_valid(prices)
    vix_end = _last_valid(vix)
    cpi_end = _last_valid(cpi)
    ff_end = _last_valid(ff)

    return {
        # Headline market-data boundary: the last close the backtest can trade on.
        "marketDataThrough": _iso(price_end),
        "backtestStart": _iso(returns.index.min()),
        "backtestEnd": _iso(returns.index.max()),
        "tradingDays": int(len(returns)),
        "sources": [
            {
                "id": "etf-prices",
                "label": "ETF adjusted closes",
                "provider": "Yahoo Finance",
                "frequency": "daily",
                "through": _iso(price_end),
                "throughLabel": _iso(price_end),
                "note": (
                    f"{len(prices.columns)}-ETF investable universe, adjusted for "
                    "dividends and splits. Sets the backtest calendar."
                ),
            },
            {
                "id": "vix",
                "label": "Cboe VIX",
                "provider": "Cboe via Yahoo Finance",
                "frequency": "daily",
                "through": _iso(vix_end),
                "throughLabel": _iso(vix_end),
                "note": "Volatility stress signal only; never an allocation.",
            },
            {
                "id": "cpi",
                "label": "U.S. CPI (FRED CPIAUCSL)",
                "provider": "Federal Reserve Bank of St. Louis",
                "frequency": "monthly",
                "through": _iso(cpi_end),
                "throughLabel": cpi_end.strftime("%B %Y"),
                "note": (
                    "Monthly series published after the reference month; the "
                    "backtest lags it a further month before use, so the "
                    "inflation signal is always older than the price data."
                ),
            },
            {
                "id": "fama-french",
                "label": "Fama-French 5 factors",
                "provider": "Kenneth R. French Data Library",
                "frequency": "daily",
                "through": _iso(ff_end),
                "throughLabel": _iso(ff_end),
                "note": (
                    "Posted on the library's own update cycle, so factor "
                    "regressions end earlier than the price sample."
                ),
            },
        ],
    }
