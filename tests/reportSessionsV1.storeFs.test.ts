import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';

import { assertValidReportIdV1, createReportSessionsStoreFsV1 } from '../src/modules/reportSessionsV1/storeFsV1';

describe('reportSessionsV1: storeFsV1', () => {
  it('create/list/get ordering is deterministic', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'ew-reportSessionsV1-'));
    const store = createReportSessionsStoreFsV1({ baseDir });

    const a = await store.createSession({
      kind: 'WIZARD',
      title: 'A',
      nowIso: '2026-02-19T00:00:00.000Z',
    });
    const b = await store.createSession({
      kind: 'CUSTOM',
      title: 'B',
      nowIso: '2026-02-20T00:00:00.000Z',
    });

    const list = await store.listSessions({ limit: 50 });
    expect(list.map((s) => s.reportId)).toEqual([b.reportId, a.reportId]);

    const loaded = await store.getSession(a.reportId);
    expect(loaded.title).toBe('A');
    expect(loaded.kind).toBe('WIZARD');
  });

  it('attachRun is most-recent-first and bounded', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'ew-reportSessionsV1-attach-'));
    const store = createReportSessionsStoreFsV1({ baseDir });
    const { reportId } = await store.createSession({
      kind: 'CUSTOM',
      title: 'Runs',
      nowIso: '2026-02-19T00:00:00.000Z',
    });

    for (let i = 0; i < 60; i++) {
      await store.attachRun(reportId, `run_${i}`);
    }
    const s = await store.getSession(reportId);
    expect(s.runIds.length).toBe(50);
    expect(s.runIds[0]).toBe('run_59');
    expect(s.runIds[49]).toBe('run_10');
  });

  it('rejects invalid reportId', async () => {
    expect(() => assertValidReportIdV1('../evil')).toThrow(/Invalid reportId/i);
    expect(() => assertValidReportIdV1('a/b')).toThrow(/Invalid reportId/i);
    expect(() => assertValidReportIdV1('')).toThrow(/required/i);
  });
});

