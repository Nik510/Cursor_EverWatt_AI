from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

from ortools.linear_solver import pywraplp

from .types import Bundle
from .tariffs.base import DemandComponent, RatePlan, TariffInterval


@dataclass(frozen=True)
class DispatchSolution:
    solver_status: str
    bill_usd: float
    energy_charges_usd: float
    demand_charges_usd: float
    fixed_charges_usd: float
    throughput_mwh: float
    peak_monthly_kw: Dict[str, float]
    peak_daily_kw: Dict[str, float]
    net_load_series: List[float]
    charge_kw_series: List[float]
    discharge_kw_series: List[float]
    soc_kwh_series: List[float]


def _split_efficiency(round_trip_efficiency: float) -> Tuple[float, float]:
    rte = float(max(0.01, min(0.999, round_trip_efficiency)))
    eta = float(np.sqrt(rte))
    return eta, eta


def optimize_bill_lp(
    intervals: Sequence[TariffInterval],
    bundle: Bundle,
    rate_plan: RatePlan,
    *,
    interval_hours: float,
    no_export: bool = True,
    interconnect_kw: float | None = None,
    initial_soc_frac: float = 0.5,
    degradation_cost_usd_per_mwh: float = 0.0,
) -> DispatchSolution:
    """
    Deterministic dispatch LP:
      minimize total bill = energy + demand + fixed

    Variables (per interval t):
      ch[t] >= 0, dis[t] >= 0, soc[t] (kWh)

    Demand modeling:
      monthlyMax: for each (component, month) define D >= net[t] (for all t that apply)
      dailyMax:   for each (component, day) define D >= net[t] (for all t that apply)

    Notes:
    - no_export => dis[t] <= base_load[t]
    - interconnect_kw => dis[t] <= min(P_total, interconnect_kw)
    - throughput limit (cycle proxy) if bundle.discharge_throughput_limit_kwh is set
    """
    if not intervals:
        return DispatchSolution(
            solver_status="no-intervals",
            bill_usd=0.0,
            energy_charges_usd=0.0,
            demand_charges_usd=0.0,
            fixed_charges_usd=0.0,
            throughput_mwh=0.0,
            peak_monthly_kw={},
            peak_daily_kw={},
            net_load_series=[],
            charge_kw_series=[],
            discharge_kw_series=[],
            soc_kwh_series=[],
        )

    n = len(intervals)
    h = float(interval_hours)
    P = float(bundle.total_power_kw)
    E = float(bundle.total_energy_kwh)
    eta_c, eta_d = _split_efficiency(bundle.round_trip_efficiency)
    dis_ub = float(min(P, interconnect_kw)) if interconnect_kw is not None else float(P)

    # LP solver
    solver = pywraplp.Solver.CreateSolver("GLOP")
    if solver is None:
        raise RuntimeError("OR-Tools GLOP solver not available")

    # Variables
    ch = [solver.NumVar(0.0, P, f"ch_{t}") for t in range(n)]
    dis = [solver.NumVar(0.0, dis_ub, f"dis_{t}") for t in range(n)]
    # SOC boundaries length n+1 is simplest
    soc = [solver.NumVar(0.0, E, f"soc_{t}") for t in range(n + 1)]

    # Initial SOC
    soc0 = float(max(0.0, min(E, initial_soc_frac * E)))
    solver.Add(soc[0] == soc0)

    # SOC dynamics
    for t in range(n):
        solver.Add(soc[t + 1] == soc[t] + (eta_c * ch[t] - (dis[t] / eta_d)) * h)

    # No export / physical guardrail
    if no_export:
        for t in range(n):
            solver.Add(dis[t] <= float(intervals[t].kW_base))

    # Throughput / cycle proxy
    if bundle.discharge_throughput_limit_kwh is not None:
        limit_kwh = float(bundle.discharge_throughput_limit_kwh)
        # Sum(dis[t] * h) <= limit_kwh
        solver.Add(solver.Sum([dis[t] * h for t in range(n)]) <= limit_kwh)

    # Demand max variables
    monthly_dem: Dict[Tuple[str, str], pywraplp.Variable] = {}
    daily_dem: Dict[Tuple[str, str], pywraplp.Variable] = {}

    for comp in rate_plan.demand_components:
        if comp.kind == "monthlyMax":
            # group by month
            for t in range(n):
                it = intervals[t]
                if not comp.applies(it):
                    continue
                key = (comp.name, it.month_key)
                if key not in monthly_dem:
                    monthly_dem[key] = solver.NumVar(0.0, solver.infinity(), f"Dm_{comp.name}_{it.month_key}")
                # net[t] <= D  => base + ch - dis <= D
                solver.Add(it.kW_base + ch[t] - dis[t] <= monthly_dem[key])
        else:
            for t in range(n):
                it = intervals[t]
                if not comp.applies(it):
                    continue
                key = (comp.name, it.day_key)
                if key not in daily_dem:
                    daily_dem[key] = solver.NumVar(0.0, solver.infinity(), f"Dd_{comp.name}_{it.day_key}")
                solver.Add(it.kW_base + ch[t] - dis[t] <= daily_dem[key])

    # Objective: energy + demand + degradation proxy
    deg_per_kwh = float(degradation_cost_usd_per_mwh) / 1000.0
    obj = solver.Objective()
    for t in range(n):
        it = intervals[t]
        er = float(rate_plan.energy_rate_per_kWh(it))
        # net energy term: base load constant ignored; we add (ch - dis) * h * er
        obj.SetCoefficient(ch[t], er * h)
        obj.SetCoefficient(dis[t], (-er + deg_per_kwh) * h)

    for (name, month), var in monthly_dem.items():
        # Find component rate (by name); safe linear scan (small list)
        rate = next(c.rate_per_kW for c in rate_plan.demand_components if c.kind == "monthlyMax" and c.name == name)
        obj.SetCoefficient(var, float(rate))

    for (name, day), var in daily_dem.items():
        rate = next(c.rate_per_kW for c in rate_plan.demand_components if c.kind == "dailyMax" and c.name == name)
        obj.SetCoefficient(var, float(rate))

    obj.SetMinimization()

    status = solver.Solve()
    status_str = str(status)
    if status != pywraplp.Solver.OPTIMAL:
        raise RuntimeError(f"Dispatch LP failed: status={status_str}")

    ch_s = np.array([v.solution_value() for v in ch], dtype=float)
    dis_s = np.array([v.solution_value() for v in dis], dtype=float)
    soc_s = np.array([v.solution_value() for v in soc], dtype=float)
    net = np.array([intervals[t].kW_base for t in range(n)], dtype=float) + ch_s - dis_s

    energy_charges = float(sum(rate_plan.energy_rate_per_kWh(intervals[t]) * net[t] * h for t in range(n)))
    demand_charges = 0.0
    for (name, month), var in monthly_dem.items():
        rate = next(c.rate_per_kW for c in rate_plan.demand_components if c.kind == "monthlyMax" and c.name == name)
        demand_charges += float(var.solution_value() * rate)
    for (name, day), var in daily_dem.items():
        rate = next(c.rate_per_kW for c in rate_plan.demand_components if c.kind == "dailyMax" and c.name == name)
        demand_charges += float(var.solution_value() * rate)

    months = sorted({i.month_key for i in intervals})
    fixed = float(rate_plan.fixed_monthly_usd) * float(len(months))

    peak_monthly: Dict[str, float] = {}
    peak_daily: Dict[str, float] = {}
    for t in range(n):
        it = intervals[t]
        peak_monthly[it.month_key] = max(peak_monthly.get(it.month_key, 0.0), float(net[t]))
        peak_daily[it.day_key] = max(peak_daily.get(it.day_key, 0.0), float(net[t]))

    throughput_mwh = float(np.sum(dis_s * h) / 1000.0)

    return DispatchSolution(
        solver_status=status_str,
        bill_usd=energy_charges + demand_charges + fixed,
        energy_charges_usd=energy_charges,
        demand_charges_usd=demand_charges,
        fixed_charges_usd=fixed,
        throughput_mwh=throughput_mwh,
        peak_monthly_kw=peak_monthly,
        peak_daily_kw=peak_daily,
        net_load_series=net.tolist(),
        charge_kw_series=ch_s.tolist(),
        discharge_kw_series=dis_s.tolist(),
        soc_kwh_series=soc_s.tolist(),
    )

