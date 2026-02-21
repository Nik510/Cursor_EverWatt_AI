import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';

type RunAndStoreResponse = {
  success: true;
  runId: string;
  analysisRun?: { runId: string; createdAtIso: string; inputFingerprint: string };
};

function writeProjectFixture(args: { userId: string; projectId: string; rateCode: string }) {
  const projectsDir = path.join(process.cwd(), 'data', 'projects');
  mkdirSync(projectsDir, { recursive: true });

  const intervalElectricV1 = [
    { timestampIso: '2026-02-19T00:00:00.000Z', intervalMinutes: 15, kWh: 1.5, kW: 6.0 },
    { timestampIso: '2026-02-19T00:15:00.000Z', intervalMinutes: 15, kWh: 1.0, kW: 4.0 },
    { timestampIso: '2026-02-19T00:30:00.000Z', intervalMinutes: 15, kWh: 2.0, kW: 8.0 },
    { timestampIso: '2026-02-19T00:45:00.000Z', intervalMinutes: 15, kWh: 1.25, kW: 5.0 },
  ];

  const project = {
    id: args.projectId,
    userId: args.userId,
    customer: {
      projectName: `Contract Fixture ${args.projectId}`,
      rateCode: args.rateCode,
      customerType: 'commercial',
    },
    telemetry: {
      utilityTerritory: 'PGE',
      intervalElectricV1,
      intervalElectricMetaV1: {
        schemaVersion: 'intervalElectricMetaV1',
        parserVersion: 'test',
        timezoneUsed: 'UTC',
      },
      billPdfText: '',
    },
    updatedAt: '2026-02-19T00:00:00.000Z',
  };

  const fp = path.join(projectsDir, `${args.projectId}.json`);
  writeFileSync(fp, JSON.stringify(project, null, 2));
  return fp;
}

describe('analysisRunsV1 endpoints (e2e deterministic contract)', () => {
  it('run-and-store x2, list is deterministic, diff is bounded, and pdf returns bytes', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'ew-analysisRunsV1-e2e-'));
    const prevBaseDir = process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
    process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = baseDir;

    const userId = 'u_test';
    const projectIdA = `p_contract_${process.pid}_a`;
    const projectIdB = `p_contract_${process.pid}_b`;
    const projectFileA = writeProjectFixture({ userId, projectId: projectIdA, rateCode: 'B-19' });
    const projectFileB = writeProjectFixture({ userId, projectId: projectIdB, rateCode: 'B-20' });

    vi.useFakeTimers();
    try {
      vi.resetModules();
      const { default: app } = await import('../src/server');

      async function runAndStore(projectId: string, nowIso: string): Promise<RunAndStoreResponse> {
        vi.setSystemTime(new Date(nowIso));
        const res = await app.request('/api/analysis-results-v1/run-and-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify({ projectId }),
        });
        expect(res.status).toBe(200);
        const json = (await res.json()) as any;
        expect(json?.success).toBe(true);
        expect(String(json?.runId || '')).toBeTruthy();
        return json as RunAndStoreResponse;
      }

      const runA = await runAndStore(projectIdA, '2026-02-19T00:00:00.000Z');
      const runB = await runAndStore(projectIdB, '2026-02-19T00:00:01.000Z');

      expect(runA.runId).not.toBe(runB.runId);

      const listRes = await app.request('/api/analysis-results-v1/runs', { headers: { 'x-user-id': userId } });
      expect(listRes.status).toBe(200);
      const listJson: any = await listRes.json();
      expect(listJson?.success).toBe(true);
      expect(Array.isArray(listJson?.runs)).toBe(true);
      expect(listJson.runs.length).toBe(2);

      // Deterministic ordering: createdAtIso desc then runId asc
      expect(listJson.runs[0].runId).toBe(runB.runId);
      expect(listJson.runs[1].runId).toBe(runA.runId);

      // UI contract: bounded index rows only (no embedded snapshot)
      for (const r of listJson.runs as any[]) {
        expect(typeof r.runId).toBe('string');
        expect(typeof r.createdAtIso).toBe('string');
        expect(typeof r.inputFingerprint).toBe('string');
        expect(r.summary && typeof r.summary === 'object').toBe(true);
        expect(typeof r.summary.utility).toBe('string');
        expect((r as any).snapshot).toBeUndefined();
        expect((r as any).analysisRun).toBeUndefined();
      }

      const diffRes = await app.request('/api/analysis-results-v1/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ runIdA: runA.runId, runIdB: runB.runId }),
      });
      expect(diffRes.status).toBe(200);
      const diffJson: any = await diffRes.json();
      expect(diffJson?.success).toBe(true);
      expect(diffJson?.diff?.runA?.runId).toBe(runA.runId);
      expect(diffJson?.diff?.runB?.runId).toBe(runB.runId);

      // Deterministic, bounded diff contract
      expect(diffJson.diff.categories.map((c: any) => c.category)).toEqual([
        'rate_and_supply',
        'interval',
        'weather_determinants',
        'battery',
        'programs',
        'warnings',
      ]);
      for (const c of diffJson.diff.categories as any[]) {
        expect(Array.isArray(c.changedPaths)).toBe(true);
        expect(Array.isArray(c.highlights)).toBe(true);
        expect(c.changedPaths.length).toBeLessThanOrEqual(25);
        expect(c.highlights.length).toBeLessThanOrEqual(10);
      }
      expect(diffJson.diff.changedSections).toEqual(expect.arrayContaining(['rate_and_supply']));

      const pdfRes = await app.request(`/api/analysis-results-v1/runs/${encodeURIComponent(runB.runId)}/pdf`, {
        headers: { 'x-user-id': userId },
      });
      expect(pdfRes.status).toBe(200);
      expect(pdfRes.headers.get('content-type')).toContain('application/pdf');
      const buf = await pdfRes.arrayBuffer();
      expect(buf.byteLength).toBeGreaterThan(1000);
    } finally {
      vi.useRealTimers();

      try {
        rmSync(projectFileA, { force: true });
        rmSync(projectFileB, { force: true });
      } catch {
        // best-effort cleanup
      }
      try {
        rmSync(baseDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }

      if (typeof prevBaseDir === 'string') process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = prevBaseDir;
      else delete process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
    }
  }, 30_000);
});

