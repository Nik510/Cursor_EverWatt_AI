import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ProgramSnapshotV1 } from './types';

let warnedMissingProgramsOnce = false;

function baseProgramsDir(baseDir?: string): string {
  const env = String(process.env.EVERWATT_PROGRAM_LIBRARY_BASEDIR || '').trim();
  return baseDir || (env ? env : path.join(process.cwd(), 'data', 'programs'));
}

function utilityDir(utilityKey: string, baseDir?: string): string {
  return path.join(baseProgramsDir(baseDir), String(utilityKey || '').trim());
}

export function isSnapshotStaleV1(capturedAtIso: string, nowIso: string, maxAgeDays = 14): boolean {
  const capturedAtMs = new Date(capturedAtIso).getTime();
  const nowMs = new Date(nowIso).getTime();
  if (!Number.isFinite(capturedAtMs) || !Number.isFinite(nowMs)) return true;
  return nowMs - capturedAtMs > maxAgeDays * 24 * 60 * 60 * 1000;
}

export async function saveProgramSnapshotV1(snapshot: ProgramSnapshotV1, opts?: { baseDir?: string }): Promise<string> {
  const dir = utilityDir(snapshot.utilityKey, opts?.baseDir);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${snapshot.versionTag}.json`);
  await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  return filePath;
}

export async function listProgramSnapshotsV1(utilityKey: string, opts?: { baseDir?: string }): Promise<string[]> {
  const dir = utilityDir(utilityKey, opts?.baseDir);
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch (e: any) {
    if (!warnedMissingProgramsOnce && String(process.env.NODE_ENV || '').toLowerCase() !== 'test') {
      const code = String(e?.code || '');
      if (code === 'ENOENT') {
        warnedMissingProgramsOnce = true;
        // eslint-disable-next-line no-console
        console.warn('[programLibrary:v1] Program snapshots not found. Run: npm run programs:ingest:ca');
      }
    }
    files = [];
  }
  return files
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .map((f) => f.replace(/\.json$/i, ''))
    .sort((a, b) => a.localeCompare(b));
}

export async function loadProgramSnapshotV1(utilityKey: string, versionTag: string, opts?: { baseDir?: string }): Promise<ProgramSnapshotV1 | null> {
  const dir = utilityDir(utilityKey, opts?.baseDir);
  const filePath = path.join(dir, `${versionTag}.json`);
  const raw = await fs.readFile(filePath, 'utf-8').catch(() => '');
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    return {
      utilityKey: String(s?.utilityKey || utilityKey),
      capturedAt: String(s?.capturedAt || ''),
      versionTag: String(s?.versionTag || versionTag),
      programs: Array.isArray(s?.programs) ? s.programs : [],
      sourceFingerprints: Array.isArray(s?.sourceFingerprints) ? s.sourceFingerprints : undefined,
    } as ProgramSnapshotV1;
  } catch {
    return null;
  }
}

export async function loadLatestProgramSnapshotV1(
  utilityKey: string,
  opts?: { baseDir?: string },
): Promise<{ snapshot: ProgramSnapshotV1 | null; warnings: string[] }> {
  const warnings: string[] = [];
  const tags = await listProgramSnapshotsV1(utilityKey, opts);
  const latest = tags[tags.length - 1];
  if (!latest) {
    warnings.push(`[programLibrary:v1] missing snapshot for ${utilityKey}`);
    return { snapshot: null, warnings };
  }
  const snapshot = await loadProgramSnapshotV1(utilityKey, latest, opts);
  if (!snapshot) warnings.push(`[programLibrary:v1] failed to load snapshot ${utilityKey}/${latest}`);
  return { snapshot, warnings };
}

