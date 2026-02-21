import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';

function extractPortalSessionCookieHeader(res: Response): string {
  const anyHeaders: any = res.headers as any;
  const setCookies: string[] =
    typeof anyHeaders.getSetCookie === 'function'
      ? (anyHeaders.getSetCookie() as string[])
      : (() => {
          const sc = res.headers.get('set-cookie');
          return sc ? [sc] : [];
        })();

  const flattened = setCookies.flatMap((sc) => String(sc || '').split(/,(?=portal_session=)/g).map((x) => x.trim()));
  const cookie = flattened.find((c) => c.toLowerCase().startsWith('portal_session='));
  if (!cookie) return '';
  return cookie.split(';')[0] || '';
}

describe('portalV1 endpoints (smoke)', () => {
  it('staff can create org/user/link; staff issues login token; user logs in and views snapshots; org scoping enforced; snapshot-only after runs deleted', async () => {
    const sessionsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-portal-sessions-'));
    const runsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-portal-runs-'));
    const projectsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-portal-projects-'));
    const portalDir = mkdtempSync(path.join(os.tmpdir(), 'ew-portal-store-'));

    const prevSessions = process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR;
    const prevRuns = process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
    const prevProjects = process.env.EVERWATT_PROJECTS_BASEDIR;
    const prevPortal = process.env.EVERWATT_PORTAL_BASEDIR;
    const prevJwt = process.env.JWT_SECRET;

    process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR = sessionsDir;
    process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = runsDir;
    process.env.EVERWATT_PROJECTS_BASEDIR = projectsDir;
    process.env.EVERWATT_PORTAL_BASEDIR = portalDir;
    process.env.JWT_SECRET = 'test-jwt-secret';

    try {
      vi.resetModules();
      const { signJwt } = await import('../src/services/auth-service');
      const jwt = signJwt({ userId: 'u_staff', role: 'editor' }, 60 * 60);
      const staffAuthz = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };

      const { default: app } = await import('../src/server');

      // Create a project + executive pack snapshot (same approach as shares tests).
      const createSession = await app.request('/api/report-sessions-v1/create', {
        method: 'POST',
        headers: staffAuthz,
        body: JSON.stringify({ kind: 'WIZARD', title: 'Portal Test Session' }),
      });
      expect(createSession.status).toBe(200);
      const reportId = String((await createSession.json() as any)?.reportId || '').trim();
      expect(reportId).toMatch(/^rs_/);

      const runRes = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/run-utility`, {
        method: 'POST',
        headers: staffAuthz,
        body: JSON.stringify({ workflowInputs: { demo: true } }),
      });
      expect(runRes.status).toBe(200);
      const runJson: any = await runRes.json();
      const projectId = String(runJson?.projectId || '').trim();
      expect(projectId).toBeTruthy();

      const genExec = await app.request(`/api/report-sessions-v1/${encodeURIComponent(reportId)}/generate-executive-pack`, {
        method: 'POST',
        headers: staffAuthz,
        body: JSON.stringify({}),
      });
      expect(genExec.status).toBe(200);
      const execJson: any = await genExec.json();
      const revisionId = String(execJson?.revisionMeta?.revisionId || '').trim();
      expect(revisionId).toBeTruthy();

      // Staff: create org + user.
      const orgRes = await app.request('/api/portal-v1/orgs/create', {
        method: 'POST',
        headers: staffAuthz,
        body: JSON.stringify({ name: 'Acme Energy' }),
      });
      expect(orgRes.status).toBe(200);
      const orgJson: any = await orgRes.json();
      expect(orgJson?.success).toBe(true);
      const orgId = String(orgJson?.org?.orgId || '').trim();
      expect(orgId).toBeTruthy();

      const email = 'viewer@acme.example';
      const userRes = await app.request('/api/portal-v1/users/create', {
        method: 'POST',
        headers: staffAuthz,
        body: JSON.stringify({ orgId, email, role: 'VIEWER' }),
      });
      expect(userRes.status).toBe(200);
      const userJson: any = await userRes.json();
      expect(userJson?.success).toBe(true);
      expect(String(userJson?.user?.email || '')).toBe(email);

      // Staff: link project to org.
      const linkRes = await app.request(`/api/portal-v1/projects/${encodeURIComponent(projectId)}/link-org`, {
        method: 'POST',
        headers: staffAuthz,
        body: JSON.stringify({ orgId }),
      });
      expect(linkRes.status).toBe(200);
      const linkJson: any = await linkRes.json();
      expect(linkJson?.success).toBe(true);
      expect(String(linkJson?.link?.projectId || '')).toBe(projectId);

      // Staff: issue login token (shown once).
      const reqTok = await app.request('/api/portal-v1/login/request', {
        method: 'POST',
        headers: staffAuthz,
        body: JSON.stringify({ email }),
      });
      expect(reqTok.status).toBe(200);
      const tokJson: any = await reqTok.json();
      expect(tokJson?.success).toBe(true);
      const tokenPlain = String(tokJson?.tokenPlain || '').trim();
      expect(tokenPlain).toMatch(/^[A-Za-z0-9_-]+$/);

      // Customer: verify token; should set portal_session cookie.
      const verifyRes = await app.request('/api/portal-v1/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tokenPlain }),
      });
      expect(verifyRes.status).toBe(200);
      const cookieHeader = extractPortalSessionCookieHeader(verifyRes);
      expect(cookieHeader).toMatch(/^portal_session=/);
      const cookieOnly = { Cookie: cookieHeader };

      // Customer: me + projects + revisions.
      const meRes = await app.request('/api/portal-v1/me', { headers: cookieOnly });
      expect(meRes.status).toBe(200);
      const meJson: any = await meRes.json();
      expect(meJson?.success).toBe(true);
      expect(String(meJson?.user?.email || '')).toBe(email);
      expect(String(meJson?.org?.orgId || '')).toBe(orgId);

      const projectsRes = await app.request('/api/portal-v1/projects', { headers: cookieOnly });
      expect(projectsRes.status).toBe(200);
      const projectsJson: any = await projectsRes.json();
      expect(projectsJson?.success).toBe(true);
      expect(JSON.stringify(projectsJson)).not.toContain(projectsDir);
      expect(Array.isArray(projectsJson?.projects)).toBe(true);
      expect(projectsJson.projects.some((p: any) => String(p?.projectId || '') === projectId)).toBe(true);

      const revisionsRes = await app.request(`/api/portal-v1/projects/${encodeURIComponent(projectId)}/revisions`, { headers: cookieOnly });
      expect(revisionsRes.status).toBe(200);
      const revisionsJson: any = await revisionsRes.json();
      expect(revisionsJson?.success).toBe(true);
      const revisionsStr = JSON.stringify(revisionsJson);
      expect(revisionsStr).not.toContain('pdfStorageKey');
      expect(revisionsStr).not.toContain(projectsDir);
      expect(revisionsJson.revisions.some((r: any) => String(r?.revisionId || '') === revisionId)).toBe(true);

      // Snapshot-only surfaces: HTML/PDF/JSON/BUNDLE.
      const htmlRes = await app.request(`/api/portal-v1/projects/${encodeURIComponent(projectId)}/revisions/${encodeURIComponent(revisionId)}/html`, { headers: cookieOnly });
      expect(htmlRes.status).toBe(200);
      const html = await htmlRes.text();
      expect(html).toContain('EverWatt');
      expect(html).toContain('EXECUTIVE_PACK_V1');

      const pdfRes = await app.request(`/api/portal-v1/projects/${encodeURIComponent(projectId)}/revisions/${encodeURIComponent(revisionId)}/pdf`, { headers: cookieOnly });
      expect(pdfRes.status).toBe(200);
      expect(String(pdfRes.headers.get('content-type') || '')).toContain('application/pdf');
      const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
      expect(pdfBuf.length).toBeGreaterThan(10_000);

      const jsonRes = await app.request(`/api/portal-v1/projects/${encodeURIComponent(projectId)}/revisions/${encodeURIComponent(revisionId)}/json`, { headers: cookieOnly });
      expect(jsonRes.status).toBe(200);
      const artifactJson: any = await jsonRes.json();
      expect(artifactJson?.success).toBe(true);
      expect(artifactJson?.reportType).toBe('EXECUTIVE_PACK_V1');
      expect(JSON.stringify(artifactJson)).not.toContain('pdfStorageKey');
      expect(JSON.stringify(artifactJson)).not.toContain(projectsDir);

      const zipRes = await app.request(`/api/portal-v1/projects/${encodeURIComponent(projectId)}/revisions/${encodeURIComponent(revisionId)}/bundle`, { headers: cookieOnly });
      expect(zipRes.status).toBe(200);
      expect(String(zipRes.headers.get('content-type') || '')).toContain('application/zip');

      // Snapshot-only guarantee: delete runs dir and re-fetch HTML/PDF/JSON/ZIP.
      rmSync(runsDir, { recursive: true, force: true });
      expect((await app.request(`/api/portal-v1/projects/${encodeURIComponent(projectId)}/revisions/${encodeURIComponent(revisionId)}/html`, { headers: cookieOnly })).status).toBe(200);
      expect((await app.request(`/api/portal-v1/projects/${encodeURIComponent(projectId)}/revisions/${encodeURIComponent(revisionId)}/pdf`, { headers: cookieOnly })).status).toBe(200);
      expect((await app.request(`/api/portal-v1/projects/${encodeURIComponent(projectId)}/revisions/${encodeURIComponent(revisionId)}/json`, { headers: cookieOnly })).status).toBe(200);
      expect((await app.request(`/api/portal-v1/projects/${encodeURIComponent(projectId)}/revisions/${encodeURIComponent(revisionId)}/bundle`, { headers: cookieOnly })).status).toBe(200);

      // Org scoping: different org/user should not access linked project.
      const org2Res = await app.request('/api/portal-v1/orgs/create', { method: 'POST', headers: staffAuthz, body: JSON.stringify({ name: 'Other Org' }) });
      const org2Id = String(((await org2Res.json() as any)?.org?.orgId) || '').trim();
      const email2 = 'viewer2@other.example';
      await app.request('/api/portal-v1/users/create', { method: 'POST', headers: staffAuthz, body: JSON.stringify({ orgId: org2Id, email: email2, role: 'VIEWER' }) });
      const tok2Res = await app.request('/api/portal-v1/login/request', { method: 'POST', headers: staffAuthz, body: JSON.stringify({ email: email2 }) });
      const tok2 = String(((await tok2Res.json() as any)?.tokenPlain) || '').trim();
      const verify2 = await app.request('/api/portal-v1/login/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email2, tokenPlain: tok2 }) });
      const cookie2 = extractPortalSessionCookieHeader(verify2);
      expect(cookie2).toMatch(/^portal_session=/);
      const resForbidden = await app.request(`/api/portal-v1/projects/${encodeURIComponent(projectId)}/revisions`, { headers: { Cookie: cookie2 } });
      expect(resForbidden.status).toBe(404);
    } finally {
      rmSync(sessionsDir, { recursive: true, force: true });
      rmSync(runsDir, { recursive: true, force: true });
      rmSync(projectsDir, { recursive: true, force: true });
      rmSync(portalDir, { recursive: true, force: true });
      if (typeof prevSessions === 'string') process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR = prevSessions;
      else delete process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR;
      if (typeof prevRuns === 'string') process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR = prevRuns;
      else delete process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR;
      if (typeof prevProjects === 'string') process.env.EVERWATT_PROJECTS_BASEDIR = prevProjects;
      else delete process.env.EVERWATT_PROJECTS_BASEDIR;
      if (typeof prevPortal === 'string') process.env.EVERWATT_PORTAL_BASEDIR = prevPortal;
      else delete process.env.EVERWATT_PORTAL_BASEDIR;
      if (typeof prevJwt === 'string') process.env.JWT_SECRET = prevJwt;
      else delete process.env.JWT_SECRET;
    }
  }, 120_000);

  it('login token expiry: expired tokens cannot be verified', async () => {
    const projectsDir = mkdtempSync(path.join(os.tmpdir(), 'ew-portal-exp-projects-'));
    const portalDir = mkdtempSync(path.join(os.tmpdir(), 'ew-portal-exp-store-'));
    const prevProjects = process.env.EVERWATT_PROJECTS_BASEDIR;
    const prevPortal = process.env.EVERWATT_PORTAL_BASEDIR;
    const prevJwt = process.env.JWT_SECRET;
    process.env.EVERWATT_PROJECTS_BASEDIR = projectsDir;
    process.env.EVERWATT_PORTAL_BASEDIR = portalDir;
    process.env.JWT_SECRET = 'test-jwt-secret';

    try {
      vi.resetModules();
      const { createPortalStoreFsV1 } = await import('../src/modules/portalV1/storeFsV1');
      const { generatePortalLoginTokenPlainV1, sha256TokenPlainV1 } = await import('../src/modules/portalV1/tokenV1');
      const store = createPortalStoreFsV1({ baseDir: portalDir });
      const org = await store.createOrg({ name: 'Expiry Org' });
      const email = 'exp@org.example';
      const user = await store.createUser({ orgId: org.orgId, email, role: 'VIEWER' });

      const tokenPlain = generatePortalLoginTokenPlainV1();
      const tokenHash = sha256TokenPlainV1(tokenPlain);
      await store.upsertLoginToken({
        userId: user.userId,
        email,
        tokenHash,
        createdAtIso: new Date(Date.now() - 60_000).toISOString(),
        expiresAtIso: new Date(Date.now() - 1_000).toISOString(),
      });

      const { default: app } = await import('../src/server');
      const verifyRes = await app.request('/api/portal-v1/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tokenPlain }),
      });
      expect(verifyRes.status).toBe(401);
    } finally {
      rmSync(projectsDir, { recursive: true, force: true });
      rmSync(portalDir, { recursive: true, force: true });
      if (typeof prevProjects === 'string') process.env.EVERWATT_PROJECTS_BASEDIR = prevProjects;
      else delete process.env.EVERWATT_PROJECTS_BASEDIR;
      if (typeof prevPortal === 'string') process.env.EVERWATT_PORTAL_BASEDIR = prevPortal;
      else delete process.env.EVERWATT_PORTAL_BASEDIR;
      if (typeof prevJwt === 'string') process.env.JWT_SECRET = prevJwt;
      else delete process.env.JWT_SECRET;
    }
  });
});

