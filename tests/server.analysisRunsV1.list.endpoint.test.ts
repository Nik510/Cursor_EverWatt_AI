import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';
import { createAnalysisRunsStoreFsV1 } from '../src/modules/analysisRunsV1/storeFsV1';
import type { AnalysisRunV1 } from '../src/modules/analysisRunsV1/types';

describe('analysisRunsV1 list endpoint', () => {
  it('returns empty list + warning when index.json missing', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'ew-analysisRunsV1-list-missing-'));
    const prev = process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
    process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = baseDir;

    try {
      vi.resetModules();
      const { default: app } = await import('../src/server');

      const res = await app.request('/api/analysis-results-v1/runs', { headers: { 'x-user-id': 'u_test' } });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json?.success).toBe(true);
      expect(Array.isArray(json?.runs)).toBe(true);
      expect(json.runs.length).toBe(0);
      expect(Array.isArray(json?.warnings)).toBe(true);
      expect(String(json.warnings?.[0] || '')).toMatch(/index\.json/i);
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = prev;
      else delete process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
    }
  });

  it('lists runs deterministically by createdAtIso desc then runId asc (bounded fields only)', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'ew-analysisRunsV1-list-seeded-'));
    const prev = process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
    process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = baseDir;

    try {
      vi.resetModules();
      const { default: app } = await import('../src/server');

      async function runAndStoreDemo(): Promise<{ runId: string; createdAtIso: string; inputFingerprint: string }> {
        const res = await app.request('/api/analysis-results-v1/run-and-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': 'u_test' },
          body: JSON.stringify({ demo: true }),
        });
        expect(res.status).toBe(200);
        const json: any = await res.json();
        expect(json?.success).toBe(true);
        return {
          runId: String(json?.analysisRun?.runId || json?.runId || ''),
          createdAtIso: String(json?.analysisRun?.createdAtIso || ''),
          inputFingerprint: String(json?.analysisRun?.inputFingerprint || ''),
        };
      }

      const a = await runAndStoreDemo();
      const b = await runAndStoreDemo();

      const listRes = await app.request('/api/analysis-results-v1/runs', { headers: { 'x-user-id': 'u_test' } });
      expect(listRes.status).toBe(200);
      const listJson: any = await listRes.json();
      expect(listJson?.success).toBe(true);
      expect(Array.isArray(listJson?.runs)).toBe(true);
      expect(listJson.runs.length).toBe(2);

      const expected = [a, b].slice().sort((x, y) => String(y.createdAtIso).localeCompare(String(x.createdAtIso)) || String(x.runId).localeCompare(String(y.runId)));
      expect(listJson.runs.map((r: any) => r.runId)).toEqual(expected.map((r) => r.runId));

      for (const r of listJson.runs as any[]) {
        expect(typeof r.runId).toBe('string');
        expect(typeof r.createdAtIso).toBe('string');
        expect(typeof r.inputFingerprint).toBe('string');
        expect(r.summary && typeof r.summary === 'object').toBe(true);
        expect(typeof r.summary.utility).toBe('string');
        expect((r as any).snapshot).toBeUndefined();
        expect((r as any).analysisRun).toBeUndefined();
      }
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = prev;
      else delete process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
    }
  });

  it('lists runs for a single project with deterministic order and respects limit', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'ew-analysisRunsV1-list-project-'));
    const prev = process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
    process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = baseDir;

    try {
      // Seed the store directly (no engine compute).
      const store = createAnalysisRunsStoreFsV1({ baseDir });
      const mkRun = (args: { runId: string; createdAtIso: string; projectId: string; hasInterval: boolean; intervalDays: number | null }) =>
        ({
          runId: args.runId,
          createdAtIso: args.createdAtIso,
          nowIso: args.createdAtIso,
          projectId: args.projectId,
          inputFingerprint: `fp_${args.runId}`,
          engineVersions: { engine: '1' },
          provenance: { tariffSnapshotId: `t_${args.runId}` },
          warningsSummary: { engineWarningsCount: 1, topEngineWarningCodes: ['E1'], missingInfoCount: 2, topMissingInfoCodes: ['M1'] },
          snapshot: {
            response: { success: true },
            reportJson: {
              schemaVersion: 'internalEngineeringReportV1',
              summary: { json: { rateFit: { status: 'good' }, building: { currentRateCode: 'X' } }, markdown: '' },
              analysisTraceV1: {
                coverage: {
                  hasInterval: args.hasInterval,
                  intervalDays: args.intervalDays,
                  tariffMatchStatus: 'good',
                  supplyProviderType: 'CCA',
                  supplyConfidence: 0.7,
                },
              },
              telemetry: { intervalElectricV1: { present: args.hasInterval, pointCount: args.hasInterval ? 10 : 0, warningCount: 0 } },
              workflow: { utility: { insights: { supplyStructure: { supplyType: 'CCA', confidence: 0.7 } } } },
              engineVersions: { engine: '1' },
            },
          },
        }) as AnalysisRunV1;

      await store.writeRun(mkRun({ runId: 'r1', createdAtIso: '2026-02-19T00:00:00.000Z', projectId: 'p1', hasInterval: false, intervalDays: null }));
      await store.writeRun(mkRun({ runId: 'r2', createdAtIso: '2026-02-20T00:00:00.000Z', projectId: 'p1', hasInterval: true, intervalDays: 30 }));
      await store.writeRun(mkRun({ runId: 'r3', createdAtIso: '2026-02-21T00:00:00.000Z', projectId: 'p2', hasInterval: true, intervalDays: 10 }));

      vi.resetModules();
      const { default: app } = await import('../src/server');

      const res = await app.request('/api/analysis-results-v1/projects/p1/runs?limit=1', { headers: { 'x-user-id': 'u_test' } });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json?.success).toBe(true);
      expect(json?.projectId).toBe('p1');
      expect(Array.isArray(json?.runs)).toBe(true);
      expect(json.runs.length).toBe(1);
      expect(json.runs[0].runId).toBe('r2'); // newest for p1
      expect(json.runs[0].warningsSummary?.engineWarningsCount).toBe(1);
      expect(json.runs[0].coverage?.hasInterval).toBe(true);
      expect(json.runs[0].coverage?.intervalDays).toBe(30);
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = prev;
      else delete process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
    }
  });
});

