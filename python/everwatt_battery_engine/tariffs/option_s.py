from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Tuple

import pandas as pd

from .base import DemandComponent, RatePlan, TariffInterval


@dataclass(frozen=True)
class OptionSRatesConfig:
    daily_peak_rate_per_kw_day: float = 1.61
    daily_part_peak_rate_per_kw_day: float = 0.08
    monthly_max_all_hours_rate_per_kw_month: float = 1.23
    monthly_max_excl_window_rate_per_kw_month: float = 6.72
    monthly_exclusion_hours_local: Tuple[int, int] = (9, 14)  # [start, end)
    peak_hours_local: Tuple[int, int] = (16, 21)
    part_peak_windows_local: Tuple[Tuple[int, int], ...] = ((14, 16), (21, 23))


def _in_window(ts: pd.Timestamp, start_hour: int, end_hour: int) -> bool:
    h = int(ts.hour)
    return start_hour <= h < end_hour


def build_option_s_rate_plan(
    *,
    name: str = "OptionS",
    rates: OptionSRatesConfig | None = None,
    energy_rate_per_kWh: Callable[[TariffInterval], float] | None = None,
) -> RatePlan:
    rates = rates or OptionSRatesConfig()
    if energy_rate_per_kWh is None:
        energy_rate_per_kWh = lambda _i: 0.0

    excl_start, excl_end = rates.monthly_exclusion_hours_local
    peak_start, peak_end = rates.peak_hours_local
    part_windows = list(rates.part_peak_windows_local)

    def is_peak(i: TariffInterval) -> bool:
        return _in_window(i.ts, peak_start, peak_end)

    def is_part(i: TariffInterval) -> bool:
        return any(_in_window(i.ts, s, e) for s, e in part_windows)

    def is_outside_excl(i: TariffInterval) -> bool:
        return not _in_window(i.ts, excl_start, excl_end)

    demand_components: List[DemandComponent] = [
        DemandComponent(kind="dailyMax", name="dailyPeak", rate_per_kW=rates.daily_peak_rate_per_kw_day, applies=is_peak),
        DemandComponent(
            kind="dailyMax",
            name="dailyPartPeak",
            rate_per_kW=rates.daily_part_peak_rate_per_kw_day,
            applies=is_part,
        ),
        DemandComponent(
            kind="monthlyMax",
            name="monthlyAllHours",
            rate_per_kW=rates.monthly_max_all_hours_rate_per_kw_month,
            applies=lambda _i: True,
        ),
        DemandComponent(
            kind="monthlyMax",
            name="monthlyExcl",
            rate_per_kW=rates.monthly_max_excl_window_rate_per_kw_month,
            applies=is_outside_excl,
        ),
    ]

    return RatePlan(name=name, energy_rate_per_kWh=energy_rate_per_kWh, demand_components=demand_components, fixed_monthly_usd=0.0)


def option_s_eligibility_required_kw(intervals: List[TariffInterval]) -> Tuple[float, float]:
    """
    Returns (peak_kw_12mo, min_kw_required) where min_kw_required = 10% of trailing 12-month peak.
    If less than 12 months are available, uses whatever history is present (conservative warning handled upstream).
    """
    if not intervals:
        return 0.0, 0.0
    latest = intervals[-1].ts
    cutoff = latest - pd.Timedelta(days=365)
    trailing = [i for i in intervals if i.ts >= cutoff]
    peak = max((i.kW_base for i in trailing), default=0.0)
    return float(peak), float(0.10 * peak)

