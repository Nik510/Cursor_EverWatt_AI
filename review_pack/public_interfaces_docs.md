# Public Interfaces — Documentation Generator (PDF/Word/Excel)

This document identifies “documentation generator” surfaces as code that **produces user-facing documents** (PDF/Word/Excel) or document blobs for download.

## What I checked (entry points)

- Generic report generator: `src/utils/report-generator.ts`, `src/utils/report-generator-word.ts`
- Change order doc generator: `src/utils/change-order-generator.ts`
- Battery report PDFs: `src/utils/battery/report-pdf.ts`, plus its view-model types in `src/utils/battery/report-vm.ts`
- Carbon footprint report + certificate: `src/utils/carbon/carbon-report-pdf.ts`, plus its input/output types in `src/utils/carbon/epa-equivalencies.ts`
- Regression exports: `src/utils/regression-report-exporter.ts`, plus regression result types in `src/utils/regression-analysis.ts`
- M&V report generator: `src/utils/mv-report-generator.ts`

If there are additional document generators outside these files, they are **unknown** from this pass.

---

## 1) Generic Report Generator (PDF / Excel / Word)

### File

- `src/utils/report-generator.ts`

### Exported types/interfaces (key fields)

- `ReportData`:
  - `title: string`
  - `type: 'energy-model' | 'regression' | 'savings' | 'proposal'`
  - `building?: { name; address; squareFootage; buildingType }`
  - `calculations?: { hvac?; lighting?; battery? }`
  - `financials?: { annualSavings; projectCost; paybackYears; npv10; co2Reduction }`
  - `recommendations?: string[]`
  - `metadata?: { generatedAt; generatedBy? }`
  - Source: `src/utils/report-generator.ts`

### Exported functions (signatures only)

- `export function generatePDFReport(data: ReportData): Blob`
  - Source: `src/utils/report-generator.ts`
- `export function generateExcelReport(data: ReportData): Blob`
  - Source: `src/utils/report-generator.ts`
- `export function downloadFile(blob: Blob, filename: string): void`
  - Source: `src/utils/report-generator.ts`
- `export async function generateReport(data: ReportData, format: 'pdf' | 'excel' | 'word'): Promise<void>`
  - Source: `src/utils/report-generator.ts`

### Word generator used by `generateReport()`

- `export async function generateWordReport(data: ReportData): Promise<Blob>`
  - Source: `src/utils/report-generator-word.ts`
  - Input type source: `src/utils/report-generator.ts` (`ReportData`)
  - Output: `Blob`

### Inputs consumed

- `ReportData` (see above) — `src/utils/report-generator.ts`

### Outputs produced

- `Blob` (PDF / XLSX / DOCX) and a browser download side-effect via `downloadFile()` — `src/utils/report-generator.ts`

---

## 2) Change Order Document Generator (PDF + Word)

### File

- `src/utils/change-order-generator.ts`

### Primary input objects consumed

- `ChangeOrderRecord`
- `ChangeOrderFileFormat`
- `ChangeOrderAiBody`
- Source types: `src/types/change-order.ts`

### Exported functions (signatures only)

- `export function generateChangeOrderPDF(co: ChangeOrderRecord): Blob`
  - Source: `src/utils/change-order-generator.ts`
- `export async function generateChangeOrderWord(co: ChangeOrderRecord): Promise<Blob>`
  - Source: `src/utils/change-order-generator.ts`
- `export async function generateChangeOrder(co: ChangeOrderRecord, format: ChangeOrderFileFormat): Promise<{ blob: Blob; filename: string }>`
  - Source: `src/utils/change-order-generator.ts`
- `export function downloadBlob(blob: Blob, filename: string): void`
  - Source: `src/utils/change-order-generator.ts`

### Output objects produced

- `Blob` for PDF/DOCX and `{ blob, filename }` — `src/utils/change-order-generator.ts`

---

## 3) Battery Analysis PDFs (Customer Summary + Full Report)

### Files

- PDF exporters: `src/utils/battery/report-pdf.ts`
- View-model/types used by exporters: `src/utils/battery/report-vm.ts`

### Exported functions (signatures only)

- `export function exportBatteryCustomerSummaryPdf(vm: BatteryReportViewModel)`
  - Source: `src/utils/battery/report-pdf.ts`
- `export function exportBatteryFullPdf(vm: BatteryReportViewModel)`
  - Source: `src/utils/battery/report-pdf.ts`

### Exported types/interfaces (key fields)

- `BatteryReportViewModel`:
  - Headline fields: `rateCode`, `demandRatePerKwMonth`, `batteryLabel`, `annualSavings`, `systemCost`, `paybackYears`, `npv10yr`, `baselineKw`, `spikeCount`
  - Raw payload passthrough: `raw: { manifest; envelope }`
  - Source: `src/utils/battery/report-vm.ts`
- `BatteryAnalysisManifest` / `BatteryAnalysisResultEnvelope` (inputs to the view model):
  - `BatteryAnalysisManifest.analysisId`, hashes (`intervalSha256`, `usageSha256`, `catalogSha256`), `rateCode`, `demandRatePerKwMonth`, `thresholdKw`
  - `BatteryAnalysisResultEnvelope.result: any` (raw response persisted)
  - Source: `src/utils/battery/report-vm.ts`

### Input objects it consumes

- `BatteryReportViewModel` — `src/utils/battery/report-vm.ts`
  - Typically produced by `buildReportViewModel()`:
    - `export function buildReportViewModel(args: { manifest: BatteryAnalysisManifest; envelope: BatteryAnalysisResultEnvelope }): BatteryReportViewModel`
    - Source: `src/utils/battery/report-vm.ts`

### Output objects it produces

- These exporters call `doc.save(...)` (side-effect) rather than returning a `Blob`.
  - Source: `src/utils/battery/report-pdf.ts`

### Coupling note (docs ↔ tariff/billing payload)

- The PDF code reads `vm.raw.envelope?.result?.tariffEngine` and expects a `cycles[]` array with `determinants` fields.
  - Source: `src/utils/battery/report-pdf.ts`
  - This is a coupling risk if the legacy tariff-engine output shape changes.

---

## 4) Carbon Footprint Report PDF + Certificate PDF

### File

- `src/utils/carbon/carbon-report-pdf.ts`

### Exported types/interfaces (key fields)

- `CarbonReportMeta`: `{ customerName; projectName; siteAddress; reportPeriodLabel; generatedAt }`
  - Source: `src/utils/carbon/carbon-report-pdf.ts`
- `CarbonReportInputs`: `{ avoidedKwh; avoidedTherms; electricityFactorMode; electricityFactorTonsPerKwh }`
  - Source: `src/utils/carbon/carbon-report-pdf.ts`
- Supporting types:
  - `ElectricityFactorMode`, `CarbonTotals`, `CarbonEquivalencies` — `src/utils/carbon/epa-equivalencies.ts`

### Exported functions (signatures only)

- `export function generateCarbonFootprintReportPdf(args: { meta: CarbonReportMeta; inputs: CarbonReportInputs; totals: CarbonTotals; equiv: CarbonEquivalencies; }): Blob`
  - Source: `src/utils/carbon/carbon-report-pdf.ts`
- `export function generateCarbonFootprintCertificatePdf(args: { customerName: string; projectName: string; siteAddress: string; completionDateLabel: string; leadName: string; leadTitle: string; leadOrg: string; recognitionLine?: string; }): Blob`
  - Source: `src/utils/carbon/carbon-report-pdf.ts`

### Output objects produced

- `Blob` (PDF) — `src/utils/carbon/carbon-report-pdf.ts`

---

## 5) Regression Export (PDF + Excel)

### File

- `src/utils/regression-report-exporter.ts`

### Exported types/interfaces (key fields)

- `ExportGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly'`
  - Source: `src/utils/regression-report-exporter.ts`
- `ExportModelChoice = 'auto' | 'linear' | 'hddcdd' | 'change-point' | 'towt'`
  - Source: `src/utils/regression-report-exporter.ts`

### Exported functions (signatures only)

- `export function exportRegressionToPDF(args: { title: string; modelChoice: ExportModelChoice; results: Record<ExportGranularity, RegressionAnalysisResult>; }): void`
  - Source: `src/utils/regression-report-exporter.ts`
- `export function exportRegressionToExcel(args: { title: string; modelChoice: ExportModelChoice; results: Record<ExportGranularity, RegressionAnalysisResult>; }): void`
  - Source: `src/utils/regression-report-exporter.ts`

### Input objects it consumes (types)

- `RegressionAnalysisResult` (and related types like `RegressionResult`, `AggregatedDataPoint`)
  - Source: `src/utils/regression-analysis.ts`

### Output objects produced

- Side-effect save/download via `doc.save(...)` for PDF and XLSX workbook generation (function returns `void`).
  - Source: `src/utils/regression-report-exporter.ts`

---

## 6) Measurement & Verification (M&V) Report Generator (PDF + Excel + Word)

### File

- `src/utils/mv-report-generator.ts`

### Exported types/interfaces (key fields)

- `MVTimePeriod = 'monthly' | 'quarterly' | 'bi-annual' | 'yearly'`
- `MVProjectData` (project metadata including optional `building`)
- `MVComparisonData` (baseline vs post-upgrade, plus savings)
- `MVReportData` (title, project, timePeriod, comparisons, summary, metadata)
  - Source: `src/utils/mv-report-generator.ts`

### Exported functions (signatures only)

- `export function calculateMVComparison(...): MVComparisonData`
- `export function generateComparisonPeriods(upgradeDate: Date, timePeriod: MVTimePeriod, numberOfPeriods: number = 12): Array<{ start: Date; end: Date }>`
- `export function calculateMVSummary(comparisons: MVComparisonData[]): MVReportData['summary']`
- `export function generateMVPDFReport(data: MVReportData): Blob`
- `export function generateMVExcelReport(data: MVReportData): Blob`
- `export async function generateMVWordReport(data: MVReportData): Promise<Blob>`
- `export function downloadFile(blob: Blob, filename: string): void`
- `export async function generateMVReport(...): Promise<void>`
  - Source: `src/utils/mv-report-generator.ts`

### Output objects produced

- `Blob` for PDF/XLSX/DOCX + browser download helper — `src/utils/mv-report-generator.ts`

