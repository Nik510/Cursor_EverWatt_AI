import path from 'path';
import { existsSync } from 'fs';
import { mkdir, readFile, readdir, writeFile } from 'fs/promises';
import { isDatabaseEnabled } from '../../db/client';
import type { ProjectRecord } from '../../types/change-order';

const PROJECTS_DIR = path.join(process.cwd(), 'data', 'projects');

async function ensureProjectsDir(): Promise<void> {
  if (!existsSync(PROJECTS_DIR)) await mkdir(PROJECTS_DIR, { recursive: true });
}

function projectPath(projectId: string): string {
  return path.join(PROJECTS_DIR, `${projectId}.json`);
}

export async function loadProjectForOrg(orgId: string, projectId: string): Promise<ProjectRecord | null> {
  if (isDatabaseEnabled()) {
    const { getProject } = await import('../../services/db-service');
    return await getProject(orgId, projectId);
  }

  const fp = projectPath(projectId);
  if (!existsSync(fp)) return null;
  const rec = JSON.parse(await readFile(fp, 'utf-8')) as any;
  if (String(rec?.userId || '') !== String(orgId || '')) return null;
  // Preserve full payload for scripts; do not strip userId here.
  return rec as ProjectRecord;
}

export async function createOrOverwriteProjectForOrg(orgId: string, project: ProjectRecord): Promise<void> {
  if (isDatabaseEnabled()) {
    const { createProject } = await import('../../services/db-service');
    // The DB service stores the JSON payload as-is, and uses `id` if supplied.
    await createProject(orgId, { ...(project as any) }, project.id);
    return;
  }

  await ensureProjectsDir();
  const fp = projectPath(project.id);
  const toWrite = { ...(project as any), userId: orgId };
  await writeFile(fp, JSON.stringify(toWrite, null, 2), 'utf-8');
}

export async function patchProjectForOrg(orgId: string, projectId: string, patch: Record<string, unknown>): Promise<ProjectRecord> {
  if (isDatabaseEnabled()) {
    const { updateProject } = await import('../../services/db-service');
    return await updateProject(orgId, projectId, patch as any);
  }

  await ensureProjectsDir();
  const fp = projectPath(projectId);
  if (!existsSync(fp)) throw new Error('Project not found');
  const rec = JSON.parse(await readFile(fp, 'utf-8')) as any;
  if (String(rec?.userId || '') !== String(orgId || '')) throw new Error('Project not found');

  const merged = {
    ...rec,
    ...patch,
    id: projectId,
    customer: { ...(rec.customer || {}), ...((patch as any).customer || {}) },
    driveFolderLink: (patch as any).driveFolderLink || rec.driveFolderLink,
    updatedAt: new Date().toISOString(),
    userId: orgId,
  };
  await writeFile(fp, JSON.stringify(merged, null, 2), 'utf-8');
  return merged as ProjectRecord;
}

export async function listProjectsForOrg(orgId: string): Promise<ProjectRecord[]> {
  if (isDatabaseEnabled()) {
    const { listProjects } = await import('../../services/db-service');
    return await listProjects(orgId);
  }

  await ensureProjectsDir();
  const files = await readdir(PROJECTS_DIR).catch(() => []);
  const out: ProjectRecord[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = await readFile(path.join(PROJECTS_DIR, f), 'utf-8');
      const rec = JSON.parse(raw) as any;
      if (String(rec?.userId || '') !== String(orgId || '')) continue;
      out.push(rec as ProjectRecord);
    } catch {
      // ignore bad files
    }
  }
  return out;
}

