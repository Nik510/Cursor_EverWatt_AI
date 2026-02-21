import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';

import './helpers/mockHeavyServerDeps';
import { enableDemoJwtForTests, getDemoBearerToken } from './helpers/demoJwt';

describe('internal engineering report runId linking', () => {
  it('stores runId on generated revision and exposes it via revisions meta endpoint', async () => {
    const userId = 'u_test_internal_eng_runid';
    const email = `${userId}@example.com`;
    const authUserId = userId;
    const projectId = `p_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

    try {
      delete process.env.EVERWATT_PROJECTS_BASEDIR;
      vi.resetModules();
      enableDemoJwtForTests();
      const { default: app } = await import('../src/server');
      const authz = await getDemoBearerToken(app, email, authUserId);

      // Minimal project record (file-backed mode) gated by userId.
      const projectsDir = path.join(process.cwd(), 'data', 'projects');
      await mkdir(projectsDir, { recursive: true });
      const projectPath = path.join(projectsDir, `${projectId}.json`);
      await writeFile(
        projectPath,
        JSON.stringify(
          {
            id: projectId,
            userId: authUserId,
            driveFolderLink: '',
            customer: { projectNumber: '1', companyName: 'Acme' },
            telemetry: {},
            reportsV1: {},
          },
          null,
          2,
        ),
      );

      const analysisResults = {
        success: true,
        project: { id: projectId, name: 'Test' },
        workflow: { utility: { inputs: {}, insights: {} } },
        summary: { json: {}, markdown: '' },
      };

      const genRes = await app.request(`/api/projects/${encodeURIComponent(projectId)}/reports/internal-engineering/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authz },
        body: JSON.stringify({ title: 't', runId: 'run_123', analysisResults }),
      });
      expect(genRes.status).toBe(200);
      const genJson: any = await genRes.json();
      expect(genJson?.success).toBe(true);
      expect(genJson?.revision?.runId).toBe('run_123');

      const listRes = await app.request(`/api/projects/${encodeURIComponent(projectId)}/reports/internal-engineering/revisions`, {
        headers: { Authorization: authz },
      });
      expect(listRes.status).toBe(200);
      const listJson: any = await listRes.json();
      expect(listJson?.success).toBe(true);
      expect(listJson?.projectId).toBe(projectId);
      expect(Array.isArray(listJson?.revisions)).toBe(true);
      expect(listJson.revisions[0]?.runId).toBe('run_123');
      expect(listJson.revisions[0]?.download?.htmlUrl).toContain('.html');
    } finally {
      // Best-effort cleanup.
      try {
        const projectsDir = path.join(process.cwd(), 'data', 'projects');
        const projectPath = path.join(projectsDir, `${projectId}.json`);
        await unlink(projectPath);
      } catch {
        // ignore
      }
    }
  });

  it('rejects invalid runId on generate', async () => {
    const userId = 'u_test_internal_eng_runid_invalid';
    const email = `${userId}@example.com`;
    const authUserId = userId;
    const projectId = `p_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

    try {
      delete process.env.EVERWATT_PROJECTS_BASEDIR;
      vi.resetModules();
      enableDemoJwtForTests();
      const { default: app } = await import('../src/server');
      const authz = await getDemoBearerToken(app, email, authUserId);

      const projectsDir = path.join(process.cwd(), 'data', 'projects');
      await mkdir(projectsDir, { recursive: true });
      const projectPath = path.join(projectsDir, `${projectId}.json`);
      await writeFile(
        projectPath,
        JSON.stringify(
          {
            id: projectId,
            userId: authUserId,
            driveFolderLink: '',
            customer: { projectNumber: '1', companyName: 'Acme' },
            telemetry: {},
            reportsV1: {},
          },
          null,
          2,
        ),
      );

      const analysisResults = {
        success: true,
        project: { id: projectId, name: 'Test' },
        workflow: { utility: { inputs: {}, insights: {} } },
        summary: { json: {}, markdown: '' },
      };

      const res = await app.request(`/api/projects/${encodeURIComponent(projectId)}/reports/internal-engineering/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authz },
        body: JSON.stringify({ title: 't', runId: '../evil', analysisResults }),
      });
      expect(res.status).toBe(400);
      const json: any = await res.json();
      expect(json?.success).toBe(false);
      expect(String(json?.error || '')).toMatch(/runId/i);
    } finally {
      try {
        const projectsDir = path.join(process.cwd(), 'data', 'projects');
        const projectPath = path.join(projectsDir, `${projectId}.json`);
        await unlink(projectPath);
      } catch {
        // ignore
      }
    }
  });
});

