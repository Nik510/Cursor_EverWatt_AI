from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
from ortools.linear_solver import pywraplp


@dataclass(frozen=True)
class EventWindow:
    start_hour: int
    end_hour: int
    weekdays_only: bool = True
    months: set[int] | None = None  # 1..12


def _ensure_ts(df: pd.DataFrame, ts_col: str) -> pd.Series:
    return pd.to_datetime(df[ts_col], utc=True, errors="coerce")


def filter_event_window(df: pd.DataFrame, *, ts_col: str, w: EventWindow) -> pd.DataFrame:
    ts = _ensure_ts(df, ts_col)
    hour = ts.dt.hour
    weekday = ts.dt.weekday  # 0=Mon
    month = ts.dt.month

    mask = (hour >= w.start_hour) & (hour < w.end_hour)
    if w.weekdays_only:
        mask &= weekday <= 4
    if w.months is not None:
        mask &= month.isin(list(w.months))
    return df.loc[mask].copy()


def deliverable_kw_no_battery(df: pd.DataFrame, *, ts_col: str, kw_col: str, w: EventWindow) -> float:
    """
    Conservative ops-only deliverable:
      - daily mean kW in event window
      - deliverable = P50 - P20
    """
    win = filter_event_window(df, ts_col=ts_col, w=w)
    if win.empty:
        return 0.0
    ts = _ensure_ts(win, ts_col)
    win = win.assign(_date=ts.dt.date)
    daily = win.groupby("_date")[kw_col].mean()
    if len(daily) < 3:
        return 0.0
    p50 = float(np.percentile(daily, 50))
    p20 = float(np.percentile(daily, 20))
    return float(max(0.0, p50 - p20))


def _select_hot_days(
    df: pd.DataFrame,
    *,
    ts_col: str,
    temp_col: str,
    w: EventWindow,
    top_n: int,
) -> set[pd.Timestamp.date]:
    """
    Select top-N hottest days based on average temperature within the event window.
    If temperature is missing/empty, returns empty set (caller falls back).
    """
    if temp_col not in df.columns:
        return set()
    win = filter_event_window(df, ts_col=ts_col, w=w)
    if win.empty:
        return set()
    if win[temp_col].isna().all():
        return set()

    ts = _ensure_ts(win, ts_col)
    win = win.assign(_date=ts.dt.date)
    daily_temp = win.groupby("_date")[temp_col].mean().dropna()
    if daily_temp.empty:
        return set()
    top_n = int(max(1, min(top_n, len(daily_temp))))
    hottest = daily_temp.sort_values(ascending=False).head(top_n).index.tolist()
    return set(hottest)


def _maximize_k_for_day(
    df_day: pd.DataFrame,
    *,
    ts_col: str,
    kw_col: str,
    is_event_col: str,
    interval_hours: float,
    P: float,
    E: float,
    eta_c: float,
    eta_d: float,
    no_export: bool,
    soc0_frac: float,
) -> float:
    """
    Solve one LP that maximizes k for this day:
      ch[t] - dis[t] + k <= 0 for event intervals (equiv net <= base - k)
    """
    n = len(df_day)
    if n < 2:
        return 0.0

    base = df_day[kw_col].astype(float).to_list()
    is_event = df_day[is_event_col].astype(bool).to_list()
    if not any(is_event):
        return 0.0

    solver = pywraplp.Solver.CreateSolver("GLOP")
    if solver is None:
        raise RuntimeError("OR-Tools GLOP solver not available")

    # Decision vars
    ch = [solver.NumVar(0.0, P, f"ch_{t}") for t in range(n)]
    dis = [solver.NumVar(0.0, P, f"dis_{t}") for t in range(n)]
    soc = [solver.NumVar(0.0, E, f"soc_{t}") for t in range(n + 1)]
    k = solver.NumVar(0.0, P, "k")

    soc0 = float(max(0.0, min(E, soc0_frac * E)))
    solver.Add(soc[0] == soc0)

    dt = float(interval_hours)
    for t in range(n):
        solver.Add(soc[t + 1] == soc[t] + (eta_c * ch[t] - dis[t] / eta_d) * dt)

    for t in range(n):
        # No export (net >= 0): base + ch - dis >= 0 => dis <= base + ch
        if no_export:
            solver.Add(dis[t] <= base[t] + ch[t])

        if is_event[t]:
            # ch - dis + k <= 0  (equiv base+ch-dis <= base-k)
            solver.Add(ch[t] - dis[t] + k <= 0.0)

    # Objective: maximize k, with tiny penalty on total discharge to discourage silly charge+discharge loops.
    obj = solver.Objective()
    obj.SetCoefficient(k, 1.0)
    eps = 1e-6
    for t in range(n):
        obj.SetCoefficient(dis[t], -eps)
    obj.SetMaximization()

    status = solver.Solve()
    if status != pywraplp.Solver.OPTIMAL:
        return 0.0
    return float(k.solution_value())


def deliverable_total_kw_with_battery(
    df: pd.DataFrame,
    *,
    ts_col: str,
    kw_col: str,
    temp_col: str | None,
    w: EventWindow,
    interval_hours: float,
    P: float,
    E: float,
    round_trip_efficiency: float,
    no_export: bool = True,
    soc0_frac: float = 0.5,
    top_hot_days_n: int = 10,
) -> Tuple[float, int, List[str]]:
    """
    Commitments-grade total deliverable using day-level LP max-k and P20 aggregation.

    Day selection:
      - if temperature exists and has values, evaluate top-N hottest days (by window avg temp)
      - else evaluate all qualifying window days
    """
    eta = float(np.sqrt(max(0.01, min(0.999, round_trip_efficiency))))
    eta_c, eta_d = eta, eta

    df = df.copy()
    df[ts_col] = _ensure_ts(df, ts_col)
    df = df.dropna(subset=[ts_col]).sort_values(ts_col).reset_index(drop=True)
    df["_date"] = df[ts_col].dt.date

    # Event mask for each row
    win_rows = filter_event_window(df, ts_col=ts_col, w=w)
    event_idx = set(win_rows.index.tolist())
    df["_is_event"] = df.index.map(lambda i: i in event_idx)

    notes: List[str] = []

    # Hot days selection
    selected_days: set[pd.Timestamp.date] = set()
    if temp_col:
        hottest = _select_hot_days(df, ts_col=ts_col, temp_col=temp_col, w=w, top_n=top_hot_days_n)
        if hottest:
            selected_days = hottest
            notes.append(f"Using top-{len(selected_days)} hottest days by avg temperature in event window.")

    if not selected_days:
        # All days that have at least one event interval
        selected_days = set(df.loc[df["_is_event"], "_date"].unique().tolist())
        notes.append("Temperature not available; using all qualifying event-window days.")

    ks: List[float] = []
    for day in sorted(selected_days):
        df_day = df[df["_date"] == day].copy()
        # Keep only days that actually have event intervals
        if not df_day["_is_event"].any():
            continue
        k_day = _maximize_k_for_day(
            df_day,
            ts_col=ts_col,
            kw_col=kw_col,
            is_event_col="_is_event",
            interval_hours=interval_hours,
            P=float(P),
            E=float(E),
            eta_c=float(eta_c),
            eta_d=float(eta_d),
            no_export=bool(no_export),
            soc0_frac=float(soc0_frac),
        )
        ks.append(float(k_day))

    if not ks:
        return 0.0, 0, notes + ["No event days found for the selected window."]

    deliverable = float(np.percentile(ks, 20))
    return deliverable, int(len(ks)), notes


def compute_dr_deliverables(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Payload schema:
      intervals: [{ts, kw, temp?}]
      battery: {power_kw, energy_kwh, round_trip_efficiency}
      window: {startHour, endHour, weekdaysOnly, months}
      options: {topHotDaysN, noExport, soc0Frac}
    """
    intervals = payload.get("intervals") or []
    df = pd.DataFrame(intervals)
    if df.empty:
        return {
            "deliverableOpsKw": 0.0,
            "deliverableTotalKw": 0.0,
            "deliverableBatteryKw": 0.0,
            "daysEvaluated": 0,
            "notes": ["no-intervals"],
        }

    ts_col = "ts"
    if "timestamp" in df.columns and "ts" not in df.columns:
        df = df.rename(columns={"timestamp": "ts"})
    if "kw" not in df.columns and "demand" in df.columns:
        df = df.rename(columns={"demand": "kw"})

    if ts_col not in df.columns or "kw" not in df.columns:
        raise ValueError("intervals must include ts and kw")

    # interval_hours (assume constant cadence)
    ts = _ensure_ts(df, ts_col)
    dt = ts.diff().dropna().median()
    interval_hours = float(dt.total_seconds() / 3600.0) if dt is not None and pd.notna(dt) else 0.25

    win = payload.get("window") or {}
    months = win.get("months")
    w = EventWindow(
        start_hour=int(win.get("startHour", 16)),
        end_hour=int(win.get("endHour", 21)),
        weekdays_only=bool(win.get("weekdaysOnly", True)),
        months=set(int(m) for m in months) if months else None,
    )

    battery = payload.get("battery") or {}
    P = float(battery.get("power_kw") or battery.get("powerKw") or 0.0)
    E = float(battery.get("energy_kwh") or battery.get("energyKwh") or 0.0)
    rte = float(battery.get("round_trip_efficiency") or battery.get("roundTripEfficiency") or 0.9)

    opts = payload.get("options") or {}
    no_export = bool(opts.get("noExport", True))
    soc0_frac = float(opts.get("soc0Frac", 0.5))
    top_hot_days_n = int(opts.get("topHotDaysN", 10))

    temp_col = None
    if "temp" in df.columns:
        temp_col = "temp"
    elif "temperature" in df.columns:
        temp_col = "temperature"

    ops = deliverable_kw_no_battery(df, ts_col=ts_col, kw_col="kw", w=w)
    total, days, notes = deliverable_total_kw_with_battery(
        df,
        ts_col=ts_col,
        kw_col="kw",
        temp_col=temp_col,
        w=w,
        interval_hours=interval_hours,
        P=P,
        E=E,
        round_trip_efficiency=rte,
        no_export=no_export,
        soc0_frac=soc0_frac,
        top_hot_days_n=top_hot_days_n,
    )

    battery_inc = max(0.0, float(total) - float(ops))
    return {
        "deliverableOpsKw": float(ops),
        "deliverableTotalKw": float(total),
        "deliverableBatteryKw": float(battery_inc),
        "daysEvaluated": int(days),
        "notes": notes,
    }


def main() -> None:
    payload = json.loads(input())
    out = compute_dr_deliverables(payload)
    print(json.dumps(out))


if __name__ == "__main__":
    main()

