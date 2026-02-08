from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Sequence

import numpy as np

from .types import OptimizationConfig, OptimizationMode, PriceOffer


def _safe_div(a: float, b: float) -> float:
    return float(a / b) if b not in (0.0, -0.0) else float("inf")


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def close_probability_model(payback_years: float, units: int, cfg: OptimizationConfig) -> float:
    """
    Default close-prob model (tunable via config):
    - Higher payback => lower close probability (logistic)
    - Higher unit count => slightly lower close probability (implementation risk / complexity)
    """
    # Logistic around mid_payback
    x = (cfg.close_prob_mid_payback_years - payback_years) / max(1e-6, cfg.close_prob_steepness)
    p = _sigmoid(x)
    # Complexity penalty
    complexity = 1.0 / (1.0 + 0.05 * max(0, units - 1))
    return float(max(0.0, min(1.0, p * complexity)))


def make_offers(
    *,
    capex_usd: float,
    savings_usd_per_year: float,
    sku_unit_count: int,
    cfg: OptimizationConfig,
) -> List[PriceOffer]:
    """
    Create three pricing offers:
    - PROFIT_MAX: push to payback ceiling
    - CUSTOMER_BENEFIT: price at CapEx (max ROI)
    - EVERWATT_ENGINE: choose price within [CapEx, payback_ceiling*savings] that maximizes expected TSV
    """
    S = float(savings_usd_per_year)
    C = float(capex_usd)
    if S <= 0:
        return []

    max_price = float(cfg.payback_ceiling_years * S)
    if max_price < C:
        # Not sellable under payback constraint
        return []

    def offer_at_price(mode: OptimizationMode, price: float, include_expected: bool = False) -> PriceOffer:
        price = float(price)
        payback = _safe_div(price, S)
        gm_usd = float(price - C)
        gm_frac = float(gm_usd / price) if price > 0 else 0.0
        tsv = float(S * gm_frac)
        roi = float(S / price) if price > 0 else 0.0
        if include_expected:
            p = close_probability_model(payback, sku_unit_count, cfg)
            return PriceOffer(
                mode=mode,
                price_usd=price,
                savings_usd_per_year=S,
                payback_years=payback,
                gross_margin_usd=gm_usd,
                gross_margin_frac=gm_frac,
                tsv=tsv,
                roi=roi,
                close_probability=p,
                expected_tsv=float(p * tsv),
            )
        return PriceOffer(
            mode=mode,
            price_usd=price,
            savings_usd_per_year=S,
            payback_years=payback,
            gross_margin_usd=gm_usd,
            gross_margin_frac=gm_frac,
            tsv=tsv,
            roi=roi,
        )

    offers: List[PriceOffer] = []

    # Customer benefit: price at CapEx (max ROI, min payback)
    offers.append(offer_at_price(OptimizationMode.CUSTOMER_BENEFIT, C))

    # Profit max: price at payback ceiling
    offers.append(offer_at_price(OptimizationMode.PROFIT_MAX, max_price))

    # EverWatt engine: maximize expected TSV over a grid
    grid_n = int(max(5, cfg.price_grid_points))
    prices = np.linspace(C, max_price, grid_n)
    best = None
    best_score = -1e18
    for p in prices:
        off = offer_at_price(OptimizationMode.EVERWATT_ENGINE, float(p), include_expected=True)
        score = float(off.expected_tsv if off.expected_tsv is not None else off.tsv)
        if score > best_score:
            best_score = score
            best = off
    if best is not None:
        offers.append(best)

    # Stable ordering: profit, engine, customer (UI-friendly)
    order = {
        OptimizationMode.PROFIT_MAX: 0,
        OptimizationMode.EVERWATT_ENGINE: 1,
        OptimizationMode.CUSTOMER_BENEFIT: 2,
    }
    offers.sort(key=lambda o: order.get(o.mode, 99))
    return offers

