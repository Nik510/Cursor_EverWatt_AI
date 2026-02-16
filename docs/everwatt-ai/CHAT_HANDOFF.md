# CHAT_HANDOFF

- [ ] After meaningful changes, update `SYSTEM_STATUS.md` + `CHAT_HANDOFF.md`.

## Current focus
Maintain the EverWatt app source-of-truth docs and keep tariff/program intelligence and analysis flows accurate.

## What's built
- Tariff Library with CA ingestion, snapshots, and curated rate tiers
- Billing Engine v2 and tariff engine scaffolding
- Utility intelligence and program library snapshots
- Analysis pipeline + report generation
- Battery calculator and HVAC optimizer demo
- EE training/academy content and UI

## Where in code
- Tariffs + curation: `src/modules/tariffLibrary/`, `src/modules/policy/curation/`, `data/curation/tariffs/ca/ca-tariffs-curation.json`
- Billing: `src/modules/billingEngineV2/`, `src/modules/tariffEngine/`
- Programs: `src/modules/programLibrary/v1/`, `data/programs/<utility>/<version>.json`
- Analysis UI: `src/pages/NewAnalysis.tsx`, `src/pages/AnalysisResultsV1Page.tsx`, `src/pages/AnalysisReportPage.tsx`
- Reports: `src/pages/modules/reports/`
- HVAC demo: `src/pages/modules/HVACOptimizer.tsx`, `services/hvac_compute/`
- API server: `src/server.ts`

## Open issues
- No auth or project persistence (projects are not durable).
- Weak workflow integration between analysis, calculators, and reports.
- Scenario comparison and data-quality reporting are missing.

## Next tasks in order
- Add durable project persistence and basic auth.
- Wire analysis results into calculator inputs and report generation.
- Add scenario/what-if comparison tooling.
- Add data-quality checks and a visible validation report.

## Key definitions
- Canon: `isEverWattCanonicalBusiness` + `businessFamilyKey` identify curated business-family rates (`src/modules/tariffLibrary/types.ts`).
- Featured: `popularityTier` in tariff curation (`top`, `featured`, `common`, `all`).
- Hidden: `curation.hidden` / `curationHidden` removes items from UI lists.
- Snapshot: stored JSON of tariffs/programs in `data/tariffs/<utility>/<version>.json` and `data/programs/<utility>/<version>.json`.
- Demo inputs: `samples/interval_peaky_office.json` plus demo defaults in `src/server.ts` (`?demo=true`).

## Recent handoff
- Hardened `analyzeBillIntelligenceV1`: ambiguous date warnings, stricter label gating, derived metric sanity warnings; tests added/updated; `npm test -- tests/billPdf.billIntelligenceV1.test.ts` passes.
