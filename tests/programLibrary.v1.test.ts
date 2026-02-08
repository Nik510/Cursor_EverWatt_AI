import { describe, expect, test } from 'vitest';

import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { applyProgramCurationV1 } from '../src/modules/policy/curation/loadCuration';
import { getLatestProgramsV1 } from '../src/modules/programLibrary/v1';
import { isSnapshotStaleV1, loadLatestProgramSnapshotV1, saveProgramSnapshotV1 } from '../src/modules/programLibrary/v1/storage';
import type { ProgramSnapshotV1 } from '../src/modules/programLibrary/v1/types';

describe('programLibrary v1', () => {
  test('snapshot write/read roundtrip and latest lookup', async () => {
    const baseDir = await mkdtemp(path.join(os.tmpdir(), 'ew-prog-'));
    const snap: ProgramSnapshotV1 = {
      utilityKey: 'SCE',
      capturedAt: '2026-02-07T00:00:00.000Z',
      versionTag: '2026-02-07T0000Z',
      programs: [
        {
          programId: 'X',
          utilityKey: 'SCE',
          programName: 'X',
          status: 'active',
          customerClassTags: ['nonresidential'],
          measureCategories: ['hvac'],
          source: { url: 'seed://x', retrievedAtIso: '2026-02-07T00:00:00.000Z' },
          because: [],
          evidence: [],
          missingInfo: [],
        } as any,
      ],
    };
    await saveProgramSnapshotV1(snap, { baseDir });
    const { snapshot, warnings } = await loadLatestProgramSnapshotV1('SCE', { baseDir });
    expect(warnings.length).toBe(0);
    expect(snapshot?.versionTag).toBe('2026-02-07T0000Z');
    expect(snapshot?.programs?.length).toBe(1);
  });

  test('stale calc matches 14-day policy', () => {
    expect(isSnapshotStaleV1('2026-02-01T00:00:00.000Z', '2026-02-10T00:00:00.000Z', 14)).toBe(false);
    expect(isSnapshotStaleV1('2026-02-01T00:00:00.000Z', '2026-02-20T00:00:00.000Z', 14)).toBe(true);
  });

  test('default policy excludes residential-only programs', () => {
    const programs = [
      { programId: 'res', customerClassTags: ['residential'] },
      { programId: 'nr', customerClassTags: ['nonresidential'] },
    ];
    const out = applyProgramCurationV1({ programs: programs as any[], curation: {} });
    expect(out.map((p) => p.programId)).toEqual(['nr']);
  });

  test('curation labels attach deterministically', () => {
    const programs = [{ programId: 'p1', customerClassTags: ['nonresidential'] }];
    const out = applyProgramCurationV1({
      programs: programs as any[],
      curation: { p1: { labels: { recommended: true }, worthItScore: 80, internalNotes: 'ok' } },
    });
    expect((out[0] as any).curation?.labels?.recommended).toBe(true);
    expect((out[0] as any).curation?.worthItScore).toBe(80);
  });

  test('onlyParticipatedBefore filter works deterministically', async () => {
    const baseDir = await mkdtemp(path.join(os.tmpdir(), 'ew-prog-'));
    const snap: ProgramSnapshotV1 = {
      utilityKey: 'PGE',
      capturedAt: '2026-02-07T00:00:00.000Z',
      versionTag: '2026-02-07T0000Z',
      programs: [
        {
          programId: 'PGE-NR-EE-REBATE-001',
          utilityKey: 'PGE',
          programName: 'PGE program',
          status: 'active',
          customerClassTags: ['nonresidential'],
          measureCategories: ['hvac'],
          participatedBefore: true,
          source: { url: 'seed://x', retrievedAtIso: '2026-02-07T00:00:00.000Z' },
          because: [],
          evidence: [],
          missingInfo: [],
        } as any,
        {
          programId: 'PGE-OTHER-001',
          utilityKey: 'PGE',
          programName: 'other',
          status: 'active',
          customerClassTags: ['nonresidential'],
          measureCategories: ['hvac'],
          source: { url: 'seed://y', retrievedAtIso: '2026-02-07T00:00:00.000Z' },
          because: [],
          evidence: [],
          missingInfo: [],
        } as any,
      ],
    };
    await saveProgramSnapshotV1(snap, { baseDir });
    const res = await getLatestProgramsV1({ utilityKey: 'PGE', onlyParticipatedBefore: true, baseDir });
    expect(res.utilityKey).toBe('PGE');
    expect(Array.isArray(res.programs)).toBe(true);
    expect(res.programs.map((p: any) => p.programId)).toEqual(['PGE-NR-EE-REBATE-001']);
  });
});

