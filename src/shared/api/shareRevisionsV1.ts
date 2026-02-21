import { apiRequest } from './client';

export type ShareScopeV1 = 'VIEW' | 'DOWNLOAD' | 'BOTH';

export type GetSharedRevisionMetaV1Response = {
  success: true;
  share: {
    scope: ShareScopeV1;
    expiresAtIso: string | null;
    lastAccessAtIso: string | null;
    accessCount: number;
  };
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
  links: {
    metaUrl: string;
    htmlUrl?: string;
    pdfUrl?: string;
    jsonUrl?: string;
    bundleZipUrl?: string;
  };
};

export async function getSharedRevisionMetaV1(args: { token: string }): Promise<GetSharedRevisionMetaV1Response> {
  const token = String(args.token || '').trim();
  if (!token) throw new Error('token is required');
  return apiRequest<GetSharedRevisionMetaV1Response>({
    url: '/api/share/v1/revision-meta',
    headers: { Authorization: `Share ${token}` },
  });
}

