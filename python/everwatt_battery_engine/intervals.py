from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Sequence, Tuple

import pandas as pd

from .types import Interval


@dataclass(frozen=True)
class NormalizedIntervals:
    df: pd.DataFrame  # columns: ts (datetime64[ns, UTC?]), load_kw (float), month_key (str), day_key (str)
    interval_hours: float
    warnings: List[str]


def detect_interval_hours(timestamps: pd.Series, fallback_hours: float = 0.25) -> float:
    ts = pd.to_datetime(timestamps, utc=True, errors="coerce").sort_values()
    if ts.isna().any() or len(ts) < 2:
        return float(fallback_hours)
    dt = ts.diff().dropna().median()
    hours = dt.total_seconds() / 3600.0
    if not pd.notna(hours) or hours <= 0:
        return float(fallback_hours)
    # round to nearest minute fraction for stability
    return float(hours)


def normalize_intervals(
    intervals: Sequence[Interval],
    *,
    timezone: str | None = "UTC",
    fill_gaps: bool = False,
    max_gap_intervals_to_fill: int = 4,
) -> NormalizedIntervals:
    """
    Normalize interval list into a DataFrame suitable for optimization.

    - Auto-detects cadence from timestamps.
    - Produces month_key/day_key strings.
    - Optionally fills short gaps (default off; safest is to fail/flag).
    """
    warnings: List[str] = []
    if not intervals:
        return NormalizedIntervals(
            df=pd.DataFrame({"ts": [], "load_kw": [], "month_key": [], "day_key": []}),
            interval_hours=0.25,
            warnings=["no-intervals"],
        )

    df = pd.DataFrame(
        {
            "ts": [i.timestamp for i in intervals],
            "load_kw": [float(i.kw) for i in intervals],
        }
    )
    df["ts"] = pd.to_datetime(df["ts"], utc=True, errors="coerce")
    if df["ts"].isna().any():
        warnings.append("Some timestamps failed to parse; those rows were dropped.")
        df = df.dropna(subset=["ts"]).copy()

    df = df.sort_values("ts").reset_index(drop=True)
    interval_hours = detect_interval_hours(df["ts"])

    if timezone and timezone.upper() != "UTC":
        try:
            df["ts"] = df["ts"].dt.tz_convert(timezone)
        except Exception:
            warnings.append(f"Failed to convert timezone to {timezone}; using UTC.")

    # Basic sanity: clamp negatives? (keep as-is; export handling is a tariff/business decision)
    # We only warn here.
    if (df["load_kw"] < 0).any():
        warnings.append("Negative kW values detected (net export). No-export mode may clip discharge accordingly.")

    # Optionally fill missing intervals
    if fill_gaps and len(df) >= 2:
        inferred = pd.to_timedelta(interval_hours, unit="h")
        full_index = pd.date_range(start=df["ts"].iloc[0], end=df["ts"].iloc[-1], freq=inferred)
        if len(full_index) > len(df):
            df2 = df.set_index("ts").reindex(full_index)
            missing = df2["load_kw"].isna().sum()
            if missing:
                if missing > max_gap_intervals_to_fill:
                    warnings.append(f"Detected {missing} missing intervals; too many to auto-fill safely.")
                else:
                    warnings.append(f"Filled {missing} missing intervals by linear interpolation.")
                    df2["load_kw"] = df2["load_kw"].interpolate(limit_direction="both")
                    df = df2.reset_index(names="ts")

    # Billing keys
    ts_local = df["ts"]
    df["month_key"] = ts_local.dt.strftime("%Y-%m")
    df["day_key"] = ts_local.dt.strftime("%Y-%m-%d")

    return NormalizedIntervals(df=df, interval_hours=float(interval_hours), warnings=warnings)

