import { randomUUID } from 'crypto';
import type { InboxItem, ProjectGraph, EvidenceRef, AssetType } from '../../../types/project-graph';
import type { EverWattAuditExportV1, EverWattAuditAsset } from './types';

export type MapToInboxResult = {
  inboxItems: InboxItem[];
  warnings: string[];
};

function normText(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 _/-]+/g, '')
    .trim();
}

function toProjectBuilderAssetType(t: string): AssetType {
  const x = String(t || '').trim().toUpperCase();
  if (x === 'AHU') return 'ahu';
  if (x === 'RTU') return 'rtu';
  if (x === 'VAV') return 'vav';
  if (x === 'FAN') return 'fan';
  if (x === 'PUMP') return 'pump';
  if (x === 'CHILLER') return 'chiller';
  if (x === 'BOILER') return 'boiler';
  if (x === 'COOLING_TOWER') return 'coolingTower';
  if (x === 'PANEL') return 'panel';
  if (x === 'METER') return 'other';
  if (x === 'LIGHTING_ZONE') return 'lightingArea';
  return 'other';
}

function evidenceRefForAudit(args: {
  projectId: string;
  auditAssetId?: string;
  fieldKey?: string;
  nowIso: string;
  sourceKey: string;
  snippetText?: string;
}): EvidenceRef {
  const note = [args.auditAssetId ? `auditAsset=${args.auditAssetId}` : '', args.fieldKey ? `field=${args.fieldKey}` : ''].filter(Boolean).join(' ');
  return {
    fileId: `audit_exchange:${args.projectId}`,
    sourceKey: args.sourceKey,
    extractedAt: args.nowIso,
    snippetText: (args.snippetText || note).slice(0, 2000) || undefined,
  } as any;
}

function matchExistingAsset(graph: ProjectGraph, auditAsset: EverWattAuditAsset): { assetId: string; confidence: number } | null {
  const assets = Array.isArray(graph?.assets) ? graph.assets : [];
  const label = String(auditAsset.label || '').trim();
  const labelNorm = normText(label);
  if (!labelNorm) return null;

  // Strong matches only: exact assetTag or exact name (case-insensitive after normalization)
  const exactTag = assets.find((a: any) => normText(a?.assetTag) === labelNorm);
  if (exactTag?.id) return { assetId: String(exactTag.id), confidence: 0.85 };
  const exactName = assets.find((a: any) => a?.name && normText(a.name) === labelNorm);
  if (exactName?.id) return { assetId: String(exactName.id), confidence: 0.8 };
  return null;
}

function clampConfidence(n: number, maxDefault = 0.7): number {
  if (!Number.isFinite(n)) return 0.6;
  if (n >= 0.9) return Math.min(0.85, n);
  return Math.min(maxDefault, Math.max(0, n));
}

function buildMissingInfoItem(args: {
  projectId: string;
  nowIso: string;
  message: string;
  sourceKey: string;
  auditAssetId?: string;
  fieldKey?: string;
  confidence?: number;
}): InboxItem {
  return {
    id: randomUUID(),
    kind: 'suggestedProperty',
    status: 'inferred',
    sourceKey: args.sourceKey,
    suggestedProperty: {
      key: 'audit_exchange:missingInfo',
      value: JSON.stringify({ message: args.message, auditAssetId: args.auditAssetId || null, fieldKey: args.fieldKey || null }),
    },
    provenance: evidenceRefForAudit({
      projectId: args.projectId,
      auditAssetId: args.auditAssetId,
      fieldKey: args.fieldKey,
      nowIso: args.nowIso,
      sourceKey: args.sourceKey,
      snippetText: args.message,
    }),
    confidence: clampConfidence(args.confidence ?? 0.6),
    needsConfirmation: true,
    createdAt: args.nowIso,
  } as InboxItem;
}

export function mapAuditExportToProjectInbox(args: {
  export: EverWattAuditExportV1;
  projectId: string;
  existingGraph: ProjectGraph;
  nowIso: string;
}): MapToInboxResult {
  const out: InboxItem[] = [];
  const warnings: string[] = [];

  for (const a of args.export.assets || []) {
    const match = matchExistingAsset(args.existingGraph, a);
    const assetType = toProjectBuilderAssetType(a.assetType);

    if (!match) {
      // asset_create → suggestedAsset
      const sourceKey = `audit:${a.auditAssetId}:asset_create`;
      out.push({
        id: randomUUID(),
        kind: 'suggestedAsset',
        status: 'inferred',
        sourceKey,
        suggestedAsset: {
          type: assetType,
          name: String(a.label || '').trim() || undefined,
          assetTagHint: String(a.label || '').trim() || undefined,
          location: a.location ? String(a.location).trim() : undefined,
          tags: ['audit_exchange', `auditAssetId:${a.auditAssetId}`, `sourceAssetType:${String(a.assetType)}`],
        },
        provenance: evidenceRefForAudit({
          projectId: args.projectId,
          auditAssetId: a.auditAssetId,
          nowIso: args.nowIso,
          sourceKey,
        }),
        confidence: clampConfidence(0.6),
        needsConfirmation: true,
        createdAt: args.nowIso,
      } as InboxItem);

      // Also capture fields as suggestedProperty without assetId (missing info until asset is created/linked)
      for (const [k, v] of Object.entries(a.fields || {})) {
        const fk = String(k || '').trim();
        if (!fk) continue;
        const sourceKey2 = `audit:${a.auditAssetId}:field:${fk}`;
        out.push(
          buildMissingInfoItem({
            projectId: args.projectId,
            nowIso: args.nowIso,
            message: `Field available for new asset but not linked yet: ${fk}=${String(v)}`,
            sourceKey: sourceKey2,
            auditAssetId: a.auditAssetId,
            fieldKey: fk,
            confidence: 0.6,
          })
        );
      }
    } else {
      // asset_update → suggestedProperty on existing asset
      for (const [k, v] of Object.entries(a.fields || {})) {
        const fk = String(k || '').trim();
        if (!fk) continue;
        const sv = v === null ? '' : typeof v === 'string' ? v : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? String(v) : String(v);
        const ev = (a.evidence || []).find((e) => String(e.fieldKey || '').trim() === fk);
        const conf = clampConfidence(Number(ev?.confidence ?? 0.65));
        const sourceKey = `audit:${a.auditAssetId}:asset_update:${match.assetId}:${fk}`;

        out.push({
          id: randomUUID(),
          kind: 'suggestedProperty',
          status: 'inferred',
          sourceKey,
          suggestedProperty: {
            assetId: match.assetId,
            key: `audit_exchange:${fk}`,
            value: sv,
          },
          provenance: evidenceRefForAudit({
            projectId: args.projectId,
            auditAssetId: a.auditAssetId,
            fieldKey: fk,
            nowIso: args.nowIso,
            sourceKey,
            snippetText: ev?.note ? String(ev.note) : undefined,
          }),
          confidence: Math.min(conf, 0.7),
          needsConfirmation: true,
          createdAt: args.nowIso,
        } as InboxItem);
      }

      // relation_create → suggestedProperty on from asset
      for (const rel of a.relations || []) {
        const sourceKey = `audit:${a.auditAssetId}:relation:${rel.relationType}:${rel.toAssetId}`;
        const payload = {
          relationType: rel.relationType,
          fromAuditAssetId: a.auditAssetId,
          toAuditAssetId: rel.toAssetId,
          note: rel.note || null,
        };
        out.push({
          id: randomUUID(),
          kind: 'suggestedProperty',
          status: 'inferred',
          sourceKey,
          suggestedProperty: {
            assetId: match.assetId,
            key: 'audit_exchange:relationsToAdd',
            value: JSON.stringify(payload),
          },
          provenance: evidenceRefForAudit({
            projectId: args.projectId,
            auditAssetId: a.auditAssetId,
            fieldKey: 'relationsToAdd',
            nowIso: args.nowIso,
            sourceKey,
            snippetText: rel.note ? String(rel.note) : undefined,
          }),
          confidence: clampConfidence(Number(rel.confidence ?? 0.6)),
          needsConfirmation: true,
          createdAt: args.nowIso,
        } as InboxItem);
      }
    }
  }

  // Basic warning: too many items
  if (out.length > 500) warnings.push(`Large inbox output: ${out.length} items (consider splitting export)`);
  return { inboxItems: out, warnings };
}

