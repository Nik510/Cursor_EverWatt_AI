import { apiRequest } from '../shared/api/client';
import type { AnalysisRunV1 } from '../modules/analysisRunsV1/types';
import type { DiffSummaryV1 } from '../modules/analysisRunsV1/diffV1';

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

export type ListRunsV1Response = { success: true; runs: AnalysisRunsV1IndexRow[]; warnings: string[] };
export type ReadRunV1Response = { success: true; analysisRun: AnalysisRunV1 };
export type DiffRunsV1Response = { success: true; diff: DiffSummaryV1 };

export async function listRunsV1(): Promise<ListRunsV1Response> {
  return apiRequest<ListRunsV1Response>({ url: '/api/analysis-results-v1/runs' });
}

export async function readRunV1(runId: string): Promise<ReadRunV1Response> {
  return apiRequest<ReadRunV1Response>({ url: `/api/analysis-results-v1/runs/${encodeURIComponent(runId)}` });
}

export async function diffRunsV1(runIdA: string, runIdB: string): Promise<DiffRunsV1Response> {
  return apiRequest<DiffRunsV1Response>({
    url: '/api/analysis-results-v1/diff',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runIdA, runIdB }),
  });
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

export async function downloadRunPdfV1(runId: string): Promise<{ blob: Blob; filename: string | null }> {
  const res = await fetch(`/api/analysis-results-v1/runs/${encodeURIComponent(runId)}/pdf`, { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to download PDF (${res.status})`);
  const blob = await res.blob();
  const filename = parseFilenameFromContentDisposition(res.headers.get('content-disposition'));
  return { blob, filename };
}

