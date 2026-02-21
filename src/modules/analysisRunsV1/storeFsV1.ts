import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';

import type { AnalysisRunIndexRowV1, AnalysisRunV1 } from './types';

const ENV_BASEDIR = 'EVERWATT_ANALYSIS_RUNS_V1_BASEDIR';

export function getAnalysisRunsV1BaseDir(): string {
  const env = String(process.env[ENV_BASEDIR] || '').trim();
  if (env) return path.resolve(env);
  return path.join(process.cwd(), '.data', 'analysisRunsV1');
}

export function assertValidRunIdV1(runIdRaw: string): string {
  const runId = String(runIdRaw || '').trim();
  // Security: allowlist only (no path traversal).
  if (!runId) throw new Error('runId is required');
  if (runId.length > 120) throw new Error('runId too long');
  if (!/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error('Invalid runId (allowed: [A-Za-z0-9_-])');
  return runId;
}

function stableStringifyV1(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalize = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(normalize);
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = normalize(v[k]);
    return out;
  };
  return JSON.stringify(normalize(value), null, 2) + '\n';
}

async function writeFileAtomicLike(targetPath: string, text: string): Promise<void> {
  const dir = path.dirname(targetPath);
  await mkdir(dir, { recursive: true });
  const tmp = `${targetPath}.tmp`;
  await writeFile(tmp, text, 'utf-8');
  try {
    // Windows rename won't overwrite; remove first if present.
    if (existsSync(targetPath)) await rm(targetPath, { force: true });
  } catch {
    // best-effort
  }
  await rename(tmp, targetPath);
}

function indexPath(baseDir: string): string {
  return path.join(baseDir, 'index.json');
}

function runPath(baseDir: string, runId: string): string {
  return path.join(baseDir, `${runId}.json`);
}

function toIndexRow(run: AnalysisRunV1): AnalysisRunIndexRowV1 {
  return {
    runId: String(run.runId),
    createdAtIso: String(run.createdAtIso),
    projectId: (run.projectId ?? null) as any,
    inputFingerprint: String(run.inputFingerprint),
  };
}

function sortIndexRowsDeterministic(rows: AnalysisRunIndexRowV1[]): AnalysisRunIndexRowV1[] {
  // Deterministic: newest first (desc). Tie-break by runId (asc).
  return rows
    .slice()
    .sort(
      (a, b) =>
        String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || '')) || String(a.runId || '').localeCompare(String(b.runId || ''))
    );
}

async function readIndexRows(baseDir: string): Promise<AnalysisRunIndexRowV1[]> {
  const fp = indexPath(baseDir);
  if (!existsSync(fp)) return [];
  try {
    const raw = await readFile(fp, 'utf-8');
    const parsed = JSON.parse(raw) as any;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r) => r && typeof r === 'object')
      .map((r) => ({
        runId: String((r as any).runId || '').trim(),
        createdAtIso: String((r as any).createdAtIso || '').trim(),
        projectId: (r as any).projectId ?? null,
        inputFingerprint: String((r as any).inputFingerprint || '').trim(),
      }))
      .filter((r) => r.runId && r.createdAtIso && r.inputFingerprint);
  } catch {
    return [];
  }
}

async function writeIndexRows(baseDir: string, rows: AnalysisRunIndexRowV1[]): Promise<void> {
  const sorted = sortIndexRowsDeterministic(rows);
  await writeFileAtomicLike(indexPath(baseDir), stableStringifyV1(sorted));
}

export function createAnalysisRunsStoreFsV1(args?: { baseDir?: string }) {
  const baseDir = path.resolve(String(args?.baseDir || '').trim() || getAnalysisRunsV1BaseDir());

  return {
    baseDir,

    async writeRun(run: AnalysisRunV1): Promise<void> {
      const runId = assertValidRunIdV1(run.runId);
      const fp = runPath(baseDir, runId);
      await writeFileAtomicLike(fp, stableStringifyV1(run));

      const existing = await readIndexRows(baseDir);
      const next = existing.filter((r) => String(r.runId) !== runId);
      next.push(toIndexRow(run));
      await writeIndexRows(baseDir, next);
    },

    async readRun(runIdRaw: string): Promise<AnalysisRunV1> {
      const runId = assertValidRunIdV1(runIdRaw);
      const fp = runPath(baseDir, runId);
      if (!existsSync(fp)) throw new Error('Analysis run not found');
      const raw = await readFile(fp, 'utf-8');
      const parsed = JSON.parse(raw) as any;
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid stored analysis run');
      // Ensure runId is the validated param (prevents surprises).
      return { ...(parsed as any), runId } as AnalysisRunV1;
    },

    async listIndex(): Promise<AnalysisRunIndexRowV1[]> {
      const existing = await readIndexRows(baseDir);
      return sortIndexRowsDeterministic(existing);
    },
  };
}

