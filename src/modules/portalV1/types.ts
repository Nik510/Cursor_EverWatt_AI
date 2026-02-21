export type OrgV1 = {
  orgId: string;
  name: string;
  createdAtIso: string;
};

export type PortalUserRoleV1 = 'VIEWER' | 'ADMIN' | 'OWNER';

export type PortalUserV1 = {
  userId: string;
  orgId: string;
  email: string;
  role: PortalUserRoleV1;
  createdAtIso: string;
  disabledAtIso?: string;
};

export type ProjectOrgLinkV1 = {
  projectId: string;
  orgId: string;
};

export type PortalSessionV1 = {
  sessionId: string;
  userId: string;
  createdAtIso: string;
  expiresAtIso: string;
};

