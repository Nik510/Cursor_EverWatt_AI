export type ReportSessionKindV1 = 'WIZARD' | 'REGRESSION' | 'SOLAR' | 'COST_EFFECTIVENESS' | 'CUSTOM';

export type ReportRevisionFormatV1 = 'JSON' | 'HTML' | 'PDF';

export type ReportTypeV1 = 'INTERNAL_ENGINEERING_V1' | 'ENGINEERING_PACK_V1' | 'EXECUTIVE_PACK_V1';

export type WarningsSummaryV1 = {
  engineWarningsCount: number;
  topEngineWarningCodes: string[];
  missingInfoCount: number;
  topMissingInfoCodes: string[];
};

export type ReportSessionStatusV1 = 'INTAKE_ONLY' | 'HAS_RUNS' | 'HAS_REVISION' | 'HAS_WIZARD_OUTPUT';

export type ReportSessionProviderTypeV1 = 'CCA' | 'DA' | 'NONE';

export type ReportSessionUploadRefV1 = {
  uploadsRef: string;
  originalFilename: string;
  sha256Hex: string;
  bytes: number;
  uploadedAtIso: string;
};

export type ReportSessionProjectMetadataInputsV1 = {
  projectName?: string;
  address?: string;
  utilityHint?: string;
  meterId?: string;
  accountNumber?: string;
  serviceAccountId?: string;
};

export type ReportSessionInputsV1 = {
  billPdf?: ReportSessionUploadRefV1 | null;
  billPdfTextRef?: string | null;
  intervalFile?: ReportSessionUploadRefV1 | null;
  rateCode?: string | null;
  providerType?: ReportSessionProviderTypeV1 | null;
  pciaVintageKey?: string | null;
  projectMetadata?: ReportSessionProjectMetadataInputsV1 | null;
};

export type ReportSessionEventV1 =
  | { type: 'CREATED'; atIso: string }
  | { type: 'PROJECT_SHELL_CREATED'; atIso: string; projectId: string }
  | { type: 'INPUT_BILL_UPLOADED'; atIso: string; sha256Hex: string }
  | { type: 'INPUT_INTERVAL_UPLOADED'; atIso: string; sha256Hex: string }
  | { type: 'INPUT_RATE_CODE_SET'; atIso: string; rateCode: string }
  | { type: 'INPUT_PROVIDER_SET'; atIso: string; providerType: ReportSessionProviderTypeV1 }
  | { type: 'INPUT_PCIA_VINTAGE_SET'; atIso: string; pciaVintageKey: string }
  | { type: 'INPUT_PROJECT_METADATA_SET'; atIso: string; keys: string[] }
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
  reportType?: ReportTypeV1;
  format: ReportRevisionFormatV1;
  downloadUrl?: string;
  engineVersions?: Record<string, string>;
  warningsSummary?: WarningsSummaryV1;
  wizardOutputHash?: string;
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
  inputsV1?: ReportSessionInputsV1 | null;
  inputsSummary: ReportSessionInputsSummaryV1;
  runIds: string[];
  revisions: ReportSessionRevisionMetaV1[];
  status: ReportSessionStatusV1;
  events: ReportSessionEventV1[];
  wizardOutputV1?: ReportSessionWizardOutputRefV1 | null;
  warnings: string[];
};

