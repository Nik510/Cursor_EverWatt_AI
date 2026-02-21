export type ShareScopeV1 = 'VIEW' | 'DOWNLOAD' | 'BOTH';

export type ShareLinkV1 = {
  shareId: string;
  createdAtIso: string;
  createdBy?: string | null; // optional internal user id later
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

