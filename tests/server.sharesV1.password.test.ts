import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';

function extractShareSessionCookieHeader(res: Response): string {
  const anyHeaders: any = res.headers as any;
  const setCookies: string[] =
    typeof anyHeaders.getSetCookie === 'function'
      ? (anyHeaders.getSetCookie() as string[])
      : (() => {
          const sc = res.headers.get('set-cookie');
          return sc ? [sc] : [];
        })();

  const flattened = setCookies.flatMap((sc) => String(sc || '').split(/,(?=share_session=)/g).map((x) => x.trim()));
  const cookie = flattened.find((c) => c.toLowerCase().startsWith('share_session='));
  if (!cookie) return '';
  return cookie.split(';')[0] || '';
}

describe('sharesV1 password gating (public)', () => {
  it('requires password: meta allowed but downloads gated until verify; verify sets cookie; cookie grants access', async () => {
    const sessionsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-pw-sessions-'));
    const runsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-pw-runs-'));
    const projectsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-pw-projects-'));
    const sharesDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-pw-store-'));

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

      const password = 'cust_pw_1234';
      const createShare = await app.request('/api/shares-v1/create', {
        method: 'POST',
        headers: authz,
        body: JSON.stringify({ projectId, revisionId: execRevId, scope: 'BOTH', expiresInHours: 168, password, passwordHint: 'usual' }),
      });
      expect(createShare.status).toBe(200);
      const shareJson: any = await createShare.json();
      expect(shareJson?.success).toBe(true);
      const tokenPlain = String(shareJson.shareUrl).replace(/^\/share\//, '').trim();
      expect(tokenPlain).toMatch(/^[A-Za-z0-9_-]+$/);

      const shareAuth = { Authorization: `Share ${tokenPlain}` };

      // Meta allowed but should indicate password requirement and hide links.
      const metaRes = await app.request('/api/share/v1/revision-meta', { headers: shareAuth });
      expect(metaRes.status).toBe(200);
      const metaJson: any = await metaRes.json();
      expect(metaJson?.success).toBe(true);
      expect(metaJson?.share?.requiresPassword).toBe(true);
      expect(metaJson?.share?.passwordVerified).toBe(false);
      expect(metaJson?.links?.htmlUrl).toBeUndefined();
      expect(metaJson?.links?.pdfUrl).toBeUndefined();
      expect(metaJson?.links?.jsonUrl).toBeUndefined();
      expect(metaJson?.links?.bundleZipUrl).toBeUndefined();
      expect(metaJson?.tokenHint).toBeUndefined();
      expect(JSON.stringify(metaJson)).not.toContain(tokenPlain);

      // Gated: HTML/PDF/JSON/ZIP should deny with raw token until verified.
      expect((await app.request('/api/share/v1/revision/html', { headers: shareAuth })).status).toBe(401);
      expect((await app.request('/api/share/v1/revision/pdf', { headers: shareAuth })).status).toBe(401);
      expect((await app.request('/api/share/v1/revision/json', { headers: shareAuth })).status).toBe(401);
      expect((await app.request('/api/share/v1/revision/bundle.zip', { headers: shareAuth })).status).toBe(401);
      expect((await app.request('/api/share/v1/revision/html?embed=1', { headers: shareAuth })).status).toBe(401);

      // Wrong password: 401 and generic.
      const wrongRes = await app.request('/api/share/v1/verify-password', {
        method: 'POST',
        headers: { ...shareAuth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'nope' }),
      });
      expect(wrongRes.status).toBe(401);
      const wrongJson: any = await wrongRes.json();
      expect(String(wrongJson?.error || '')).toMatch(/invalid/i);
      expect(JSON.stringify(wrongJson)).not.toMatch(/scrypt|passwordHash|tokenHash/i);

      // Correct password: sets share_session cookie.
      const okRes = await app.request('/api/share/v1/verify-password', {
        method: 'POST',
        headers: { ...shareAuth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      expect(okRes.status).toBe(200);
      const okJson: any = await okRes.json();
      expect(okJson?.success).toBe(true);
      const cookieHeader = extractShareSessionCookieHeader(okRes);
      expect(cookieHeader).toMatch(/^share_session=/);

      // Cookie now grants access without token.
      const cookieOnly = { Cookie: cookieHeader };
      expect((await app.request('/api/share/v1/revision-meta', { headers: cookieOnly })).status).toBe(200);
      expect((await app.request('/api/share/v1/revision/html', { headers: cookieOnly })).status).toBe(200);
      expect((await app.request('/api/share/v1/revision/pdf', { headers: cookieOnly })).status).toBe(200);
      expect((await app.request('/api/share/v1/revision/json', { headers: cookieOnly })).status).toBe(200);
      expect((await app.request('/api/share/v1/revision/bundle.zip', { headers: cookieOnly })).status).toBe(200);
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
  }, 120_000);

  it('staff can set password later; existing share becomes gated', async () => {
    const sessionsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-pw2-sessions-'));
    const runsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-pw2-runs-'));
    const projectsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-pw2-projects-'));
    const sharesDir = mkdtempSync(path.join(os.tmpdir(), 'ew-shares-pw2-store-'));

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
      const reportId = String((await createRes.json() as any)?.reportId || '').trim();

      const runRes = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/run-utility`, {
        method: 'POST',
        headers: authz,
        body: JSON.stringify({ workflowInputs: { demo: true } }),
      });
      const projectId = String((await runRes.json() as any)?.projectId || '').trim();

      const genExec = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/generate-executive-pack`, {
        method: 'POST',
        headers: authz,
        body: JSON.stringify({}),
      });
      const execRevId = String((await genExec.json() as any)?.revisionMeta?.revisionId || '').trim();

      const createShare = await app.request('/api/shares-v1/create', {
        method: 'POST',
        headers: authz,
        body: JSON.stringify({ projectId, revisionId: execRevId, scope: 'BOTH', expiresInHours: 168 }),
      });
      const shareJson: any = await createShare.json();
      const shareId = String(shareJson?.shareId || '').trim();
      const tokenPlain = String(shareJson.shareUrl).replace(/^\/share\//, '').trim();
      const shareAuth = { Authorization: `Share ${tokenPlain}` };

      expect((await app.request('/api/share/v1/revision/html', { headers: shareAuth })).status).toBe(200);

      const setPw = await app.request(`/api/shares-v1/${encodeURIComponent(shareId)}/set-password`, {
        method: 'POST',
        headers: authz,
        body: JSON.stringify({ password: 'later_pw_1234', passwordHint: 'later' }),
      });
      expect(setPw.status).toBe(200);

      // Now gated
      expect((await app.request('/api/share/v1/revision/html', { headers: shareAuth })).status).toBe(401);
      const metaRes = await app.request('/api/share/v1/revision-meta', { headers: shareAuth });
      expect(metaRes.status).toBe(200);
      const metaJson: any = await metaRes.json();
      expect(metaJson?.share?.requiresPassword).toBe(true);
      expect(metaJson?.links?.htmlUrl).toBeUndefined();

      const okRes = await app.request('/api/share/v1/verify-password', {
        method: 'POST',
        headers: { ...shareAuth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'later_pw_1234' }),
      });
      expect(okRes.status).toBe(200);
      const cookieHeader = extractShareSessionCookieHeader(okRes);
      expect(cookieHeader).toMatch(/^share_session=/);
      expect((await app.request('/api/share/v1/revision/html', { headers: { Cookie: cookieHeader } })).status).toBe(200);
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
  }, 120_000);
});

