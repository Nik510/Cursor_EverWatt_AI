import { apiRequest } from './client';

export type SupplyStructureV1 = {
  supplyType: 'bundled' | 'CCA' | 'DA' | 'unknown';
  confidence: number;
  because: string[];
  evidence?: {
    serviceProvider?: string;
    espTotalRevenueAmount?: number;
    pgeRevenueAmount?: number;
    totalBillAmount?: number;
    trueTotalUsed?: number;
    source?: 'bill_records' | 'bill_pdf' | 'rate_context';
  };
  recommendation?: {
    title: string;
    because: string[];
    confidence: number;
  };
};

export const SupplyStructureWarningCodesV1 = {
  MISSING_INPUT: 'MISSING_INPUT',
} as const;

export type UtilityInsightsApiV1 = {
  supplyStructure?: SupplyStructureV1;
  // Keep additive + permissive; existing UI reads other fields dynamically.
  [k: string]: any;
};

export type AnalysisResultsV1WorkflowApi = {
  utility?: {
    insights?: UtilityInsightsApiV1;
    [k: string]: any;
  };
  [k: string]: any;
};

export type AnalysisResultsV1Response = {
  success: true;
  project: any;
  workflow: AnalysisResultsV1WorkflowApi;
  summary: {
    json: any;
    markdown: string;
  };
  demo?: boolean;
};

export async function getAnalysisResultsV1(args: { projectId: string; demo?: boolean }) {
  const params = new URLSearchParams();
  if (args.demo) params.set('demo', 'true');
  const qs = params.toString();
  return apiRequest<AnalysisResultsV1Response>({
    url: `/api/projects/${encodeURIComponent(args.projectId)}/analysis-results-v1${qs ? `?${qs}` : ''}`,
  });
}

