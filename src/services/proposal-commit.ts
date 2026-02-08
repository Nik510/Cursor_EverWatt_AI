import { randomUUID } from 'crypto';
import type { InboxItem, EvidenceRef, ProjectGraph } from '../types/project-graph';

export function isProposalCommitEnabled(envValue: string | undefined): boolean {
  const v = String(envValue || '').trim().toLowerCase();
  if (!v) return false;
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export function deltaToInboxItems(args: {
  proposalPackId: string;
  scenarioId: string;
  deltas: any[];
  storageKey?: string | null;
  nowIso: string;
  idFactory?: () => string;
}): InboxItem[] {
  const idFactory = args.idFactory || (() => randomUUID());
  const deltas = Array.isArray(args.deltas) ? args.deltas : [];

  return deltas.map((delta, i) => {
    const sourceKey = `${args.proposalPackId}:${args.scenarioId}:${i}`;
    const provenance: EvidenceRef = {
      fileId: args.proposalPackId,
      source: 'proposalPack',
      proposalPackId: args.proposalPackId,
      scenarioId: args.scenarioId,
      deltaId: String(delta?.id || '') || null,
      sourceKey,
      storageKey: args.storageKey ?? null,
      extractedAt: args.nowIso,
    };

    const base: Omit<InboxItem, 'kind'> = {
      id: idFactory(),
      status: 'inferred',
      sourceKey,
      provenance,
      confidence: 0.7,
      needsConfirmation: true,
      createdAt: args.nowIso,
    };

    const kind = String(delta?.kind || '').trim();
    switch (kind) {
      case 'ADD_MEASURE': {
        const m = delta?.measure || {};
        return {
          ...base,
          kind: 'suggestedMeasure',
          confidence: 0.75,
          suggestedMeasure: {
            id: m?.id ? String(m.id) : undefined,
            name: m?.name ? String(m.name) : undefined,
            category: m?.category ? String(m.category) : undefined,
            notes: m?.notes ? String(m.notes) : undefined,
          },
        };
      }
      case 'ADD_ASSET': {
        const a = delta?.asset || {};
        return {
          ...base,
          kind: 'suggestedAsset',
          confidence: 0.65,
          suggestedAsset: {
            type: a?.type ? String(a.type) : undefined,
            name: a?.name ? String(a.name) : undefined,
            assetTagHint: a?.assetTagHint ? String(a.assetTagHint) : a?.assetTag ? String(a.assetTag) : undefined,
            location: a?.location ? String(a.location) : undefined,
            tags: Array.isArray(a?.tags) ? a.tags.map((t: any) => String(t)) : undefined,
          } as any,
        };
      }
      case 'UPDATE_ASSET_META': {
        return {
          ...base,
          kind: 'suggestedProperty',
          confidence: 0.7,
          suggestedProperty: {
            assetId: delta?.assetId ? String(delta.assetId) : undefined,
            key: 'proposalDelta:UPDATE_ASSET_META',
            value: JSON.stringify(delta?.patch ?? {}),
          },
        };
      }
      case 'LINK_ASSET_TO_MEASURE': {
        const measureId = delta?.measureId ? String(delta.measureId) : '';
        return {
          ...base,
          kind: 'suggestedProperty',
          confidence: 0.7,
          suggestedProperty: {
            assetId: delta?.assetId ? String(delta.assetId) : undefined,
            key: 'proposalDelta:LINK_ASSET_TO_MEASURE',
            value: measureId || JSON.stringify(delta ?? {}),
          },
        };
      }
      case 'ADD_ASSUMPTION':
      case 'UPDATE_ASSUMPTION': {
        return {
          ...base,
          kind: 'suggestedProperty',
          confidence: 0.7,
          suggestedProperty: {
            key: 'proposalDelta:ASSUMPTION',
            value: JSON.stringify(delta ?? {}),
          },
        };
      }
      case 'ADD_BOM_ITEMS': {
        const measureId = delta?.measureId ? String(delta.measureId) : '';
        if (!measureId) {
          return {
            ...base,
            kind: 'suggestedProperty',
            confidence: 0.7,
            suggestedProperty: {
              key: 'proposalDelta:ADD_BOM_ITEMS',
              value: JSON.stringify({ measureId: delta?.measureId ?? null, items: delta?.items ?? [] }),
            },
          };
        }
        return {
          ...base,
          kind: 'suggestedBomItems',
          confidence: 0.7,
          suggestedBomItems: {
            measureId,
            items: Array.isArray(delta?.items) ? delta.items : [],
          },
        };
      }
      default: {
        // Fallback: preserve delta without guessing
        return {
          ...base,
          kind: 'suggestedProperty',
          confidence: 0.5,
          suggestedProperty: {
            key: `proposalDelta:${kind || 'UNKNOWN'}`,
            value: JSON.stringify(delta ?? {}).slice(0, 3000),
          },
        };
      }
    }
  });
}

export function commitProposalPackToInboxV1(args: {
  enabled: boolean;
  proposalPackId: string;
  scenarioId: string;
  pack: any;
  storageKey?: string | null;
  graph: ProjectGraph;
  nowIso: string;
  idFactory?: () => string;
}): { status: 200 | 400 | 404; createdCount: number; skippedCount: number; inboxCount: number; nextGraph: ProjectGraph } {
  if (!args.enabled) {
    return { status: 404, createdCount: 0, skippedCount: 0, inboxCount: Array.isArray(args.graph?.inbox) ? args.graph.inbox.length : 0, nextGraph: args.graph };
  }

  const scenarios = Array.isArray(args.pack?.scenarios) ? args.pack.scenarios : [];
  const scenario = scenarios.find((s: any) => String(s?.scenarioId || '') === String(args.scenarioId));
  if (!scenario) {
    return { status: 400, createdCount: 0, skippedCount: 0, inboxCount: Array.isArray(args.graph?.inbox) ? args.graph.inbox.length : 0, nextGraph: args.graph };
  }

  const existingInbox: InboxItem[] = Array.isArray(args.graph?.inbox) ? (args.graph.inbox as any) : [];
  const existingKeys = new Set(existingInbox.map((it: any) => String(it?.sourceKey || '')).filter(Boolean));

  const candidates = deltaToInboxItems({
    proposalPackId: args.proposalPackId,
    scenarioId: args.scenarioId,
    deltas: Array.isArray(scenario?.deltas) ? scenario.deltas : [],
    storageKey: args.storageKey ?? null,
    nowIso: args.nowIso,
    idFactory: args.idFactory,
  });

  let skippedCount = 0;
  const created: InboxItem[] = [];
  for (const it of candidates) {
    const key = String((it as any)?.sourceKey || '').trim();
    if (key && existingKeys.has(key)) {
      skippedCount += 1;
      continue;
    }
    if (key) existingKeys.add(key);
    created.push(it);
  }

  const nextInbox = [...existingInbox, ...created];
  const nextGraph: ProjectGraph = { ...(args.graph as any), inbox: nextInbox };

  return {
    status: 200,
    createdCount: created.length,
    skippedCount,
    inboxCount: nextInbox.length,
    nextGraph,
  };
}

