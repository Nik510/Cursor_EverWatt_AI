from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, Iterable, List, Literal, Sequence

import pandas as pd


TouBucket = Literal["on", "part", "off"]


@dataclass(frozen=True)
class TariffInterval:
    ts: pd.Timestamp
    kW_base: float
    kWh_base: float
    month_key: str
    day_key: str
    tou: TouBucket


@dataclass(frozen=True)
class DemandComponent:
    kind: Literal["monthlyMax", "dailyMax"]
    name: str
    rate_per_kW: float
    applies: Callable[[TariffInterval], bool]


@dataclass(frozen=True)
class RatePlan:
    """
    Generic rate plan interface (matches existing TS concepts).
    """

    name: str
    energy_rate_per_kWh: Callable[[TariffInterval], float]
    demand_components: Sequence[DemandComponent]
    fixed_monthly_usd: float = 0.0


def get_interval_hours_from_df(df: pd.DataFrame, fallback: float = 0.25) -> float:
    if df is None or len(df) < 2:
        return float(fallback)
    ts = pd.to_datetime(df["ts"], utc=True, errors="coerce")
    dt = ts.diff().dropna().median()
    if dt is None or not pd.notna(dt):
        return float(fallback)
    h = dt.total_seconds() / 3600.0
    return float(h if h > 0 else fallback)


def to_tariff_intervals(
    df: pd.DataFrame,
    *,
    tou_mapper: Callable[[pd.Timestamp], TouBucket] | None = None,
    interval_hours: float | None = None,
) -> List[TariffInterval]:
    """
    df must contain: ts (datetime), load_kw, month_key, day_key.
    """
    if tou_mapper is None:
        tou_mapper = lambda _ts: "off"  # type: ignore[return-value]
    if interval_hours is None:
        interval_hours = get_interval_hours_from_df(df)

    out: List[TariffInterval] = []
    for row in df.itertuples(index=False):
        ts = getattr(row, "ts")
        kw = float(getattr(row, "load_kw"))
        month_key = str(getattr(row, "month_key"))
        day_key = str(getattr(row, "day_key"))
        out.append(
            TariffInterval(
                ts=pd.Timestamp(ts),
                kW_base=kw,
                kWh_base=kw * float(interval_hours),
                month_key=month_key,
                day_key=day_key,
                tou=tou_mapper(pd.Timestamp(ts)),
            )
        )
    return out

