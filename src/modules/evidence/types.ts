export type EvidenceSourceType = 'audit_exchange';

export type EvidenceSource = {
  sourceId: string;
  orgId: string;
  projectId: string;
  type: EvidenceSourceType;
  createdAt: string;
  provenance?: Record<string, unknown>;
};

export type EvidenceArtifactKind = 'photo' | 'pdf' | 'spreadsheet' | 'csv' | 'json' | 'note' | 'other';

export type EvidenceArtifact = {
  artifactId: string;
  orgId: string;
  projectId: string;
  sourceId: string;
  kind: EvidenceArtifactKind;
  filename: string;
  uriOrPath: string;
  capturedAt?: string;
  hash?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type EvidenceLink = {
  linkId: string;
  orgId: string;
  projectId: string;
  sourceId: string;
  /** e.g. auditAssetId + fieldKey */
  from: { kind: 'audit_field'; auditAssetId: string; fieldKey: string };
  /** e.g. inboxItemId + suggested payload path */
  to: { kind: 'inbox_item'; inboxItemId: string; suggested?: { kind: 'asset' | 'property' | 'relation'; key?: string } };
  artifactId?: string;
  note?: string;
  confidence?: number;
  createdAt: string;
};

export type EvidenceStoreRecord = {
  sources: EvidenceSource[];
  artifacts: EvidenceArtifact[];
  links: EvidenceLink[];
};

