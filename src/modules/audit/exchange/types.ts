import { z } from 'zod';

export type EverWattAuditArtifactKind = 'photo' | 'pdf' | 'spreadsheet' | 'csv' | 'json' | 'note' | 'other';

export type EverWattAssetType =
  | 'AHU'
  | 'VAV'
  | 'PANEL'
  | 'METER'
  | 'LIGHTING_ZONE'
  | 'RTU'
  | 'FAN'
  | 'PUMP'
  | 'CHILLER'
  | 'BOILER'
  | 'COOLING_TOWER'
  | 'OTHER';

export type EverWattRelationType = 'SERVES' | 'HAS_VFD' | 'POWERED_BY' | 'MEASURED_BY' | 'CONTROLS';

export type EverWattAuditArtifact = {
  artifactId: string;
  kind: EverWattAuditArtifactKind;
  filename: string;
  uriOrPath: string;
  capturedAt?: string;
  hash?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type EverWattAuditFieldEvidence = {
  artifactId: string;
  fieldKey: string;
  note?: string;
  confidence?: number;
};

export type EverWattAuditAssetRelation = {
  relationType: EverWattRelationType;
  toAssetId: string;
  note?: string;
  confidence?: number;
};

export type EverWattAuditAsset = {
  auditAssetId: string;
  assetType: EverWattAssetType;
  label: string;
  location?: string;
  fields: Record<string, string | number | boolean | null>;
  relations?: EverWattAuditAssetRelation[];
  evidence?: EverWattAuditFieldEvidence[];
  notes?: string[];
};

export type EverWattAuditProvenance = {
  exportedAt: string;
  exportedBy?: string;
  tool?: string;
  toolVersion?: string;
  method?: string;
};

export type EverWattAuditExportV1 = {
  apiVersion: 'everwatt_audit_export/v1';
  provenance: EverWattAuditProvenance;
  building: {
    buildingType: string;
    sqft?: number | null;
    territory?: string | null;
    climateZone?: string | null;
    address?: string | null;
  };
  artifacts: EverWattAuditArtifact[];
  assets: EverWattAuditAsset[];
  notes?: string[];
};

// ----------------------------------------------------------------------------
// Zod schemas (strict) used by validateAuditExport/parseAuditExport
// ----------------------------------------------------------------------------

export const AuditArtifactSchema = z
  .object({
    artifactId: z.string().min(1),
    kind: z.enum(['photo', 'pdf', 'spreadsheet', 'csv', 'json', 'note', 'other']),
    filename: z.string().min(1),
    uriOrPath: z.string().min(1),
    capturedAt: z.string().min(1).optional(),
    hash: z.string().min(1).optional(),
    metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  })
  .strict();

export const AuditFieldEvidenceSchema = z
  .object({
    artifactId: z.string().min(1),
    fieldKey: z.string().min(1),
    note: z.string().min(1).optional(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .strict();

export const AuditRelationSchema = z
  .object({
    relationType: z.enum(['SERVES', 'HAS_VFD', 'POWERED_BY', 'MEASURED_BY', 'CONTROLS']),
    toAssetId: z.string().min(1),
    note: z.string().min(1).optional(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .strict();

export const AuditAssetSchema = z
  .object({
    auditAssetId: z.string().min(1),
    assetType: z.enum(['AHU', 'VAV', 'PANEL', 'METER', 'LIGHTING_ZONE', 'RTU', 'FAN', 'PUMP', 'CHILLER', 'BOILER', 'COOLING_TOWER', 'OTHER']),
    label: z.string().min(1),
    location: z.string().min(1).optional(),
    fields: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
    relations: z.array(AuditRelationSchema).optional(),
    evidence: z.array(AuditFieldEvidenceSchema).optional(),
    notes: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const AuditExportV1Schema = z
  .object({
    apiVersion: z.literal('everwatt_audit_export/v1'),
    provenance: z
      .object({
        exportedAt: z.string().min(1),
        exportedBy: z.string().min(1).optional(),
        tool: z.string().min(1).optional(),
        toolVersion: z.string().min(1).optional(),
        method: z.string().min(1).optional(),
      })
      .strict(),
    building: z
      .object({
        buildingType: z.string().min(1),
        sqft: z.number().optional().nullable(),
        territory: z.string().optional().nullable(),
        climateZone: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
      })
      .strict(),
    artifacts: z.array(AuditArtifactSchema),
    assets: z.array(AuditAssetSchema).min(1),
    notes: z.array(z.string().min(1)).optional(),
  })
  .strict();

