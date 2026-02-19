import { apiRequest } from './client';

import type { AnalysisRunV1 } from '../types/analysisRunsV1';
import type { DiffSummaryV1 } from '../types/analysisRunsDiffV1';

export type AnalysisRunsV1IndexRow = {
  runId: string;
  createdAtIso: string;
  inputFingerprint: string;
  summary: {
    utility: string;
    utilityConfidence?: number;
    rateCode?: string;
    supplyProviderType?: 'CCA' | 'DA' | 'NONE';
    lseName?: string;
    hasIntervals?: boolean;
    hasBillText?: boolean;
    hasWeather?: boolean;
    rateSourceKind?: string;
  };
  engineVersionsSummary?: Record<string, string>;
};

export type RunAndStoreAnalysisRequestV1 =
  | { demo: true; projectId?: string; meterId?: string }
  | { demo?: false; projectId: string; meterId?: string };

export type RunAndStoreAnalysisResponseV1 = {
  success: true;
  runId: string;
  snapshot: { response: unknown; reportJson: unknown };
  /**
   * Back-compat: server historically returned this field name.
   */
  analysisRun?: {
    runId: string;
    createdAtIso: string;
    projectId?: string | null;
    inputFingerprint: string;
    engineVersions?: Record<string, string>;
    provenance?: unknown;
    warningsSummary?: unknown;
  };
  /**
   * Preferred: meta-only view (no embedded snapshot).
   */
  analysisRunMeta?: {
    runId: string;
    createdAtIso: string;
    projectId?: string | null;
    inputFingerprint: string;
    engineVersions?: Record<string, string>;
    provenance?: unknown;
    warningsSummary?: unknown;
  };
};

export type ListRunsV1Response = { success: true; runs: AnalysisRunsV1IndexRow[]; warnings: string[] };
export type ReadRunV1Response = { success: true; analysisRun: AnalysisRunV1 };
export type DiffRunsV1Response = { success: true; diff: DiffSummaryV1 };

export async function listAnalysisRunsV1(): Promise<ListRunsV1Response> {
  return apiRequest<ListRunsV1Response>({ url: '/api/analysis-results-v1/runs' });
}

export async function runAndStoreAnalysisV1(payload: RunAndStoreAnalysisRequestV1): Promise<RunAndStoreAnalysisResponseV1> {
  return apiRequest<RunAndStoreAnalysisResponseV1>({
    url: '/api/analysis-results-v1/run-and-store',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getAnalysisRunV1(runId: string): Promise<ReadRunV1Response> {
  return apiRequest<ReadRunV1Response>({ url: `/api/analysis-results-v1/runs/${encodeURIComponent(runId)}` });
}

export async function diffAnalysisRunsV1(runIdA: string, runIdB: string): Promise<DiffRunsV1Response> {
  return apiRequest<DiffRunsV1Response>({
    url: '/api/analysis-results-v1/diff',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runIdA, runIdB }),
  });
}

export function getAnalysisRunPdfUrlV1(runId: string): string {
  return `/api/analysis-results-v1/runs/${encodeURIComponent(runId)}/pdf`;
}

function parseFilenameFromContentDisposition(cd: string | null): string | null {
  const raw = String(cd || '').trim();
  if (!raw) return null;
  // e.g. attachment; filename="EverWatt_AnalysisRunV1_X.pdf"
  const m = raw.match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i);
  if (!m) return null;
  const v = m[1].trim();
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export async function fetchAnalysisRunPdfV1(runId: string): Promise<{ blob: Blob; filename: string | null }> {
  const res = await fetch(getAnalysisRunPdfUrlV1(runId), { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to download PDF (${res.status})`);
  const blob = await res.blob();
  const filename = parseFilenameFromContentDisposition(res.headers.get('content-disposition'));
  return { blob, filename };
}

// Back-compat aliases (older callers used these names)
export const listRunsV1 = listAnalysisRunsV1;
export const readRunV1 = getAnalysisRunV1;
export const diffRunsV1 = diffAnalysisRunsV1;
export const downloadRunPdfV1 = fetchAnalysisRunPdfV1;

