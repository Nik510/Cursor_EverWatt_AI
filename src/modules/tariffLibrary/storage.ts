import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { CaTariffUtility } from './ca/sources';
import type { TariffSnapshot } from './types';

let warnedMissingSnapshotsOnce = false;

function normalizeSnapshotV0(s: any): TariffSnapshot {
  const utility = String(s?.utility || '').trim() as CaTariffUtility;
  const capturedAt = String(s?.capturedAt || '').trim();
  const versionTag = String(s?.versionTag || '').trim();
  const rates = Array.isArray(s?.rates) ? (s.rates as TariffSnapshot['rates']) : [];
  const metadataCompleteness =
    s?.metadataCompleteness && typeof s.metadataCompleteness === 'object' ? (s.metadataCompleteness as any) : undefined;
  const raw = Array.isArray(s?.raw) ? (s.raw as TariffSnapshot['raw']) : undefined;
  const sourceFingerprints = Array.isArray(s?.sourceFingerprints)
    ? (s.sourceFingerprints as TariffSnapshot['sourceFingerprints'])
    : Array.isArray(raw)
      ? raw
      : [];
  const diffFromPrevious =
    s?.diffFromPrevious &&
    typeof s.diffFromPrevious === 'object' &&
    typeof s.diffFromPrevious.previousVersionTag === 'string'
      ? (s.diffFromPrevious as TariffSnapshot['diffFromPrevious'])
      : undefined;

  return {
    utility,
    capturedAt,
    versionTag,
    rates,
    ...(metadataCompleteness ? { metadataCompleteness } : {}),
    sourceFingerprints,
    ...(diffFromPrevious ? { diffFromPrevious } : {}),
    ...(raw ? { raw } : {}),
  };
}

function baseTariffDir(baseDir?: string): string {
  const env = String(process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR || '').trim();
  return baseDir || (env ? env : path.join(process.cwd(), 'data', 'tariffs'));
}

function utilityDir(utility: CaTariffUtility, baseDir?: string): string {
  return path.join(baseTariffDir(baseDir), utility);
}

export async function saveSnapshot(snapshot: TariffSnapshot, opts?: { baseDir?: string }): Promise<string> {
  const dir = utilityDir(snapshot.utility, opts?.baseDir);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${snapshot.versionTag}.json`);
  await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  return filePath;
}

export async function listSnapshots(utility: CaTariffUtility, opts?: { baseDir?: string }): Promise<string[]> {
  const dir = utilityDir(utility, opts?.baseDir);
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch (e: any) {
    // Dev-friendly warning (log once) when snapshots are not present at runtime.
    // Keep quiet during unit tests to avoid noisy logs.
    if (!warnedMissingSnapshotsOnce && String(process.env.NODE_ENV || '').toLowerCase() !== 'test') {
      const code = String(e?.code || '');
      if (code === 'ENOENT') {
        warnedMissingSnapshotsOnce = true;
        // eslint-disable-next-line no-console
        console.warn('[tariffLibrary:v0] Tariff snapshots not found. Run: npm run tariffs:ingest:ca');
      }
    }
    files = [];
  }
  return files
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .map((f) => f.replace(/\.json$/i, ''))
    .sort((a, b) => a.localeCompare(b));
}

export async function loadSnapshot(utility: CaTariffUtility, versionTag: string, opts?: { baseDir?: string }): Promise<TariffSnapshot | null> {
  const dir = utilityDir(utility, opts?.baseDir);
  const filePath = path.join(dir, `${versionTag}.json`);
  const raw = await fs.readFile(filePath, 'utf-8').catch(() => '');
  if (!raw) return null;
  try {
    return normalizeSnapshotV0(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function loadLatestSnapshot(utility: CaTariffUtility, opts?: { baseDir?: string }): Promise<TariffSnapshot | null> {
  const tags = await listSnapshots(utility, opts);
  const latest = tags[tags.length - 1];
  if (!latest) return null;
  return loadSnapshot(utility, latest, opts);
}

