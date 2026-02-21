import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

import { discoverGoldenReportSessionCasesV1, runGoldenReportSessionCaseV1 } from '../src/modules/testing/goldenReportSessionsV1/runner';
import { stableSnapshotStringifyV1 } from '../src/modules/testing/goldenSnapshotsV1/stableSnapshotJsonV1';

function loadJson(fp: string): any {
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

function stableSnapshotNormalize(value: any): any {
  return JSON.parse(stableSnapshotStringifyV1(value, 0));
}

describe('Golden Report Sessions v1 — strict deterministic regression gate', () => {
  const SNAP_DIR = path.join(process.cwd(), 'tests', 'snapshots', 'reportSessionsV1');
  const NOW_ISO = '2026-03-01T00:00:00.000Z';

  it(
    'matches committed snapshots',
    async () => {
      const cases = discoverGoldenReportSessionCasesV1({ nowIso: NOW_ISO });
      mkdirSync(SNAP_DIR, { recursive: true });

      for (const c of cases) {
        const snapPath = path.join(SNAP_DIR, `${c.caseId}.json`);
        const out = await runGoldenReportSessionCaseV1(c);
        const payloadNorm = stableSnapshotNormalize(out);

        if (!existsSync(snapPath)) {
          throw new Error(`Missing snapshot for ${c.caseId}. Create it by running the golden runner and committing ${path.relative(process.cwd(), snapPath)}.`);
        }

        const prev = loadJson(snapPath);
        const prevNorm = stableSnapshotNormalize(prev);
        expect(payloadNorm).toEqual(prevNorm);
      }
    },
    120_000,
  );
});

