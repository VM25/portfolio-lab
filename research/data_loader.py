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
"""

import io
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


def _ensure_dirs():
    config.RAW_DIR.mkdir(parents=True, exist_ok=True)
    config.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# ETF prices
# ---------------------------------------------------------------------------

def download_price_data() -> pd.DataFrame:
    import yfinance as yf

    raw = yf.download(
        config.INVESTABLE_TICKERS,
        start=config.PRICE_START_DATE,
        end=config.PRICE_END_DATE,
        auto_adjust=True,  # adjusted close: dividends, splits, distributions
        progress=False,
    )
    prices = raw["Close"][config.INVESTABLE_TICKERS]
    prices.index = pd.to_datetime(prices.index).tz_localize(None)
    prices.index.name = "Date"
    return prices


def load_price_data(force_download: bool = False) -> pd.DataFrame:
    _ensure_dirs()
    if PRICES_PATH.exists() and not force_download:
        prices = pd.read_csv(PRICES_PATH, index_col="Date", parse_dates=True)
    else:
        prices = download_price_data()
        prices.to_csv(PRICES_PATH)
    missing = [t for t in config.INVESTABLE_TICKERS if t not in prices.columns]
    if missing:
        raise ValueError(f"Missing required tickers in price data: {missing}")
    return prices[config.INVESTABLE_TICKERS]


# ---------------------------------------------------------------------------
# VIX (signal only — never investable)
# ---------------------------------------------------------------------------

def download_vix_data() -> pd.Series:
    import yfinance as yf

    raw = yf.download(
        config.SIGNAL_TICKERS["VIX"],
        start=config.PRICE_START_DATE,
        end=config.PRICE_END_DATE,
        auto_adjust=False,
        progress=False,
    )
    close = raw["Close"]
    if isinstance(close, pd.DataFrame):
        close = close.iloc[:, 0]
    close.index = pd.to_datetime(close.index).tz_localize(None)
    close.index.name = "Date"
    close.name = "VIX"
    return close


def load_vix_data(force_download: bool = False) -> pd.Series:
    _ensure_dirs()
    if VIX_PATH.exists() and not force_download:
        vix = pd.read_csv(VIX_PATH, index_col="Date", parse_dates=True)["VIX"]
    else:
        vix = download_vix_data()
        vix.to_frame().to_csv(VIX_PATH)
    if vix.dropna().empty:
        raise ValueError("VIX data is empty; cannot compute the stress signal.")
    return vix


# ---------------------------------------------------------------------------
# CPI (FRED CPIAUCSL, monthly)
# ---------------------------------------------------------------------------

def load_cpi_data(force_download: bool = False) -> pd.Series:
    _ensure_dirs()
    if CPI_PATH.exists() and not force_download:
        cpi = pd.read_csv(CPI_PATH, index_col=0, parse_dates=True).iloc[:, 0]
    else:
        cpi = pd.read_csv(FRED_CPI_URL, index_col=0, parse_dates=True).iloc[:, 0]
        cpi.to_frame("CPIAUCSL").to_csv(CPI_PATH)
    cpi.name = "CPI"
    cpi.index.name = "Date"
    if cpi.dropna().empty:
        raise ValueError("CPI data is empty; the Regime-Aware strategy requires it.")
    return cpi


# ---------------------------------------------------------------------------
# Fama-French 5 factors (daily)
# ---------------------------------------------------------------------------

def load_fama_french_factors(force_download: bool = False) -> pd.DataFrame:
    _ensure_dirs()
    if FF5_PATH.exists() and not force_download:
        ff = pd.read_csv(FF5_PATH, index_col="Date", parse_dates=True)
    else:
        with urllib.request.urlopen(FF5_DAILY_URL, timeout=120) as resp:
            payload = resp.read()
        with zipfile.ZipFile(io.BytesIO(payload)) as zf:
            csv_name = zf.namelist()[0]
            text = zf.read(csv_name).decode("utf-8", errors="ignore")
        # File has descriptive header lines before the data block; the data
        # block starts at the line whose first field parses as YYYYMMDD.
        lines = text.splitlines()
        header_idx = next(
            i for i, ln in enumerate(lines) if ln.strip().lower().startswith(",mkt-rf")
        )
        body = []
        for ln in lines[header_idx + 1:]:
            first = ln.split(",")[0].strip()
            if len(first) == 8 and first.isdigit():
                body.append(ln)
            elif body:
                break  # trailing copyright block
        csv_text = lines[header_idx] + "\n" + "\n".join(body)
        ff = pd.read_csv(io.StringIO(csv_text), index_col=0)
        ff.index = pd.to_datetime(ff.index.astype(str), format="%Y%m%d")
        ff.index.name = "Date"
        ff.columns = [c.strip() for c in ff.columns]
        ff = ff / 100.0  # percent -> decimal
        ff.to_csv(FF5_PATH)
    required = ["Mkt-RF", "SMB", "HML", "RMW", "CMA", "RF"]
    missing = [c for c in required if c not in ff.columns]
    if missing:
        raise ValueError(f"Missing factor columns: {missing}")
    return ff[required]
