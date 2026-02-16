import { describe, it, expect } from 'vitest';
import path from 'path';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

import './helpers/mockHeavyServerDeps';

const PROJECTS_DIR = path.join(process.cwd(), 'data', 'projects');

async function writeProjectFile(args: { projectId: string; userId: string; project: any }) {
  await mkdir(PROJECTS_DIR, { recursive: true });
  await writeFile(path.join(PROJECTS_DIR, `${args.projectId}.json`), JSON.stringify({ id: args.projectId, userId: args.userId, ...args.project }, null, 2), 'utf8');
}

async function readProjectFile(projectId: string): Promise<any> {
  const raw = await readFile(path.join(PROJECTS_DIR, `${projectId}.json`), 'utf8');
  return JSON.parse(raw);
}

async function deleteProjectFile(projectId: string) {
  const p = path.join(PROJECTS_DIR, `${projectId}.json`);
  if (existsSync(p)) await rm(p);
}

describe('Phase2A inbox decision (endpoint)', () => {
  it('accept/reject requires reason (400)', async () => {
    const projectId = `t_${randomUUID().slice(0, 8)}`;
    const userId = 'u_test';
    try {
      await writeProjectFile({
        projectId,
        userId,
        project: {
          graph: {
            assets: [],
            measures: [],
            inbox: [
              {
                id: 'ii1',
                kind: 'suggestedMeasure',
                status: 'inferred',
                provenance: { fileId: 'pp' },
                confidence: 0.6,
                needsConfirmation: true,
                suggestedMeasure: { id: 'm1', name: 'M', category: 'battery' },
              },
            ],
            inboxHistory: [],
            decisions: [],
            bomItems: [],
          },
        },
      });

      const { default: app } = await import('../src/server');
      const res = await app.request(`/api/projects/${projectId}/graph/inbox/ii1/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ decision: 'ACCEPT', reason: ' ' }),
      });
      expect(res.status).toBe(400);
    } finally {
      await deleteProjectFile(projectId);
    }
  });

  it('accept suggestedBomItems adds bomItems and moves item to history', async () => {
    const projectId = `t_${randomUUID().slice(0, 8)}`;
    const userId = 'u_test';
    try {
      await writeProjectFile({
        projectId,
        userId,
        project: {
          graph: {
            assets: [],
            measures: [{ kind: 'measure', id: 'm1', name: 'Measure 1' }],
            inbox: [
              {
                id: 'ii2',
                kind: 'suggestedBomItems',
                status: 'inferred',
                provenance: { fileId: 'pp' },
                confidence: 0.6,
                needsConfirmation: true,
                sourceKey: 'pp:sc:1',
                suggestedBomItems: { measureId: 'm1', items: [{ sku: 'X', qty: 1 }] },
              },
            ],
            inboxHistory: [],
            decisions: [],
            bomItems: [],
          },
        },
      });

      const { default: app } = await import('../src/server');
      const res = await app.request(`/api/projects/${projectId}/graph/inbox/ii2/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ decision: 'ACCEPT', reason: 'Add to scope' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data?.success).toBe(true);
      expect(Array.isArray(data?.graph?.bomItems)).toBe(true);
      expect(data.graph.bomItems.length).toBe(1);
      expect(data.graph.inbox.length).toBe(0);
      expect(data.graph.inboxHistory?.[0]?.status).toBe('accepted');
      expect(data.graph.decisions?.length).toBe(1);

      const disk = await readProjectFile(projectId);
      expect(disk?.graph?.bomItems?.length).toBe(1);
    } finally {
      await deleteProjectFile(projectId);
    }
  });

  it('reject does not add bomItems/assets/measures, but writes decision + history', async () => {
    const projectId = `t_${randomUUID().slice(0, 8)}`;
    const userId = 'u_test';
    try {
      await writeProjectFile({
        projectId,
        userId,
        project: {
          graph: {
            assets: [],
            measures: [],
            inbox: [
              {
                id: 'ii3',
                kind: 'suggestedBomItems',
                status: 'inferred',
                provenance: { fileId: 'pp' },
                confidence: 0.6,
                needsConfirmation: true,
                suggestedBomItems: { measureId: 'm1', items: [{ sku: 'X', qty: 1 }] },
              },
            ],
            inboxHistory: [],
            decisions: [],
            bomItems: [],
          },
        },
      });

      const { default: app } = await import('../src/server');
      const res = await app.request(`/api/projects/${projectId}/graph/inbox/ii3/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ decision: 'REJECT', reason: 'Not needed' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data?.success).toBe(true);
      expect(data.graph.bomItems?.length || 0).toBe(0);
      expect(data.graph.assets?.length || 0).toBe(0);
      expect(data.graph.measures?.length || 0).toBe(0);
      expect(data.graph.inbox.length).toBe(0);
      expect(data.graph.inboxHistory?.[0]?.status).toBe('rejected');
      expect(data.graph.decisions?.length).toBe(1);
    } finally {
      await deleteProjectFile(projectId);
    }
  });
});

