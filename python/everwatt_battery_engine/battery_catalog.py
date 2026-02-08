from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Sequence, Tuple

import pandas as pd

from .types import BatterySKU


def load_battery_catalog_csv(path: str) -> List[BatterySKU]:
    df = pd.read_csv(path)
    skus: List[BatterySKU] = []

    def yn(v: object) -> bool:
        s = str(v).strip().lower()
        return s in ("yes", "true", "1", "y")

    for row in df.to_dict(orient="records"):
        active = yn(row.get("Active", "Yes"))
        sku = BatterySKU(
            id=str(row.get("Model Name")),
            manufacturer=str(row.get("Manufacturer")),
            energy_kwh=float(row.get("Capacity (kWh)")),
            power_kw=float(row.get("Power (kW)")),
            c_rate=float(row.get("C-Rate")),
            round_trip_efficiency=float(row.get("Efficiency (%)")) / 100.0,
            warranty_years=float(row.get("Warranty (Years)")),
            max_cycles_per_day=None,
            price_1_10=float(row.get("Price 1-10")),
            price_11_20=float(row.get("Price 11-20")),
            price_21_50=float(row.get("Price 21-50")),
            price_50_plus=float(row.get("Price 50+")),
            active=active,
        )
        skus.append(sku)
    return skus


def price_per_unit(sku: BatterySKU, qty: int) -> float:
    if qty <= 10:
        return float(sku.price_1_10)
    if qty <= 20:
        return float(sku.price_11_20)
    if qty <= 50:
        return float(sku.price_21_50)
    return float(sku.price_50_plus)


def equipment_cost_for_bundle(skus_by_id: Dict[str, BatterySKU], sku_qty: Dict[str, int]) -> float:
    cost = 0.0
    for sku_id, qty in sku_qty.items():
        sku = skus_by_id[sku_id]
        cost += float(qty) * price_per_unit(sku, int(qty))
    return float(cost)

