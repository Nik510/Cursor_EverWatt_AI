# Risks and Hotspots

This is a best-effort static review. All items include concrete file paths. If something is uncertain, it is labeled **unknown**.

## Top coupling hotspots (module-level)
Computed from a static import scan of `src/**/*.ts(x)` (relative + tsconfig alias resolution).

- **1. `src`** — fan-in: 0, fan-out: 29
  - example edge: `src/App.tsx` → `src/pages/ModuleHub.tsx`
  - example edge: `src/App.tsx` → `src/modules/ee_training/pages/EETraining.tsx`
- **2. `src/pages`** — fan-in: 11, fan-out: 16
  - example edge: `src/pages/AnalysisReportPage.tsx` → `src/utils/interval-stats.ts`
  - example edge: `src/pages/AnalysisReportPage.tsx` → `src/modules/battery/types.ts`
  - example edge: `src/App.tsx` → `src/pages/ModuleHub.tsx`
  - example edge: `src/modules/utilities/pages/OBFMeasureChecker.tsx` → `src/pages/OBFMeasureChecker.tsx`
- **3. `src/services`** — fan-in: 8, fan-out: 6
  - example edge: `src/services/ai-rag-service.ts` → `src/db/client.ts`
  - example edge: `src/services/auth-service.ts` → `src/backend/admin/types.ts`
  - example edge: `src/App.tsx` → `src/services/logger.ts`
  - example edge: `src/scripts/ingest-mills-workbook.ts` → `src/services/workbook-mills-ingest.ts`
- **4. `src/components`** — fan-in: 3, fan-out: 10
  - example edge: `src/components/AIInsightPanel.tsx` → `src/services/llm-insights.ts`
  - example edge: `src/components/BatteryCard.tsx` → `src/utils/battery-catalog-loader.ts`
  - example edge: `src/App.tsx` → `src/components/ErrorBoundary.tsx`
  - example edge: `src/types/analysis.ts` → `src/components/CustomerInformationForm.tsx`
- **5. `src/utils`** — fan-in: 6, fan-out: 7
  - example edge: `src/utils/academy-storage.ts` → `src/data/academy/role-paths.ts`
  - example edge: `src/utils/battery-catalog-loader.ts` → `src/modules/battery/types.ts`
  - example edge: `src/server.ts` → `src/utils/excel-reader.ts`
  - example edge: `src/scripts/debug-battery-selection.ts` → `src/utils/battery-catalog-loader.ts`
- **6. `src/modules/battery`** — fan-in: 7, fan-out: 4
  - example edge: `src/modules/battery/dispatch.ts` → `src/utils/battery/s-rate-calculations.ts`
  - example edge: `src/modules/battery/dr-panel-adapter.ts` → `src/data/dr-programs/types.ts`
  - example edge: `src/server.ts` → `src/modules/battery/logic.ts`
  - example edge: `src/utils/battery-catalog-loader.ts` → `src/modules/battery/types.ts`
- **7. `src/types`** — fan-in: 9, fan-out: 2
  - example edge: `src/types/analysis.ts` → `src/components/CustomerInformationForm.tsx`
  - example edge: `src/types/analysis.ts` → `src/modules/battery/types.ts`
  - example edge: `src/server.ts` → `src/types/data-service.ts`
  - example edge: `src/utils/change-order-generator.ts` → `src/types/change-order.ts`
- **8. `src/data`** — fan-in: 8, fan-out: 1
  - example edge: `src/data/dr-programs/types.ts` → `src/modules/battery/dr-fit-score.ts`
  - example edge: `src/server.ts` → `src/data/equipment/comprehensive-equipment-database.ts`
  - example edge: `src/utils/academy-storage.ts` → `src/data/academy/role-paths.ts`
- **9. `src/backend`** — fan-in: 8, fan-out: 0
  - example edge: `src/server.ts` → `src/backend/admin/auth.ts`
  - example edge: `src/utils/certification-storage.ts` → `src/backend/ee-training/types.ts`
- **10. `src/modules/hvac`** — fan-in: 2, fan-out: 5
  - example edge: `src/modules/hvac/equipment-library.ts` → `src/data/hvac/index.ts`
  - example edge: `src/modules/hvac/hvac-compute-client.ts` → `src/config/index.ts`
  - example edge: `src/server.ts` → `src/modules/hvac/calculations.ts`
  - example edge: `src/pages/modules/HVACOptimizer.tsx` → `src/modules/hvac/optimizer-contract.ts`

## Circular dependencies
- **cycle 1**: `src/utils` → `src/data` → `src/modules/battery` → `src/utils`
- **cycle 2**: `src/data` → `src/modules/battery` → `src/data`
- **cycle 3**: `src/types` → `src/components` → `src/services` → `src/types`
- **cycle 4**: `src/utils` → `src/types` → `src/components` → `src/utils`
- **cycle 5**: `src/types` → `src/components` → `src/hooks` → `src/types`
- **cycle 6**: `src/types` → `src/components` → `src/types`

## God modules / high-impact files (largest by LOC)
- **1. `src/data/equipment/all-technology-compendiums.ts`** — ~12071 lines
- **2. `src/server.ts`** — ~6962 lines
- **3. `src/data/hvac/comprehensive-hvac-database.ts`** — ~5379 lines
- **4. `src/pages/Phase2ResultsPage.tsx`** — ~4564 lines
- **5. `src/data/master-ee-database/index.ts`** — ~3508 lines
- **6. `src/pages/modules/calculators/BatteryCalculator.tsx`** — ~2891 lines
- **7. `src/pages/AnalysisReportPage.tsx`** — ~2676 lines
- **8. `src/pages/EnergyIntelligence.tsx`** — ~2264 lines
- **9. `src/data/knowledge-base/master-measures.ts`** — ~1815 lines
- **10. `src/modules/battery/optimal-selection.ts`** — ~1742 lines

## Places where doc changes could break billing/optimizer/UI
- **Battery PDF reads legacy tariff-engine payload shape** (`tariffEngine.cycles[*].determinants`).
  - `src/utils/battery/report-pdf.ts`
  - Upstream payload source is `vm.raw.envelope.result` (`any`) in `src/utils/battery/report-vm.ts`
- **Generic report generator (`ReportData`) mixes many concerns** (hvac + lighting + battery + financials) and is used by both PDF and Word paths.
  - `src/utils/report-generator.ts`
  - `src/utils/report-generator-word.ts`
- **Change order docs couple to `ChangeOrderRecord` shape**; changes to customer/address fields affect rendering.
  - `src/utils/change-order-generator.ts`
  - `src/types/change-order.ts`
- **Carbon reports depend on EPA equivalency type shapes and factor selection.**
  - `src/utils/carbon/carbon-report-pdf.ts`
  - `src/utils/carbon/epa-equivalencies.ts`
- **Regression export depends on `RegressionAnalysisResult` + model diagnostics fields.**
  - `src/utils/regression-report-exporter.ts`
  - `src/utils/regression-analysis.ts`
- **M&V report generator has its own report data model; doc layout depends on these fields remaining stable.**
  - `src/utils/mv-report-generator.ts`

## Top 10 coupling risks (concrete items)
- **1) Docs reading untyped `any` envelopes** can silently break when upstream shapes change.
  - `src/utils/battery/report-vm.ts` (`BatteryAnalysisResultEnvelope.result: any`)
- **2) Docs directly read engine-specific payload keys** rather than a stable adapter contract.
  - `src/utils/battery/report-pdf.ts` (expects `tariffEngine.cycles`)
- **3) UI ↔ docs coupling through browser-only globals** (Blob/URL/document) makes server-side rendering or node-based generation risky.
  - `src/utils/report-generator.ts` (`URL.createObjectURL`, `document.createElement`)
  - `src/utils/change-order-generator.ts` (`URL.createObjectURL`, `document.createElement`)
- **4) Duplicate helper names across generators** (`downloadFile` vs `downloadBlob`) increases accidental misuse risk.
  - `src/utils/report-generator.ts` (`downloadFile`)
  - `src/utils/change-order-generator.ts` (`downloadBlob`)
- **5) “ReportData” is a broad union container** that can grow into a god-type.
  - `src/utils/report-generator.ts` (`ReportData`)
- **6) Large central server file** can act as an integration hotspot; changes can ripple widely.
  - `src/server.ts`
- **7) Cross-cutting utilities are imported widely**; small changes can have big blast radius.
  - `src/utils/*` (see module coupling section above)
- **8) Module boundary between UI and domain is porous** (UI imports deep domain modules).
  - Example domain module root: `src/modules/phase1_tariff/*`
  - Example UI roots: `src/pages/*`, `src/components/*`
- **9) Multiple PDF generators with different conventions** (save side-effect vs returning Blob) complicates a unified “docs pipeline”.
  - Side-effect save: `src/utils/battery/report-pdf.ts`, `src/utils/regression-report-exporter.ts`
  - Blob return: `src/utils/carbon/carbon-report-pdf.ts`, `src/utils/report-generator.ts`
- **10) Deterministic engines are adjacent to non-deterministic systems** (AI/services); keeping a strict boundary is fragile without enforcement.
  - Deterministic: `src/modules/phase1_tariff/billing/billingOracle.ts`, `src/modules/tariffEngine/*`
  - AI/services: `src/services/ai-service.ts`, `src/services/ai-rag-service.ts`
