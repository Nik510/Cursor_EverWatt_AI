import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { dbQuery, isDatabaseEnabled } from '../../db/client';
import type { CompletedProjectRecord, EverWattMemoryIndex, MemoryIndexVersion, RecommendationSuggestion } from '../project/types';

const DEV_DIR = path.join(process.cwd(), 'data', 'dev');
const COMPLETED_PROJECTS_DIR = path.join(DEV_DIR, 'completed-projects');
const MEMORY_INDEX_DIR = path.join(DEV_DIR, 'memory-index');
const RECOMMENDATIONS_DIR = path.join(DEV_DIR, 'recommendations');

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

function completedProjectsPath(orgId: string): string {
  return path.join(COMPLETED_PROJECTS_DIR, `${orgId}.json`);
}

function memoryIndexPath(orgId: string, version: MemoryIndexVersion): string {
  return path.join(MEMORY_INDEX_DIR, `${orgId}.${version}.json`);
}

function recommendationsPath(orgId: string, projectId: string): string {
  return path.join(RECOMMENDATIONS_DIR, orgId, `${projectId}.json`);
}

export async function upsertCompletedProject(rec: CompletedProjectRecord): Promise<void> {
  if (isDatabaseEnabled()) {
    await dbQuery(
      `INSERT INTO completed_projects (id, org_id, data, created_at, imported_at, updated_at)
       VALUES ($1, $2, $3::jsonb, $4::timestamptz, $5::timestamptz, NOW())
       ON CONFLICT (id) DO UPDATE SET
         org_id = EXCLUDED.org_id,
         data = EXCLUDED.data,
         created_at = EXCLUDED.created_at,
         imported_at = EXCLUDED.imported_at,
         updated_at = NOW()`,
      [
        rec.completedProjectId,
        rec.orgId,
        JSON.stringify(rec),
        rec.createdAt,
        rec.importedAt,
      ]
    );
    return;
  }

  await ensureDir(COMPLETED_PROJECTS_DIR);
  const fp = completedProjectsPath(rec.orgId);
  const arr: CompletedProjectRecord[] = existsSync(fp)
    ? (JSON.parse(await readFile(fp, 'utf-8')) as CompletedProjectRecord[])
    : [];
  const idx = arr.findIndex((x) => String(x?.completedProjectId || '') === rec.completedProjectId);
  const next = idx >= 0 ? [...arr.slice(0, idx), rec, ...arr.slice(idx + 1)] : [rec, ...arr];
  await writeFile(fp, JSON.stringify(next, null, 2), 'utf-8');
}

export async function listCompletedProjects(orgId: string): Promise<CompletedProjectRecord[]> {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{ data: unknown }>(
      `SELECT data
       FROM completed_projects
       WHERE org_id = $1
       ORDER BY imported_at DESC
       LIMIT 5000`,
      [orgId]
    );
    return rows.map((r) => r.data as CompletedProjectRecord);
  }

  const fp = completedProjectsPath(orgId);
  if (!existsSync(fp)) return [];
  const arr = JSON.parse(await readFile(fp, 'utf-8')) as CompletedProjectRecord[];
  return Array.isArray(arr) ? arr : [];
}

export async function upsertMemoryIndex(index: EverWattMemoryIndex): Promise<void> {
  if (isDatabaseEnabled()) {
    await dbQuery(
      `INSERT INTO memory_index (id, org_id, version, data, generated_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz, NOW())
       ON CONFLICT (id) DO UPDATE SET
         data = EXCLUDED.data,
         generated_at = EXCLUDED.generated_at,
         updated_at = NOW()`,
      [index.indexId, index.orgId, index.version, JSON.stringify(index), index.generatedAt]
    );
    return;
  }

  await ensureDir(MEMORY_INDEX_DIR);
  const fp = memoryIndexPath(index.orgId, index.version);
  await writeFile(fp, JSON.stringify(index, null, 2), 'utf-8');
}

export async function getMemoryIndex(orgId: string, version: MemoryIndexVersion): Promise<EverWattMemoryIndex | null> {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{ data: unknown }>(
      `SELECT data
       FROM memory_index
       WHERE org_id = $1 AND version = $2
       ORDER BY generated_at DESC
       LIMIT 1`,
      [orgId, version]
    );
    const row = rows[0];
    return row ? (row.data as EverWattMemoryIndex) : null;
  }

  const fp = memoryIndexPath(orgId, version);
  if (!existsSync(fp)) return null;
  return JSON.parse(await readFile(fp, 'utf-8')) as EverWattMemoryIndex;
}

export async function upsertRecommendationSuggestion(s: RecommendationSuggestion): Promise<void> {
  if (isDatabaseEnabled()) {
    await dbQuery(
      `INSERT INTO recommendations (id, org_id, project_id, data, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz, NOW())
       ON CONFLICT (id) DO UPDATE SET
         data = EXCLUDED.data,
         updated_at = NOW()`,
      [s.suggestionId, s.orgId, s.projectId, JSON.stringify(s), s.createdAt]
    );
    return;
  }

  await ensureDir(path.join(RECOMMENDATIONS_DIR, s.orgId));
  const fp = recommendationsPath(s.orgId, s.projectId);
  const arr: RecommendationSuggestion[] = existsSync(fp) ? (JSON.parse(await readFile(fp, 'utf-8')) as RecommendationSuggestion[]) : [];
  const idx = arr.findIndex((x) => String(x?.suggestionId || '') === s.suggestionId);
  const next = idx >= 0 ? [...arr.slice(0, idx), s, ...arr.slice(idx + 1)] : [s, ...arr];
  await writeFile(fp, JSON.stringify(next, null, 2), 'utf-8');
}

export async function listRecommendationSuggestions(orgId: string, projectId: string): Promise<RecommendationSuggestion[]> {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{ data: unknown }>(
      `SELECT data
       FROM recommendations
       WHERE org_id = $1 AND project_id = $2
       ORDER BY created_at DESC
       LIMIT 5000`,
      [orgId, projectId]
    );
    return rows.map((r) => r.data as RecommendationSuggestion);
  }

  const fp = recommendationsPath(orgId, projectId);
  if (!existsSync(fp)) return [];
  const arr = JSON.parse(await readFile(fp, 'utf-8')) as RecommendationSuggestion[];
  return Array.isArray(arr) ? arr : [];
}

export function newId(prefix?: string): string {
  const id = randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

