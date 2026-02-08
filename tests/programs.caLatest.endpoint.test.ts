import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';

import app from '../src/server';
import { saveProgramSnapshotV1 } from '../src/modules/programLibrary/v1/storage';
import type { ProgramSnapshotV1 } from '../src/modules/programLibrary/v1/types';

describe('programs endpoint: /api/programs/ca/latest', () => {
  it('defaults to commercial-only (residential excluded) and returns snapshot header', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'ew-prog-endpoint-'));
    const prev = process.env.EVERWATT_PROGRAM_LIBRARY_BASEDIR;
    process.env.EVERWATT_PROGRAM_LIBRARY_BASEDIR = baseDir;

    try {
      const snap: ProgramSnapshotV1 = {
        utilityKey: 'PGE',
        capturedAt: '2026-02-07T00:00:00.000Z',
        versionTag: '2026-02-07T0000Z',
        programs: [
          {
            programId: 'nr',
            utilityKey: 'PGE',
            programName: 'Nonresidential Program',
            status: 'active',
            customerClassTags: ['nonresidential'],
            measureCategories: ['hvac'],
            source: { url: 'seed://nr', retrievedAtIso: '2026-02-07T00:00:00.000Z' },
            because: [],
            evidence: [],
            missingInfo: [],
          } as any,
          {
            programId: 'res',
            utilityKey: 'PGE',
            programName: 'Residential Program',
            status: 'active',
            customerClassTags: ['residential'],
            measureCategories: ['hvac'],
            source: { url: 'seed://res', retrievedAtIso: '2026-02-07T00:00:00.000Z' },
            because: [],
            evidence: [],
            missingInfo: [],
          } as any,
        ],
      };
      await saveProgramSnapshotV1(snap, { baseDir });

      const res = await app.request('/api/programs/ca/latest?utility=PGE');
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json?.success).toBe(true);
      expect(json?.curationStatus?.programCuration?.loadedFromPath).toBeTruthy();
      const pge = (json.utilities || []).find((u: any) => u.utilityKey === 'PGE');
      expect(pge.latestSnapshot?.versionTag).toBe('2026-02-07T0000Z');
      expect(pge.latestSnapshot?.programCount).toBe(1);
      expect((pge.programs || []).map((p: any) => p.programId)).toEqual(['nr']);
      expect(pge?.curationStatus?.loadedFromPath).toBeTruthy();
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_PROGRAM_LIBRARY_BASEDIR = prev;
      else delete process.env.EVERWATT_PROGRAM_LIBRARY_BASEDIR;
    }
  });
});

