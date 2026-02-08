import path from 'path';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import type { EvidenceStoreRecord } from './types';

const EVIDENCE_DIR = path.join(process.cwd(), 'data', 'dev', 'evidence');

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

function storePath(orgId: string, projectId: string): string {
  return path.join(EVIDENCE_DIR, orgId, `${projectId}.json`);
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
  await ensureDir(path.join(EVIDENCE_DIR, orgId));
  const fp = storePath(orgId, projectId);
  await writeFile(fp, JSON.stringify(next, null, 2), 'utf-8');
}

