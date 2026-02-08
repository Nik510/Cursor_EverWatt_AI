import { randomUUID } from 'crypto';
import type { AssetNode, AssetType, BomItemsRecord, DecisionEntry, InboxHistoryItem, InboxItem, MeasureNode, ProjectGraph } from '../types/project-graph';

export type InboxDecision = 'ACCEPT' | 'REJECT';

function isAssetType(x: unknown): x is AssetType {
  return (
    x === 'lightingFixture' ||
    x === 'lightingControl' ||
    x === 'lightingArea' ||
    x === 'panel' ||
    x === 'ahu' ||
    x === 'rtu' ||
    x === 'fan' ||
    x === 'pump' ||
    x === 'vav' ||
    x === 'chiller' ||
    x === 'boiler' ||
    x === 'coolingTower' ||
    x === 'other'
  );
}

function sanitizeAssetTagHint(hint: string): string {
  const raw = String(hint || '').trim();
  if (!raw) return '';
  // Conservative: uppercase, alnum + dash only.
  const cleaned = raw
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 40);
}

function nextUniqueAssetTag(existingTagsLower: Set<string>, preferred: string): string {
  const base = sanitizeAssetTagHint(preferred) || 'ASSET';
  const tryTag = (suffix?: number) => (suffix ? `${base}-${suffix}` : base);
  let n = 0;
  while (n < 10000) {
    const candidate = tryTag(n === 0 ? undefined : n + 1);
    const key = candidate.toLowerCase();
    if (!existingTagsLower.has(key)) {
      existingTagsLower.add(key);
      return candidate;
    }
    n += 1;
  }
  // Extremely unlikely.
  const fallback = `ASSET-${randomUUID().slice(0, 8).toUpperCase()}`;
  existingTagsLower.add(fallback.toLowerCase());
  return fallback;
}

function extractFixtureGroupPropsFromTags(tags: unknown): Record<string, string> {
  if (!Array.isArray(tags)) return {};
  const out: Record<string, string> = {};
  for (const t of tags) {
    const s = String(t ?? '').trim();
    const idx = s.indexOf(':');
    if (idx <= 0) continue;
    const k = s.slice(0, idx).trim();
    const v = s.slice(idx + 1).trim();
    if (!k || !v) continue;
    // Only accept a small allowlist to avoid turning tags into arbitrary mutation vectors.
    if (k === 'fixtureTypeKey' || k === 'existingDesc' || k === 'proposedDesc') {
      out[k] = v.slice(0, 500);
    }
  }
  return out;
}

export function applyInboxDecision(args: {
  graph: ProjectGraph;
  inboxItemId: string;
  decision: InboxDecision;
  reason: string;
  nowIso: string;
  idFactory?: () => string;
}):
  | { status: 200; nextGraph: ProjectGraph; createdAssetIds: string[]; createdMeasureIds: string[] }
  | { status: 400 | 404; error: string; nextGraph: ProjectGraph } {
  const idFactory = args.idFactory || (() => randomUUID());
  const reason = String(args.reason || '').trim();
  if (!reason) return { status: 400, error: 'reason is required', nextGraph: args.graph };

  const inbox = Array.isArray(args.graph?.inbox) ? args.graph.inbox : [];
  const idx = inbox.findIndex((it: any) => String(it?.id || '') === String(args.inboxItemId || ''));
  if (idx < 0) return { status: 404, error: 'Inbox item not found', nextGraph: args.graph };

  const item = inbox[idx] as InboxItem;
  const nextInbox = [...inbox.slice(0, idx), ...inbox.slice(idx + 1)];

  const inboxHistory = Array.isArray((args.graph as any)?.inboxHistory) ? ((args.graph as any).inboxHistory as InboxHistoryItem[]) : [];
  const decisions = Array.isArray((args.graph as any)?.decisions) ? ((args.graph as any).decisions as DecisionEntry[]) : [];
  const bomItems = Array.isArray((args.graph as any)?.bomItems) ? ((args.graph as any).bomItems as BomItemsRecord[]) : [];

  const historyItem: InboxHistoryItem = {
    ...(item as any),
    status: args.decision === 'ACCEPT' ? 'accepted' : 'rejected',
    dispositionReason: reason,
    reviewedAt: args.nowIso,
  } as any;

  const createdAssetIds: string[] = [];
  const createdMeasureIds: string[] = [];

  const nextAssets: AssetNode[] = Array.isArray(args.graph?.assets) ? [...args.graph.assets] : [];
  const nextMeasures: MeasureNode[] = Array.isArray(args.graph?.measures) ? [...args.graph.measures] : [];
  const nextBomItems: BomItemsRecord[] = [...bomItems];

  if (args.decision === 'ACCEPT') {
    if (item.kind === 'suggestedMeasure') {
      const mid = String(item?.suggestedMeasure?.id || '').trim() || idFactory();
      const name = String(item?.suggestedMeasure?.name || '').trim() || 'Proposed measure';
      const category = String(item?.suggestedMeasure?.category || '').trim() || undefined;

      // Dedup by id if already present.
      if (!nextMeasures.some((m) => String(m?.id || '') === mid)) {
        nextMeasures.push({
          kind: 'measure',
          id: mid,
          name,
          ...(category ? { category } : {}),
          evidenceRefs: [item.provenance],
          status: 'confirmed',
          createdAt: args.nowIso,
          updatedAt: args.nowIso,
        });
        createdMeasureIds.push(mid);
      }
    } else if (item.kind === 'suggestedBomItems') {
      const measureId = String(item?.suggestedBomItems?.measureId || '').trim();
      const items = Array.isArray(item?.suggestedBomItems?.items) ? item.suggestedBomItems!.items : [];
      if (measureId) {
        nextBomItems.push({
          id: idFactory(),
          measureId,
          items,
          provenance: item.provenance,
          sourceKey: item.sourceKey,
          createdAt: args.nowIso,
        });
      }
    } else if (item.kind === 'suggestedAsset') {
      const existingTagsLower = new Set(
        (Array.isArray(args.graph?.assets) ? args.graph.assets : []).map((a) => String((a as any)?.assetTag || '').trim().toLowerCase()).filter(Boolean)
      );

      const type = isAssetType(item?.suggestedAsset?.type) ? (item.suggestedAsset!.type as AssetType) : 'other';
      const name = item?.suggestedAsset?.name ? String(item.suggestedAsset.name).trim() : undefined;
      const location = item?.suggestedAsset?.location ? String(item.suggestedAsset.location).trim() : undefined;
      const tags = Array.isArray(item?.suggestedAsset?.tags) ? item.suggestedAsset!.tags.map((t: any) => String(t)) : undefined;
      const assetTag = nextUniqueAssetTag(existingTagsLower, String(item?.suggestedAsset?.assetTagHint || '').trim() || 'ASSET');

      const baselineProps: Record<string, string> = {};
      const qty = Number(item?.quantity);
      if (Number.isFinite(qty)) baselineProps.qty = String(qty);
      const unit = String(item?.unit || '').trim();
      if (unit) baselineProps.unit = unit;
      // Mills fixture-group encoding: we stash a few key props in tags as k:v pairs.
      const fg = extractFixtureGroupPropsFromTags(tags);
      for (const [k, v] of Object.entries(fg)) baselineProps[k] = v;
      if (tags?.includes('fixtureGroup') && !baselineProps.kind) baselineProps.kind = 'fixtureGroup';

      const aid = idFactory();
      nextAssets.push({
        kind: 'asset',
        id: aid,
        assetTag,
        type,
        ...(name ? { name } : {}),
        ...(location ? { location } : {}),
        ...(tags ? { tags } : {}),
        baseline: {
          ...(Object.keys(baselineProps).length ? { properties: baselineProps } : {}),
          evidenceRefs: [item.provenance],
        },
        evidenceRefs: [item.provenance],
        status: 'confirmed',
        createdAt: args.nowIso,
        updatedAt: args.nowIso,
      });
      createdAssetIds.push(aid);
    } else if (item.kind === 'suggestedProperty') {
      const assetId = String(item?.suggestedProperty?.assetId || '').trim();
      const key = String(item?.suggestedProperty?.key || '').trim();
      const value = String(item?.suggestedProperty?.value || '').trim();
      const valueSafe = Boolean(value) && value.length <= 2000;
      if (assetId && key && valueSafe) {
        const hitIdx = nextAssets.findIndex((a) => String(a?.id || '') === assetId);
        if (hitIdx >= 0) {
          const prev = nextAssets[hitIdx] as any;
          const frozenAt = String(prev?.baseline?.frozenAt || '').trim();
          if (!frozenAt) {
            const next = { ...prev };
            next.baseline = { ...(next.baseline || {}) };
            next.baseline.properties = { ...(next.baseline.properties || {}) };
            next.baseline.properties[key] = value;
            // ensure provenance is not lost
            next.baseline.evidenceRefs = Array.isArray(next.baseline.evidenceRefs) ? next.baseline.evidenceRefs : [];
            if (!next.baseline.evidenceRefs.some((e: any) => String(e?.fileId || '') === String(item.provenance?.fileId || ''))) {
              next.baseline.evidenceRefs = [...next.baseline.evidenceRefs, item.provenance];
            }
            nextAssets[hitIdx] = next;
          }
        }
      }
    }
  }

  const decisionEntry: DecisionEntry = {
    id: idFactory(),
    date: args.nowIso,
    disposition: args.decision === 'ACCEPT' ? 'accepted' : 'rejected',
    decisionType: 'scope',
    context: `inboxItemId=${String(item?.id || '')} sourceKey=${String(item?.sourceKey || '')} kind=${String(item?.kind || '')}`,
    rationale: reason,
    ...(createdAssetIds.length ? { linkedAssetIds: createdAssetIds } : {}),
    ...(createdMeasureIds.length ? { linkedMeasureIds: createdMeasureIds } : {}),
    evidenceRefs: [item.provenance],
  };

  const nextGraph: ProjectGraph = {
    ...(args.graph as any),
    inbox: nextInbox,
    inboxHistory: [historyItem, ...inboxHistory].slice(0, 2000),
    decisions: [...decisions, decisionEntry].slice(-5000),
    assets: nextAssets,
    measures: nextMeasures,
    bomItems: nextBomItems,
  };

  return { status: 200, nextGraph, createdAssetIds, createdMeasureIds };
}

