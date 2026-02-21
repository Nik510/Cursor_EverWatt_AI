export type GoldenReportSessionRunFixtureV1 = {
  runId: string;
  analysisResultsSnapshotId: string;
};

export type GoldenReportSessionCaseV1 = {
  caseId: string;
  nowIso: string;
  reportId: string;
  projectId: string;
  kind: 'WIZARD' | 'REGRESSION' | 'SOLAR' | 'COST_EFFECTIVENESS' | 'CUSTOM';
  title: string;
  runs: GoldenReportSessionRunFixtureV1[];
  revisionForRunId: string;
  wizardOutputForRunId: string;
};

export type GoldenReportSessionOutputV1 = {
  caseId: string;
  session: unknown;
  wizardOutput: unknown;
};

