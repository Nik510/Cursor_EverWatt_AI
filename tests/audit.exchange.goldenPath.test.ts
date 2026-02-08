import { describe, expect, test } from 'vitest';
import { readFile } from 'fs/promises';
import path from 'path';
import { parseAuditExport } from '../src/modules/audit/exchange/parseAuditExport';
import { mapAuditExportToProjectInbox } from '../src/modules/audit/exchange/mapToProjectInbox';
import { ingestEvidence } from '../src/modules/evidence/ingestEvidence';
import { linkEvidence } from '../src/modules/evidence/linkEvidence';
import { readEvidenceStore } from '../src/modules/evidence/store';
import type { ProjectGraph } from '../src/types/project-graph';

async function readJson(fp: string): Promise<any> {
  const raw = await readFile(fp, 'utf-8');
  return JSON.parse(raw);
}

describe('Audit Import v1 - golden path (inbox-only)', () => {
  test('parses fixture, maps to Phase-1 inbox, ingests evidence links', async () => {
    const fixture = await readJson(path.join(process.cwd(), 'samples', 'everwatt_audit_export_example_small.json'));
    const parsed = parseAuditExport(fixture);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const orgId = 'demo-org';
    const projectId = 'p_demo';
    const nowIso = '2026-02-03T00:00:00.000Z';

    // Existing graph already has AHU-1 so we get asset_update suggestions for it
    const existingGraph: ProjectGraph = {
      assets: [
        { kind: 'asset', id: 'asset_ahu1', assetTag: 'AHU-1', type: 'ahu' as any, baseline: { properties: {} } } as any,
      ],
      measures: [],
      inbox: [],
      inboxHistory: [],
      bomItems: [],
      decisions: [],
    };

    const mapped = mapAuditExportToProjectInbox({ export: parsed.export, projectId, existingGraph, nowIso });
    expect(mapped.inboxItems.length).toBeGreaterThan(0);

    // Inbox-only: should not mutate assets array; mapping returns only inboxItems
    expect(existingGraph.assets.length).toBe(1);

    const { source, artifacts } = await ingestEvidence({ orgId, projectId, audit: parsed.export, nowIso });
    expect(artifacts.length).toBeGreaterThanOrEqual(4);

    const linked = await linkEvidence({ orgId, projectId, sourceId: source.sourceId, audit: parsed.export, inboxItems: mapped.inboxItems, nowIso });
    expect(linked.links.length).toBeGreaterThan(0);

    const store = await readEvidenceStore(orgId, projectId);
    expect(store.sources.length).toBeGreaterThan(0);
    expect(store.artifacts.length).toBeGreaterThan(0);
    expect(store.links.length).toBeGreaterThan(0);
  });
});

