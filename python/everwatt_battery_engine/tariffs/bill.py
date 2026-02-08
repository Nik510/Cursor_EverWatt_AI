from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple

from .base import RatePlan, TariffInterval


@dataclass(frozen=True)
class BillSummary:
    bill_usd: float
    energy_charges_usd: float
    demand_charges_usd: float
    fixed_charges_usd: float
    peak_kw: float
    peak_monthly_kw: Dict[str, float]
    peak_daily_kw: Dict[str, float]


def calculate_bill(intervals: Sequence[TariffInterval], rate_plan: RatePlan) -> BillSummary:
    """
    Deterministic tariff bill calculator (no battery): compute energy + demand + fixed.
    Demand components are computed as max(net kW) over their applicable window per month/day.
    """
    if not intervals:
        return BillSummary(
            bill_usd=0.0,
            energy_charges_usd=0.0,
            demand_charges_usd=0.0,
            fixed_charges_usd=0.0,
            peak_kw=0.0,
            peak_monthly_kw={},
            peak_daily_kw={},
        )

    # Energy charges
    energy = sum(rate_plan.energy_rate_per_kWh(i) * i.kWh_base for i in intervals)

    # Demand charges: group maxima
    demand_total = 0.0
    peak_monthly_kw: Dict[str, float] = {}
    peak_daily_kw: Dict[str, float] = {}

    for comp in rate_plan.demand_components:
        if comp.kind == "monthlyMax":
            by_month: Dict[str, float] = {}
            for i in intervals:
                if not comp.applies(i):
                    continue
                by_month[i.month_key] = max(by_month.get(i.month_key, 0.0), float(i.kW_base))
            demand_total += sum(v * comp.rate_per_kW for v in by_month.values())
        else:
            by_day: Dict[str, float] = {}
            for i in intervals:
                if not comp.applies(i):
                    continue
                by_day[i.day_key] = max(by_day.get(i.day_key, 0.0), float(i.kW_base))
            demand_total += sum(v * comp.rate_per_kW for v in by_day.values())

    months = sorted({i.month_key for i in intervals})
    fixed = float(rate_plan.fixed_monthly_usd) * float(len(months))

    # Peaks
    peak = 0.0
    for i in intervals:
        peak = max(peak, float(i.kW_base))
        peak_monthly_kw[i.month_key] = max(peak_monthly_kw.get(i.month_key, 0.0), float(i.kW_base))
        peak_daily_kw[i.day_key] = max(peak_daily_kw.get(i.day_key, 0.0), float(i.kW_base))

    return BillSummary(
        bill_usd=float(energy + demand_total + fixed),
        energy_charges_usd=float(energy),
        demand_charges_usd=float(demand_total),
        fixed_charges_usd=float(fixed),
        peak_kw=float(peak),
        peak_monthly_kw=peak_monthly_kw,
        peak_daily_kw=peak_daily_kw,
    )

