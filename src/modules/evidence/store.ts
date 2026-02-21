import path from 'path';
import os from 'node:os';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import type { EvidenceStoreRecord } from './types';

function resolveEvidenceDir(): string {
  const override = String(process.env.EVERWATT_EVIDENCE_DIR || '').trim();
  if (override) return override;

  // Tests should never write into tracked repo data.
  const isTest = Boolean(process.env.VITEST) || String(process.env.NODE_ENV || '').toLowerCase() === 'test';
  if (isTest) {
    const pid = String(process.pid);
    const worker = String(process.env.VITEST_WORKER_ID || '0');
    return path.join(os.tmpdir(), 'everwatt-engine', 'vitest', `pid-${pid}`, `worker-${worker}`, 'evidence');
  }

  return path.join(process.cwd(), 'data', 'dev', 'evidence');
}

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

function storePath(orgId: string, projectId: string): string {
  return path.join(resolveEvidenceDir(), orgId, `${projectId}.json`);
}

export async function readEvidenceStore(orgId: string, projectId: string): Promise<EvidenceStoreRecord> {
  const fp = storePath(orgId, projectId);
  if (!existsSync(fp)) return { sources: [], artifacts: [], links: [] };
  const raw = await readFile(fp, 'utf-8');
  const data = JSON.parse(raw) as EvidenceStoreRecord;
  return {
    sources: Array.isArray(data?.sources) ? data.sources : [],
    artifacts: Array.isArray(data?.artifacts) ? data.artifacts : [],
    links: Array.isArray(data?.links) ? data.links : [],
  };
}

export async function writeEvidenceStore(orgId: string, projectId: string, next: EvidenceStoreRecord): Promise<void> {
  const dir = resolveEvidenceDir();
  await ensureDir(path.join(dir, orgId));
  const fp = storePath(orgId, projectId);
  await writeFile(fp, JSON.stringify(next, null, 2), 'utf-8');
}

