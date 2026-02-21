import { apiRequest } from './client';

export type ShareScopeV1 = 'VIEW' | 'DOWNLOAD' | 'BOTH';

export type GetSharedRevisionMetaV1Response = {
  success: true;
  share: {
    scope: ShareScopeV1;
    expiresAtIso: string | null;
    lastAccessAtIso: string | null;
    accessCount: number;
    requiresPassword: boolean;
    passwordHint: string | null;
    passwordVerified: boolean;
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
    verifyPasswordUrl: string;
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

export type VerifySharedRevisionPasswordV1Response = { success: true; verified: true };

export async function verifySharedRevisionPasswordV1(args: { token: string; password: string }): Promise<VerifySharedRevisionPasswordV1Response> {
  const token = String(args.token || '').trim();
  if (!token) throw new Error('token is required');
  const password = String(args.password || '').trim();
  if (!password) throw new Error('password is required');
  return apiRequest<VerifySharedRevisionPasswordV1Response>({
    url: '/api/share/v1/verify-password',
    method: 'POST',
    headers: { Authorization: `Share ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

