import { apiRequest } from './client';

export type GetProjectReportRevisionV1Response = {
  success: true;
  revision: {
    revisionId: string;
    reportType: string;
    createdAtIso: string;
    runId?: string;
    engineVersions?: Record<string, string>;
    warningsSummary?: {
      engineWarningsCount: number;
      topEngineWarningCodes: string[];
      missingInfoCount: number;
      topMissingInfoCodes: string[];
    };
    wizardOutputHash?: string;
  };
  links: { htmlUrl: string; jsonUrl: string; pdfUrl: string; bundleZipUrl?: string };
};

export async function getProjectReportRevisionV1(args: { projectId: string; revisionId: string }): Promise<GetProjectReportRevisionV1Response> {
  const projectId = String(args.projectId || '').trim();
  const revisionId = String(args.revisionId || '').trim();
  if (!projectId) throw new Error('projectId is required');
  if (!revisionId) throw new Error('revisionId is required');
  return apiRequest<GetProjectReportRevisionV1Response>({
    url: `/api/projects/${encodeURIComponent(projectId)}/reports/revisions/${encodeURIComponent(revisionId)}`,
  });
}

