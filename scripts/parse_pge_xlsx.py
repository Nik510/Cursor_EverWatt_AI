"""
Utility: Parse PG&E tariff XLSX files into a normalized JSON bundle.

Outputs:
- src/utils/rates/data/pge-tariff-tables.json

Notes:
- Keeps all non-empty rows per sheet to preserve official values.
- Converts numeric cells to Python floats; leaves strings as-is (stripped).
- Skips completely empty rows/columns but otherwise keeps the raw table layout.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd


# Use environment variable or fallback to original source location
# Note: This is a one-time extraction script. Extracted data is stored in data/ folder.
import os
ROOT = Path(os.getenv("TRAINING_DATA_BASE_PATH", r"C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine")) / "UTILITY_DATA"
OUTPUT = Path("src/utils/rates/data/pge-tariff-tables.json")


def normalize_value(value: Any) -> Any:
    """Normalize cell values for JSON serialization."""
    if pd.isna(value):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return str(value).strip()


def dataframe_to_rows(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Convert a dataframe to a list of row dicts, dropping all-null rows."""
    # Drop fully empty rows/cols
    df = df.dropna(how="all").dropna(axis=1, how="all")
    rows: List[Dict[str, Any]] = []
    for _, row in df.iterrows():
        record = {}
        for col, val in row.items():
            norm = normalize_value(val)
            if norm is not None:
                record[str(col).strip()] = norm
        if record:
            rows.append(record)
    return rows


def parse_workbook(path: Path) -> Dict[str, Any]:
    """Parse all sheets from an Excel workbook."""
    xl = pd.ExcelFile(path)
    workbook_data: Dict[str, Any] = {}
    for sheet in xl.sheet_names:
        df = xl.parse(sheet)
        rows = dataframe_to_rows(df)
        workbook_data[sheet] = {
            "columns": [str(c).strip() for c in df.columns],
            "rows": rows,
        }
    return workbook_data


def main() -> None:
    sources = list(ROOT.rglob("*.xlsx"))
    payload: Dict[str, Any] = {"source_root": str(ROOT), "files": {}}

    for path in sorted(sources):
        rel = path.relative_to(ROOT).as_posix()
        payload["files"][rel] = parse_workbook(path)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"Wrote {OUTPUT} with {len(payload['files'])} workbooks.")


if __name__ == "__main__":
    main()
