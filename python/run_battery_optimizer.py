from __future__ import annotations

import json
from pathlib import Path

from everwatt_battery_engine.optimize import optimize_battery_solutions
from everwatt_battery_engine.types import Interval, OptimizationConfig


def synthetic_intervals(hours: int = 72) -> list[Interval]:
    """
    Small synthetic 15-min load curve for smoke testing:
    - baseline ~120 kW
    - daily peak window ~16-21 with spikes
    """
    out: list[Interval] = []
    import datetime as dt

    start = dt.datetime(2025, 7, 1, 0, 0, tzinfo=dt.timezone.utc)
    step = dt.timedelta(minutes=15)
    import math
    import random

    t = start
    n = int(hours * 4)
    for i in range(n):
        hour = t.hour + t.minute / 60.0
        base = 120.0 + 10.0 * math.sin(2 * math.pi * (hour / 24.0))
        peak = 0.0
        if 16 <= hour < 21:
            peak = 80.0 + 30.0 * random.random()
        kw = base + peak
        out.append(Interval(timestamp=t.isoformat(), kw=kw))
        t += step
    return out


def main() -> None:
    # workspace root (repo)
    root = Path(__file__).resolve().parent.parent
    catalog = root / "data" / "battery-catalog.csv"
    cfg = OptimizationConfig(no_export=True, payback_ceiling_years=10.0, price_grid_points=21)
    results = optimize_battery_solutions(
        intervals=synthetic_intervals(),
        battery_catalog_csv=str(catalog),
        tariff_rate_code="B-19",
        cfg=cfg,
        top_n=10,
    )
    print(f"got {len(results)} results")
    for r in results[:5]:
        best = next((o for o in r.offers if o.mode.value == "everwatt_engine"), r.offers[0])
        print(
            f"{r.scenario.id} | savings=${r.savings_usd_per_year:,.0f}/yr | "
            f"capex=${r.bundle.capex_usd:,.0f} | best({best.mode.value}) price=${best.price_usd:,.0f} "
            f"pb={best.payback_years:.1f}y GM%={best.gross_margin_frac:.2%} TSV={best.tsv:,.0f}"
        )


if __name__ == "__main__":
    main()

