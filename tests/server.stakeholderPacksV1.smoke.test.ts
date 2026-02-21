import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { rmSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';

describe('stakeholder report packs v1 endpoints (smoke)', () => {
  it('generate engineering + executive packs; retrieve stored html/json without recompute', async () => {
    const sessionsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-reportSessionsV1-pack-'));
    const runsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-analysisRunsV1-pack-'));
    const projectsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-projects-pack-'));

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
      const reportId = String(createJson?.reportId || '').trim();
      expect(reportId).toBeTruthy();

      const runRes = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/run-utility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'u_test' },
        body: JSON.stringify({ workflowInputs: { demo: true } }),
      });
      expect(runRes.status).toBe(200);
      const runJson: any = await runRes.json();
      expect(runJson?.success).toBe(true);
      const runId = String(runJson?.runId || '').trim();
      const projectId = String(runJson?.projectId || '').trim();
      expect(runId).toBeTruthy();
      expect(projectId).toBeTruthy();

      const genEng = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/generate-engineering-pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'u_test' },
        body: JSON.stringify({}),
      });
      expect(genEng.status).toBe(200);
      const engJson: any = await genEng.json();
      expect(engJson?.success).toBe(true);
      expect(engJson?.revisionMeta?.reportType).toBe('ENGINEERING_PACK_V1');
      const engRevId = String(engJson?.revisionMeta?.revisionId || '').trim();
      expect(engRevId).toBeTruthy();

      const genExec = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/generate-executive-pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'u_test' },
        body: JSON.stringify({}),
      });
      expect(genExec.status).toBe(200);
      const execJson: any = await genExec.json();
      expect(execJson?.success).toBe(true);
      expect(execJson?.revisionMeta?.reportType).toBe('EXECUTIVE_PACK_V1');
      const execRevId = String(execJson?.revisionMeta?.revisionId || '').trim();
      expect(execRevId).toBeTruthy();

      const htmlRes = await app.request(`/api/projects/${encodeURIComponent(projectId)}/reports/revisions/${encodeURIComponent(execRevId)}/html`, {
        headers: { 'x-user-id': 'u_test' },
      });
      expect(htmlRes.status).toBe(200);
      const htmlText = await htmlRes.text();
      expect(htmlText).toContain('EverWatt');
      expect(htmlText).toContain('EXECUTIVE_PACK_V1');

      const jsonRes = await app.request(`/api/projects/${encodeURIComponent(projectId)}/reports/revisions/${encodeURIComponent(execRevId)}/json`, {
        headers: { 'x-user-id': 'u_test' },
      });
      expect(jsonRes.status).toBe(200);
      const revJson: any = await jsonRes.json();
      expect(revJson?.success).toBe(true);
      expect(revJson?.reportType).toBe('EXECUTIVE_PACK_V1');
      expect(revJson?.revision?.packJson?.schemaVersion).toBe('executivePackV1');
      expect(revJson?.revision?.packJson?.verificationSummaryV1).toBeTruthy();
      expect(revJson?.revision?.packJson?.claimsPolicyV1).toBeTruthy();

      // Prove GET is snapshot-only: delete analysis runs dir and re-fetch HTML/JSON.
      rmSync(runsDir, { recursive: true, force: true });

      const htmlRes2 = await app.request(`/api/projects/${encodeURIComponent(projectId)}/reports/revisions/${encodeURIComponent(engRevId)}/html`, {
        headers: { 'x-user-id': 'u_test' },
      });
      expect(htmlRes2.status).toBe(200);

      const jsonRes2 = await app.request(`/api/projects/${encodeURIComponent(projectId)}/reports/revisions/${encodeURIComponent(engRevId)}/json`, {
        headers: { 'x-user-id': 'u_test' },
      });
      expect(jsonRes2.status).toBe(200);
      const revJson2: any = await jsonRes2.json();
      expect(revJson2?.success).toBe(true);
      expect(revJson2?.reportType).toBe('ENGINEERING_PACK_V1');
      expect(revJson2?.revision?.packJson?.schemaVersion).toBe('engineeringPackV1');
      expect(revJson2?.revision?.packJson?.verificationSummaryV1).toBeTruthy();
      expect(revJson2?.revision?.packJson?.claimsPolicyV1).toBeTruthy();
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

