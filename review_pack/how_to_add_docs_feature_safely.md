# How to add a docs feature safely (checklist)

This checklist is designed to help you add/extend document generation without breaking billing/optimizer/UI behavior. It is grounded in the current doc-generator patterns and coupling hotspots.

## 0) Non-negotiable boundaries (do not put doc logic here)

- **Do not add doc logic to deterministic engines** (treat them as read-only dependencies):
  - `src/modules/tariffEngine/*`
  - `src/modules/phase1_tariff/billing/billingOracle.ts`
  - `src/modules/phase1_tariff/optimizer/dispatchLp.ts`
- **Do not add doc logic to battery optimization core**:
  - `src/modules/battery/*` (notably `src/modules/battery/option-s-optimizer.ts`)

## 1) Identify the “document type” and its contract

- Write down:
  - **Inputs** (domain objects): e.g. `ChangeOrderRecord` (`src/types/change-order.ts`), `BatteryAnalysisManifest` (`src/utils/battery/report-vm.ts`)
  - **Outputs**: `Blob` return vs `doc.save()` side-effect
    - Blob-returning pattern: `src/utils/report-generator.ts`, `src/utils/carbon/carbon-report-pdf.ts`
    - Side-effect save pattern: `src/utils/battery/report-pdf.ts`, `src/utils/regression-report-exporter.ts`

## 2) Add or reuse types in the right place

- Prefer **cross-cutting domain types** in `src/types/*`:
  - Example: `ChangeOrderRecord`, `ProjectCustomerDetails` in `src/types/change-order.ts`
- Prefer **doc-specific input models** near the generator when they are truly doc-specific:
  - Example: `CarbonReportMeta`, `CarbonReportInputs` in `src/utils/carbon/carbon-report-pdf.ts`
- Avoid “any” envelopes if possible; when unavoidable, isolate them behind a view-model adapter:
  - Example: `BatteryAnalysisResultEnvelope.result: any` is isolated behind `BatteryReportViewModel` in `src/utils/battery/report-vm.ts`

## 3) Add an adapter/view-model layer (recommended)

Goal: make doc generators consume a **stable, typed view model**, not raw engine payloads.

- Pattern to copy:
  - `src/utils/battery/report-vm.ts` exports `BatteryReportViewModel` and `buildReportViewModel(...)`
- Keep the adapter responsible for:
  - picking the correct source fields
  - defaults and coercions
  - versioning/manifest footers for audit/discrepancy triage
  - (optional) diff helpers (e.g. `diffHeadline(...)` in `src/utils/battery/report-vm.ts`)

## 4) Implement the document generator as a pure formatter

- Put PDF/Word/Excel generation in `src/utils/**` (current convention):
  - PDF: `src/utils/report-generator.ts`, `src/utils/carbon/carbon-report-pdf.ts`, `src/utils/mv-report-generator.ts`
  - Word (docx): `src/utils/report-generator-word.ts`, `src/utils/change-order-generator.ts`
- Keep generator responsibilities limited to:
  - layout, tables, rendering, pagination
  - translating a view-model into document text/tables
- Do **not** recompute billing or dispatch inside the doc generator:
  - Example of risky coupling to avoid: `src/utils/battery/report-pdf.ts` reads `vm.raw.envelope?.result?.tariffEngine` directly

## 5) Decide on “return Blob” vs “save side-effect” (and be consistent)

- Prefer **returning `Blob`** where possible, and let UI decide how to download/save:
  - Example: `generatePDFReport(...): Blob` in `src/utils/report-generator.ts`
  - Example: `generateCarbonFootprintReportPdf(...): Blob` in `src/utils/carbon/carbon-report-pdf.ts`
- If you must keep side-effect saving (current battery/regression patterns), isolate it behind a single exported function:
  - Example: `exportBatteryFullPdf(vm)` uses `doc.save(...)` in `src/utils/battery/report-pdf.ts`

## 6) Wire it into UI safely (minimal blast radius)

- Prefer calling doc generators from UI handlers in:
  - `src/pages/*` or `src/components/*`
- Prefer routing backend calls through typed API clients:
  - `src/shared/api/*` (e.g. `src/shared/api/calculators.ts`, `src/shared/api/projectBuilder.ts`)
- Avoid importing doc generators into deterministic engines or domain core modules.

## 7) Test strategy (what to test so docs changes don’t break billing/optimizer)

### A) Unit-test view-model adapters (recommended)

- Test adapter outputs with fixed fixtures (JSON inputs), since they are deterministic and easy to snapshot:
  - Example target: `buildReportViewModel(...)` in `src/utils/battery/report-vm.ts`

### B) Unit-test calculation helpers used by docs

- Example: carbon factor + equivalency math is pure and testable:
  - `calculateCarbonTotals(...)` and `calculateEpaEquivalencies(...)` in `src/utils/carbon/epa-equivalencies.ts`

### C) Snapshot tests for rendered structure (not raw PDF bytes)

- Instead of snapshotting the `Blob` bytes, snapshot:
  - the view-model JSON
  - table row arrays / computed sections (if exposed by helpers)
- If you must validate PDF output, validate invariants:
  - generation doesn’t throw for representative inputs
  - key strings appear (title/customer/site) — but note this may require a PDF text extractor (not currently present in these generators)

### D) Guardrails for engine coupling

- Add a “contract fixture” test for upstream payload shapes that docs depend on, and treat it as a breaking-change gate.
  - Example coupling point: `tariffEngine.cycles[*].determinants` referenced by `src/utils/battery/report-pdf.ts`

## 8) Rollout checklist

- Add the new generator behind a UI affordance without changing core computation behavior.
  - Example: `downloadFile(...)` helper pattern in `src/utils/report-generator.ts`
- Run through a sample input set for each supported doc type:
  - Change orders: `src/utils/change-order-generator.ts` + `src/types/change-order.ts`
  - Carbon report: `src/utils/carbon/carbon-report-pdf.ts` + `src/utils/carbon/epa-equivalencies.ts`
  - Battery report: `src/utils/battery/report-vm.ts` + `src/utils/battery/report-pdf.ts`

