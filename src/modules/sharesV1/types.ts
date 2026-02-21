export type ShareScopeV1 = 'VIEW' | 'DOWNLOAD' | 'BOTH';

export type ShareEventV1 =
  | {
      type: 'CREATED';
      createdAtIso: string;
      scope: ShareScopeV1;
      expiresAtIso: string | null;
      note?: string | null;
    }
  | {
      type: 'ACCESSED';
      atIso: string;
      userAgentHash?: string;
      ipHash?: string;
    }
  | {
      type: 'REVOKED';
      atIso: string;
    }
  | {
      type: 'EXPIRY_EXTENDED';
      atIso: string;
      newExpiresAtIso: string;
    }
  | {
      type: 'SCOPE_CHANGED';
      atIso: string;
      newScope: ShareScopeV1;
    };

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
  requiresPassword: boolean;
  passwordHash: string | null; // server-only (never returned); stored hash only
  passwordHint: string | null; // optional, safe string
  note?: string | null;
  events: ShareEventV1[]; // append-only, bounded
};

export type ShareLinkSafeV1 = Omit<ShareLinkV1, 'passwordHash'>;

export type ShareLinkMetaV1 = Omit<ShareLinkSafeV1, 'events'>;

