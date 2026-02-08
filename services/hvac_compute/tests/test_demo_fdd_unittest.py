from __future__ import annotations

import unittest
from pathlib import Path
import subprocess
import sys


class TestDemoFdd(unittest.TestCase):
    def _repo_root(self) -> Path:
        # Walk upward until we find the repo's package.json (robust on Windows)
        p = Path(__file__).resolve()
        for parent in [p, *p.parents]:
            if (parent / "package.json").exists():
                return parent
        raise RuntimeError(f"Could not find repo root from {p}")

    def test_demo_trends_triggers_expected_faults(self) -> None:
        repo = self._repo_root()

        # Generate the demo CSV deterministically
        gen = repo / "scripts" / "generate_hvac_trend_csv.py"
        self.assertTrue(gen.exists(), f"Missing generator script at {gen}")

        # Run generator in a subprocess (simple + reliable on Windows)
        subprocess.check_call([sys.executable, str(gen)], cwd=str(repo))

        csv_path = repo / "data" / "hvac" / "demo_trends.csv"
        self.assertTrue(csv_path.exists(), f"Missing demo CSV at {csv_path}")
        csv_text = csv_path.read_text(encoding="utf-8")

        # Call the compute endpoint logic directly (no server required)
        try:
            import fastapi  # noqa: F401
            import pydantic  # noqa: F401
        except Exception as e:
            self.fail(
                "Python dependencies for hvac_compute are not installed. "
                "Run: pip install -r services/hvac_compute/requirements.txt. "
                f"Import error: {e}"
            )

        from services.hvac_compute.app.main import AnalyzeRequest, EquipmentSystem, PointMapping, TrendPayload, analyze

        req = AnalyzeRequest(
            apiVersion="v1",
            projectId="demo-project",
            runId="demo-run",
            timezone="UTC",
            systems=[EquipmentSystem(id="ahu-1", type="AHU", name="AHU-1")],
            pointMapping=PointMapping(
                timestampColumn="timestamp",
                points={
                    "SAT": "SAT",
                    "CHW_VALVE_PCT": "CHW_VALVE_PCT",
                    "HW_VALVE_PCT": "HW_VALVE_PCT",
                    "DUCT_STATIC": "DUCT_STATIC",
                    "FAN_SPEED_PCT": "FAN_SPEED_PCT",
                },
            ),
            trend=TrendPayload(format="csv", csvText=csv_text),
            targetIntervalMinutes=5,
        )

        resp = analyze(req)
        findings = list(resp.fdd_findings)
        fault_types = {f.fault_type for f in findings}

        # Must include these deterministic segments
        self.assertIn("simultaneous_heating_cooling", fault_types)
        self.assertIn("reheat_leakage", fault_types)
        self.assertIn("sensor_out_of_range", fault_types)
        self.assertIn("sensor_flatlined", fault_types)

        # blocks_optimization must be true for sensor validity faults
        for f in findings:
            if f.fault_type in ("sensor_out_of_range", "sensor_flatlined"):
                self.assertTrue(f.blocks_optimization, f"{f.fault_type} should block optimization")


if __name__ == "__main__":
    unittest.main()

