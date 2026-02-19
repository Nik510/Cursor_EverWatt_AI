export type ReportSessionKindV1 = 'WIZARD' | 'REGRESSION' | 'SOLAR' | 'COST_EFFECTIVENESS' | 'CUSTOM';

export type ReportRevisionFormatV1 = 'JSON' | 'HTML' | 'PDF';

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
  runId?: string | null;
  format: ReportRevisionFormatV1;
  downloadUrl?: string;
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
  warnings: string[];
};

