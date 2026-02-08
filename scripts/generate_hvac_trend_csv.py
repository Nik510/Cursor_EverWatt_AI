"""
Generate a deterministic synthetic HVAC trend CSV for end-to-end FDD validation.

Outputs:
  data/hvac/demo_trends.csv

Spec:
- 5-minute intervals
- 7 days
- ISO8601 timestamps (UTC, Z suffix)
- Columns:
    timestamp
    SAT
    CHW_VALVE_PCT
    HW_VALVE_PCT
    DUCT_STATIC
    FAN_SPEED_PCT

Segments (reliably trigger FDD):
  A) simultaneous heating & cooling (>= 30 min)
  B) reheat leakage (>= 2 hrs with SAT cold + HW valve sustained)
  C) sensor flatline + out-of-range (clearly invalid window)
  Plus a normal baseline window everywhere else.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path


@dataclass(frozen=True)
class Row:
    timestamp: str
    SAT: float
    CHW_VALVE_PCT: float
    HW_VALVE_PCT: float
    DUCT_STATIC: float
    FAN_SPEED_PCT: float


def _iso_z(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc)
    return dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def generate_rows(
    start_utc: datetime,
    days: int = 7,
    interval_minutes: int = 5,
) -> list[Row]:
    n_per_day = int((24 * 60) / interval_minutes)
    total = days * n_per_day

    rows: list[Row] = []
    for i in range(total):
        t = start_utc + timedelta(minutes=i * interval_minutes)
        day = i // n_per_day
        within = i % n_per_day

        # "Normal" baseline: small deterministic variation every 5 minutes
        # (avoid accidental flatline flags)
        sat = 55.0 + ((within % 13) - 6) * 0.12  # ~54.28..55.72
        chw = 0.0 + (20.0 if 72 <= within <= 216 else 5.0)  # daytime-ish load proxy
        hw = 0.0 + (5.0 if within < 72 or within > 216 else 0.0)
        duct = 1.2 + ((within % 11) - 5) * 0.01  # ~1.15..1.25
        fan = 55.0 + ((within % 21) - 10) * 0.25  # ~52.5..57.5

        # Segment A: day 3, 08:00-09:00 UTC -> simultaneous heating & cooling
        # 08:00 is within=96 (since 8h * 60 / 5 = 96)
        if day == 2 and 96 <= within <= 108:  # 65 minutes inclusive window
            chw = 60.0
            hw = 60.0

        # Segment B: day 4, 01:00-04:00 UTC -> reheat leakage
        # SAT "cold" (<=55) while HW valve sustained > X%
        if day == 3 and 12 <= within <= 48:  # 3 hours + 5 min inclusive
            sat = 52.0 + ((within % 7) - 3) * 0.02  # tiny variation, not flatline
            chw = 0.0
            hw = 35.0

        # Segment C: day 5, 12:00-18:00 UTC -> sensor flatline + out-of-range
        # SAT and DUCT_STATIC are flatlined and out-of-range.
        if day == 4 and 144 <= within <= 216:  # 6 hours + 5 min inclusive
            sat = 150.0  # out-of-range for SAT (expected ~35..90F)
            duct = 15.0  # out-of-range for DUCT_STATIC (expected ~0..10 inwc)
            chw = 0.0
            hw = 0.0
            fan = 20.0

        rows.append(
            Row(
                timestamp=_iso_z(t),
                SAT=round(sat, 3),
                CHW_VALVE_PCT=round(chw, 3),
                HW_VALVE_PCT=round(hw, 3),
                DUCT_STATIC=round(duct, 3),
                FAN_SPEED_PCT=round(fan, 3),
            )
        )

    return rows


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    out_dir = repo_root / "data" / "hvac"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "demo_trends.csv"

    start = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    rows = generate_rows(start_utc=start, days=7, interval_minutes=5)

    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["timestamp", "SAT", "CHW_VALVE_PCT", "HW_VALVE_PCT", "DUCT_STATIC", "FAN_SPEED_PCT"])
        for r in rows:
            w.writerow([r.timestamp, r.SAT, r.CHW_VALVE_PCT, r.HW_VALVE_PCT, r.DUCT_STATIC, r.FAN_SPEED_PCT])

    print(f"Wrote {len(rows)} rows to {out_path}")


if __name__ == "__main__":
    main()

