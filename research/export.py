"""JSON/CSV export helpers for frontend-ready data files."""

import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

import config


def _sanitize(obj):
    """Recursively convert numpy types and replace non-finite floats with None."""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        obj = float(obj)
    if isinstance(obj, float):
        return obj if math.isfinite(obj) else None
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, pd.Timestamp):
        return obj.strftime("%Y-%m-%d")
    return obj


def export_json(data, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(_sanitize(data), f, separators=(",", ":"))
    return path.name


def export_csv(dataframe: pd.DataFrame, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    dataframe.to_csv(path)
    return path.name


def format_dates_for_json(index) -> list:
    return [d.strftime("%Y-%m-%d") for d in index]


def round_records(records, fields, decimals=6):
    for rec in records:
        for f in fields:
            if f in rec and isinstance(rec[f], float):
                rec[f] = round(rec[f], decimals)
    return records
