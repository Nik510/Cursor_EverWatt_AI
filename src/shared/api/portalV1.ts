export type PortalUserRoleV1 = 'VIEWER' | 'ADMIN' | 'OWNER';

export type PortalMeV1Response = {
  success: true;
  user: { userId: string; orgId: string; email: string; role: PortalUserRoleV1; createdAtIso: string };
  org: { orgId: string; name: string; createdAtIso: string };
};

export type PortalProjectListItemV1 = {
  projectId: string;
  name: string;
  latestRevision: {
    revisionId: string;
    reportType: string;
    createdAtIso: string;
    runId?: string;
    engineVersions?: Record<string, string>;
    warningsSummary?: any;
    wizardOutputHash?: string;
  } | null;
};

export type PortalListProjectsV1Response = {
  success: true;
  orgId: string;
  projects: PortalProjectListItemV1[];
};

export type PortalListRevisionsV1Response = {
  success: true;
  projectId: string;
  revisions: Array<{
    revisionId: string;
    reportType: string;
    createdAtIso: string;
    runId?: string;
    engineVersions?: Record<string, string>;
    warningsSummary?: any;
    wizardOutputHash?: string;
  }>;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...(init || {}), credentials: 'same-origin' });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok || (data && typeof data === 'object' && data.success === false)) {
    const msg = (data && typeof data === 'object' && (data.error || data.message)) ? String(data.error || data.message) : `Request failed (${res.status})`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data as T;
}

export async function portalLoginVerifyV1(args: { email: string; tokenPlain: string }): Promise<{ success: true }> {
  return fetchJson<{ success: true }>('/api/portal-v1/login/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: args.email, tokenPlain: args.tokenPlain }),
  });
}

export async function portalLogoutV1(): Promise<{ success: true }> {
  return fetchJson<{ success: true }>('/api/portal-v1/logout', { method: 'POST' });
}

export async function portalMeV1(): Promise<PortalMeV1Response> {
  return fetchJson<PortalMeV1Response>('/api/portal-v1/me');
}

export async function portalListProjectsV1(): Promise<PortalListProjectsV1Response> {
  return fetchJson<PortalListProjectsV1Response>('/api/portal-v1/projects');
}

export async function portalListProjectRevisionsV1(args: { projectId: string }): Promise<PortalListRevisionsV1Response> {
  const projectId = String(args.projectId || '').trim();
  if (!projectId) throw new Error('projectId is required');
  return fetchJson<PortalListRevisionsV1Response>(`/api/portal-v1/projects/${encodeURIComponent(projectId)}/revisions`);
}

export function portalRevisionLinksV1(args: { projectId: string; revisionId: string }) {
  const projectId = String(args.projectId || '').trim();
  const revisionId = String(args.revisionId || '').trim();
  if (!projectId || !revisionId) throw new Error('projectId and revisionId are required');
  const base = `/api/portal-v1/projects/${encodeURIComponent(projectId)}/revisions/${encodeURIComponent(revisionId)}`;
  return {
    htmlUrl: `${base}/html`,
    pdfUrl: `${base}/pdf`,
    jsonUrl: `${base}/json`,
    bundleUrl: `${base}/bundle`,
  };
}

