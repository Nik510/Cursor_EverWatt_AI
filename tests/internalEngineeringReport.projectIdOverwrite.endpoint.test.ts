import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';

import './helpers/mockHeavyServerDeps';

describe('internal engineering report endpoint hardening', () => {
  it('overwrites reportJson.projectId with route param projectId', async () => {
    const userId = 'u_test_internal_eng';
    const projectId = `p_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

    try {
      vi.resetModules();
      const { default: app } = await import('../src/server');

      // Create a minimal project record that matches the server's userId gating.
      const projectsDir = path.join(process.cwd(), 'data', 'projects');
      await mkdir(projectsDir, { recursive: true });
      const projectPath = path.join(projectsDir, `${projectId}.json`);
      await writeFile(
        projectPath,
        JSON.stringify(
          {
            id: projectId,
            userId,
            driveFolderLink: '',
            customer: { projectNumber: '1', companyName: 'Acme' },
            reportsV1: {},
          },
          null,
          2,
        ),
      );

      const res = await app.request(`/api/projects/${encodeURIComponent(projectId)}/reports/internal-engineering`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({
          title: 't',
          reportJson: { schemaVersion: 'internalEngineeringReportV1', projectId: 'p_evil', telemetry: {} },
        }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json?.success).toBe(true);
      expect(json?.revision?.reportJson?.projectId).toBe(projectId);

      const listRes = await app.request(`/api/projects/${encodeURIComponent(projectId)}/reports/internal-engineering`, {
        headers: { 'x-user-id': userId },
      });
      expect(listRes.status).toBe(200);
      const listJson = await listRes.json();
      expect(listJson?.success).toBe(true);
      const rev0 = Array.isArray(listJson?.revisions) ? listJson.revisions[0] : null;
      expect(rev0?.reportJson?.projectId).toBe(projectId);
    } finally {
      // Best-effort cleanup. (Project file is in repo data dir.)
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

