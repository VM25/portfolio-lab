"""Data loading for the research engine.

Loads (or downloads, then caches) the four raw datasets:

  1. ETF adjusted close prices  -> data/raw/prices.csv      (Yahoo Finance / yfinance)
  2. VIX daily close            -> data/raw/vix.csv         (Yahoo Finance ^VIX)
  3. CPI monthly level          -> data/raw/cpi.csv         (FRED CPIAUCSL)
  4. Fama-French 5 factors      -> data/raw/fama_french_5_factors.csv
                                                            (Kenneth French Data Library)

Behavior: local cache is used when present; otherwise data is downloaded and
saved. Download failures with no cache raise clear errors — tickers are never
silently dropped or replaced.

Refresh safety. Upstream sources fail transiently (rate limits, locked yfinance
caches, truncated responses), so every download is retried, then checked for
integrity *before* it is allowed near the cache, and finally written through a
temporary file. Three rules hold for every source:

  * a download that fails integrity checks raises instead of being cached, so a
    partial response can never overwrite a known-good file;
  * a refresh may never move a series' coverage backwards in time;
  * the cache is replaced atomically, so an interrupted run leaves the previous
    known-good file intact.
"""

import io
import os
import time
import urllib.request
import zipfile

import pandas as pd

import config

FRED_CPI_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL"
FF5_DAILY_URL = (
    "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/"
    "F-F_Research_Data_5_Factors_2x3_daily_CSV.zip"
)

PRICES_PATH = config.RAW_DIR / "prices.csv"
VIX_PATH = config.RAW_DIR / "vix.csv"
CPI_PATH = config.RAW_DIR / "cpi.csv"
FF5_PATH = config.RAW_DIR / "fama_french_5_factors.csv"

# Retry policy for transient upstream failures.
DOWNLOAD_ATTEMPTS = 4
DOWNLOAD_BACKOFF_SECONDS = 6

# Integrity thresholds. These reject broken downloads; they never repair them.
MIN_PRICE_ROWS = 3000          # ~12y of trading days from the 2006 start
MIN_VIX_ROWS = 3000
MIN_CPI_MONTHS = 600
MIN_FACTOR_ROWS = 15000
MAX_TICKER_STALENESS_DAYS = 10  # every ETF in the universe trades daily


class DataDownloadError(RuntimeError):
    """Raised when an upstream refresh cannot be trusted. Never caught to
    silently fall back on the cache: a failed refresh must fail visibly."""


def _ensure_dirs():
    config.RAW_DIR.mkdir(parents=True, exist_ok=True)
    config.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def _retry(fn, label: str):
    """Call fn(), retrying transient upstream failures with linear backoff."""
    last = None
    for attempt in range(1, DOWNLOAD_ATTEMPTS + 1):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 - upstream errors are opaque
            last = exc
            if attempt < DOWNLOAD_ATTEMPTS:
                wait = DOWNLOAD_BACKOFF_SECONDS * attempt
                print(f"  [retry] {label} attempt {attempt}/{DOWNLOAD_ATTEMPTS} "
                      f"failed ({type(exc).__name__}: {exc}); retrying in {wait}s.")
                time.sleep(wait)
    raise DataDownloadError(f"{label} failed after {DOWNLOAD_ATTEMPTS} attempts: {last}")


def _atomic_write_csv(frame, path):
    """Write via a temporary file and replace, so an interrupted or failed
    write cannot leave a truncated cache behind."""
    tmp = path.with_name(path.name + ".tmp")
    frame.to_csv(tmp)
    os.replace(tmp, path)


def _cached_last_date(path, **read_kwargs):
    """Last index date of the existing cache, or None when there is no cache."""
    if not path.exists():
        return None
    try:
        cached = pd.read_csv(path, **read_kwargs)
    except Exception:  # noqa: BLE001 - an unreadable cache is not a regression
        return None
    if cached.empty:
        return None
    return pd.to_datetime(cached.index.max())


def _assert_not_regressed(new_last, cached_last, label: str):
    """A refresh may extend coverage or leave it unchanged, never shorten it."""
    if cached_last is not None and new_last is not None and new_last < cached_last:
        raise DataDownloadError(
            f"{label} refresh regressed: downloaded data ends {new_last.date()} "
            f"but the cached series already ends {cached_last.date()}. "
            "Refusing to overwrite good data with a shorter series."
        )


# US equity session close, plus a short buffer for the print to settle.
MARKET_TZ = "America/New_York"
SESSION_CLOSE_HOUR = 16
SETTLE_BUFFER_MINUTES = 15


def _drop_unsettled_session(obj):
    """Drop the current trading day while it is still in progress.

    Yahoo serves a partial bar for the live session, so a refresh run during
    market hours (a manual workflow_dispatch, say) would otherwise write an
    intraday quote into the cache as if it were a settled daily close. That
    would put a non-final price into the return series and make the run
    unreproducible an hour later. Completed sessions are never touched.
    """
    now = pd.Timestamp.now(tz=MARKET_TZ)
    settled = now.replace(
        hour=SESSION_CLOSE_HOUR, minute=SETTLE_BUFFER_MINUTES,
        second=0, microsecond=0,
    )
    if now >= settled:
        return obj  # today's close is final
    today = now.normalize().tz_localize(None)
    if len(obj.index) and pd.Timestamp(obj.index.max()) == today:
        print(f"  [note] dropping in-progress session {today.date()} "
              "(market still open; only settled closes are used).")
        return obj.iloc[:-1]
    return obj


# ---------------------------------------------------------------------------
# ETF prices
# ---------------------------------------------------------------------------

def download_price_data() -> pd.DataFrame:
    import yfinance as yf

    def _fetch():
        raw = yf.download(
            config.INVESTABLE_TICKERS,
            start=config.PRICE_START_DATE,
            end=config.PRICE_END_DATE,
            auto_adjust=True,  # adjusted close: dividends, splits, distributions
            progress=False,
            threads=False,     # serialized: yfinance's shared cache is not concurrency-safe
        )
        if raw is None or raw.empty:
            raise DataDownloadError("yfinance returned an empty price frame.")
        prices = raw["Close"][config.INVESTABLE_TICKERS]
        prices.index = pd.to_datetime(prices.index).tz_localize(None)
        prices.index.name = "Date"
        prices = _drop_unsettled_session(prices)
        _validate_prices(prices)
        return prices

    return _retry(_fetch, "ETF price download")


def _validate_prices(prices: pd.DataFrame) -> None:
    """Reject a price download that is incomplete, stale, or truncated.

    yfinance reports per-ticker failures as an all-null column rather than an
    exception, so an unchecked partial response would silently drop an asset
    from the universe.
    """
    missing = [t for t in config.INVESTABLE_TICKERS if t not in prices.columns]
    if missing:
        raise DataDownloadError(f"Price download missing required tickers: {missing}")

    empty = [t for t in config.INVESTABLE_TICKERS if prices[t].dropna().empty]
    if empty:
        raise DataDownloadError(
            f"Price download returned no observations for: {empty} "
            "(partial download; refusing to cache)."
        )

    if len(prices) < MIN_PRICE_ROWS:
        raise DataDownloadError(
            f"Price download has only {len(prices)} rows (< {MIN_PRICE_ROWS}); "
            "response looks truncated."
        )

    frame_last = prices.index.max()
    stale = {}
    for ticker in config.INVESTABLE_TICKERS:
        last_valid = prices[ticker].last_valid_index()
        gap = (frame_last - last_valid).days
        if gap > MAX_TICKER_STALENESS_DAYS:
            stale[ticker] = f"{last_valid.date()} ({gap}d behind)"
    if stale:
        raise DataDownloadError(
            f"Price download is stale for {stale} versus the frame end "
            f"{frame_last.date()}; refusing to cache a partial refresh."
        )


def load_price_data(force_download: bool = False) -> pd.DataFrame:
    _ensure_dirs()
    if PRICES_PATH.exists() and not force_download:
        prices = pd.read_csv(PRICES_PATH, index_col="Date", parse_dates=True)
    else:
        cached_last = _cached_last_date(PRICES_PATH, index_col="Date", parse_dates=True)
        prices = download_price_data()
        _assert_not_regressed(prices.index.max(), cached_last, "ETF prices")
        _atomic_write_csv(prices, PRICES_PATH)
    missing = [t for t in config.INVESTABLE_TICKERS if t not in prices.columns]
    if missing:
        raise ValueError(f"Missing required tickers in price data: {missing}")
    return prices[config.INVESTABLE_TICKERS]


# ---------------------------------------------------------------------------
# VIX (signal only — never investable)
# ---------------------------------------------------------------------------

def download_vix_data() -> pd.Series:
    import yfinance as yf

    def _fetch():
        raw = yf.download(
            config.SIGNAL_TICKERS["VIX"],
            start=config.PRICE_START_DATE,
            end=config.PRICE_END_DATE,
            auto_adjust=False,
            progress=False,
            threads=False,
        )
        if raw is None or raw.empty:
            raise DataDownloadError("yfinance returned an empty VIX frame.")
        close = raw["Close"]
        if isinstance(close, pd.DataFrame):
            close = close.iloc[:, 0]
        close.index = pd.to_datetime(close.index).tz_localize(None)
        close.index.name = "Date"
        close.name = "VIX"
        close = _drop_unsettled_session(close)
        if close.dropna().empty:
            raise DataDownloadError("VIX download contains no observations.")
        if len(close.dropna()) < MIN_VIX_ROWS:
            raise DataDownloadError(
                f"VIX download has only {len(close.dropna())} observations "
                f"(< {MIN_VIX_ROWS}); response looks truncated."
            )
        return close

    return _retry(_fetch, "VIX download")


def load_vix_data(force_download: bool = False) -> pd.Series:
    _ensure_dirs()
    if VIX_PATH.exists() and not force_download:
        vix = pd.read_csv(VIX_PATH, index_col="Date", parse_dates=True)["VIX"]
    else:
        cached_last = _cached_last_date(VIX_PATH, index_col="Date", parse_dates=True)
        vix = download_vix_data()
        _assert_not_regressed(vix.dropna().index.max(), cached_last, "VIX")
        _atomic_write_csv(vix.to_frame(), VIX_PATH)
    if vix.dropna().empty:
        raise ValueError("VIX data is empty; cannot compute the stress signal.")
    return vix


# ---------------------------------------------------------------------------
# CPI (FRED CPIAUCSL, monthly)
# ---------------------------------------------------------------------------

def download_cpi_data() -> pd.Series:
    def _fetch():
        cpi = pd.read_csv(FRED_CPI_URL, index_col=0, parse_dates=True).iloc[:, 0]
        cpi = pd.to_numeric(cpi, errors="coerce").dropna()
        if len(cpi) < MIN_CPI_MONTHS:
            raise DataDownloadError(
                f"CPI download has only {len(cpi)} monthly observations "
                f"(< {MIN_CPI_MONTHS}); response looks truncated."
            )
        cpi.index = pd.to_datetime(cpi.index)
        return cpi.sort_index()

    return _retry(_fetch, "FRED CPI download")


def load_cpi_data(force_download: bool = False) -> pd.Series:
    _ensure_dirs()
    if CPI_PATH.exists() and not force_download:
        cpi = pd.read_csv(CPI_PATH, index_col=0, parse_dates=True).iloc[:, 0]
    else:
        cached_last = _cached_last_date(CPI_PATH, index_col=0, parse_dates=True)
        cpi = download_cpi_data()
        _assert_not_regressed(cpi.index.max(), cached_last, "CPI")
        _atomic_write_csv(cpi.to_frame("CPIAUCSL"), CPI_PATH)
    cpi.name = "CPI"
    cpi.index.name = "Date"
    if cpi.dropna().empty:
        raise ValueError("CPI data is empty; the Regime-Aware strategy requires it.")
    return cpi


# ---------------------------------------------------------------------------
# Fama-French 5 factors (daily)
# ---------------------------------------------------------------------------

def download_fama_french_factors() -> pd.DataFrame:
    def _fetch():
        with urllib.request.urlopen(FF5_DAILY_URL, timeout=120) as resp:
            payload = resp.read()
        with zipfile.ZipFile(io.BytesIO(payload)) as zf:
            csv_name = zf.namelist()[0]
            text = zf.read(csv_name).decode("utf-8", errors="ignore")
        # File has descriptive header lines before the data block; the data
        # block starts at the line whose first field parses as YYYYMMDD.
        lines = text.splitlines()
        try:
            header_idx = next(
                i for i, ln in enumerate(lines) if ln.strip().lower().startswith(",mkt-rf")
            )
        except StopIteration:
            raise DataDownloadError(
                "Fama-French file layout changed: no ',Mkt-RF' header row found."
            )
        body = []
        for ln in lines[header_idx + 1:]:
            first = ln.split(",")[0].strip()
            if len(first) == 8 and first.isdigit():
                body.append(ln)
            elif body:
                break  # trailing copyright block
        if len(body) < MIN_FACTOR_ROWS:
            raise DataDownloadError(
                f"Fama-French download has only {len(body)} daily rows "
                f"(< {MIN_FACTOR_ROWS}); response looks truncated."
            )
        csv_text = lines[header_idx] + "\n" + "\n".join(body)
        ff = pd.read_csv(io.StringIO(csv_text), index_col=0)
        ff.index = pd.to_datetime(ff.index.astype(str), format="%Y%m%d")
        ff.index.name = "Date"
        ff.columns = [c.strip() for c in ff.columns]
        ff = ff / 100.0  # percent -> decimal
        missing = [c for c in ["Mkt-RF", "SMB", "HML", "RMW", "CMA", "RF"]
                   if c not in ff.columns]
        if missing:
            raise DataDownloadError(f"Fama-French download missing columns: {missing}")
        return ff

    return _retry(_fetch, "Fama-French factor download")


def load_fama_french_factors(force_download: bool = False) -> pd.DataFrame:
    _ensure_dirs()
    if FF5_PATH.exists() and not force_download:
        ff = pd.read_csv(FF5_PATH, index_col="Date", parse_dates=True)
    else:
        cached_last = _cached_last_date(FF5_PATH, index_col="Date", parse_dates=True)
        ff = download_fama_french_factors()
        _assert_not_regressed(ff.index.max(), cached_last, "Fama-French factors")
        _atomic_write_csv(ff, FF5_PATH)
    required = ["Mkt-RF", "SMB", "HML", "RMW", "CMA", "RF"]
    missing = [c for c in required if c not in ff.columns]
    if missing:
        raise ValueError(f"Missing factor columns: {missing}")
    return ff[required]
