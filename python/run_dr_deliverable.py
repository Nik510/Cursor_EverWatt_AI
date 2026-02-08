from __future__ import annotations

import json
import sys

from everwatt_battery_engine.dr_deliverable import compute_dr_deliverables


def main() -> None:
    # Read JSON payload from stdin and write JSON response to stdout.
    payload = json.loads(sys.stdin.read() or "{}")
    out = compute_dr_deliverables(payload)
    sys.stdout.write(json.dumps(out))


if __name__ == "__main__":
    main()

