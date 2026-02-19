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

export type BuildWizardOutputV1Response = { success: true; wizardOutput: WizardOutputV1 };

export async function buildWizardOutputForReportSessionV1(reportId: string, payload?: { runId?: string }): Promise<BuildWizardOutputV1Response> {
  const rid = String(reportId || '').trim();
  if (!rid) throw new Error('reportId is required');
  return apiRequest<BuildWizardOutputV1Response>({
    url: `/api/report-sessions-v1/${encodeURIComponent(rid)}/build-wizard-output`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}

