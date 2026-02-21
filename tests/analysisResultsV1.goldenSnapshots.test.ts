import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { discoverGoldenSnapshotCasesV1, loadGoldenSnapshotBatteryLibraryV1, runGoldenSnapshotCaseV1 } from '../src/modules/testing/goldenSnapshotsV1/runner';
import { stableSnapshotStringifyV1 } from '../src/modules/testing/goldenSnapshotsV1/stableSnapshotJsonV1';

type Json = any;

function loadJson(fp: string): Json {
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

function stableSnapshotNormalize(value: any): any {
  // Normalize to the exact JSON representation we commit (key order, NaN/Infinity handling, undefined removal, etc.)
  return JSON.parse(stableSnapshotStringifyV1(value, 0));
}

function summarizeChangedPaths(a: any, b: any, opts?: { maxDepth?: number; prefix?: string; limit?: number }): string[] {
  const maxDepth = Number.isFinite(Number(opts?.maxDepth)) ? Number(opts?.maxDepth) : 2;
  const prefix = String(opts?.prefix || '').trim();
  const limit = Number.isFinite(Number(opts?.limit)) ? Number(opts?.limit) : 40;

  const out: string[] = [];
  const push = (p: string) => {
    if (out.length >= limit) return;
    out.push(p);
  };

  const eqPrim = (x: any, y: any) => x === y || (Number.isNaN(x) && Number.isNaN(y));

  const walk = (x: any, y: any, p: string, depth: number) => {
    if (out.length >= limit) return;
    if (eqPrim(x, y)) return;
    if (depth >= maxDepth) {
      push(p || '(root)');
      return;
    }

    const xIsArr = Array.isArray(x);
    const yIsArr = Array.isArray(y);
    if (xIsArr || yIsArr) {
      if (!xIsArr || !yIsArr) {
        push(p || '(root)');
        return;
      }
      if (x.length !== y.length) {
        push(p || '(root)');
        return;
      }
      // arrays can be huge; just mark the parent when any element differs
      for (let i = 0; i < x.length; i++) {
        if (!eqPrim(x[i], y[i])) {
          push(p || '(root)');
          return;
        }
      }
      return;
    }

    const xObj = x && typeof x === 'object';
    const yObj = y && typeof y === 'object';
    if (!xObj || !yObj) {
      push(p || '(root)');
      return;
    }

    const keys = new Set<string>([...Object.keys(x), ...Object.keys(y)]);
    const sorted = [...keys].sort((aa, bb) => aa.localeCompare(bb));
    for (const k of sorted) {
      const nextP = p ? `${p}.${k}` : k;
      if (!(k in x) || !(k in y)) {
        push(nextP);
        continue;
      }
      walk(x[k], y[k], nextP, depth + 1);
      if (out.length >= limit) return;
    }
  };

  walk(a, b, prefix, 0);
  return out;
}

describe(
  'Golden Snapshots v1 (analysis-results-v1) — strict deterministic regression gate',
  () => {
    const SNAP_DIR = path.join(process.cwd(), 'tests', 'snapshots', 'analysisResultsV1');
    const UPDATE = String(process.env.UPDATE_SNAPSHOTS || '').trim() === '1';
    const NOW_ISO = '2026-03-01T00:00:00.000Z';

    it(
      'matches committed snapshots (or updates them when UPDATE_SNAPSHOTS=1)',
      async () => {
        const cases = discoverGoldenSnapshotCasesV1({ nowIso: NOW_ISO });
        const batteryLibrary = await loadGoldenSnapshotBatteryLibraryV1();

        mkdirSync(SNAP_DIR, { recursive: true });

        for (const c of cases) {
          const snapPath = path.join(SNAP_DIR, `${c.caseId}.json`);
          const out = await runGoldenSnapshotCaseV1({ c, batteryLibrary });
          const payload = { caseId: out.caseId, response: out.response, reportJson: out.reportJson };
          const payloadNorm = stableSnapshotNormalize(payload);

          if (!existsSync(snapPath)) {
            if (!UPDATE) throw new Error(`Missing snapshot for ${c.caseId}. Re-run with UPDATE_SNAPSHOTS=1 to create it.`);
            writeFileSync(snapPath, stableSnapshotStringifyV1(payloadNorm, 2), 'utf-8');
            continue;
          }

          if (UPDATE) {
            writeFileSync(snapPath, stableSnapshotStringifyV1(payloadNorm, 2), 'utf-8');
            continue;
          }

          const prev = loadJson(snapPath);
          const prevNorm = stableSnapshotNormalize(prev);
          try {
            expect(payloadNorm).toEqual(prevNorm);
          } catch (e) {
            const changed = summarizeChangedPaths(payloadNorm, prevNorm, { maxDepth: 3, limit: 80 });
            // eslint-disable-next-line no-console
            console.error(`[goldenSnapshotsV1] ${c.caseId} changed paths (sample):\n- ${changed.join('\n- ')}`);
            throw e;
          }
        }
      },
      180_000,
    );
  },
  180_000,
);

