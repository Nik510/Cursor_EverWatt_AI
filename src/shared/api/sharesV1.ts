import { apiRequest } from './client';

export type ShareScopeV1 = 'VIEW' | 'DOWNLOAD' | 'BOTH';

export type ShareEventV1 =
  | { type: 'CREATED'; createdAtIso: string; scope: ShareScopeV1; expiresAtIso: string | null; note?: string | null }
  | { type: 'ACCESSED'; atIso: string; userAgentHash?: string; ipHash?: string }
  | { type: 'REVOKED'; atIso: string }
  | { type: 'EXPIRY_EXTENDED'; atIso: string; newExpiresAtIso: string }
  | { type: 'SCOPE_CHANGED'; atIso: string; newScope: ShareScopeV1 };

export type ShareLinkMetaV1 = {
  shareId: string;
  createdAtIso: string;
  createdBy?: string | null;
  projectId: string;
  revisionId: string;
  reportType: string;
  scope: ShareScopeV1;
  expiresAtIso: string | null;
  revokedAtIso: string | null;
  accessCount: number;
  lastAccessAtIso: string | null;
  note?: string | null;
};

export type ShareLinkV1 = ShareLinkMetaV1 & { events: ShareEventV1[] };

function staffHeaders(adminToken?: string): Record<string, string> | undefined {
  const t = String(adminToken || '').trim();
  return t ? { 'x-admin-token': t } : undefined;
}

export type CreateShareV1Response = { success: true; shareUrl: string; shareId: string; expiresAtIso: string };

export async function createShareV1(args: {
  projectId: string;
  revisionId: string;
  scope: ShareScopeV1;
  expiresInHours?: number;
  note?: string | null;
  adminToken?: string;
}): Promise<CreateShareV1Response> {
  return apiRequest<CreateShareV1Response>({
    url: '/api/shares-v1/create',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(staffHeaders(args.adminToken) || {}) },
    body: JSON.stringify({
      projectId: args.projectId,
      revisionId: args.revisionId,
      scope: args.scope,
      ...(args.expiresInHours !== undefined ? { expiresInHours: args.expiresInHours } : {}),
      ...(args.note !== undefined ? { note: args.note } : {}),
    }),
  });
}

export type ListSharesV1Response = { success: true; shares: ShareLinkMetaV1[] };

export async function listSharesV1(args?: { limit?: number; q?: string; adminToken?: string }): Promise<ListSharesV1Response> {
  const limit = Number(args?.limit);
  const q = String(args?.q || '').trim();
  const qs = [
    Number.isFinite(limit) ? `limit=${encodeURIComponent(String(Math.trunc(limit)))}` : '',
    q ? `q=${encodeURIComponent(q)}` : '',
  ]
    .filter(Boolean)
    .join('&');
  return apiRequest<ListSharesV1Response>({
    url: `/api/shares-v1${qs ? `?${qs}` : ''}`,
    headers: staffHeaders(args?.adminToken),
  });
}

export type ListProjectSharesV1Response = { success: true; shares: ShareLinkMetaV1[] };

export async function listProjectSharesV1(args: { projectId: string; limit?: number; adminToken?: string }): Promise<ListProjectSharesV1Response> {
  const projectId = String(args.projectId || '').trim();
  if (!projectId) throw new Error('projectId is required');
  const limit = Number(args.limit);
  const qs = Number.isFinite(limit) ? `?limit=${encodeURIComponent(String(Math.trunc(limit)))}` : '';
  return apiRequest<ListProjectSharesV1Response>({
    url: `/api/shares-v1/projects/${encodeURIComponent(projectId)}${qs}`,
    headers: staffHeaders(args.adminToken),
  });
}

export type ReadShareV1Response = { success: true; share: ShareLinkV1 };

export async function readShareV1(args: { shareId: string; adminToken?: string }): Promise<ReadShareV1Response> {
  const shareId = String(args.shareId || '').trim();
  if (!shareId) throw new Error('shareId is required');
  return apiRequest<ReadShareV1Response>({
    url: `/api/shares-v1/${encodeURIComponent(shareId)}`,
    headers: staffHeaders(args.adminToken),
  });
}

export type RevokeShareV1Response = { success: true; share: ShareLinkV1 };

export async function revokeShareV1(args: { shareId: string; adminToken?: string }): Promise<RevokeShareV1Response> {
  const shareId = String(args.shareId || '').trim();
  if (!shareId) throw new Error('shareId is required');
  return apiRequest<RevokeShareV1Response>({
    url: `/api/shares-v1/${encodeURIComponent(shareId)}/revoke`,
    method: 'POST',
    headers: staffHeaders(args.adminToken),
  });
}

export type ExtendExpiryV1Response = { success: true; share: ShareLinkV1 };

export async function extendExpiryV1(args: { shareId: string; extendHours: number; adminToken?: string }): Promise<ExtendExpiryV1Response> {
  const shareId = String(args.shareId || '').trim();
  if (!shareId) throw new Error('shareId is required');
  return apiRequest<ExtendExpiryV1Response>({
    url: `/api/shares-v1/${encodeURIComponent(shareId)}/extend-expiry`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(staffHeaders(args.adminToken) || {}) },
    body: JSON.stringify({ extendHours: args.extendHours }),
  });
}

export type SetScopeV1Response = { success: true; share: ShareLinkV1 };

export async function setScopeV1(args: { shareId: string; scope: ShareScopeV1; adminToken?: string }): Promise<SetScopeV1Response> {
  const shareId = String(args.shareId || '').trim();
  if (!shareId) throw new Error('shareId is required');
  return apiRequest<SetScopeV1Response>({
    url: `/api/shares-v1/${encodeURIComponent(shareId)}/set-scope`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(staffHeaders(args.adminToken) || {}) },
    body: JSON.stringify({ scope: args.scope }),
  });
}

