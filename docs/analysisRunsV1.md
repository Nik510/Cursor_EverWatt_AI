## Analysis Runs V1 (snapshot-only persistence)

### Storage location + env overrides

- **Default base dir**: `.data/analysisRunsV1/` (relative to repo root)
- **Override**: set `EVERWATT_ANALYSIS_RUNS_V1_BASEDIR` to an absolute or relative path; it will be resolved to an absolute path at runtime.

Notes:
- Stored runs are **immutable JSON snapshots** written as `<runId>.json` with an `index.json` for deterministic listing.
- Tests should always point `EVERWATT_ANALYSIS_RUNS_V1_BASEDIR` at a temp directory to avoid relying on repo state.

### Endpoints

- **POST** `/api/analysis-results-v1/run-and-store`
  - Purpose: compute a run once and persist a snapshot.
  - Body (common):
    - `{ "demo": true }` uses built-in demo inputs
    - `{ "projectId": "..." }` loads a persisted project and runs the workflow
    - Optional: `{ "meterId": "..." }` forwarded to workflow

- **GET** `/api/analysis-results-v1/runs`
  - Purpose: list persisted runs (bounded index view; no embedded snapshot).
  - Ordering is deterministic: `createdAtIso` **desc**, tie-break `runId` **asc**.
  - Response rows are intentionally bounded (runId/createdAtIso/inputFingerprint + a small summary).

- **GET** `/api/analysis-results-v1/runs/:runId`
  - Purpose: read the full persisted run JSON (including `snapshot`).

- **POST** `/api/analysis-results-v1/diff`
  - Purpose: diff **stored snapshots only**.
  - Body: `{ "runIdA": "...", "runIdB": "..." }`

- **GET** `/api/analysis-results-v1/runs/:runId/pdf`
  - Purpose: render a PDF from the **stored** snapshot (no recompute).

### Snapshot-only guarantee (release safety gate)

The v1 runs store is designed so that **only** `run-and-store` may compute engines.

Hard rule:
- **Reads**, **diffs**, and **PDF exports** must operate on the persisted JSON snapshot and must **never** re-run engines.

### Diff contract (bounded + deterministic)

The diff response is intentionally bounded so it’s safe for UI rendering and stable in CI:

- **Fixed category order**:
  - `rate_and_supply`, `interval`, `weather_determinants`, `battery`, `programs`, `warnings`
- **Bounded fields per category**:
  - `changedPaths`: max **25** entries, sorted
  - `highlights`: max **10** entries, deterministic ordering based on the predefined path list
- `changedSections` is the list of categories with at least one changed path.

### Clearing local data safely

To clear stored analysis runs without touching other local state, delete:

- `.data/analysisRunsV1/`

Examples:

```bash
rm -rf .data/analysisRunsV1
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force .data\analysisRunsV1
```

