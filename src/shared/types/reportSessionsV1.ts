export type ReportSessionKindV1 = 'WIZARD' | 'REGRESSION' | 'SOLAR' | 'COST_EFFECTIVENESS' | 'CUSTOM';

export type ReportRevisionFormatV1 = 'JSON' | 'HTML' | 'PDF';

export type ReportSessionStatusV1 = 'INTAKE_ONLY' | 'HAS_RUNS' | 'HAS_REVISION' | 'HAS_WIZARD_OUTPUT';

export type ReportSessionEventV1 =
  | { type: 'CREATED'; atIso: string }
  | { type: 'PROJECT_SHELL_CREATED'; atIso: string; projectId: string }
  | { type: 'RUN_ATTACHED'; atIso: string; runId: string }
  | { type: 'REVISION_ATTACHED'; atIso: string; revisionId: string; runId: string }
  | { type: 'WIZARD_OUTPUT_BUILT'; atIso: string; hash: string; runIdsUsed: string[] }
  | { type: 'ERROR_RECORDED'; atIso: string; code: string; context?: Record<string, unknown> };

export type ReportSessionInputsSummaryV1 = {
  hasBillText?: boolean;
  hasIntervals?: boolean;
  hasAddress?: boolean;
  hasQuestionnaire?: boolean;
  hasNotes?: boolean;
  utilityHint?: string;
};

export type ReportSessionRevisionMetaV1 = {
  revisionId: string;
  createdAtIso: string;
  runId: string;
  format: ReportRevisionFormatV1;
  downloadUrl?: string;
};

export type ReportSessionWizardOutputRefV1 =
  | {
      kind: 'INLINE';
      hash: string;
      generatedAtIso: string;
      runIdsUsed: string[];
      revisionIdsUsed: string[];
      wizardOutput: unknown;
      approxBytes: number;
    }
  | {
      kind: 'BLOB_REF';
      hash: string;
      generatedAtIso: string;
      runIdsUsed: string[];
      revisionIdsUsed: string[];
      blobRef: string;
      approxBytes: number;
    };

export type ReportSessionV1 = {
  reportId: string;
  createdAtIso: string;
  updatedAtIso: string;
  title: string;
  kind: ReportSessionKindV1;
  projectId?: string | null;
  inputsSummary: ReportSessionInputsSummaryV1;
  runIds: string[];
  revisions: ReportSessionRevisionMetaV1[];
  status: ReportSessionStatusV1;
  events: ReportSessionEventV1[];
  wizardOutputV1?: ReportSessionWizardOutputRefV1 | null;
  warnings: string[];
};

