from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional, Tuple

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


API_VERSION: Literal["v1"] = "v1"


class TrendPayload(BaseModel):
    format: Literal["csv"]
    csvText: str = Field(min_length=1)


class PointMapping(BaseModel):
    timestampColumn: str = Field(min_length=1)
    points: Dict[str, str] = Field(default_factory=dict)
    unitsHint: Optional[Dict[str, str]] = None


class EquipmentSystem(BaseModel):
    id: str = Field(min_length=1)
    type: Literal["AHU", "RTU", "VAVGroup", "ChillerPlant", "BoilerPlant"]
    name: str = Field(min_length=1)
    metadata: Optional[Dict[str, Any]] = None


class HvacObjective(BaseModel):
    mode: Optional[Literal["energy", "demand", "cost"]] = "cost"
    demandCapKw: Optional[float] = None


class HvacConstraints(BaseModel):
    comfort: Optional[Dict[str, Any]] = None
    ventilation: Optional[Dict[str, Any]] = None
    equipment: Optional[Dict[str, Any]] = None


class AnalyzeRequest(BaseModel):
    apiVersion: Literal["v1"]
    projectId: str = Field(min_length=1)
    runId: str = Field(min_length=1)
    timezone: str = Field(min_length=1, default="UTC")

    systems: List[EquipmentSystem] = Field(min_length=1)
    pointMapping: PointMapping
    trend: TrendPayload

    objective: Optional[HvacObjective] = None
    constraints: Optional[HvacConstraints] = None
    targetIntervalMinutes: int = Field(default=15, ge=1, le=60)


class DataQaIssue(BaseModel):
    id: str
    pointTag: Optional[str] = None
    message: str
    severity: Literal["info", "warning", "error"] = "warning"


class EvidenceMetric(BaseModel):
    key: str
    value: Any = None
    unit: Optional[str] = None


class TechnicianChange(BaseModel):
    pointTag: Optional[str] = None
    pointName: str
    currentValue: Optional[Any] = None
    recommendedValue: Any
    when: Optional[Dict[str, Any]] = None
    rollbackValue: Optional[Any] = None
    notes: Optional[str] = None


class Recommendation(BaseModel):
    id: str
    title: str
    category: Literal["schedule", "reset", "economizer", "fdd", "other"]
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    confidence: float = Field(ge=0.0, le=1.0)
    estimatedImpact: Optional[Dict[str, Any]] = None
    technicianChangeList: List[TechnicianChange] = Field(default_factory=list)
    evidence: List[EvidenceMetric] = Field(default_factory=list)
    rationale: List[str] = Field(default_factory=list)


class FaultFinding(BaseModel):
    id: str
    system_id: Optional[str] = None
    fault_type: str
    severity: Literal["low", "medium", "high"]
    blocks_optimization: bool
    evidence: Dict[str, Any] = Field(default_factory=dict)
    recommended_investigation: List[str] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    apiVersion: Literal["v1"]
    projectId: str
    runId: str
    generatedAt: str

    dataQa: Dict[str, Any]
    fdd_findings: List[FaultFinding]
    recommendations: List[Recommendation]
    summary: Dict[str, Any]


app = FastAPI(title="EverWatt HVAC Compute", version=API_VERSION)


def _csv_headers(csv_text: str) -> List[str]:
    # Robust header read: ignore blank lines, tolerate BOM
    text = csv_text.lstrip("\ufeff")
    buf = io.StringIO(text)
    reader = csv.reader(buf)
    for row in reader:
        if not row:
            continue
        # Treat first non-empty row as header
        return [c.strip() for c in row if c is not None]
    return []

def _parse_csv_rows(csv_text: str) -> Tuple[List[str], List[Dict[str, str]]]:
    text = csv_text.lstrip("\ufeff")
    buf = io.StringIO(text)
    reader = csv.DictReader(buf)
    if reader.fieldnames is None:
        return [], []
    headers = [h.strip() for h in reader.fieldnames if h is not None]
    rows: List[Dict[str, str]] = []
    for r in reader:
        # Normalize keys by exact header names; keep raw string values
        rows.append({(k or "").strip(): (v or "").strip() for k, v in r.items()})
    return headers, rows

def _parse_ts(value: str) -> Optional[datetime]:
    v = (value or "").strip()
    if not v:
        return None
    # Try common ISO formats; fall back to datetime.fromisoformat
    try:
        # Handle 'Z'
        if v.endswith("Z"):
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return datetime.fromisoformat(v)
    except Exception:
        return None

def _to_float(value: str) -> Optional[float]:
    v = (value or "").strip()
    if not v:
        return None
    try:
        return float(v)
    except Exception:
        return None

def _median_dt_seconds(times: List[datetime]) -> Optional[float]:
    if len(times) < 3:
        return None
    diffs = []
    for i in range(1, len(times)):
        d = (times[i] - times[i - 1]).total_seconds()
        if d > 0:
            diffs.append(d)
    if not diffs:
        return None
    diffs.sort()
    mid = len(diffs) // 2
    return float(diffs[mid])

def _find_true_runs(times: List[datetime], flags: List[bool], min_seconds: float) -> List[Tuple[datetime, datetime]]:
    """Return contiguous windows where flags are True for at least min_seconds."""
    windows: List[Tuple[datetime, datetime]] = []
    start: Optional[datetime] = None
    last: Optional[datetime] = None
    for t, f in zip(times, flags):
        if f:
            if start is None:
                start = t
            last = t
        else:
            if start is not None and last is not None:
                if (last - start).total_seconds() >= min_seconds:
                    windows.append((start, last))
            start = None
            last = None
    if start is not None and last is not None:
        if (last - start).total_seconds() >= min_seconds:
            windows.append((start, last))
    return windows

def _flatline_windows(times: List[datetime], values: List[Optional[float]], epsilon: float, min_seconds: float) -> List[Tuple[datetime, datetime, float]]:
    """Detect windows where a point is effectively constant (abs diff <= epsilon)."""
    windows: List[Tuple[datetime, datetime, float]] = []
    start: Optional[datetime] = None
    last: Optional[datetime] = None
    last_val: Optional[float] = None
    for t, v in zip(times, values):
        if v is None:
            # break window on missing
            if start is not None and last is not None and (last - start).total_seconds() >= min_seconds and last_val is not None:
                windows.append((start, last, float(last_val)))
            start = None
            last = None
            last_val = None
            continue
        if last_val is None:
            start = t
            last = t
            last_val = v
            continue
        if abs(v - last_val) <= epsilon:
            last = t
        else:
            if start is not None and last is not None and (last - start).total_seconds() >= min_seconds:
                windows.append((start, last, float(last_val)))
            start = t
            last = t
            last_val = v
    if start is not None and last is not None and (last - start).total_seconds() >= min_seconds and last_val is not None:
        windows.append((start, last, float(last_val)))
    return windows

def _range_for_tag(tag: str) -> Optional[Tuple[float, float, str]]:
    # Ranges are conservative and deterministic (units assumed to match tag conventions)
    ranges: Dict[str, Tuple[float, float, str]] = {
        "OAT": (-40.0, 140.0, "F"),
        "RAT": (40.0, 95.0, "F"),
        "MAT": (35.0, 110.0, "F"),
        "SAT": (35.0, 90.0, "F"),
        "CHWST": (35.0, 60.0, "F"),
        "CHWRT": (35.0, 80.0, "F"),
        "HWST": (80.0, 220.0, "F"),
        "HWRT": (60.0, 220.0, "F"),
        "DUCT_STATIC": (0.0, 10.0, "inwc"),
        "FAN_SPEED_PCT": (0.0, 100.0, "pct"),
        "FAN_KW": (0.0, 5000.0, "kW"),
        "CHW_VALVE_PCT": (0.0, 100.0, "pct"),
        "HW_VALVE_PCT": (0.0, 100.0, "pct"),
        "OA_DAMPER_PCT": (0.0, 100.0, "pct"),
        "SPACE_TEMP": (45.0, 95.0, "F"),
        "SPACE_TEMP_SP": (45.0, 95.0, "F"),
        "ZONE_CO2": (0.0, 5000.0, "ppm"),
    }
    return ranges.get(tag)

def _build_fdd_findings(
    times: List[datetime],
    series: Dict[str, List[Optional[float]]],
    mapped_cols: Dict[str, str],
) -> List[FaultFinding]:
    findings: List[FaultFinding] = []
    if len(times) < 10:
        return findings

    # Compute dt for durations
    dt = _median_dt_seconds(times) or 900.0

    def mk_metric(key: str, value: Any, unit: Optional[str] = None) -> Dict[str, Any]:
        d = {"key": key, "value": value}
        if unit:
            d["unit"] = unit
        return d

    # 1) Simultaneous heating & cooling: CHW valve and HW valve both active
    if "CHW_VALVE_PCT" in series and "HW_VALVE_PCT" in series:
        cool_thr = 20.0
        heat_thr = 20.0
        flags = []
        for c, h in zip(series["CHW_VALVE_PCT"], series["HW_VALVE_PCT"]):
            flags.append((c is not None and c >= cool_thr) and (h is not None and h >= heat_thr))
        windows = _find_true_runs(times, flags, min_seconds=1800.0)  # 30 min
        if windows:
            # Evidence summary
            pct = 100.0 * (sum(1 for f in flags if f) / max(1, len(flags)))
            w0 = windows[0]
            findings.append(
                FaultFinding(
                    id="simultaneous_heating_cooling",
                    system_id=None,
                    fault_type="simultaneous_heating_cooling",
                    severity="high" if pct >= 5.0 else "medium",
                    blocks_optimization=False,
                    evidence={
                        "metrics": [
                            mk_metric("percent_time_simultaneous", round(pct, 2), "pct"),
                            mk_metric("threshold_chw_valve_pct", cool_thr, "pct"),
                            mk_metric("threshold_hw_valve_pct", heat_thr, "pct"),
                            mk_metric("min_window_minutes", 30, "min"),
                        ],
                        "timestamps": [w0[0].isoformat(), w0[1].isoformat()],
                    },
                    recommended_investigation=[
                        "Check sequences for deadband and interlocks between heating and cooling.",
                        "Verify valve command trends and actuator feedback match (no swapped points).",
                        "Look for economizer + reheat interactions or SAT reset causing reheat during cooling.",
                    ],
                )
            )

    # 2) Reheat leakage: HW valve sustained while SAT is cold (cooling SAT)
    if "HW_VALVE_PCT" in series and "SAT" in series:
        leak_thr = 15.0
        sat_cool_thr = 55.0
        flags = []
        for hv, sat in zip(series["HW_VALVE_PCT"], series["SAT"]):
            flags.append((hv is not None and hv >= leak_thr) and (sat is not None and sat <= sat_cool_thr))
        windows = _find_true_runs(times, flags, min_seconds=2 * 3600.0)  # 2h
        if windows:
            w0 = windows[0]
            findings.append(
                FaultFinding(
                    id="reheat_leakage",
                    system_id=None,
                    fault_type="reheat_leakage",
                    severity="high",
                    blocks_optimization=False,
                    evidence={
                        "metrics": [
                            mk_metric("threshold_hw_valve_pct", leak_thr, "pct"),
                            mk_metric("sat_cooling_threshold_f", sat_cool_thr, "F"),
                            mk_metric("min_window_hours", 2, "h"),
                        ],
                        "timestamps": [w0[0].isoformat(), w0[1].isoformat()],
                    },
                    recommended_investigation=[
                        "Inspect reheat valves/coils for leakage and verify valve close-off.",
                        "Check control loop tuning and minimum airflow settings driving reheat demand.",
                        "Confirm SAT sensor accuracy (bad SAT can misclassify cooling condition).",
                    ],
                )
            )

    # 3) Excessive duct static with low demand (proxy): high static with low fan speed
    if "DUCT_STATIC" in series and "FAN_SPEED_PCT" in series:
        static_high = 2.0  # inwc (placeholder, conservative)
        speed_low = 40.0
        flags = []
        for sp, fs in zip(series["DUCT_STATIC"], series["FAN_SPEED_PCT"]):
            flags.append((sp is not None and sp >= static_high) and (fs is not None and fs <= speed_low))
        windows = _find_true_runs(times, flags, min_seconds=1800.0)
        if windows:
            w0 = windows[0]
            findings.append(
                FaultFinding(
                    id="excessive_duct_static_pressure",
                    system_id=None,
                    fault_type="excessive_duct_static_pressure",
                    severity="medium",
                    blocks_optimization=False,
                    evidence={
                        "metrics": [
                            mk_metric("duct_static_threshold", static_high, "inwc"),
                            mk_metric("fan_speed_low_threshold", speed_low, "pct"),
                            mk_metric("note", "Using fan speed as a proxy for low demand (no VAV demand point mapped)."),
                        ],
                        "timestamps": [w0[0].isoformat(), w0[1].isoformat()],
                    },
                    recommended_investigation=[
                        "Review duct static setpoint and reset strategy (may be too high at low load).",
                        "Check pressure sensor location/tubing and calibration.",
                        "Verify VAV box control and damper operation (if available in BAS).",
                    ],
                )
            )

    # 4) Long-running overrides (proxy): flatlined control values >= 24h
    flatline_min = 24 * 3600.0
    control_tags = ["FAN_SPEED_PCT", "OA_DAMPER_PCT", "CHW_VALVE_PCT", "HW_VALVE_PCT", "DUCT_STATIC", "SAT"]
    for tag in control_tags:
        if tag not in series:
            continue
        eps = 0.1 if tag.endswith("_PCT") or tag in ("DUCT_STATIC", "FAN_KW") else 0.05
        wins = _flatline_windows(times, series[tag], epsilon=eps, min_seconds=flatline_min)
        if wins:
            w0 = wins[0]
            findings.append(
                FaultFinding(
                    id=f"long_running_override_{tag.lower()}",
                    system_id=None,
                    fault_type="long_running_overrides",
                    severity="medium",
                    blocks_optimization=True,
                    evidence={
                        "metrics": [
                            mk_metric("point_tag", tag),
                            mk_metric("mapped_column", mapped_cols.get(tag)),
                            mk_metric("flatline_epsilon", eps),
                            mk_metric("flatline_value", round(w0[2], 4)),
                            mk_metric("min_window_hours", 24, "h"),
                        ],
                        "timestamps": [w0[0].isoformat(), w0[1].isoformat()],
                    },
                    recommended_investigation=[
                        "Check BAS for manual overrides, operator holds, or disabled loops.",
                        "Verify the point is a command vs feedback (commands may legitimately be flat overnight).",
                        "Inspect for comms issues or stale trend logging.",
                    ],
                )
            )

    # 5) Sensor plausibility: out-of-range and inverted/scaled
    for tag, vals in series.items():
        rng = _range_for_tag(tag)
        if rng is None:
            continue
        lo, hi, unit = rng
        numeric = [v for v in vals if v is not None]
        if len(numeric) < 10:
            continue
        out = [v for v in numeric if v < lo or v > hi]
        if out:
            frac = 100.0 * (len(out) / max(1, len(numeric)))
            sev: Literal["low", "medium", "high"] = "high" if frac >= 5.0 else ("medium" if frac >= 1.0 else "low")
            findings.append(
                FaultFinding(
                    id=f"sensor_out_of_range_{tag.lower()}",
                    system_id=None,
                    fault_type="sensor_out_of_range",
                    severity=sev,
                    blocks_optimization=True,
                    evidence={
                        "metrics": [
                            mk_metric("point_tag", tag),
                            mk_metric("mapped_column", mapped_cols.get(tag)),
                            mk_metric("expected_min", lo, unit),
                            mk_metric("expected_max", hi, unit),
                            mk_metric("out_of_range_percent", round(frac, 2), "pct"),
                            mk_metric("sample_out_of_range_value", round(out[0], 4), unit),
                        ],
                        "timestamps": [],
                    },
                    recommended_investigation=[
                        "Verify units/scaling in the BAS trend export (F vs C, Pa vs in.w.c, etc.).",
                        "Check sensor calibration and wiring; confirm the trended point is the intended sensor.",
                    ],
                )
            )

        # Flatlined sensor (separate from override): for temperature/pressure sensors
        if tag in ("OAT", "RAT", "MAT", "SAT", "DUCT_STATIC", "CHWST", "CHWRT", "HWST", "HWRT", "SPACE_TEMP"):
            eps = 0.02 if unit in ("F", "inwc") else 0.1
            wins = _flatline_windows(times, vals, epsilon=eps, min_seconds=6 * 3600.0)  # 6h
            if wins:
                w0 = wins[0]
                findings.append(
                    FaultFinding(
                        id=f"sensor_flatlined_{tag.lower()}",
                        system_id=None,
                        fault_type="sensor_flatlined",
                        severity="medium",
                        blocks_optimization=True,
                        evidence={
                            "metrics": [
                                mk_metric("point_tag", tag),
                                mk_metric("mapped_column", mapped_cols.get(tag)),
                                mk_metric("flatline_epsilon", eps, unit),
                                mk_metric("flatline_value", round(w0[2], 4), unit),
                                mk_metric("min_window_hours", 6, "h"),
                            ],
                            "timestamps": [w0[0].isoformat(), w0[1].isoformat()],
                        },
                        recommended_investigation=[
                            "Confirm sensor is live (not stuck, not frozen) and trend sampling is working.",
                            "Check for communications dropouts causing repeated last value.",
                        ],
                    )
                )

    return findings


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"status": "ok", "service": "hvac_compute", "version": API_VERSION}


@app.post("/v1/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    if req.apiVersion != API_VERSION:
        raise HTTPException(status_code=400, detail=f"Unsupported apiVersion: {req.apiVersion}")

    headers = _csv_headers(req.trend.csvText)
    if not headers:
        raise HTTPException(status_code=400, detail="CSV appears to have no header row")

    # Data QA: completeness score based on mapped points presence
    expected = {k: v for k, v in (req.pointMapping.points or {}).items() if v}
    present = 0
    issues: List[DataQaIssue] = []

    # Timestamp column
    if req.pointMapping.timestampColumn not in headers:
        issues.append(
            DataQaIssue(
                id="missing_timestamp_column",
                message=f"Timestamp column '{req.pointMapping.timestampColumn}' not found in CSV header",
                severity="error",
            )
        )

    for tag, col in expected.items():
        if col in headers:
            present += 1
        else:
            issues.append(
                DataQaIssue(
                    id=f"missing_point_{tag.lower()}",
                    pointTag=tag,
                    message=f"Mapped column '{col}' for point '{tag}' not found in CSV header",
                    severity="warning",
                )
            )

    completeness = (present / max(1, len(expected))) if expected else 0.0

    # Parse CSV rows for FDD (deterministic; uses mapped points only)
    _, rows = _parse_csv_rows(req.trend.csvText)
    ts_col = req.pointMapping.timestampColumn
    times: List[datetime] = []
    # Build numeric series by tag
    series: Dict[str, List[Optional[float]]] = {tag: [] for tag in expected.keys()}
    # Always attempt to parse SAT/valves/static if mapped, even if not in expected (in case points dict is partial)
    for tag in list(req.pointMapping.points.keys()):
        if tag not in series:
            series[tag] = []

    for r in rows:
        t = _parse_ts(r.get(ts_col, ""))
        if t is None:
            continue
        # Normalize naive timestamps as UTC to keep deterministic
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        times.append(t)
        for tag, col in (req.pointMapping.points or {}).items():
            if not col:
                continue
            series.setdefault(tag, []).append(_to_float(r.get(col, "")))
        # Ensure all series are aligned (append None where missing)
        for tag in series.keys():
            col = (req.pointMapping.points or {}).get(tag)
            if col is None or col == "":
                # If a tag is not mapped, keep Nones aligned
                series[tag].append(None)

    # Sort by time and reorder series
    if times:
        idxs = sorted(range(len(times)), key=lambda i: times[i])
        times = [times[i] for i in idxs]
        for tag in list(series.keys()):
            vals = series[tag]
            if len(vals) == len(idxs):
                series[tag] = [vals[i] for i in idxs]

    mapped_cols = {tag: col for tag, col in (req.pointMapping.points or {}).items() if col}
    fdd_findings = _build_fdd_findings(times, series, mapped_cols)

    # Baseline results v1 (no savings, no optimization): return QA + FDD only
    now = datetime.now(timezone.utc).isoformat()
    return AnalyzeResponse(
        apiVersion=API_VERSION,
        projectId=req.projectId,
        runId=req.runId,
        generatedAt=now,
        dataQa={
            "completenessScore": float(completeness),
            "issues": [i.model_dump() for i in issues],
        },
        fdd_findings=fdd_findings,
        recommendations=[],
        summary={
            "recommendationCount": 0,
            "highPriorityCount": 0,
            "notes": [
                "FDD v1 enabled (deterministic checks; no optimization).",
            ],
        },
    )

