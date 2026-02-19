import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';

describe('reportSessionsV1 endpoints (smoke)', () => {
  it('create session -> run utility (demo) -> attach runId -> generate revision -> build wizard output', async () => {
    const sessionsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-reportSessionsV1-endpoint-'));
    const runsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-analysisRunsV1-endpoint-'));
    const projectsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-projects-endpoint-'));

    const prevSessions = process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR;
    const prevRuns = process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
    const prevProjects = process.env.EVERWATT_PROJECTS_BASEDIR;

    process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR = sessionsDir;
    process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = runsDir;
    process.env.EVERWATT_PROJECTS_BASEDIR = projectsDir;

    try {
      vi.resetModules();
      const { default: app } = await import('../src/server');

      const createRes = await app.request('/api/report-sessions-v1/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'u_test' },
        body: JSON.stringify({ kind: 'WIZARD', title: 'Test Session' }),
      });
      expect(createRes.status).toBe(200);
      const createJson: any = await createRes.json();
      expect(createJson?.success).toBe(true);
      const reportId = String(createJson?.reportId || '').trim();
      expect(reportId).toMatch(/^rs_/);

      const runRes = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/run-utility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'u_test' },
        body: JSON.stringify({ workflowInputs: { demo: true } }),
      });
      expect(runRes.status).toBe(200);
      const runJson: any = await runRes.json();
      expect(runJson?.success).toBe(true);
      expect(String(runJson?.runId || '')).toBeTruthy();
      expect(String(runJson?.projectId || '')).toBeTruthy();

      const getRes = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}`, {
        headers: { 'x-user-id': 'u_test' },
      });
      expect(getRes.status).toBe(200);
      const getJson: any = await getRes.json();
      expect(getJson?.success).toBe(true);
      expect(getJson?.session?.reportId).toBe(reportId);
      expect(Array.isArray(getJson?.session?.runIds)).toBe(true);
      expect(getJson.session.runIds[0]).toBe(runJson.runId);

      const genRes = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/generate-internal-engineering-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'u_test' },
        body: JSON.stringify({}),
      });
      expect(genRes.status).toBe(200);
      const genJson: any = await genRes.json();
      expect(genJson?.success).toBe(true);
      expect(String(genJson?.revisionMeta?.revisionId || '')).toBeTruthy();
      expect(String(genJson?.revisionMeta?.downloadUrl || '')).toContain('/api/projects/');

      const wizRes = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/build-wizard-output`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'u_test' },
        body: JSON.stringify({}),
      });
      expect(wizRes.status).toBe(200);
      const wizJson: any = await wizRes.json();
      expect(wizJson?.success).toBe(true);
      expect(wizJson?.wizardOutput?.provenance?.reportId).toBe(reportId);
      expect(Array.isArray(wizJson?.wizardOutput?.provenance?.runIdsUsed)).toBe(true);
      expect(wizJson?.wizardOutput?.provenance?.runIdsUsed[0]).toBe(runJson.runId);
      expect(typeof wizJson?.wizardOutput?.wizardOutputHash).toBe('string');
      expect(typeof wizJson?.wizardOutput?.dataQuality?.score0to100).toBe('number');
      expect(Array.isArray(wizJson?.wizardOutput?.findings)).toBe(true);
    } finally {
      if (typeof prevSessions === 'string') process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR = prevSessions;
      else delete process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR;
      if (typeof prevRuns === 'string') process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = prevRuns;
      else delete process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
      if (typeof prevProjects === 'string') process.env.EVERWATT_PROJECTS_BASEDIR = prevProjects;
      else delete process.env.EVERWATT_PROJECTS_BASEDIR;
    }
  });
});

