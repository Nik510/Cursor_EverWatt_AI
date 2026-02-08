/**
 * HVAC Optimizer Run Storage
 *
 * Stores async HVAC optimizer runs by runId.
 * - If DB enabled: uses calculations table (calculation_type = 'hvac-optimizer-run')
 * - Else: stores JSON files under data/hvac-runs/<userId>/<runId>.json
 */
import { mkdir, readFile, writeFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { isDatabaseEnabled } from '../../db/client';
import type { HvacComputeAnalyzeRequest, HvacComputeAnalyzeResponse } from './optimizer-contract';
 
export type HvacRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'blocked_by_faults';
 
export type HvacRunRecord = {
  id: string; // runId
  userId: string;
  projectId: string;
  status: HvacRunStatus;
  requestHash: string;
  request: Omit<HvacComputeAnalyzeRequest, 'trend'> & { trendSource: { kind: 'userFile'; key: string } | { kind: 'inlineCsv' } };
  result?: HvacComputeAnalyzeResponse;
  error?: { message: string };
  createdAt: string;
  updatedAt: string;
};
 
const HVAC_RUNS_DIR = path.join(process.cwd(), 'data', 'hvac-runs');
 
async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}
 
function getRunPath(userId: string, runId: string): string {
  return path.join(HVAC_RUNS_DIR, userId, `${runId}.json`);
}
 
export async function createHvacRun(record: HvacRunRecord): Promise<void> {
  if (isDatabaseEnabled()) {
    const { createCalculation } = await import('../../services/db-service');
    await createCalculation(
      record.userId,
      'hvac-optimizer-run',
      record,
      `HVAC Optimizer Run - ${new Date(record.createdAt).toLocaleString()}`,
      record.id
    );
    return;
  }
 
  await ensureDir(path.join(HVAC_RUNS_DIR, record.userId));
  await writeFile(getRunPath(record.userId, record.id), JSON.stringify(record, null, 2), 'utf-8');
}
 
export async function getHvacRun(userId: string, runId: string): Promise<HvacRunRecord | null> {
  if (isDatabaseEnabled()) {
    const { getCalculation } = await import('../../services/db-service');
    const rec = await getCalculation(userId, runId);
    if (!rec) return null;
    return rec.data as HvacRunRecord;
  }
 
  const fp = getRunPath(userId, runId);
  if (!existsSync(fp)) return null;
  const raw = await readFile(fp, 'utf-8');
  return JSON.parse(raw) as HvacRunRecord;
}
 
export async function updateHvacRun(userId: string, runId: string, patch: Partial<HvacRunRecord>): Promise<HvacRunRecord> {
  const existing = await getHvacRun(userId, runId);
  if (!existing) throw new Error('HVAC run not found');
  const updated: HvacRunRecord = {
    ...existing,
    ...patch,
    id: existing.id,
    userId: existing.userId,
    updatedAt: new Date().toISOString(),
  };
 
  if (isDatabaseEnabled()) {
    const { updateCalculation } = await import('../../services/db-service');
    await updateCalculation(userId, runId, { data: updated });
    return updated;
  }
 
  await ensureDir(path.join(HVAC_RUNS_DIR, userId));
  await writeFile(getRunPath(userId, runId), JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}
 
export async function listHvacRuns(userId: string, projectId?: string): Promise<HvacRunRecord[]> {
  if (isDatabaseEnabled()) {
    const { listCalculations } = await import('../../services/db-service');
    const calcs = await listCalculations(userId, 'hvac-optimizer-run');
    const runs = calcs.map((c) => c.data as HvacRunRecord);
    return projectId ? runs.filter((r) => r.projectId === projectId) : runs;
  }
 
  const dir = path.join(HVAC_RUNS_DIR, userId);
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  const runs: HvacRunRecord[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = await readFile(path.join(dir, f), 'utf-8');
      const r = JSON.parse(raw) as HvacRunRecord;
      if (!projectId || r.projectId === projectId) runs.push(r);
    } catch {
      // ignore bad files
    }
  }
  return runs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
 
