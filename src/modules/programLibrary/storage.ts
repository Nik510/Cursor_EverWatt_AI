import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ProgramSnapshotV0 } from './types';

function baseProgramsDir(baseDir?: string): string {
  const env = String(process.env.EVERWATT_PROGRAM_LIBRARY_BASEDIR || '').trim();
  return baseDir || (env ? env : path.join(process.cwd(), 'data', 'programs'));
}

function scopeDir(scope: string, baseDir?: string): string {
  return path.join(baseProgramsDir(baseDir), scope);
}

export async function saveProgramSnapshot(snapshot: ProgramSnapshotV0, opts?: { baseDir?: string }): Promise<string> {
  const dir = scopeDir(snapshot.scope, opts?.baseDir);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${snapshot.versionTag}.json`);
  await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  return filePath;
}

export async function listProgramSnapshots(scope: string, opts?: { baseDir?: string }): Promise<string[]> {
  const dir = scopeDir(scope, opts?.baseDir);
  const files = await fs.readdir(dir).catch(() => []);
  return files
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .map((f) => f.replace(/\.json$/i, ''))
    .sort((a, b) => a.localeCompare(b));
}

export async function loadProgramSnapshot(scope: string, versionTag: string, opts?: { baseDir?: string }): Promise<ProgramSnapshotV0 | null> {
  const dir = scopeDir(scope, opts?.baseDir);
  const filePath = path.join(dir, `${versionTag}.json`);
  const raw = await fs.readFile(filePath, 'utf-8').catch(() => '');
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    return {
      scope: String(s?.scope || scope),
      capturedAt: String(s?.capturedAt || ''),
      versionTag: String(s?.versionTag || versionTag),
      programs: Array.isArray(s?.programs) ? s.programs : [],
    } as ProgramSnapshotV0;
  } catch {
    return null;
  }
}

export async function loadLatestProgramSnapshot(scope: string, opts?: { baseDir?: string }): Promise<ProgramSnapshotV0 | null> {
  const tags = await listProgramSnapshots(scope, opts);
  const latest = tags[tags.length - 1];
  if (!latest) return null;
  return loadProgramSnapshot(scope, latest, opts);
}

