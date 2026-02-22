import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';
import { enableDemoJwtForTests, getDemoBearerToken } from './helpers/demoJwt';

describe('analysisRunsV1 endpoints (smoke)', () => {
  it('can run-and-store (demo), fetch run snapshot, diff, and render pdf without recompute', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'ew-analysisRunsV1-endpoint-'));
    const prev = process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
    process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = baseDir;

    try {
      vi.resetModules();
      enableDemoJwtForTests();
      const { default: app } = await import('../src/server');
      const authz = await getDemoBearerToken(app, 'u_test@example.com', 'u_test');

      const runRes = await app.request('/api/analysis-results-v1/run-and-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authz },
        body: JSON.stringify({ demo: true }),
      });
      expect(runRes.status).toBe(200);
      const runJson: any = await runRes.json();
      expect(runJson?.success).toBe(true);
      expect(String(runJson?.runId || '')).toBeTruthy();
      expect(runJson?.snapshot?.reportJson).toBeTruthy();

      const runId = String(runJson.runId);

      const getRes = await app.request(`/api/analysis-results-v1/runs/${runId}`, {
        headers: { Authorization: authz },
      });
      expect(getRes.status).toBe(200);
      const getJson: any = await getRes.json();
      expect(getJson?.success).toBe(true);
      expect(getJson?.analysisRun?.runId).toBe(runId);

      const diffRes = await app.request(`/api/analysis-results-v1/diff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authz },
        body: JSON.stringify({ runIdA: runId, runIdB: runId }),
      });
      expect(diffRes.status).toBe(200);
      const diffJson: any = await diffRes.json();
      expect(diffJson?.success).toBe(true);
      expect(Array.isArray(diffJson?.diff?.categories)).toBe(true);

      const pdfRes = await app.request(`/api/analysis-results-v1/runs/${runId}/pdf`, {
        headers: { Authorization: authz },
      });
      expect(pdfRes.status).toBe(200);
      expect(pdfRes.headers.get('content-type')).toContain('application/pdf');
      const buf = await pdfRes.arrayBuffer();
      expect(buf.byteLength).toBeGreaterThan(1000);
    } finally {
      if (typeof prev === 'string') process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = prev;
      else delete process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
    }
  });
});

