# Module Index

This file is generated for review; it is **read-only** and reflects a best-effort static import scan of `src/**/*.ts(x)`.

## No-touch boundaries (for this review pack)
- `src/modules/tariffEngine/**`
- `src/modules/battery/**`
- `src/app/**` (note: this repo uses `src/App.tsx`)

## Import alias map (tsconfig)
- Source: `tsconfig.json`
- `@core/*` → `src/core/*`
- `@battery/*` → `src/modules/battery/*`
- `@hvac/*` → `src/modules/hvac/*`
- `@financials/*` → `src/modules/financials/*`
- `@utils/*` → `src/utils/*`

## Module roots covered
- `src/api`
- `src/backend`
- `src/components`
- `src/config`
- `src/contexts`
- `src/core`
- `src/data`
- `src/db`
- `src/hooks`
- `src/middleware`
- `src/modules`
- `src/modules/academy`
- `src/modules/admin`
- `src/modules/audit`
- `src/modules/battery`
- `src/modules/calculator`
- `src/modules/ee_training`
- `src/modules/financials`
- `src/modules/hvac`
- `src/modules/hvac_optimizer`
- `src/modules/integration`
- `src/modules/lighting`
- `src/modules/monitoring`
- `src/modules/nifs`
- `src/modules/phase1_tariff`
- `src/modules/projectLibrary`
- `src/modules/project_builder`
- `src/modules/reports`
- `src/modules/tariffEngine`
- `src/modules/utilities`
- `src/pages`
- `src/scripts`
- `src/services`
- `src/shared`
- `src/storage`
- `src/tools`
- `src/types`
- `src/ui`
- `src/utils`
- `src/validation`

## `src/api`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/api/ee-training/index.ts`
- **key dependencies**: `src/backend`, `src/services`, `src/types`
- **what depends on it**: `src/pages`
- **classification**: `core`
- **evidence checked**: `src/api/ee-training/index.ts`

## `src/backend`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/backend/ee-training/types.ts`, `src/backend/admin/types.ts`, `src/backend/admin/auth.ts`
- **key dependencies**: none found (static scan)
- **what depends on it**: `src`, `src/api`, `src/components`, `src/contexts`, `src/middleware`, `src/pages`, `src/services`, `src/utils`
- **classification**: `core`
- **evidence checked**: `src/backend/ee-training/types.ts`, `src/backend/admin/types.ts`, `src/backend/admin/auth.ts`

## `src/components`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/components/FileUpload.tsx`, `src/components/ai/AiChat.tsx`, `src/components/ErrorBoundary.tsx`
- **key dependencies**: `src/backend`, `src/contexts`, `src/data`, `src/hooks`, `src/modules/battery`, `src/modules/financials`, `src/services`, `src/shared`, `src/types`, `src/utils`
- **what depends on it**: `src`, `src/pages`, `src/types`
- **classification**: `ui`
- **evidence checked**: `src/components/FileUpload.tsx`, `src/components/ai/AiChat.tsx`, `src/components/ErrorBoundary.tsx`

## `src/config`

- **purpose**: Application Configuration
- **key entry files**: `src/config/index.ts`
- **key dependencies**: none found (static scan)
- **what depends on it**: `src`, `src/db`, `src/modules/hvac`, `src/pages`, `src/services`
- **classification**: `core`
- **evidence checked**: `src/config/index.ts`

## `src/contexts`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/contexts/ToastContext.tsx`, `src/contexts/AdminContext.tsx`
- **key dependencies**: `src/backend`
- **what depends on it**: `src`, `src/components`, `src/pages`
- **classification**: `core`
- **evidence checked**: `src/contexts/ToastContext.tsx`, `src/contexts/AdminContext.tsx`

## `src/core`

- **purpose**: Core module exports
- **key entry files**: `src/core/index.ts`
- **key dependencies**: none found (static scan)
- **what depends on it**: `src`, `src/modules/battery`, `src/modules/financials`, `src/utils`
- **classification**: `core`
- **evidence checked**: `src/core/index.ts`

## `src/data`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/data/pge/pge-obf-pathways.ts`, `src/data/obf/obf-eligibility.ts`, `src/data/equipment/comprehensive-equipment-database.ts`
- **key dependencies**: `src/modules/battery`
- **what depends on it**: `src`, `src/components`, `src/modules/battery`, `src/modules/hvac`, `src/pages`, `src/scripts`, `src/services`, `src/utils`
- **classification**: `core`
- **evidence checked**: `src/data/pge/pge-obf-pathways.ts`, `src/data/obf/obf-eligibility.ts`, `src/data/equipment/comprehensive-equipment-database.ts`

## `src/db`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/db/client.ts`
- **key dependencies**: `src/config`
- **what depends on it**: `src`, `src/modules/hvac`, `src/scripts`, `src/services`
- **classification**: `core`
- **evidence checked**: `src/db/client.ts`

## `src/hooks`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/hooks/useDataService.ts`
- **key dependencies**: `src/services`, `src/types`
- **what depends on it**: `src/components`
- **classification**: `core`
- **evidence checked**: `src/hooks/useDataService.ts`

## `src/middleware`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/middleware/auth.ts`, `src/middleware/error-handler.ts`, `src/middleware/security.ts`
- **key dependencies**: `src/backend`, `src/services`
- **what depends on it**: `src`
- **classification**: `core`
- **evidence checked**: `src/middleware/auth.ts`, `src/middleware/error-handler.ts`, `src/middleware/security.ts`

## `src/modules`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/modules/battery/types.ts`, `src/modules/battery/logic.ts`, `src/modules/financials/calculations.ts`
- **key dependencies**: none found (static scan)
- **what depends on it**: `src/pages`
- **classification**: `core`
- **evidence checked**: `src/modules/battery/types.ts`, `src/modules/battery/logic.ts`, `src/modules/financials/calculations.ts`

## `src/modules/academy`

- **purpose**: Public training and enablement (no login).
- **key entry files**: `src/modules/academy/pages/Academy.tsx`, `src/modules/academy/pages/AcademyStandards.tsx`, `src/modules/academy/pages/AcademyTroubleshooting.tsx`
- **key dependencies**: `src/pages`
- **what depends on it**: `src`
- **classification**: `feature`
- **evidence checked**: `src/modules/registry.ts`, `src/modules/academy/pages/Academy.tsx`, `src/modules/academy/pages/AcademyStandards.tsx`, `src/modules/academy/pages/AcademyTroubleshooting.tsx`

## `src/modules/admin`

- **purpose**: Admin dashboard.
- **key entry files**: `src/modules/admin/pages/AdminDashboard.tsx`
- **key dependencies**: `src/pages`
- **what depends on it**: `src`
- **classification**: `feature`
- **evidence checked**: `src/modules/registry.ts`, `src/modules/admin/pages/AdminDashboard.tsx`

## `src/modules/audit`

- **purpose**: Audit intake and forms.
- **key entry files**: `src/modules/audit/pages/Audit.tsx`
- **key dependencies**: `src/pages`
- **what depends on it**: `src`
- **classification**: `feature`
- **evidence checked**: `src/modules/registry.ts`, `src/modules/audit/pages/Audit.tsx`

## `src/modules/battery`

- **purpose**: Battery storage module
- **key entry files**: `src/modules/battery/index.ts`
- **key dependencies**: `src/core`, `src/data`, `src/modules/financials`, `src/utils`
- **what depends on it**: `src`, `src/components`, `src/data`, `src/pages`, `src/scripts`, `src/types`, `src/utils`
- **classification**: `feature`
- **evidence checked**: `src/modules/battery/index.ts`

## `src/modules/calculator`

- **purpose**: Run calculators and explore scenarios.
- **key entry files**: `src/modules/calculator/pages/Calculator.tsx`
- **key dependencies**: `src/pages`
- **what depends on it**: `src`
- **classification**: `feature`
- **evidence checked**: `src/modules/registry.ts`, `src/modules/calculator/pages/Calculator.tsx`

## `src/modules/ee_training`

- **purpose**: Internal training paths and certification.
- **key entry files**: `src/modules/ee_training/pages/EETraining.tsx`, `src/modules/ee_training/pages/CertificationPage.tsx`, `src/modules/ee_training/pages/TrainingDashboard.tsx`
- **key dependencies**: `src/pages`
- **what depends on it**: `src`
- **classification**: `feature`
- **evidence checked**: `src/modules/registry.ts`, `src/modules/ee_training/pages/EETraining.tsx`, `src/modules/ee_training/pages/CertificationPage.tsx`, `src/modules/ee_training/pages/TrainingDashboard.tsx`

## `src/modules/financials`

- **purpose**: Financial analysis module
- **key entry files**: `src/modules/financials/index.ts`
- **key dependencies**: `src/core`
- **what depends on it**: `src`, `src/components`, `src/modules/battery`, `src/utils`
- **classification**: `feature`
- **evidence checked**: `src/modules/financials/index.ts`

## `src/modules/hvac`

- **purpose**: HVAC module
- **key entry files**: `src/modules/hvac/index.ts`
- **key dependencies**: `src/config`, `src/data`, `src/db`, `src/services`, `src/types`
- **what depends on it**: `src`, `src/pages`
- **classification**: `feature`
- **evidence checked**: `src/modules/hvac/index.ts`

## `src/modules/hvac_optimizer`

- **purpose**: HVAC optimization tools.
- **key entry files**: `src/modules/hvac_optimizer/pages/HVACOptimizer.tsx`
- **key dependencies**: `src/pages`
- **what depends on it**: `src`
- **classification**: `feature`
- **evidence checked**: `src/modules/registry.ts`, `src/modules/hvac_optimizer/pages/HVACOptimizer.tsx`

## `src/modules/integration`

- **purpose**: BMS Integration Module
- **key entry files**: `src/modules/integration/index.ts`
- **key dependencies**: none found (static scan)
- **what depends on it**: none found (static scan)
- **classification**: `feature`
- **evidence checked**: `src/modules/integration/index.ts`

## `src/modules/lighting`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/modules/lighting/calculations.ts`
- **key dependencies**: none found (static scan)
- **what depends on it**: `src`
- **classification**: `feature`
- **evidence checked**: `src/modules/lighting/calculations.ts`

## `src/modules/monitoring`

- **purpose**: Monitoring dashboards and operational views.
- **key entry files**: `src/modules/monitoring/pages/Monitoring.tsx`
- **key dependencies**: `src/pages`
- **what depends on it**: `src`
- **classification**: `feature`
- **evidence checked**: `src/modules/registry.ts`, `src/modules/monitoring/pages/Monitoring.tsx`

## `src/modules/nifs`

- **purpose**: NIFS (Non-IOU Fuel Source) Analysis Module
- **key entry files**: `src/modules/nifs/index.ts`
- **key dependencies**: none found (static scan)
- **what depends on it**: `src/pages`, `src/utils`
- **classification**: `feature`
- **evidence checked**: `src/modules/nifs/index.ts`

## `src/modules/phase1_tariff`

- **purpose**: unknown (no module description found in index header)
- **key entry files**: `src/modules/phase1_tariff/index.ts`
- **key dependencies**: `src/utils`
- **what depends on it**: `src/pages`
- **classification**: `feature`
- **evidence checked**: `src/modules/phase1_tariff/index.ts`

## `src/modules/projectLibrary`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/modules/projectLibrary/search.ts`, `src/modules/projectLibrary/ingest.ts`
- **key dependencies**: none found (static scan)
- **what depends on it**: `src`, `src/tools`
- **classification**: `feature`
- **evidence checked**: `src/modules/projectLibrary/search.ts`, `src/modules/projectLibrary/ingest.ts`

## `src/modules/project_builder`

- **purpose**: System of record for evidence + scope. Upload evidence into a Project Vault, review suggestions in Inbox, confirm into the Project Graph, and preserve an auditable Decision Ledger.
- **key entry files**: `src/modules/project_builder/pages/ProjectBuilderHome.tsx`, `src/modules/project_builder/pages/ProjectBuilderProject.tsx`
- **key dependencies**: `src/pages`
- **what depends on it**: `src`
- **classification**: `feature`
- **evidence checked**: `src/modules/registry.ts`, `src/modules/project_builder/pages/ProjectBuilderHome.tsx`, `src/modules/project_builder/pages/ProjectBuilderProject.tsx`

## `src/modules/reports`

- **purpose**: Reporting generators and exports.
- **key entry files**: `src/modules/reports/pages/Reports.tsx`, `src/modules/reports/pages/reports/PGERegressionReport.tsx`, `src/modules/reports/pages/reports/RegressionReportGenerator.tsx`
- **key dependencies**: `src/pages`
- **what depends on it**: `src`
- **classification**: `feature`
- **evidence checked**: `src/modules/registry.ts`, `src/modules/reports/pages/Reports.tsx`, `src/modules/reports/pages/reports/PGERegressionReport.tsx`, `src/modules/reports/pages/reports/RegressionReportGenerator.tsx`

## `src/modules/tariffEngine`

- **purpose**: unknown (no module description found in index header)
- **key entry files**: `src/modules/tariffEngine/index.ts`
- **key dependencies**: none found (static scan)
- **what depends on it**: `src`
- **classification**: `feature`
- **evidence checked**: `src/modules/tariffEngine/index.ts`

## `src/modules/utilities`

- **purpose**: Rates, programs, and OBF workflows.
- **key entry files**: `src/modules/utilities/pages/UtilitiesAndProgramsLanding.tsx`, `src/modules/utilities/pages/UtilitiesAndPrograms.tsx`, `src/modules/utilities/pages/UtilityPrograms.tsx`
- **key dependencies**: `src/pages`
- **what depends on it**: `src`
- **classification**: `feature`
- **evidence checked**: `src/modules/registry.ts`, `src/modules/utilities/pages/UtilitiesAndProgramsLanding.tsx`, `src/modules/utilities/pages/UtilitiesAndPrograms.tsx`, `src/modules/utilities/pages/UtilityPrograms.tsx`

## `src/pages`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/pages/ModuleHub.tsx`, `src/pages/EnergyIntelligence.tsx`, `src/pages/Phase2ResultsPage.tsx`
- **key dependencies**: `src/api`, `src/backend`, `src/components`, `src/config`, `src/contexts`, `src/data`, `src/modules`, `src/modules/battery`, `src/modules/hvac`, `src/modules/nifs`, `src/modules/phase1_tariff`, `src/services`, `src/shared`, `src/types`, `src/utils`, `src/validation`
- **what depends on it**: `src`, `src/modules/academy`, `src/modules/admin`, `src/modules/audit`, `src/modules/calculator`, `src/modules/ee_training`, `src/modules/hvac_optimizer`, `src/modules/monitoring`, `src/modules/project_builder`, `src/modules/reports`, `src/modules/utilities`
- **classification**: `ui`
- **evidence checked**: `src/pages/ModuleHub.tsx`, `src/pages/EnergyIntelligence.tsx`, `src/pages/Phase2ResultsPage.tsx`

## `src/scripts`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `unknown`
- **key dependencies**: `src/data`, `src/db`, `src/modules/battery`, `src/services`, `src/utils`
- **what depends on it**: none found (static scan)
- **classification**: `core`
- **evidence checked**: `unknown`

## `src/services`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/services/db-service.ts`, `src/services/storage-service.ts`, `src/services/logger.ts`
- **key dependencies**: `src/backend`, `src/config`, `src/data`, `src/db`, `src/storage`, `src/types`
- **what depends on it**: `src`, `src/api`, `src/components`, `src/hooks`, `src/middleware`, `src/modules/hvac`, `src/pages`, `src/scripts`
- **classification**: `core`
- **evidence checked**: `src/services/db-service.ts`, `src/services/storage-service.ts`, `src/services/logger.ts`

## `src/shared`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/shared/api/client.ts`, `src/shared/api/projectBuilder.ts`, `src/shared/api/vault.ts`
- **key dependencies**: none found (static scan)
- **what depends on it**: `src/components`, `src/pages`
- **classification**: `core`
- **evidence checked**: `src/shared/api/client.ts`, `src/shared/api/projectBuilder.ts`, `src/shared/api/vault.ts`

## `src/storage`

- **purpose**: unknown (no module description found in index header)
- **key entry files**: `src/storage/index.ts`
- **key dependencies**: none found (static scan)
- **what depends on it**: `src/services`
- **classification**: `core`
- **evidence checked**: `src/storage/index.ts`

## `src/tools`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `unknown`
- **key dependencies**: `src/modules/projectLibrary`
- **what depends on it**: none found (static scan)
- **classification**: `core`
- **evidence checked**: `unknown`

## `src/types`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/types/change-order.ts`, `src/types/data-service.ts`, `src/types/project-graph.ts`
- **key dependencies**: `src/components`, `src/modules/battery`
- **what depends on it**: `src`, `src/api`, `src/components`, `src/hooks`, `src/modules/hvac`, `src/pages`, `src/services`, `src/ui`, `src/utils`
- **classification**: `core`
- **evidence checked**: `src/types/change-order.ts`, `src/types/data-service.ts`, `src/types/project-graph.ts`

## `src/ui`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `unknown`
- **key dependencies**: `src/types`
- **what depends on it**: none found (static scan)
- **classification**: `core`
- **evidence checked**: `unknown`

## `src/utils`

- **purpose**: Utility Library Index
- **key entry files**: `src/utils/index.ts`
- **key dependencies**: `src/backend`, `src/core`, `src/data`, `src/modules/battery`, `src/modules/financials`, `src/modules/nifs`, `src/types`
- **what depends on it**: `src`, `src/components`, `src/modules/battery`, `src/modules/phase1_tariff`, `src/pages`, `src/scripts`
- **classification**: `core`
- **evidence checked**: `src/utils/index.ts`

## `src/validation`

- **purpose**: unknown (no index.ts entrypoint found)
- **key entry files**: `src/validation/schemas/proposal-contract-schema.ts`, `src/validation/schemas/project-graph-phase1-schema.ts`, `src/validation/schemas/battery-library-schema.ts`
- **key dependencies**: none found (static scan)
- **what depends on it**: `src`, `src/pages`
- **classification**: `core`
- **evidence checked**: `src/validation/schemas/proposal-contract-schema.ts`, `src/validation/schemas/project-graph-phase1-schema.ts`, `src/validation/schemas/battery-library-schema.ts`
