# Proposed Architecture Rules (module boundaries)

These are **proposed boundary rules** grounded in the current code layout and observed couplings. Each rule cites at least one file path that motivated it.

- **Deterministic “truth engines” must be pure and side-effect free** (no network, no file writes, no randomness). Treat these as **read-only dependencies** for everything else.  
  Evidence: `src/modules/tariffEngine/*`, `src/modules/phase1_tariff/billing/billingOracle.ts`, `src/modules/phase1_tariff/optimizer/dispatchLp.ts`

- **Billing outputs are a source of truth and should be stable + versioned** (shape changes should be explicit, not implicit).  
  Evidence: `src/modules/phase1_tariff/types.ts` (`BillBreakdown`), `src/modules/tariffEngine/schema.ts`

- **Optimizers should not know about UI, storage, or doc generation**; they should accept typed inputs and return typed outputs only.  
  Evidence: `src/modules/phase1_tariff/optimizer/dispatchLp.ts`, `src/modules/battery/option-s-optimizer.ts`

- **Doc generators must be consumers only**: they may format/aggregate but must not recompute billing/optimization results.  
  Evidence: `src/utils/report-generator.ts`, `src/utils/change-order-generator.ts`, `src/utils/carbon/carbon-report-pdf.ts`

- **Doc generators should depend on view-model adapters instead of raw engine payloads** to avoid direct coupling to engine internals.  
  Evidence: `src/utils/battery/report-pdf.ts` (reads `vm.raw.envelope?.result?.tariffEngine`), `src/utils/battery/report-vm.ts`

- **All “formatters/exporters” belong in a dedicated doc/export layer** (currently clustered under `src/utils/*`). Avoid sprinkling PDF/Word logic into domain modules.  
  Evidence: `src/utils/regression-report-exporter.ts`, `src/utils/mv-report-generator.ts`, `src/utils/report-generator-word.ts`

- **IO boundary**: server routes and services are the only places allowed to talk to disk/network.  
  Evidence: `src/server.ts`, `src/services/*`, `src/storage/*`

- **Storage adapters should be narrow and capability-scoped** (read/write/list primitives), with all business rules elsewhere.  
  Evidence: `src/storage/types.ts`, `src/storage/local-adapter.ts`, `src/storage/s3-adapter.ts`

- **UI should only call through typed API clients, never import domain modules directly** (except for pure display helpers).  
  Evidence: `src/shared/api/*`, `src/pages/*`, `src/components/*`

- **API client wrappers are the contract surface between UI and backend**; keep them small and typed.  
  Evidence: `src/shared/api/client.ts`, `src/shared/api/calculators.ts`, `src/shared/api/projectBuilder.ts`

- **Cross-module types live in `src/types/*` and `src/validation/schemas/*`**; doc generators should import types from there rather than re-declaring shapes.  
  Evidence: `src/types/proposal-contract.ts`, `src/validation/schemas/proposal-contract-schema.ts`, `src/types/change-order.ts`

- **Validation schemas should be treated as authoritative** for persisted/over-the-wire shapes (and used at boundaries).  
  Evidence: `src/validation/schemas/project-graph-phase1-schema.ts`, `src/validation/schemas/audit-schema.ts`

- **Content/data catalogs are read-only inputs to the app**; transformation/ingestion scripts may write, but runtime modules should treat them as immutable.  
  Evidence: `src/data/*`, `src/scripts/*`

- **Scripts are allowed to be “dirty”** (one-off ingestion/transforms), but must not be imported by runtime code.  
  Evidence: `src/scripts/*`, `src/main.tsx`, `src/server.ts`

- **Module enablement is centralized**: feature gating should flow through the module registry, not scattered flags.  
  Evidence: `src/modules/registry.ts`

- **Avoid “god types” that transitively pull in everything**; keep doc-generator inputs explicitly scoped per document.  
  Evidence: `src/utils/report-generator.ts` (`ReportData` is broad), `src/utils/battery/report-vm.ts` (`envelope.result: any`)

- **Prefer explicit versioning in artifacts** (manifest/envelope/apiVersion), especially for persisted analysis results used by docs.  
  Evidence: `src/utils/battery/report-vm.ts` (`BatteryAnalysisManifest.apiVersion`, `BatteryAnalysisResultEnvelope.apiVersion`)

- **No-touch rule for review pack**: treat these as locked and do not patch behavior from doc-generation work.  
  Evidence: `src/modules/tariffEngine/*`, `src/modules/battery/*`, `src/App.tsx`

