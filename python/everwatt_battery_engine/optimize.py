from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

from .battery_catalog import load_battery_catalog_csv
from .bundles import generate_candidate_bundles
from .dispatch_lp import optimize_bill_lp
from .intervals import normalize_intervals
from .pricing import make_offers
from .tariffs.base import to_tariff_intervals
from .tariffs.bill import calculate_bill
from .tariffs.option_s import build_option_s_rate_plan, option_s_eligibility_required_kw
from .tariffs.pge_b19 import b19_tou_bucket, build_pge_b19_rate_plan
from .types import BatterySKU, Bundle, Interval, OptimizationConfig, OptimizationResult, TariffScenarioSpec


def _bundle_units(bundle: Bundle) -> int:
    return int(sum(int(v) for v in bundle.sku_qty.values()))


def optimize_battery_solutions(
    *,
    intervals: Sequence[Interval],
    battery_catalog_csv: str,
    tariff_rate_code: str = "B-19",
    cfg: OptimizationConfig | None = None,
    top_n: int = 10,
    candidate_caps: int = 15,
    variations_per_cap: int = 8,
) -> List[OptimizationResult]:
    """
    Orchestrator:
      intervals -> normalize -> tariff scenarios -> candidate bundles -> dispatch LP -> billing -> offers -> top N

    This v1 focuses on:
      - PG&E B-19 baseline
      - Option S scenario gated by 10% inverter rule
      - no export by default
    """
    cfg = cfg or OptimizationConfig()

    norm = normalize_intervals(intervals, timezone="UTC", fill_gaps=False)
    df = norm.df
    h = norm.interval_hours
    day_count = int(df["day_key"].nunique()) if len(df) else 0
    annualization_factor = float(365.0 / day_count) if day_count > 0 else 1.0

    # Load battery library
    skus = load_battery_catalog_csv(battery_catalog_csv)
    skus = [s for s in skus if s.active]
    skus_by_id = {s.id: s for s in skus}

    # Tariff scenarios
    scenarios: List[TariffScenarioSpec] = []
    if tariff_rate_code.upper().replace(" ", "") in ("B-19", "B19"):
        scenarios.append(TariffScenarioSpec(id="pge_b19", name="PG&E B-19", kind="pge_b19"))
        scenarios.append(TariffScenarioSpec(id="pge_option_s", name="PG&E Option S (gated)", kind="pge_option_s"))
    else:
        # Stub: treat any other rate as B-19 for now
        scenarios.append(TariffScenarioSpec(id="pge_b19", name=f"Stub rate for {tariff_rate_code}", kind="pge_b19"))
        scenarios.append(TariffScenarioSpec(id="pge_option_s", name="PG&E Option S (gated)", kind="pge_option_s"))

    # Candidate bundles
    bundles = generate_candidate_bundles(
        df,
        h,
        skus,
        caps=candidate_caps,
        variations_per_cap=variations_per_cap,
        max_units=200,
        skus_by_id=skus_by_id,
        install_adder_frac=cfg.install_adder_frac,
        fixed_soft_costs_usd=cfg.fixed_soft_costs_usd,
    )

    # Convert to tariff intervals once (TOU mapper differs by scenario, but for now both use B-19 mapping)
    base_tariff_intervals = to_tariff_intervals(df, tou_mapper=b19_tou_bucket, interval_hours=h)

    # Baseline bills per scenario (no battery)
    baseline_bill: Dict[str, float] = {}
    baseline_peak: Dict[str, float] = {}

    # Rate plans
    b19_plan = build_pge_b19_rate_plan()
    # Option S: demand structure + B19 energy as default hook
    option_s_plan = build_option_s_rate_plan(energy_rate_per_kWh=b19_plan.energy_rate_per_kWh)

    for sc in scenarios:
        if sc.kind == "pge_b19":
            bill = calculate_bill(base_tariff_intervals, b19_plan)
            baseline_bill[sc.id] = float(bill.bill_usd) * annualization_factor
            baseline_peak[sc.id] = bill.peak_kw
        elif sc.kind == "pge_option_s":
            bill = calculate_bill(base_tariff_intervals, option_s_plan)
            baseline_bill[sc.id] = float(bill.bill_usd) * annualization_factor
            baseline_peak[sc.id] = bill.peak_kw

    # Evaluate bundle + scenario
    results: List[OptimizationResult] = []

    # Option S eligibility threshold (site-level)
    peak12, min_kw_required = option_s_eligibility_required_kw(base_tariff_intervals)

    for bundle in bundles:
        # Skip degenerate bundles
        if bundle.total_power_kw <= 0 or bundle.total_energy_kwh <= 0:
            continue

        for sc in scenarios:
            if sc.kind == "pge_b19":
                plan = b19_plan
            elif sc.kind == "pge_option_s":
                # Gate on 10% rule
                if bundle.total_power_kw < min_kw_required:
                    continue
                plan = option_s_plan
            else:
                continue

            base_bill = float(baseline_bill.get(sc.id, 0.0))
            base_peak = float(baseline_peak.get(sc.id, 0.0))

            dispatch = optimize_bill_lp(
                base_tariff_intervals,
                bundle=bundle,
                rate_plan=plan,
                interval_hours=h,
                no_export=cfg.no_export,
                interconnect_kw=cfg.interconnect_kw,
            )

            optimized_bill_annual = float(dispatch.bill_usd) * annualization_factor
            savings = float(base_bill - optimized_bill_annual)
            if savings <= 0:
                continue

            offers = make_offers(
                capex_usd=bundle.capex_usd,
                savings_usd_per_year=savings,
                sku_unit_count=_bundle_units(bundle),
                cfg=cfg,
            )
            if not offers:
                continue

            results.append(
                OptimizationResult(
                    scenario=sc,
                    bundle=bundle,
                    baseline_bill_usd_per_year=base_bill,
                    optimized_bill_usd_per_year=optimized_bill_annual,
                    savings_usd_per_year=savings,
                    peak_kw_before=base_peak,
                    peak_kw_after=float(max(dispatch.net_load_series) if dispatch.net_load_series else 0.0),
                    offers=offers,
                    net_kw_series=dispatch.net_load_series,
                    charge_kw_series=dispatch.charge_kw_series,
                    discharge_kw_series=dispatch.discharge_kw_series,
                    soc_kwh_series=dispatch.soc_kwh_series,
                    solver_status=dispatch.solver_status,
                )
            )

    # Rank and return top N:
    # Use best offer per result: prioritize EVERWATT_ENGINE mode first, then PROFIT, then CUSTOMER.
    def best_offer_key(res: OptimizationResult) -> Tuple[float, float]:
        offer_by_mode = {o.mode.value: o for o in res.offers}
        if "everwatt_engine" in offer_by_mode:
            o = offer_by_mode["everwatt_engine"]
            return (float(o.expected_tsv or o.tsv), float(o.gross_margin_usd))
        if "profit_max" in offer_by_mode:
            o = offer_by_mode["profit_max"]
            return (float(o.tsv), float(o.gross_margin_usd))
        o = res.offers[0]
        return (float(o.tsv), float(o.gross_margin_usd))

    results.sort(key=lambda r: best_offer_key(r), reverse=True)
    return results[: int(top_n)]

