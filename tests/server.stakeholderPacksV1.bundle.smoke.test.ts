import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';
import { enableDemoJwtForTests, getDemoBearerToken } from './helpers/demoJwt';

describe('stakeholder report packs v1 bundle.zip endpoint (smoke)', () => {
  it('returns a zip of stored artifacts (no recompute)', async () => {
    const sessionsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-reportSessionsV1-bundle-'));
    const runsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-analysisRunsV1-bundle-'));
    const projectsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-projects-bundle-'));
    const storageDir = mkdtempSync(path.join(os.tmpdir(), 'ew-storage-bundle-'));

    const prevSessions = process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR;
    const prevRuns = process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
    const prevProjects = process.env.EVERWATT_PROJECTS_BASEDIR;
    const prevStorage = process.env.STORAGE_LOCAL_DIR;

    process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR = sessionsDir;
    process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = runsDir;
    process.env.EVERWATT_PROJECTS_BASEDIR = projectsDir;
    process.env.STORAGE_LOCAL_DIR = storageDir;

    try {
      vi.resetModules();
      enableDemoJwtForTests();
      const { default: app } = await import('../src/server');
      const { default: JSZip } = await import('jszip');
      const authz = await getDemoBearerToken(app, 'u_test@example.com', 'u_test');

      const createRes = await app.request('/api/report-sessions-v1/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authz },
        body: JSON.stringify({ kind: 'WIZARD', title: 'Test Session' }),
      });
      expect(createRes.status).toBe(200);
      const createJson: any = await createRes.json();
      const reportId = String(createJson?.reportId || '').trim();
      expect(reportId).toBeTruthy();

      const runRes = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/run-utility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authz },
        body: JSON.stringify({ workflowInputs: { demo: true } }),
      });
      expect(runRes.status).toBe(200);
      const runJson: any = await runRes.json();
      expect(runJson?.success).toBe(true);
      const projectId = String(runJson?.projectId || '').trim();
      expect(projectId).toBeTruthy();

      const genEng = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/generate-engineering-pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authz },
        body: JSON.stringify({}),
      });
      if (genEng.status !== 200) {
        throw new Error(`generate-engineering-pack failed: ${genEng.status} ${await genEng.text()}`);
      }
      const engJson: any = await genEng.json();
      const engRevId = String(engJson?.revisionMeta?.revisionId || '').trim();
      expect(engRevId).toBeTruthy();

      const genExec = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/generate-executive-pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authz },
        body: JSON.stringify({}),
      });
      if (genExec.status !== 200) {
        throw new Error(`generate-executive-pack failed: ${genExec.status} ${await genExec.text()}`);
      }
      const execJson: any = await genExec.json();
      const execRevId = String(execJson?.revisionMeta?.revisionId || '').trim();
      expect(execRevId).toBeTruthy();

      const zipRes = await app.request(`/api/projects/${encodeURIComponent(projectId)}/reports/revisions/${encodeURIComponent(execRevId)}/bundle.zip`, {
        headers: { Authorization: authz },
      });
      expect(zipRes.status).toBe(200);
      expect(String(zipRes.headers.get('content-type') || '')).toContain('application/zip');
      const cd = String(zipRes.headers.get('content-disposition') || '');
      expect(cd).toContain('.zip');
      expect(cd).toContain(`Rev${execRevId}`);

      const zipBuf = Buffer.from(await zipRes.arrayBuffer());
      const zip = await JSZip.loadAsync(zipBuf);
      const names = Object.keys(zip.files).sort();
      expect(names).toContain('README.txt');
      expect(names).toContain('pack.json');
      expect(names).toContain('executive-pack.pdf');
      expect(names).toContain('engineering-pack.pdf');

      const readme = await zip.file('README.txt')!.async('string');
      expect(readme).toContain('snapshot-only');
      const packJsonText = await zip.file('pack.json')!.async('string');
      const packJson = JSON.parse(packJsonText) as any;
      expect(packJson?.success).toBe(true);
      expect(packJson?.projectId).toBe(projectId);
      expect(packJson?.revisionId).toBe(execRevId);

      // Prove GET is snapshot-only: delete analysis runs dir and re-fetch bundle.
      rmSync(runsDir, { recursive: true, force: true });
      const zipRes2 = await app.request(`/api/projects/${encodeURIComponent(projectId)}/reports/revisions/${encodeURIComponent(execRevId)}/bundle.zip`, {
        headers: { Authorization: authz },
      });
      expect(zipRes2.status).toBe(200);
    } finally {
      rmSync(sessionsDir, { recursive: true, force: true });
      rmSync(runsDir, { recursive: true, force: true });
      rmSync(projectsDir, { recursive: true, force: true });
      rmSync(storageDir, { recursive: true, force: true });
      if (typeof prevSessions === 'string') process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR = prevSessions;
      else delete process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR;
      if (typeof prevRuns === 'string') process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = prevRuns;
      else delete process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
      if (typeof prevProjects === 'string') process.env.EVERWATT_PROJECTS_BASEDIR = prevProjects;
      else delete process.env.EVERWATT_PROJECTS_BASEDIR;
      if (typeof prevStorage === 'string') process.env.STORAGE_LOCAL_DIR = prevStorage;
      else delete process.env.STORAGE_LOCAL_DIR;
    }
  });
});

