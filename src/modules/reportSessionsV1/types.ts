import path from 'node:path';

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
  /** Upload ref stored under allowlisted uploads dir (server-resolved). */
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
  /** Extracted text stored as an uploadsRef (keeps session JSON small). */
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
  /**
   * Additive: identifies the snapshot artifact type stored under the revisionId.
   * Optional for back-compat with older stored sessions.
   */
  reportType?: ReportTypeV1;
  format: ReportRevisionFormatV1;
  downloadUrl?: string;
  /** Additive provenance metadata for stakeholder packs + internal reports. */
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
  /**
   * Session-scoped intake inputs (snapshot-only).
   * These are used by POST actions (e.g. run-utility) but must not trigger any compute on GET.
   */
  inputsV1?: ReportSessionInputsV1 | null;
  inputsSummary: ReportSessionInputsSummaryV1;
  /** Most recent first. Bounded to 50. */
  runIds: string[];
  /** Most recent first. Bounded to 50. */
  revisions: ReportSessionRevisionMetaV1[];
  status: ReportSessionStatusV1;
  /** Append-only. Bounded to 50 (keeps most recent 50). */
  events: ReportSessionEventV1[];
  wizardOutputV1?: ReportSessionWizardOutputRefV1 | null;
  /** Sorted and unique. Bounded to 50. */
  warnings: string[];
};

export type ReportSessionIndexRowV1 = {
  reportId: string;
  createdAtIso: string;
  updatedAtIso: string;
  title: string;
  kind: ReportSessionKindV1;
  projectId?: string | null;
  status: ReportSessionStatusV1;
};

export function computeReportSessionStatusV1(session: Pick<ReportSessionV1, 'runIds' | 'revisions' | 'wizardOutputV1'>): ReportSessionStatusV1 {
  const hasWizard = Boolean((session as any)?.wizardOutputV1);
  if (hasWizard) return 'HAS_WIZARD_OUTPUT';
  const revisions = Array.isArray((session as any)?.revisions) ? ((session as any).revisions as any[]) : [];
  if (revisions.length) return 'HAS_REVISION';
  const runIds = Array.isArray((session as any)?.runIds) ? ((session as any).runIds as any[]) : [];
  if (runIds.length) return 'HAS_RUNS';
  return 'INTAKE_ONLY';
}

function assertIdLike(args: { label: string; value: string; max?: number }): void {
  const label = String(args.label || 'id');
  const value = String(args.value || '').trim();
  const max = Number.isFinite(Number(args.max)) ? Number(args.max) : 120;
  if (!value) throw new Error(`${label} is required`);
  if (value.length > max) throw new Error(`${label} too long`);
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error(`Invalid ${label} (allowed: [A-Za-z0-9_-])`);
}

function assertIsoLike(label: string, value: string): void {
  const v = String(value || '').trim();
  if (!v) throw new Error(`${label} is required`);
  // Cheap check (avoids parsing pitfalls while still catching obvious corruption)
  if (!/^\d{4}-\d{2}-\d{2}T/.test(v)) throw new Error(`Invalid ${label} (expected ISO string)`);
}

function assertUploadsRefLike(label: string, value: string): void {
  const v = String(value || '').trim();
  if (!v) throw new Error(`${label} is required`);
  if (v.length > 360) throw new Error(`${label} too long`);
  // Must be a relative-ish ref (no drive letters / absolute paths)
  if (path.isAbsolute(v)) throw new Error(`${label} must not be absolute`);
  if (v.includes('\\')) throw new Error(`${label} must use '/' separators`);
  if (v.split('/').some((seg) => seg === '..')) throw new Error(`${label} must not contain '..' segments`);
  if (v.includes('\0')) throw new Error(`${label} contains null byte`);
}

export function assertReportSessionInvariantV1(session: ReportSessionV1): void {
  if (!session || typeof session !== 'object') throw new Error('Invalid report session (not an object)');

  assertIdLike({ label: 'reportId', value: String((session as any).reportId || '') });
  assertIsoLike('createdAtIso', String((session as any).createdAtIso || ''));
  assertIsoLike('updatedAtIso', String((session as any).updatedAtIso || ''));
  if (!String((session as any).title || '').trim()) throw new Error('title is required');
  if (!String((session as any).kind || '').trim()) throw new Error('kind is required');

  const runIds = Array.isArray((session as any).runIds) ? ((session as any).runIds as any[]) : [];
  const runSeen = new Set<string>();
  for (const r of runIds) {
    const runId = String(r || '').trim();
    assertIdLike({ label: 'runId', value: runId });
    if (runSeen.has(runId)) throw new Error(`Duplicate runId: ${runId}`);
    runSeen.add(runId);
  }

  const revisions = Array.isArray((session as any).revisions) ? ((session as any).revisions as any[]) : [];
  const revSeen = new Set<string>();
  for (const rr of revisions) {
    const revisionId = String(rr?.revisionId || '').trim();
    const runId = String(rr?.runId || '').trim();
    assertIdLike({ label: 'revisionId', value: revisionId });
    assertIdLike({ label: 'runId', value: runId });
    assertIsoLike('revision.createdAtIso', String(rr?.createdAtIso || ''));

    const reportType = String(rr?.reportType || '').trim();
    if (
      reportType &&
      reportType !== 'INTERNAL_ENGINEERING_V1' &&
      reportType !== 'ENGINEERING_PACK_V1' &&
      reportType !== 'EXECUTIVE_PACK_V1'
    ) {
      throw new Error(`revision.reportType invalid (${revisionId})`);
    }
    if (!String(rr?.format || '').trim()) throw new Error(`revision.format is required (${revisionId})`);
    if (revSeen.has(revisionId)) throw new Error(`Duplicate revisionId: ${revisionId}`);
    revSeen.add(revisionId);
    if (!runSeen.has(runId)) throw new Error(`Revision references unattached runId: ${revisionId} -> ${runId}`);

    const engineVersions = rr?.engineVersions;
    if (engineVersions !== undefined && engineVersions !== null) {
      if (!engineVersions || typeof engineVersions !== 'object' || Array.isArray(engineVersions)) throw new Error(`revision.engineVersions must be an object (${revisionId})`);
      for (const k of Object.keys(engineVersions)) {
        const val = String((engineVersions as any)[k] ?? '').trim();
        if (val && val.length > 120) throw new Error(`revision.engineVersions.${k} too long (${revisionId})`);
      }
    }

    const warningsSummary = rr?.warningsSummary;
    if (warningsSummary !== undefined && warningsSummary !== null) {
      if (!warningsSummary || typeof warningsSummary !== 'object' || Array.isArray(warningsSummary)) throw new Error(`revision.warningsSummary must be an object (${revisionId})`);
      const topEngine = Array.isArray((warningsSummary as any).topEngineWarningCodes) ? ((warningsSummary as any).topEngineWarningCodes as any[]) : [];
      const topMissing = Array.isArray((warningsSummary as any).topMissingInfoCodes) ? ((warningsSummary as any).topMissingInfoCodes as any[]) : [];
      if (topEngine.length > 50) throw new Error(`revision.warningsSummary.topEngineWarningCodes too long (${revisionId})`);
      if (topMissing.length > 50) throw new Error(`revision.warningsSummary.topMissingInfoCodes too long (${revisionId})`);
    }

    const wizardOutputHash = String(rr?.wizardOutputHash || '').trim();
    if (wizardOutputHash && wizardOutputHash.length > 128) throw new Error(`revision.wizardOutputHash too long (${revisionId})`);
  }

  const warnings = Array.isArray((session as any).warnings) ? ((session as any).warnings as any[]) : [];
  for (let i = 0; i < warnings.length; i++) {
    const w = String(warnings[i] || '').trim();
    if (!w) throw new Error('warnings must not contain empty strings');
    if (i > 0) {
      const prev = String(warnings[i - 1] || '').trim();
      if (prev.localeCompare(w) > 0) throw new Error('warnings must be sorted (deterministic)');
      if (prev === w) throw new Error('warnings must be unique');
    }
  }

  const inputsV1 = (session as any).inputsV1 as any;
  if (inputsV1 !== undefined && inputsV1 !== null) {
    if (typeof inputsV1 !== 'object') throw new Error('inputsV1 must be an object when present');
    const rateCode = Object.prototype.hasOwnProperty.call(inputsV1, 'rateCode') ? String(inputsV1.rateCode ?? '').trim() : '';
    if (rateCode && rateCode.length > 40) throw new Error('inputsV1.rateCode too long');
    const providerType = Object.prototype.hasOwnProperty.call(inputsV1, 'providerType') ? String(inputsV1.providerType ?? '').trim() : '';
    if (providerType && providerType !== 'CCA' && providerType !== 'DA' && providerType !== 'NONE') throw new Error('inputsV1.providerType invalid');
    const pcia = Object.prototype.hasOwnProperty.call(inputsV1, 'pciaVintageKey') ? String(inputsV1.pciaVintageKey ?? '').trim() : '';
    if (pcia && pcia.length > 40) throw new Error('inputsV1.pciaVintageKey too long');

    const billPdfTextRef = Object.prototype.hasOwnProperty.call(inputsV1, 'billPdfTextRef') ? String(inputsV1.billPdfTextRef ?? '').trim() : '';
    if (billPdfTextRef) assertUploadsRefLike('inputsV1.billPdfTextRef', billPdfTextRef);

    const checkUpload = (label: string, v: any) => {
      if (v === undefined || v === null) return;
      if (!v || typeof v !== 'object') throw new Error(`${label} must be an object`);
      assertUploadsRefLike(`${label}.uploadsRef`, String(v.uploadsRef ?? ''));
      const originalFilename = String(v.originalFilename ?? '').trim();
      if (!originalFilename) throw new Error(`${label}.originalFilename is required`);
      if (originalFilename.length > 180) throw new Error(`${label}.originalFilename too long`);
      const sha256Hex = String(v.sha256Hex ?? '').trim().toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(sha256Hex)) throw new Error(`${label}.sha256Hex invalid`);
      const bytes = Number(v.bytes);
      if (!Number.isFinite(bytes) || bytes < 0) throw new Error(`${label}.bytes invalid`);
      assertIsoLike(`${label}.uploadedAtIso`, String(v.uploadedAtIso ?? ''));
    };
    checkUpload('inputsV1.billPdf', inputsV1.billPdf);
    checkUpload('inputsV1.intervalFile', inputsV1.intervalFile);
  }

  const expectedStatus = computeReportSessionStatusV1(session);
  const status = String((session as any).status || '').trim() as any;
  if (status !== expectedStatus) throw new Error(`Invalid status: ${status} (expected ${expectedStatus})`);

  const events = Array.isArray((session as any).events) ? ((session as any).events as any[]) : [];
  if (events.length > 50) throw new Error('events must be bounded to 50');
  for (const e of events) {
    if (!e || typeof e !== 'object') throw new Error('events entries must be objects');
    if (!String((e as any).type || '').trim()) throw new Error('events entries must have type');
    assertIsoLike('event.atIso', String((e as any).atIso || ''));
  }

  const wiz = (session as any).wizardOutputV1 as any;
  if (wiz) {
    const kind = String(wiz?.kind || '').trim();
    if (kind !== 'INLINE' && kind !== 'BLOB_REF') throw new Error('wizardOutputV1.kind must be INLINE or BLOB_REF');
    if (!String(wiz?.hash || '').trim()) throw new Error('wizardOutputV1.hash is required');
    assertIsoLike('wizardOutputV1.generatedAtIso', String(wiz?.generatedAtIso || ''));

    const runIdsUsed = Array.isArray(wiz?.runIdsUsed) ? (wiz.runIdsUsed as any[]) : [];
    for (const r of runIdsUsed) {
      const runId = String(r || '').trim();
      assertIdLike({ label: 'runId', value: runId });
      if (!runSeen.has(runId)) throw new Error(`wizardOutputV1 references unattached runId: ${runId}`);
    }

    const revisionIdsUsed = Array.isArray(wiz?.revisionIdsUsed) ? (wiz.revisionIdsUsed as any[]) : [];
    for (const x of revisionIdsUsed) {
      const revisionId = String(x || '').trim();
      assertIdLike({ label: 'revisionId', value: revisionId });
      if (!revSeen.has(revisionId)) throw new Error(`wizardOutputV1 references unattached revisionId: ${revisionId}`);
    }
  }
}

