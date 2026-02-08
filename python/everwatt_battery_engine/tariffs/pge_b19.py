from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, Iterable, List, Literal, Optional, Sequence, Tuple

import pandas as pd

from .base import DemandComponent, RatePlan, TariffInterval, TouBucket


def _is_weekend(ts: pd.Timestamp) -> bool:
    # Monday=0 ... Sunday=6
    return int(ts.dayofweek) >= 5


def _season(ts: pd.Timestamp) -> Literal["summer", "winter"]:
    # PG&E commonly uses Jun-Sep as summer for many tariffs.
    m = int(ts.month)
    return "summer" if 6 <= m <= 9 else "winter"


def _in_window(ts: pd.Timestamp, start_hour: int, end_hour: int) -> bool:
    h = int(ts.hour)
    return start_hour <= h < end_hour


def b19_tou_bucket(ts: pd.Timestamp) -> TouBucket:
    """
    Approximate B-19 TOU buckets as defined in src/utils/rates/pge-rates-comprehensive.ts.
    This is a stub mapping; holiday calendars and exact tariff dates should be added later.
    """
    season = _season(ts)
    if _is_weekend(ts):
        return "off"
    if season == "summer":
        if _in_window(ts, 15, 20):
            return "on"
        if _in_window(ts, 10, 15) or _in_window(ts, 20, 22):
            return "part"
        return "off"
    # winter
    if _in_window(ts, 15, 20):
        return "on"
    return "off"


def build_pge_b19_rate_plan(
    *,
    name: str = "PG&E_B-19",
    include_fixed_monthly: bool = True,
    fixed_monthly_usd: float = 349.61,
    # Energy rates ($/kWh)
    summer_on_peak: float = 0.19551,
    summer_partial_peak: float = 0.17922,
    summer_off_peak: float = 0.14455,
    winter_on_peak: float = 0.19441,
    winter_off_peak: float = 0.14532,
    # Demand charges ($/kW-month) (from pge-rates-comprehensive.ts)
    demand_max_all_hours_summer: float = 19.20,
    demand_max_all_hours_winter: float = 19.20,
    demand_on_peak_summer: float = 19.17,
    demand_partial_peak_summer: float = 4.79,
    demand_on_peak_winter: float = 1.85,
) -> RatePlan:
    def energy_rate(i: TariffInterval) -> float:
        season = _season(i.ts)
        if season == "summer":
            if i.tou == "on":
                return summer_on_peak
            if i.tou == "part":
                return summer_partial_peak
            return summer_off_peak
        # winter
        if i.tou == "on":
            return winter_on_peak
        return winter_off_peak

    def applies_all_hours(i: TariffInterval) -> bool:
        return True

    def applies_summer(i: TariffInterval) -> bool:
        return _season(i.ts) == "summer"

    def applies_winter(i: TariffInterval) -> bool:
        return _season(i.ts) == "winter"

    def applies_on_peak(i: TariffInterval) -> bool:
        return i.tou == "on"

    def applies_partial_peak(i: TariffInterval) -> bool:
        return i.tou == "part"

    demand_components: List[DemandComponent] = [
        DemandComponent(
            kind="monthlyMax",
            name="max_all_hours_summer",
            rate_per_kW=demand_max_all_hours_summer,
            applies=lambda i: applies_summer(i) and applies_all_hours(i),
        ),
        DemandComponent(
            kind="monthlyMax",
            name="max_all_hours_winter",
            rate_per_kW=demand_max_all_hours_winter,
            applies=lambda i: applies_winter(i) and applies_all_hours(i),
        ),
        DemandComponent(
            kind="monthlyMax",
            name="on_peak_summer",
            rate_per_kW=demand_on_peak_summer,
            applies=lambda i: applies_summer(i) and applies_on_peak(i),
        ),
        DemandComponent(
            kind="monthlyMax",
            name="partial_peak_summer",
            rate_per_kW=demand_partial_peak_summer,
            applies=lambda i: applies_summer(i) and applies_partial_peak(i),
        ),
        DemandComponent(
            kind="monthlyMax",
            name="on_peak_winter",
            rate_per_kW=demand_on_peak_winter,
            applies=lambda i: applies_winter(i) and applies_on_peak(i),
        ),
    ]

    return RatePlan(
        name=name,
        energy_rate_per_kWh=energy_rate,
        demand_components=demand_components,
        fixed_monthly_usd=float(fixed_monthly_usd if include_fixed_monthly else 0.0),
    )

