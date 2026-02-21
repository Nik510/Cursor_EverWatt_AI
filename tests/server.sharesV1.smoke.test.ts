import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';

describe('sharesV1 endpoints (smoke)', () => {
  it('create share link; incognito-style access; scope/revoke/expiry; snapshot-only after runs deleted', async () => {
    const sessionsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-sessions-'));
    const runsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-runs-'));
    const projectsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-projects-'));
    const sharesDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-store-'));

    const prevSessions = process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR;
    const prevRuns = process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
    const prevProjects = process.env.EVERWATT_PROJECTS_BASEDIR;
    const prevShares = process.env.EVERWATT_SHARES_BASEDIR;
    const prevJwt = process.env.JWT_SECRET;

    process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR = sessionsDir;
    process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = runsDir;
    process.env.EVERWATT_PROJECTS_BASEDIR = projectsDir;
    process.env.EVERWATT_SHARES_BASEDIR = sharesDir;
    process.env.JWT_SECRET = 'test-jwt-secret';

    try {
      vi.resetModules();
      const { signJwt } = await import('../src/services/auth-service');
      const jwt = signJwt({ userId: 'u_test', role: 'editor' }, 60 * 60);
      const authz = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };

      const { default: app } = await import('../src/server');

      const createRes = await app.request('/api/report-sessions-v1/create', {
        method: 'POST',
        headers: authz,
        body: JSON.stringify({ kind: 'WIZARD', title: 'Test Session' }),
      });
      expect(createRes.status).toBe(200);
      const createJson: any = await createRes.json();
      const reportId = String(createJson?.reportId || '').trim();
      expect(reportId).toMatch(/^rs_/);

      const runRes = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/run-utility`, {
        method: 'POST',
        headers: authz,
        body: JSON.stringify({ workflowInputs: { demo: true } }),
      });
      expect(runRes.status).toBe(200);
      const runJson: any = await runRes.json();
      expect(runJson?.success).toBe(true);
      const projectId = String(runJson?.projectId || '').trim();
      expect(projectId).toBeTruthy();

      const genExec = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/generate-executive-pack`, {
        method: 'POST',
        headers: authz,
        body: JSON.stringify({}),
      });
      expect(genExec.status).toBe(200);
      const execJson: any = await genExec.json();
      const execRevId = String(execJson?.revisionMeta?.revisionId || '').trim();
      expect(execRevId).toBeTruthy();

      const createShare = await app.request('/api/shares-v1/create', {
        method: 'POST',
        headers: authz,
        body: JSON.stringify({ projectId, revisionId: execRevId, scope: 'BOTH', expiresInHours: 168, note: 'bd share' }),
      });
      expect(createShare.status).toBe(200);
      const shareJson: any = await createShare.json();
      expect(shareJson?.success).toBe(true);
      expect(String(shareJson?.shareUrl || '')).toMatch(/^\/share\//);
      expect(String(shareJson?.shareId || '').trim()).toBeTruthy();
      const tokenPlain = String(shareJson.shareUrl).replace(/^\/share\//, '').trim();
      expect(tokenPlain).toMatch(/^[A-Za-z0-9_-]+$/);

      const shareAuth = { Authorization: `Share ${tokenPlain}` };
      const metaRes = await app.request('/api/share/v1/revision-meta', { headers: shareAuth });
      expect(metaRes.status).toBe(200);
      const metaJson: any = await metaRes.json();
      expect(metaJson?.success).toBe(true);
      expect(metaJson?.revision?.revisionId).toBe(execRevId);
      expect(metaJson?.revision?.reportType).toBe('EXECUTIVE_PACK_V1');
      expect(metaJson?.share?.scope).toBe('BOTH');
      expect(metaJson?.links?.htmlUrl).toBe('/api/share/v1/revision/html');
      expect(metaJson?.links?.pdfUrl).toBe('/api/share/v1/revision/pdf');

      const htmlRes = await app.request('/api/share/v1/revision/html', { headers: shareAuth });
      expect(htmlRes.status).toBe(200);
      const html = await htmlRes.text();
      expect(html).toContain('EverWatt');
      expect(html).toContain('EXECUTIVE_PACK_V1');

      const pdfRes = await app.request('/api/share/v1/revision/pdf', { headers: shareAuth });
      expect(pdfRes.status).toBe(200);
      expect(String(pdfRes.headers.get('content-type') || '')).toContain('application/pdf');
      const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
      expect(pdfBuf.length).toBeGreaterThan(10_000);

      const jsonRes = await app.request('/api/share/v1/revision/json', { headers: shareAuth });
      expect(jsonRes.status).toBe(200);
      const artifactJson: any = await jsonRes.json();
      expect(artifactJson?.success).toBe(true);
      expect(artifactJson?.reportType).toBe('EXECUTIVE_PACK_V1');
      expect(artifactJson?.packJson?.schemaVersion).toBe('executivePackV1');
      expect(JSON.stringify(artifactJson)).not.toContain('pdfStorageKey');

      const zipRes = await app.request('/api/share/v1/revision/bundle.zip', { headers: shareAuth });
      expect(zipRes.status).toBe(200);
      expect(String(zipRes.headers.get('content-type') || '')).toContain('application/zip');

      // Snapshot-only guarantee: delete runs dir and re-fetch HTML/PDF/JSON/ZIP.
      rmSync(runsDir, { recursive: true, force: true });

      const htmlRes2 = await app.request('/api/share/v1/revision/html', { headers: shareAuth });
      expect(htmlRes2.status).toBe(200);
      const pdfRes2 = await app.request('/api/share/v1/revision/pdf', { headers: shareAuth });
      expect(pdfRes2.status).toBe(200);
      const jsonRes2 = await app.request('/api/share/v1/revision/json', { headers: shareAuth });
      expect(jsonRes2.status).toBe(200);
      const zipRes2 = await app.request('/api/share/v1/revision/bundle.zip', { headers: shareAuth });
      if (zipRes2.status !== 200) {
        const t = await zipRes2.text().catch(() => '');
        throw new Error(`Expected bundle.zip 200 after runs deleted, got ${zipRes2.status}: ${t}`);
      }

      // Scope enforcement: VIEW allows HTML but not PDF/JSON/ZIP.
      const createViewShare = await app.request('/api/shares-v1/create', {
        method: 'POST',
        headers: authz,
        body: JSON.stringify({ projectId, revisionId: execRevId, scope: 'VIEW', expiresInHours: 168 }),
      });
      expect(createViewShare.status).toBe(200);
      const viewShareJson: any = await createViewShare.json();
      const viewToken = String(viewShareJson.shareUrl).replace(/^\/share\//, '').trim();
      const viewAuth = { Authorization: `Share ${viewToken}` };
      expect((await app.request('/api/share/v1/revision/html', { headers: viewAuth })).status).toBe(200);
      expect((await app.request('/api/share/v1/revision/pdf', { headers: viewAuth })).status).toBe(403);
      expect((await app.request('/api/share/v1/revision/json', { headers: viewAuth })).status).toBe(403);
      expect((await app.request('/api/share/v1/revision/bundle.zip', { headers: viewAuth })).status).toBe(403);

      // Revocation
      const shareId = String(shareJson?.shareId || '').trim();
      const revokeRes = await app.request(`/api/shares-v1/${encodeURIComponent(shareId)}/revoke`, { method: 'POST', headers: authz });
      if (revokeRes.status !== 200) {
        const t = await revokeRes.text().catch(() => '');
        throw new Error(`Expected revoke 200, got ${revokeRes.status}: ${t}`);
      }
      expect((await app.request('/api/share/v1/revision-meta', { headers: shareAuth })).status).toBe(410);

      // Expiry (store-level)
      const { createSharesStoreFsV1 } = await import('../src/modules/sharesV1/storeFsV1');
      const { sha256TokenPlainV1 } = await import('../src/modules/sharesV1/tokenV1');
      const store = createSharesStoreFsV1({ baseDir: sharesDir });
      const expiredToken = 'expiredTokenPlain_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'.replace(/[^A-Za-z0-9_-]/g, '_');
      const expiredHash = sha256TokenPlainV1(expiredToken);
      await store.createShareLink({
        tokenHash: expiredHash,
        projectId,
        revisionId: execRevId,
        reportType: 'EXECUTIVE_PACK_V1',
        scope: 'BOTH',
        expiresAtIso: new Date(Date.now() - 60_000).toISOString(),
        createdBy: 'u_test',
      });
      expect((await app.request('/api/share/v1/revision-meta', { headers: { Authorization: `Share ${expiredToken}` } })).status).toBe(410);
    } finally {
      rmSync(sessionsDir, { recursive: true, force: true });
      rmSync(runsDir, { recursive: true, force: true });
      rmSync(projectsDir, { recursive: true, force: true });
      rmSync(sharesDir, { recursive: true, force: true });
      if (typeof prevSessions === 'string') process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR = prevSessions;
      else delete process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR;
      if (typeof prevRuns === 'string') process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = prevRuns;
      else delete process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
      if (typeof prevProjects === 'string') process.env.EVERWATT_PROJECTS_BASEDIR = prevProjects;
      else delete process.env.EVERWATT_PROJECTS_BASEDIR;
      if (typeof prevShares === 'string') process.env.EVERWATT_SHARES_BASEDIR = prevShares;
      else delete process.env.EVERWATT_SHARES_BASEDIR;
      if (typeof prevJwt === 'string') process.env.JWT_SECRET = prevJwt;
      else delete process.env.JWT_SECRET;
    }
  });
});

