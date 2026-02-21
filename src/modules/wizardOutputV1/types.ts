export type WizardFindingV1 = {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'critical';
  confidence0to1: number;
  evidenceRefs: string[];
  summaryBullets: string[];
};

export type WizardChartV1 = {
  id: string;
  title: string;
  kind: 'timeseries' | 'bar' | 'table' | 'other';
  datasetRef: string;
};

export type WizardOpportunityV1 = {
  id: string;
  title: string;
  tier?: string;
  confidence0to1: number;
  prerequisites: string[];
  expectedRange?: string;
  risks: string[];
};

export type WizardStepStatusV1 = 'DONE' | 'NEEDS_INPUT' | 'OPTIONAL' | 'BLOCKED';

export type WizardActionTypeV1 =
  | 'UPLOAD_BILL_PDF'
  | 'UPLOAD_INTERVAL_CSV'
  | 'ENTER_RATE_CODE'
  | 'SELECT_PROVIDER_TYPE'
  | 'SET_PCIA_VINTAGE_KEY'
  | 'ADD_PROJECT_METADATA';

export type WizardActionStatusV1 = 'DONE' | 'NEEDS_INPUT' | 'OPTIONAL' | 'BLOCKED';

export type WizardActionApiHintV1 = {
  method: 'POST';
  endpoint: string;
  payloadExample: Record<string, unknown>;
};

export type WizardActionV1 = {
  actionId: string;
  type: WizardActionTypeV1;
  label: string;
  required: boolean;
  apiHint: WizardActionApiHintV1;
  status: WizardActionStatusV1;
};

export type WizardStepEvidenceV1 = {
  runId?: string;
  revisionId?: string;
};

export type WizardStepV1 = {
  id: string;
  title: string;
  status: WizardStepStatusV1;
  requiredActions: WizardActionV1[];
  evidence?: WizardStepEvidenceV1;
  helpText?: string;
};

export type MissingInfoSeverityV1 = 'REQUIRED' | 'RECOMMENDED';

export type MissingInfoItemV1 = {
  id: string;
  severity: MissingInfoSeverityV1;
  category?: string;
  description: string;
  details?: Record<string, unknown>;
};

export type EngineWarningV1 = {
  code: string;
  module: string;
  operation: string;
  exceptionName: string;
  contextKey: string;
};

export type WizardMissingInfoSummaryV1 = {
  /** Sorted by severity (required first), then id. */
  required: MissingInfoItemV1[];
  /** Sorted by id (deterministic). */
  recommended: MissingInfoItemV1[];
  /** Sorted by code, then module/operation/contextKey (deterministic). */
  warnings: EngineWarningV1[];
};

export type WizardOutputV1 = {
  wizardOutputHash: string;
  provenance: {
    reportId: string;
    projectId?: string | null;
    generatedAtIso: string;
    runIdsUsed: string[];
    revisionIdsUsed: string[];
    engineVersions: Record<string, string>;
  };
  /**
   * When true, the run was explicitly allowed to proceed despite required missing inputs.
   * This must be set only by POST actions (never on GET).
   */
  partialRunAllowed?: boolean;
  /** Fixed-order wizard steps derived from stored run snapshots. */
  wizardSteps: WizardStepV1[];
  /** Structured missing-info + warning summary derived from stored run snapshots. */
  missingInfoSummary: WizardMissingInfoSummaryV1;
  dataQuality: {
    score0to100: number;
    missingInfoIds: string[];
    warnings: string[];
  };
  findings: WizardFindingV1[];
  charts: WizardChartV1[];
  opportunities: WizardOpportunityV1[];
};

