import { describe, it, expect } from 'vitest';

import type { ProjectGraph } from '../src/types/project-graph';
import { applyInboxDecision } from '../src/services/inbox-decisions';

describe('Phase2A inbox decision (pure helper)', () => {
  it('reject requires reason', () => {
    const graph: ProjectGraph = { assets: [], measures: [], inbox: [] };
    const res = applyInboxDecision({ graph, inboxItemId: 'x', decision: 'REJECT', reason: ' ', nowIso: new Date(0).toISOString(), idFactory: () => 'id' });
    expect(res.status).toBe(400);
  });

  it('accept suggestedMeasure creates measure + writes ledger + moves to history', () => {
    const nowIso = new Date(0).toISOString();
    const graph: ProjectGraph = {
      assets: [],
      measures: [],
      inbox: [
        {
          id: 'ii1',
          kind: 'suggestedMeasure',
          status: 'inferred',
          provenance: { fileId: 'pp', source: 'proposalPack', proposalPackId: 'pp', scenarioId: 'sc', deltaId: 'd' },
          confidence: 0.7,
          needsConfirmation: true,
          sourceKey: 'pp:sc:0',
          suggestedMeasure: { id: 'm1', name: 'Install BESS', category: 'battery' },
        },
      ] as any,
      inboxHistory: [],
      decisions: [],
      bomItems: [],
    };

    const res = applyInboxDecision({ graph, inboxItemId: 'ii1', decision: 'ACCEPT', reason: 'Looks good', nowIso, idFactory: () => 'uuid' });
    if (res.status !== 200) throw new Error('expected 200');

    expect(res.nextGraph.inbox).toHaveLength(0);
    expect(res.nextGraph.inboxHistory?.[0]?.status).toBe('accepted');
    expect(res.nextGraph.decisions?.length).toBe(1);
    expect(res.nextGraph.measures.find((m) => m.id === 'm1')?.name).toBe('Install BESS');
  });

  it('reject does not mutate assets/measures/bomItems', () => {
    const nowIso = new Date(0).toISOString();
    const graph: ProjectGraph = {
      assets: [{ kind: 'asset', id: 'a1', assetTag: 'A1', type: 'other' } as any],
      measures: [{ kind: 'measure', id: 'm1', name: 'M', category: 'x' } as any],
      inbox: [
        {
          id: 'ii2',
          kind: 'suggestedBomItems',
          status: 'inferred',
          provenance: { fileId: 'pp' },
          confidence: 0.6,
          needsConfirmation: true,
          suggestedBomItems: { measureId: 'm1', items: [{ sku: 'X' }] },
        },
      ] as any,
      inboxHistory: [],
      decisions: [],
      bomItems: [],
    };

    const res = applyInboxDecision({ graph, inboxItemId: 'ii2', decision: 'REJECT', reason: 'Not in scope', nowIso, idFactory: () => 'uuid' });
    if (res.status !== 200) throw new Error('expected 200');
    expect(res.nextGraph.assets).toHaveLength(1);
    expect(res.nextGraph.measures).toHaveLength(1);
    expect(res.nextGraph.bomItems).toHaveLength(0);
    expect(res.nextGraph.inboxHistory?.[0]?.status).toBe('rejected');
    expect(res.nextGraph.decisions?.length).toBe(1);
  });
});

