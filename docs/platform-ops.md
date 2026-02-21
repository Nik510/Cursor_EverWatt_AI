# Platform ops (dev + ship) — v1

This doc is a lightweight “how to run + how to ship” reference for the **ship-slice** surface, with emphasis on **snapshot-only** guarantees and **endpoint gating**.

## Required env vars (production)

- **`NODE_ENV=production`**
- **JWT secret (stop-ship)**: set `JWT_SECRET` (preferred) or `AUTH_SECRET`
  - The server will fail fast in production if no secret is configured.

## Optional env vars (storage locations)

These control where snapshot-only stores write to disk. Values may be absolute or relative (resolved to absolute at runtime).

- **Projects (non-snapshot project records)**
  - **`EVERWATT_PROJECTS_BASEDIR`**
  - **Default**: `data/projects/`

- **Runs (analysis run snapshots, v1)**
  - **Preferred**: `EVERWATT_RUNS_BASEDIR`
  - **Legacy (still supported)**: `EVERWATT_ANALYSIS_RUNS_V1_BASEDIR`
  - **Default**: `.data/analysisRunsV1/`

- **Reports (report sessions spine, v1)**
  - **Preferred**: `EVERWATT_REPORTS_BASEDIR`
  - **Legacy (still supported)**: `EVERWATT_REPORT_SESSIONS_V1_BASEDIR`
  - **Default**: `.data/reportSessionsV1/`

## Demo/internal endpoint gating

- **`EVERWATT_DEMO_AUTH=1`**
  - Enables demo-only behavior (ex: admin “accept any password” login).
  - Also enables a small set of **internal/debug endpoints** when `NODE_ENV=production`.
  - When `NODE_ENV=production` and `EVERWATT_DEMO_AUTH` is not set to `1`, these internal endpoints respond with **404**.

## Where data is stored (defaults)

- **Runs (snapshot-only)**: `.data/analysisRunsV1/`
- **Report sessions + wizard outputs (snapshot-only)**: `.data/reportSessionsV1/`
- **Projects**: `data/projects/`

The repo `.gitignore` excludes the `.data/*` roots above.

## How to run locally

- **Frontend + backend**

```bash
npm run dev:all
```

- **Backend only**

```bash
npm run dev:server
```

## How to ship (CI-parity)

The ship build is:

```bash
npm run build
```

This runs:
- Type-check for the ship surface (`tsconfig.ship.json`)
- Vite build in `--mode ship`

## Generate packs + bundles (snapshot-only)

There are two “spines” for producing report artifacts:

- **Report sessions v1**
  - `POST /api/report-sessions-v1/:reportId/run-utility` (computes + persists a run snapshot id)
  - `POST /api/report-sessions-v1/:reportId/generate-engineering-pack`
  - `POST /api/report-sessions-v1/:reportId/generate-executive-pack`
  - `POST /api/report-sessions-v1/:reportId/build-wizard-output`

- **Project report revisions**
  - `POST /api/projects/:id/reports/engineering-pack-v1/generate`
  - `POST /api/projects/:id/reports/executive-pack-v1/generate`
  - `GET /api/projects/:id/reports/revisions/:revisionId/bundle.zip`

## “Snapshot-only” guarantees (contract)

- **GET endpoints never recompute engines**: they render/read strictly from stored snapshots/revisions.
- **Compute endpoints write snapshots**: any endpoint that runs an engine must persist a snapshot id and return stable ids so downstream reads remain deterministic.

