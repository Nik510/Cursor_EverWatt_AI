# Utility Intelligence Engine v1 (Deterministic)

## What it is

`utilityIntelligence` is a **deterministic, platform-agnostic** analysis module that produces:

- **Explainable** utility insights (load shape, operating pattern, load shifting signals, rate fit candidates, Option S relevance, program matches)
- **Inbox-only** recommendations (never auto-applies changes)
- **Conservative missing-input detection** (unknown → missing)

It is designed so any EverWatt AI surface (Project Builder, Reports, Academy, Calculator) can call the same engine and render the same explainable outputs.

## Non-goals (v1)

- No LLM required
- No external web calls
- No auto-apply / no graph mutation (only suggestion artifacts)
- No dispatch modeling in this module
- No claims of savings unless a deterministic bill delta is computed

## Entry point

- Orchestrator: `src/modules/utilityIntelligence/analyzeUtility.ts`
- Inputs: `src/modules/utilityIntelligence/types.ts` (`UtilityInputs`)
- Inbox adapter: `src/modules/utilityIntelligence/toInboxSuggestions.ts`

## What v1 can conclude deterministically

### Load shape (from interval kW)
If interval kW is provided, v1 computes:
- `baseloadKw` (10th percentile)
- `peakKw` (95th percentile)
- `loadFactor` (avg/peak)
- `peakinessIndex` (peak/baseload)
- `weekdayWeekendDelta` (UTC day-of-week buckets)
- `nightDayRatio` (UTC night 00–06 vs day 09–17)
- `seasonalityIndex` (CV of monthly mean kW; UTC month buckets)
- `signatureVector` (24-element normalized hourly profile)

### Operating pattern inference
Deterministic rule inference from load-shape metrics:
- `24_7` vs `business_hours` vs `mixed` vs `unknown`
- Includes `confidence` and `reasons`

### Load shifting feasibility
Deterministic heuristic scoring (0..1) that flags repeatable peak windows:
- Candidate windows (e.g. 16–21 UTC-based)
- Constraints detection based on `UtilityInputs.constraints`

### Program matching
Deterministic matching against a versioned program catalog (see `program_intelligence_v1.md`):
- Territory match required
- NAICS prefix include/exclude rules
- Threshold gating (peak kW, kWh)
- Interval/AMI requirement enforcement

## What v1 will *not* claim (and how it flags missing)

### Savings claims
v1 only populates dollar deltas when it can compute them deterministically.

- If a deterministic delta is **not** computed, v1 will say **“potential improvement; needs X inputs”** and will include those inputs in `requiredInputsMissing`.
- In v1, rate deltas (when computed) are **demand-charge-only** using deterministic rate lookups and the protected `tariffEngine` demand-only billing primitives. Energy TOU charges are not modeled here.

### Address / weather / satellite enrichment
v1 does **not** make external calls. Weather sensitivity is computed only when a caller provides a `WeatherProvider` implementation (adapter interface) and a weather series can be returned deterministically.

If no provider is configured, v1 sets:
- `weatherSensitivity.available=false`
- `requiredInputsMissing` includes: “Weather series not available; provide weather data or configure provider.”

## Required inputs (v1)

### Always recommended
- **Utility territory** (e.g., `PGE`): required for rate/program catalogs
- **Current rate code**: required to evaluate rate fit (otherwise v1 recommends collecting it)
- **Interval kW** (or a reference that can be resolved): required for load shape, load shifting, DR matching
- **NAICS + customer type**: required for many programs (NAICS prefix rules)

### Sometimes required (depends on the recommendation)
- **Demand charge presence** (`meterMeta.hasDemandChargesKnown`): required to interpret Option S relevance
- **Billing cycle summary**: required to compute deterministic bill deltas per billing cycle (if available)

## Output guarantees (v1)
- Every `UtilityRecommendation` includes:
  - `because[]` (human-readable explanation)
  - `requiredInputsMissing[]` (conservative)
  - `suggestedMeasure` (canonical `Measure` schema)
- `toInboxSuggestions()` returns:
  - `RecommendationSuggestion[]` (project suggestion payloads)
  - `InboxItem[]` (Phase-1 inbox items, kind=`suggestedMeasure`)
- No code in this module mutates `ProjectGraph`.

## How to extend v1

### Extend the rate catalog
- File: `src/modules/utilityIntelligence/rates/rateCatalog.ts`
- Add entries to `RATE_CATALOG_V1` (territory, rateCode, tags, notes).
- Keep catalog additive; avoid breaking existing rate codes.

### Extend program catalogs
- File: `src/modules/programIntelligence/catalogs/pge_programs_v1.json`
- Add additional catalog JSON files per territory (recommended pattern):
  - `src/modules/programIntelligence/catalogs/<territory>_programs_v1.json`
- Update the matcher loader (`getDefaultCatalogForTerritory`) to return the proper catalog for that territory.

### Plug in providers later (interfaces only in v1)
- Weather: `src/modules/utilityIntelligence/weather/provider.ts`
- Future (not implemented in v1): address geocoding, satellite, and other enrichments should follow the same adapter pattern:
  - deterministic provider interface
  - mark missing when provider not configured or inputs not provided

## Running the CLI
- Utility Intelligence CLI:
  - `npx tsx scripts/run-utility-intelligence.ts --projectId <id> --territory PGE --intervalFixture samples/interval_peaky_office.json`
- Program Intelligence CLI:
  - `npx tsx scripts/run-program-intelligence.ts --territory PGE --naics 622110 --customerType healthcare --peakKw 600 --annualKwh 2500000`
