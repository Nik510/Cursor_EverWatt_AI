## EverWatt Memory + Recommendations (v1)

This document describes the **Completed Project Ingestion + Memory + Recommendations** foundation.

### What this delivers (v1)

- **Completed project ingestion**: import historical/completed projects (what we did + why) into a canonical `CompletedProjectRecord`.
- **EverWatt Memory index**: deterministic feature extraction + inverted indexes for similarity search.
- **Recommendations**: deterministic, explainable measure suggestions for a target Project Builder project.
- **Safety**: recommendations are **inbox-only and never auto-applied**; they only create **Project Graph inbox** items (`kind: "suggestedMeasure"`).

### What v1 does NOT do (by design)

- **No LLM required** for similarity or recommendations.
- **No automatic savings claims** unless deterministic calculators exist for that measure. If missing inputs are detected, the suggestion includes: “estimate unavailable; requires X inputs”.
- **No billing / optimizer behavior changes** and no dependency on battery logic completion.

---

## Data model (Types + Storage)

TypeScript types live in:

- `src/modules/project/types.ts`

Primary schemas:

- **CompletedProjectRecord**
  - `completedProjectId`, `orgId`, `createdAt`, `importedAt`
  - building metadata: `buildingType`, `sqft`, `climateZone`, `territory`, optional `operatingSchedule.bucket`
  - asset summaries (`assetsBefore` / `assetsAfter`): `ahuCount`, `vavCount`, etc.
  - measures implemented: canonical `measuresImplemented: Measure[]` (see below)
  - outcomes (optional): `savingsKwh`, `savingsKw`, `savingsTherms`, `savingsUsd`, `costUsd`, `paybackYears`
  - rationale (optional): `summary`, `decisionTags`, structured `assumptions`
  - evidence refs (optional): `url` and/or `storageKey`

- **EverWattMemoryIndex**
  - `indexId`, `orgId`, `generatedAt`, `version="v1"`
  - deterministic feature vectors (stored as structured features, not ML embeddings)
  - inverted indexes:
    - measureTag → projects
    - buildingType → projects
    - systemType (asset-count keys) → projects

- **RecommendationSuggestion**
  - `suggestionId`, `orgId`, `projectId`, `stateId`
  - suggested measure: canonical `Measure` (`measureType`, optional `label`, `tags`, `parameters`)
  - `score (0..1)`, `confidence (0..1)`
  - explainable evidence: top contributors + matching features + frequency
  - `requiredInputsMissing` list (populated for every suggestion)
  - `status`: `proposed | accepted | rejected | snoozed`

### Canonical Measure schema (v1)

Types live in:

- `src/modules/measures/types.ts`

**MeasureType list** (v1):

- `VFD_RETROFIT`
- `PUMP_VFD`
- `AHU_SCHEDULE_OPT`
- `VAV_RESET`
- `CHILLED_WATER_RESET`
- `HOT_WATER_RESET`
- `OCCUPANCY_CONTROLS`
- `LIGHTING_RETROFIT`
- `EMS_TUNING`
- `CHILLER_PLANT_OPT`
- `BATTERY_PEAK_SHAVE`
- `DEMAND_RESPONSE_ENROLLMENT`
- `STEAM_OPTIMIZATION`
- `RADIATOR_TRV`
- `OTHER` (fallback when we cannot reliably map)

**Normalization** is deterministic and happens on import:

- Implementation: `src/modules/measures/normalizeMeasure.ts`
- Synonym examples:
  - `"Variable frequency drive retrofit (fans)"` → `VFD_RETROFIT`
  - `"Pump VFD install"` / `"Variable Frequency Drive retrofit on pumps"` → `PUMP_VFD`
  - `"BMS tuning / retro-commissioning"` → `EMS_TUNING`
  - `"LED lighting retrofit"` → `LIGHTING_RETROFIT`

Normalization always preserves the original human text as `Measure.label`.

### Requirements registry + missing inputs

- Registry: `src/modules/measures/requirements.ts`
- Detector: `src/modules/recommendations/missingInputs.ts`

For every suggestion we compute `requiredInputsMissing` by checking:

- **telemetry**: conservative check for interval electricity presence (15-min or hourly)
- **asset_field**: scans Project Builder `graph.assets[].baseline.properties` for required fields

If `requiredInputsMissing` is non-empty:

- the recommendation must not claim readiness or savings
- the inbox suggestion includes “Estimate unavailable; requires …”

### Storage

This repo supports two modes:

- **Database enabled** (`USE_DATABASE=true` + `DATABASE_URL`): additive tables created by `src/db/schema.ts`
  - `completed_projects` (id, org_id, data jsonb, created/imported timestamps)
  - `memory_index` (id, org_id, version, data jsonb)
  - `recommendations` (id, org_id, project_id, data jsonb)

- **File-based dev storage** (default): JSON written under:
  - `data/dev/completed-projects/<orgId>.json`
  - `data/dev/memory-index/<orgId>.v1.json`
  - `data/dev/recommendations/<orgId>/<projectId>.json`

Inbox surfacing is done by appending `ProjectGraph.inbox[]` items to the target project record (stored either in DB `projects.data` or `data/projects/<projectId>.json`).

---

## How to run (CLI)

All scripts run with `tsx`.

### 1) Import completed projects (required)

Sample template:

- `samples/completed_project_template.json`

Run:

```bash
npx tsx scripts/import-completed-project.ts --file samples/completed_project_template.json
```

By default this also creates an **archived** Project Builder project (system of record). To disable:

```bash
npx tsx scripts/import-completed-project.ts --file samples/completed_project_template.json --createArchivedProject false
```

### 2) Build / rebuild memory index (required)

```bash
npx tsx scripts/build-memory-index.ts --org demo-org
```

This is **idempotent**: rebuilding overwrites the `v1` index for that org (no duplicates).

### 3) Generate recommendations for a project (required)

```bash
npx tsx scripts/generate-recommendations.ts --org demo-org --project <projectId>
```

Preview only (no writes):

```bash
npx tsx scripts/generate-recommendations.ts --org demo-org --project <projectId> --dryRun true
```

Outputs:

- RecommendationSuggestion objects persisted to the recommendations store
- Phase-1 inbox items added to the target project graph (`kind: "suggestedMeasure"`) with a “because” explanation

---

## Recommendation algorithm (deterministic v1)

1. Extract target feature vector from the target project:
   - building type bucket
   - sqft bucket (if present)
   - climate zone / territory (if present)
   - asset inventory similarity (counts from Project Graph assets)
   - schedule bucket (if present)
2. Find top-N similar completed projects (weighted similarity).
3. Aggregate measure types used in top matches.
4. Score each suggested measure:
   - \(score = \frac{\sum similarity(project\_i)}{\sum similarity(topN)}\) for projects containing the measure
   - confidence increases with average similarity and sample size
5. Run a deterministic **missing input detector** per suggestion to avoid unsafe savings claims.

---

## Tests

Unit tests added under `tests/`:

- feature extraction
- similarity scoring
- importer validation (missing fields)
- snapshot-style recommendation output

Run:

```bash
npm run test:unit
```

