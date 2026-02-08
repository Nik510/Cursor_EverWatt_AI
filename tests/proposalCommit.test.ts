import { describe, it, expect } from 'vitest';

import type { ProjectGraph } from '../src/types/project-graph';
import { commitProposalPackToInboxV1, deltaToInboxItems, isProposalCommitEnabled } from '../src/services/proposal-commit';

describe('proposal commit v1 (mapper + dedupe)', () => {
  it('flag parsing: default disabled', () => {
    expect(isProposalCommitEnabled(undefined)).toBe(false);
    expect(isProposalCommitEnabled('false')).toBe(false);
    expect(isProposalCommitEnabled('0')).toBe(false);
    expect(isProposalCommitEnabled('true')).toBe(true);
    expect(isProposalCommitEnabled('1')).toBe(true);
  });

  it('deltaToInboxItems emits provenance/sourceKey and suggestedBomItems', () => {
    const proposalPackId = 'pp_1';
    const scenarioId = 'sc_1';
    const deltas = [
      { id: 'd1', kind: 'ADD_MEASURE', measure: { id: 'm1', name: 'Install BESS', category: 'battery', notes: 'n' } },
      { id: 'd2', kind: 'ADD_BOM_ITEMS', measureId: 'm1', items: [{ sku: 'X', qty: 1 }] },
      { id: 'd3', kind: 'UPDATE_ASSET_META', assetId: 'a1', patch: { k: 'v' } },
    ];

    const out = deltaToInboxItems({
      proposalPackId,
      scenarioId,
      deltas,
      storageKey: 'sk',
      nowIso: new Date(0).toISOString(),
      idFactory: () => 'iid',
    });

    expect(out).toHaveLength(3);
    for (let i = 0; i < out.length; i++) {
      expect(out[i].needsConfirmation).toBe(true);
      expect(out[i].sourceKey).toBe(`${proposalPackId}:${scenarioId}:${i}`);
      expect(out[i].provenance.fileId).toBe(proposalPackId);
      expect(out[i].provenance.source).toBe('proposalPack');
      expect(out[i].provenance.proposalPackId).toBe(proposalPackId);
      expect(out[i].provenance.scenarioId).toBe(scenarioId);
      expect(out[i].provenance.sourceKey).toBe(`${proposalPackId}:${scenarioId}:${i}`);
      expect(out[i].provenance.storageKey).toBe('sk');
    }

    expect(out[0].kind).toBe('suggestedMeasure');
    expect(out[0].suggestedMeasure?.id).toBe('m1');
    expect(out[0].suggestedMeasure?.name).toBe('Install BESS');

    expect(out[1].kind).toBe('suggestedBomItems');
    expect(out[1].suggestedBomItems?.measureId).toBe('m1');
    expect(Array.isArray(out[1].suggestedBomItems?.items)).toBe(true);

    expect(out[2].kind).toBe('suggestedProperty');
    expect(out[2].suggestedProperty?.assetId).toBe('a1');
  });

  it('commit helper blocks when disabled and does not mutate graph', () => {
    const graph: ProjectGraph = { assets: [], measures: [], inbox: [] };
    const res = commitProposalPackToInboxV1({
      enabled: false,
      proposalPackId: 'pp',
      scenarioId: 'sc',
      pack: { scenarios: [] },
      graph,
      nowIso: new Date(0).toISOString(),
    });
    expect(res.status).toBe(404);
    expect(res.nextGraph).toBe(graph);
    expect(res.createdCount).toBe(0);
  });

  it('commit helper appends inbox items and dedupes on second call', () => {
    const proposalPackId = 'pp_2';
    const scenarioId = 'sc_2';
    const pack = {
      scenarios: [
        {
          scenarioId,
          deltas: [
            { id: 'd1', kind: 'ADD_MEASURE', measure: { id: 'm1', name: 'Install', category: 'battery' } },
            { id: 'd2', kind: 'ADD_BOM_ITEMS', measureId: 'm1', items: [{ sku: 'X' }] },
          ],
        },
      ],
    };

    const base: ProjectGraph = { assets: [{ kind: 'asset', id: 'a', assetTag: 'A', type: 'other' } as any], measures: [], inbox: [] };
    const nowIso = new Date(0).toISOString();

    const first = commitProposalPackToInboxV1({
      enabled: true,
      proposalPackId,
      scenarioId,
      pack,
      storageKey: 'sk',
      graph: base,
      nowIso,
      idFactory: (() => {
        let n = 0;
        return () => `iid_${++n}`;
      })(),
    });
    expect(first.status).toBe(200);
    expect(first.createdCount).toBe(2);
    expect(first.skippedCount).toBe(0);
    expect(first.nextGraph.assets).toBe(base.assets); // no mutation beyond inbox
    expect(first.nextGraph.inbox).toHaveLength(2);

    const second = commitProposalPackToInboxV1({
      enabled: true,
      proposalPackId,
      scenarioId,
      pack,
      storageKey: 'sk',
      graph: first.nextGraph,
      nowIso,
      idFactory: () => 'iid_x',
    });
    expect(second.status).toBe(200);
    expect(second.createdCount).toBe(0);
    expect(second.skippedCount).toBe(2);
    expect(second.nextGraph.inbox).toHaveLength(2);
  });
});

