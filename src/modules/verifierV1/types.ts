export type VerifierStatusV1 = 'PASS' | 'WARN' | 'FAIL';

export type VerifierCheckStatusV1 = VerifierStatusV1;

export type VerifierCheckResultV1 = {
  code: string;
  status: VerifierCheckStatusV1;
  message: string;
  details?: unknown;
  /** When present, this check used a numeric tolerance (e.g. USD). */
  tolerance?: number;
  /** Optional JSON-pointer-ish paths used by the check. */
  paths?: string[];
};

export type VerifierResultV1 = {
  status: VerifierStatusV1;
  generatedAtIso: string;
  /** Deterministically sorted by `code` (then status/message). */
  checks: Array<VerifierCheckResultV1>;
  summary: { passCount: number; warnCount: number; failCount: number };
};

export type VerifierReportTypeV1 = 'INTERNAL_ENGINEERING_V1' | 'ENGINEERING_PACK_V1' | 'EXECUTIVE_PACK_V1' | 'UNKNOWN';

export type VerifierSnapshotContextV1 = {
  generatedAtIso: string;
  reportType: VerifierReportTypeV1;
  analysisRun?: unknown | null;
  reportJson?: unknown | null;
  packJson?: unknown | null;
  wizardOutput?: unknown | null;
};

