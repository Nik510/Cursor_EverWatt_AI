## Golden Snapshot Harness v1 (analysis-results-v1)

### What it is
- Runs a deterministic suite of “golden” workflow cases (currently `tests/fixtures/goldenBills/v1/*`).
- Captures the **full analysis-results-v1-like payload** plus the deterministic `internalEngineeringReportJsonV1` output.
- Compares against committed JSON snapshots and fails tests on any unexpected diff.

### Running
- **Normal mode (strict gate)**:

```bash
npm run test:unit
```

- **Intentional snapshot update**:

```bash
UPDATE_SNAPSHOTS=1 npm run test:unit
```

### Interpreting diffs
On mismatch, the test prints a short “changed paths” summary (example: `workflow.utility.insights.intervalIntelligenceV1`, `workflow.analysisTraceV1.steps`, `workflow.utility.recommendations`) to make regressions actionable before reviewing the full diff.

