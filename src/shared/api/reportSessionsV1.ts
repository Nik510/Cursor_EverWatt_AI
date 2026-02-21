import { apiRequest } from './client';

import type { ReportSessionInputsSummaryV1, ReportSessionKindV1, ReportSessionRevisionMetaV1, ReportSessionV1 } from '../types/reportSessionsV1';
import type { WizardOutputV1 } from '../types/wizardOutputV1';

export type CreateReportSessionV1Request = {
  title?: string;
  kind: ReportSessionKindV1;
  projectId?: string;
  inputsSummary?: ReportSessionInputsSummaryV1;
};

export type CreateReportSessionV1Response = { success: true; reportId: string; session: ReportSessionV1 };

export async function createReportSessionV1(payload: CreateReportSessionV1Request): Promise<CreateReportSessionV1Response> {
  return apiRequest<CreateReportSessionV1Response>({
    url: '/api/report-sessions-v1/create',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export type ListReportSessionsV1Response = { success: true; sessions: ReportSessionV1[]; warnings: string[] };

export async function listReportSessionsV1(opts?: { limit?: number; q?: string }): Promise<ListReportSessionsV1Response> {
  const limit = Number(opts?.limit);
  const q = String(opts?.q || '').trim();
  const qs = [
    Number.isFinite(limit) ? `limit=${encodeURIComponent(String(Math.trunc(limit)))}` : '',
    q ? `q=${encodeURIComponent(q)}` : '',
  ]
    .filter(Boolean)
    .join('&');
  return apiRequest<ListReportSessionsV1Response>({ url: `/api/report-sessions-v1${qs ? `?${qs}` : ''}` });
}

export type GetReportSessionV1Response = { success: true; session: ReportSessionV1 };

export async function getReportSessionV1(reportId: string): Promise<GetReportSessionV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  return apiRequest<GetReportSessionV1Response>({ url: `/api/report-sessions-v1/${encodeURIComponent(rid)}` });
}

export type RunUtilityInReportSessionV1Request = {
  projectId?: string;
  /** When true, allow running despite required missing inputs (marks outputs as partial). */
  runAnyway?: boolean;
  workflowInputs?: {
    demo?: boolean;
    meterId?: string;
    projectName?: string;
    address?: string;
    utilityCompany?: string;
    utilityHint?: string;
    billPdfText?: string;
    intervalElectricV1?: Array<{
      timestampIso: string;
      intervalMinutes: number;
      kWh?: number;
      kW?: number;
      temperatureF?: number;
    }>;
    intervalElectricMetaV1?: Record<string, unknown>;
  };
};

export type RunUtilityInReportSessionV1Response = { success: true; reportId: string; projectId: string; runId: string };

export async function runUtilityInReportSessionV1(reportId: string, payload: RunUtilityInReportSessionV1Request): Promise<RunUtilityInReportSessionV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  return apiRequest<RunUtilityInReportSessionV1Response>({
    url: `/api/report-sessions-v1/${encodeURIComponent(rid)}/run-utility`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export type UploadBillInputToReportSessionV1Response = { success: true; session: ReportSessionV1 };

export async function uploadBillInputToReportSessionV1(reportId: string, file: File): Promise<UploadBillInputToReportSessionV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  if (!file) throw new Error('file is required');
  const form = new FormData();
  form.append('file', file);
  return apiRequest<UploadBillInputToReportSessionV1Response>({
    url: `/api/report-sessions-v1/${encodeURIComponent(rid)}/inputs/upload-bill`,
    method: 'POST',
    body: form,
  });
}

export type UploadIntervalInputToReportSessionV1Response = { success: true; session: ReportSessionV1 };

export async function uploadIntervalInputToReportSessionV1(reportId: string, file: File): Promise<UploadIntervalInputToReportSessionV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  if (!file) throw new Error('file is required');
  const form = new FormData();
  form.append('file', file);
  return apiRequest<UploadIntervalInputToReportSessionV1Response>({
    url: `/api/report-sessions-v1/${encodeURIComponent(rid)}/inputs/upload-interval`,
    method: 'POST',
    body: form,
  });
}

export type SetRateCodeInReportSessionV1Response = { success: true; session: ReportSessionV1 };

export async function setRateCodeInReportSessionV1(reportId: string, payload: { rateCode: string }): Promise<SetRateCodeInReportSessionV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  const rateCode = String(payload?.rateCode || '').trim();
  if (!rateCode) throw new Error('rateCode is required');
  return apiRequest<SetRateCodeInReportSessionV1Response>({
    url: `/api/report-sessions-v1/${encodeURIComponent(rid)}/inputs/set-rate-code`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rateCode }),
  });
}

export type SetProviderInReportSessionV1Response = { success: true; session: ReportSessionV1 };

export async function setProviderInReportSessionV1(
  reportId: string,
  payload: { providerType: 'CCA' | 'DA' | 'NONE' },
): Promise<SetProviderInReportSessionV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  const providerType = String(payload?.providerType || '').trim().toUpperCase();
  if (providerType !== 'CCA' && providerType !== 'DA' && providerType !== 'NONE') throw new Error('providerType must be CCA, DA, or NONE');
  return apiRequest<SetProviderInReportSessionV1Response>({
    url: `/api/report-sessions-v1/${encodeURIComponent(rid)}/inputs/set-provider`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerType }),
  });
}

export type SetPciaVintageKeyInReportSessionV1Response = { success: true; session: ReportSessionV1 };

export async function setPciaVintageKeyInReportSessionV1(
  reportId: string,
  payload: { pciaVintageKey: string },
): Promise<SetPciaVintageKeyInReportSessionV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  const pciaVintageKey = String(payload?.pciaVintageKey || '').trim();
  if (!pciaVintageKey) throw new Error('pciaVintageKey is required');
  return apiRequest<SetPciaVintageKeyInReportSessionV1Response>({
    url: `/api/report-sessions-v1/${encodeURIComponent(rid)}/inputs/set-pcia-vintage-key`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pciaVintageKey }),
  });
}

export type SetProjectMetadataInReportSessionV1Response = { success: true; session: ReportSessionV1 };

export async function setProjectMetadataInReportSessionV1(
  reportId: string,
  payload: { projectName?: string; address?: string; utilityHint?: string; meterId?: string; accountNumber?: string; serviceAccountId?: string },
): Promise<SetProjectMetadataInReportSessionV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  return apiRequest<SetProjectMetadataInReportSessionV1Response>({
    url: `/api/report-sessions-v1/${encodeURIComponent(rid)}/inputs/set-project-metadata`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}

export type AttachRunToReportSessionV1Request = { runId: string };
export type AttachRunToReportSessionV1Response = { success: true; session: ReportSessionV1 };

export async function attachRunToReportSessionV1(reportId: string, payload: AttachRunToReportSessionV1Request): Promise<AttachRunToReportSessionV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  const runId = String(payload?.runId || '').trim();
  if (!runId) throw new Error('runId is required');
  return apiRequest<AttachRunToReportSessionV1Response>({
    url: `/api/report-sessions-v1/${encodeURIComponent(rid)}/attach-run`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId }),
  });
}

export type AttachRevisionToReportSessionV1Request = {
  revisionId: string;
  runId: string;
  createdAtIso?: string;
  format?: ReportSessionRevisionMetaV1['format'];
  downloadUrl?: string;
};
export type AttachRevisionToReportSessionV1Response = { success: true; session: ReportSessionV1 };

export async function attachRevisionToReportSessionV1(
  reportId: string,
  payload: AttachRevisionToReportSessionV1Request,
): Promise<AttachRevisionToReportSessionV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  const revisionId = String(payload?.revisionId || '').trim();
  const runId = String(payload?.runId || '').trim();
  if (!revisionId) throw new Error('revisionId is required');
  if (!runId) throw new Error('runId is required');
  return apiRequest<AttachRevisionToReportSessionV1Response>({
    url: `/api/report-sessions-v1/${encodeURIComponent(rid)}/attach-revision`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      revisionId,
      runId,
      ...(payload?.createdAtIso ? { createdAtIso: payload.createdAtIso } : {}),
      ...(payload?.format ? { format: payload.format } : {}),
      ...(payload?.downloadUrl ? { downloadUrl: payload.downloadUrl } : {}),
    }),
  });
}

export type GenerateInternalEngineeringReportFromSessionV1Request = { runId?: string; title?: string };

export type GenerateInternalEngineeringReportFromSessionV1Response = {
  success: true;
  revisionMeta: ReportSessionRevisionMetaV1 & { projectId: string; download?: { htmlUrl: string; jsonUrl: string } };
};

export async function generateInternalEngineeringReportFromSessionV1(
  reportId: string,
  payload: GenerateInternalEngineeringReportFromSessionV1Request,
): Promise<GenerateInternalEngineeringReportFromSessionV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  return apiRequest<GenerateInternalEngineeringReportFromSessionV1Response>({
    url: `/api/report-sessions-v1/${encodeURIComponent(rid)}/generate-internal-engineering-report`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}

export type GenerateEngineeringPackFromSessionV1Request = { runId?: string; title?: string };
export type GenerateEngineeringPackFromSessionV1Response = {
  success: true;
  revisionMeta: ReportSessionRevisionMetaV1 & { projectId: string; download?: { htmlUrl: string; jsonUrl: string; pdfUrl: string } };
};

export async function generateEngineeringPackFromSessionV1(
  reportId: string,
  payload: GenerateEngineeringPackFromSessionV1Request,
): Promise<GenerateEngineeringPackFromSessionV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  return apiRequest<GenerateEngineeringPackFromSessionV1Response>({
    url: `/api/report-sessions-v1/${encodeURIComponent(rid)}/generate-engineering-pack`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}

export type GenerateExecutivePackFromSessionV1Request = { runId?: string; title?: string };
export type GenerateExecutivePackFromSessionV1Response = {
  success: true;
  revisionMeta: ReportSessionRevisionMetaV1 & { projectId: string; download?: { htmlUrl: string; jsonUrl: string; pdfUrl: string } };
};

export async function generateExecutivePackFromSessionV1(
  reportId: string,
  payload: GenerateExecutivePackFromSessionV1Request,
): Promise<GenerateExecutivePackFromSessionV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  return apiRequest<GenerateExecutivePackFromSessionV1Response>({
    url: `/api/report-sessions-v1/${encodeURIComponent(rid)}/generate-executive-pack`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}

export type BuildWizardOutputV1Response = { success: true; wizardOutput: WizardOutputV1 };

export async function buildWizardOutputForReportSessionV1(
  reportId: string,
  payload?: { runId?: string; partialRunAllowed?: boolean },
): Promise<BuildWizardOutputV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  return apiRequest<BuildWizardOutputV1Response>({
    url: `/api/report-sessions-v1/${encodeURIComponent(rid)}/build-wizard-output`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}

