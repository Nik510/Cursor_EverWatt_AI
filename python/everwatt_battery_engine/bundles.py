from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

from .battery_catalog import equipment_cost_for_bundle
from .types import BatterySKU, Bundle


def _energy_weighted_rte(items: List[Tuple[BatterySKU, int]]) -> float:
    num = 0.0
    den = 0.0
    for sku, qty in items:
        e = float(sku.energy_kwh) * float(qty)
        num += e * float(sku.round_trip_efficiency)
        den += e
    return float(num / den) if den > 0 else 0.9


def _throughput_limit_kwh(items: List[Tuple[BatterySKU, int]], days: int) -> float | None:
    # Cycle proxy: sum(qty * max_cycles_per_day * energy_kwh) * days
    total = 0.0
    any_cycles = False
    for sku, qty in items:
        if sku.max_cycles_per_day is None:
            continue
        any_cycles = True
        total += float(qty) * float(sku.max_cycles_per_day) * float(sku.energy_kwh) * float(days)
    return float(total) if any_cycles else None


def _bundle_totals(items: List[Tuple[BatterySKU, int]]) -> Tuple[float, float]:
    # Total power uses C-rate-limited continuous power per unit.
    p = 0.0
    e = 0.0
    for sku, qty in items:
        p += float(qty) * float(sku.max_continuous_power_kw())
        e += float(qty) * float(sku.energy_kwh)
    return float(p), float(e)


def _greedy_build(
    skus: Sequence[BatterySKU],
    target_power_kw: float,
    target_energy_kwh: float,
    *,
    max_units: int = 200,
    prefer: str = "balanced",
) -> Dict[str, int] | None:
    """
    Build a mix of SKUs to meet (power, energy) targets.
    prefer:
      - "power": emphasize cost per kW
      - "energy": emphasize cost per kWh
      - "balanced": combined score
    """
    candidates = [s for s in skus if s.active]
    if not candidates:
        return None

    # heuristic "unit cost" based on 1-10 pricing
    def score(s: BatterySKU) -> float:
        cost = float(s.price_1_10)
        p = max(1e-6, float(s.max_continuous_power_kw()))
        e = max(1e-6, float(s.energy_kwh))
        cpkW = cost / p
        cpkWh = cost / e
        if prefer == "power":
            return cpkW
        if prefer == "energy":
            return cpkWh
        # balanced: normalize-ish
        return 0.5 * cpkW + 0.5 * cpkWh

    candidates = sorted(candidates, key=score)

    qty: Dict[str, int] = {}
    cur_p = 0.0
    cur_e = 0.0

    # greedy add until both met or max units hit
    i = 0
    while (cur_p < target_power_kw or cur_e < target_energy_kwh) and sum(qty.values()) < max_units:
        sku = candidates[i % len(candidates)]
        qty[sku.id] = qty.get(sku.id, 0) + 1
        cur_p += float(sku.max_continuous_power_kw())
        cur_e += float(sku.energy_kwh)
        i += 1

        # escape if targets are tiny
        if target_power_kw <= 0 and target_energy_kwh <= 0:
            break

    if cur_p < target_power_kw or cur_e < target_energy_kwh:
        return None
    return qty


def generate_candidate_bundles(
    df_intervals: pd.DataFrame,
    interval_hours: float,
    battery_skus: Sequence[BatterySKU],
    *,
    caps: int = 15,
    variations_per_cap: int = 8,
    p_base_percentile: float = 0.5,
    max_units: int = 200,
    skus_by_id: Dict[str, BatterySKU] | None = None,
    install_adder_frac: float = 0.0,
    fixed_soft_costs_usd: float = 0.0,
) -> List[Bundle]:
    """
    v1: deterministic candidate enumeration described in the PDF:
    - choose cap targets between peak and baseline percentile
    - for each cap compute target power and worst-day energy need
    - map (P,E) to library via greedy recipes (power/energy/balanced) + small variants
    """
    if skus_by_id is None:
        skus_by_id = {s.id: s for s in battery_skus}

    load = df_intervals["load_kw"].astype(float).to_numpy()
    if load.size == 0:
        return []

    p_peak = float(np.max(load))
    p_base = float(np.quantile(load, p_base_percentile))
    # Caps from near-peak down toward baseline
    caps_kw = np.linspace(p_peak, p_base, caps)

    # Precompute per-day group slices
    df = df_intervals.copy()
    df["day_key"] = df["day_key"].astype(str)
    days = df["day_key"].unique().tolist()
    day_count = len(days)

    bundles: Dict[Tuple[Tuple[str, int], ...], Bundle] = {}

    for cap_kw in caps_kw:
        # Required shave profile
        exceed = np.maximum(0.0, load - float(cap_kw))

        # worst-day energy need
        e_need = 0.0
        for day, group in df.groupby("day_key"):
            dload = group["load_kw"].astype(float).to_numpy()
            dexceed = np.maximum(0.0, dload - float(cap_kw))
            e_day = float(np.sum(dexceed) * float(interval_hours))
            e_need = max(e_need, e_day)

        p_need = max(0.0, float(p_peak - cap_kw))

        # Generate a few heuristics
        recipes = ["balanced", "power", "energy"]
        for recipe in recipes:
            qty = _greedy_build(battery_skus, p_need, e_need, max_units=max_units, prefer=recipe)
            if qty is None:
                continue

            # Small variation: try adding 0..(variations_per_cap-1) extra units of cheapest SKU
            # to explore "bigger battery" vs long spikes.
            for extra in range(max(1, variations_per_cap)):
                qty2 = dict(qty)
                if extra > 0:
                    # pick cheapest by balanced score (already first in sorted inside _greedy_build, but recompute)
                    cheapest = sorted([s for s in battery_skus if s.active], key=lambda s: float(s.price_1_10))[0]
                    qty2[cheapest.id] = qty2.get(cheapest.id, 0) + extra

                items = [(skus_by_id[k], int(v)) for k, v in qty2.items()]
                total_p, total_e = _bundle_totals(items)
                rte = _energy_weighted_rte(items)
                equipment_cost = equipment_cost_for_bundle(skus_by_id, qty2)
                capex = float(equipment_cost * (1.0 + install_adder_frac) + fixed_soft_costs_usd)
                throughput_limit = _throughput_limit_kwh(items, day_count)

                key = tuple(sorted(qty2.items()))
                bundles[key] = Bundle(
                    sku_qty=qty2,
                    total_power_kw=total_p,
                    total_energy_kwh=total_e,
                    capex_usd=capex,
                    round_trip_efficiency=rte,
                    discharge_throughput_limit_kwh=throughput_limit,
                )

    # Return as list, sorted by capex ascending for convenience
    out = list(bundles.values())
    out.sort(key=lambda b: (b.capex_usd, b.total_power_kw, b.total_energy_kwh))
    return out

