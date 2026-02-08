import { randomUUID } from 'crypto';
import type { InboxItem } from '../../types/project-graph';
import type { EverWattAuditExportV1 } from '../audit/exchange/types';
import type { EvidenceLink } from './types';
import { readEvidenceStore, writeEvidenceStore } from './store';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.6;
  return Math.max(0, Math.min(1, n));
}

/**
 * Create EvidenceLink entries tying audit field evidence → inbox items.
 *
 * v1 deterministic approach:
 * - Match inbox items by sourceKey prefix `audit:<auditAssetId>:` emitted by mapAuditExportToProjectInbox()
 * - Link any audit evidence rows for matching auditAssetId + fieldKey
 */
export async function linkEvidence(args: {
  orgId: string;
  projectId: string;
  sourceId: string;
  audit: EverWattAuditExportV1;
  inboxItems: InboxItem[];
  nowIso: string;
}): Promise<{ links: EvidenceLink[]; warnings: string[] }> {
  const store = await readEvidenceStore(args.orgId, args.projectId);
  const warnings: string[] = [];

  const inboxByKey = new Map<string, InboxItem>();
  for (const it of args.inboxItems || []) {
    const k = String((it as any)?.sourceKey || '').trim();
    if (k) inboxByKey.set(k, it);
  }

  const links: EvidenceLink[] = [];

  for (const asset of args.audit.assets || []) {
    for (const ev of asset.evidence || []) {
      const auditAssetId = String(asset.auditAssetId || '');
      const fieldKey = String(ev.fieldKey || '');
      if (!auditAssetId || !fieldKey) continue;

      // best-effort: link to update suggestion if present, else to missingInfo
      const candidateKeys = [
        // update suggestion key pattern
        ...Array.from(inboxByKey.keys()).filter((k) => k.startsWith(`audit:${auditAssetId}:asset_update:`) && k.endsWith(`:${fieldKey}`)),
        `audit:${auditAssetId}:field:${fieldKey}`,
      ];
      const chosenKey = candidateKeys.find((k) => inboxByKey.has(k)) || '';
      const item = chosenKey ? inboxByKey.get(chosenKey) : null;
      if (!item) {
        warnings.push(`No inbox item found for evidence auditAssetId=${auditAssetId} fieldKey=${fieldKey}`);
        continue;
      }

      links.push({
        linkId: `evidenceLink_${randomUUID()}`,
        orgId: args.orgId,
        projectId: args.projectId,
        sourceId: args.sourceId,
        from: { kind: 'audit_field', auditAssetId, fieldKey },
        to: {
          kind: 'inbox_item',
          inboxItemId: String((item as any).id),
          suggested: (item as any).kind === 'suggestedAsset' ? { kind: 'asset' } : (item as any).kind === 'suggestedProperty' ? { kind: 'property', key: (item as any)?.suggestedProperty?.key } : { kind: 'property' },
        },
        artifactId: ev.artifactId ? String(ev.artifactId) : undefined,
        note: ev.note ? String(ev.note) : undefined,
        confidence: ev.confidence != null ? clamp01(Number(ev.confidence)) : undefined,
        createdAt: args.nowIso,
      });
    }
  }

  const next = { ...store, links: [...links, ...store.links] };
  await writeEvidenceStore(args.orgId, args.projectId, next);
  return { links, warnings };
}

