import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';

import { createAnalysisRunsStoreFsV1, assertValidRunIdV1 } from '../src/modules/analysisRunsV1/storeFsV1';
import type { AnalysisRunV1 } from '../src/modules/analysisRunsV1/types';

describe('analysisRunsV1: storeFsV1', () => {
  it('write/read roundtrip + index is deterministic', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'ew-analysisRunsV1-'));
    const store = createAnalysisRunsStoreFsV1({ baseDir });

    const run1: AnalysisRunV1 = {
      runId: 'run_1',
      createdAtIso: '2026-02-19T00:00:00.000Z',
      nowIso: '2026-02-19T00:00:00.000Z',
      projectId: 'p1',
      inputFingerprint: 'fp1',
      engineVersions: { engine: '1' },
      provenance: { tariffSnapshotId: 't1' },
      warningsSummary: { engineWarningsCount: 0, topEngineWarningCodes: [], missingInfoCount: 0, topMissingInfoCodes: [] },
      snapshot: { response: { ok: true }, reportJson: { schemaVersion: 'internalEngineeringReportV1', summary: { json: {}, markdown: '' } } },
    };
    const run2: AnalysisRunV1 = {
      ...run1,
      runId: 'run_2',
      createdAtIso: '2026-02-20T00:00:00.000Z',
      nowIso: '2026-02-20T00:00:00.000Z',
      inputFingerprint: 'fp2',
    };

    await store.writeRun(run1);
    await store.writeRun(run2);

    const loaded1 = await store.readRun('run_1');
    expect(loaded1.runId).toBe('run_1');
    expect((loaded1 as any).snapshot?.response?.ok).toBe(true);

    const index = await store.listIndex();
    expect(index.map((r) => r.runId)).toEqual(['run_2', 'run_1']); // newest first
    expect(index[0].createdAtIso).toBe('2026-02-20T00:00:00.000Z');
  });

  it('rejects invalid runId', async () => {
    expect(() => assertValidRunIdV1('../evil')).toThrow(/Invalid runId/i);
    expect(() => assertValidRunIdV1('a/b')).toThrow(/Invalid runId/i);
    expect(() => assertValidRunIdV1('')).toThrow(/required/i);
  });
});

