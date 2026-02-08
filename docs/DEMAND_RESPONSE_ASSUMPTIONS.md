# Demand Response (DR) Assumptions (v1)

This document describes the deterministic assumptions used by EverWatt’s DR panel (fit score, deliverable kW, and program $ comparisons).

## Deliverable kW definitions

- **deliverableOpsKw** (ops-only): Conservative estimate of operational flexibility (no battery), computed from interval data in the DR event window as:\n+  - per-day mean kW in window\n+  - \(P50 - P20\) of those daily means\n+  - clamped at \(\ge 0\)\n+
- **deliverableTotalKw** (commitment-grade): Firm total kW reduction supported by storage + ops, computed by:\n+  - selecting candidate event days (Top-N hottest days if temperature exists; otherwise all qualifying days)\n+  - for each day solving a linear program that **maximizes k** (firm kW reduction) subject to battery physics and event constraint\n+  - committing as \(P20(k_{day})\) (meets on ~80% of evaluated days)\n+
- **deliverableBatteryKw** (incremental battery contribution):\n+  - `max(0, deliverableTotalKw - deliverableOpsKw)`\n+  - This avoids double-counting when ops and battery shave the same load.\n+
## Event window (v1 default)

- **Summer weekdays, 16:00–21:00 local**, months **June–September**.\n+- Individual programs may have different windows; v1 uses the default window for deliverable computations (program windows can be expanded in the catalog).\n+
## Battery feasibility LP (commitment-grade)

For each day, we solve an LP with decision variables charge/discharge/SOC and a scalar `k`:\n+
- SOC dynamics: `soc[t+1] = soc[t] + (eta_c*ch[t] - dis[t]/eta_d) * dt`\n+- Power and SOC bounds: `0<=ch<=P`, `0<=dis<=P`, `0<=soc<=E`\n+- No-export (default): `base[t] + ch[t] - dis[t] >= 0`  (equivalently `dis[t] <= base[t] + ch[t]`)\n+- Event constraint (total deliverable): `ch[t] - dis[t] + k <= 0` for event intervals\n+- Objective: maximize `k` with a tiny penalty on discharge to discourage unnecessary cycling\n+
## Day selection: Top hot days

If interval temperature exists:\n+- For each day, compute average temperature within the event window.\n+- Select the **Top-N hottest** days (default N=10).\n+\n+If temperature is missing:\n+- Use all days that have at least one interval in the event window.\n+
## SOC initialization

v1 uses `soc0 = 50%` of usable energy for feasibility runs.\n+\n+Planned improvement (v1.2): use the SOC at event start from bill-optimized dispatch for the same battery bundle.\n+
## Program payments and fee model

Programs must explicitly declare event payment unit:\n+- `per_kw_event` (e.g., $/kW per event)\n+- `per_kwh` (e.g., $/kWh curtailed)\n+\n+The UI supports scenario overrides.\n+
### Hybrid EverWatt fee (default)

- `everwattFee = max( $30/kW-year * committedKw, 20% * customerGrossDR )`\n+
### Customer net DR

- `customerNetDR = customerGrossDR - everwattFee`\n+- DR is treated as **additive** to battery bill savings in customer payback calculations.\n+
## Output schema notes

The API returns `demandResponse` on `/api/batteries/analyze` responses when enabled.\n+It includes deliverables, fit score + explanations, program evaluations, and money breakdown (gross / fee / net).\n+
