import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { CaGasTariffUtility, GasTariffSnapshot } from './types';

let warnedMissingSnapshotsOnce = false;

function normalizeSnapshotV0(s: any): GasTariffSnapshot {
  const utility = String(s?.utility || '').trim().toUpperCase() as CaGasTariffUtility;
  const capturedAt = String(s?.capturedAt || '').trim();
  const versionTag = String(s?.versionTag || '').trim();
  const rates = Array.isArray(s?.rates) ? (s.rates as GasTariffSnapshot['rates']) : [];
  const metadataCompleteness =
    s?.metadataCompleteness && typeof s.metadataCompleteness === 'object' ? (s.metadataCompleteness as any) : undefined;
  const raw = Array.isArray(s?.raw) ? (s.raw as GasTariffSnapshot['raw']) : undefined;
  const sourceFingerprints = Array.isArray(s?.sourceFingerprints)
    ? (s.sourceFingerprints as GasTariffSnapshot['sourceFingerprints'])
    : Array.isArray(raw)
      ? raw
      : [];
  const diffFromPrevious =
    s?.diffFromPrevious &&
    typeof s.diffFromPrevious === 'object' &&
    typeof s.diffFromPrevious.previousVersionTag === 'string'
      ? (s.diffFromPrevious as GasTariffSnapshot['diffFromPrevious'])
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
  const env = String(process.env.EVERWATT_TARIFF_LIBRARY_GAS_BASEDIR || '').trim();
  return baseDir || (env ? env : path.join(process.cwd(), 'data', 'tariffs_gas'));
}

function utilityDir(utility: CaGasTariffUtility, baseDir?: string): string {
  return path.join(baseTariffDir(baseDir), utility);
}

export async function saveGasSnapshot(snapshot: GasTariffSnapshot, opts?: { baseDir?: string }): Promise<string> {
  const dir = utilityDir(snapshot.utility, opts?.baseDir);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${snapshot.versionTag}.json`);
  await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  return filePath;
}

export async function listGasSnapshots(utility: CaGasTariffUtility, opts?: { baseDir?: string }): Promise<string[]> {
  const dir = utilityDir(utility, opts?.baseDir);
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch (e: any) {
    if (!warnedMissingSnapshotsOnce && String(process.env.NODE_ENV || '').toLowerCase() !== 'test') {
      const code = String(e?.code || '');
      if (code === 'ENOENT') {
        warnedMissingSnapshotsOnce = true;
        // eslint-disable-next-line no-console
        console.warn('[tariffLibraryGas:v0] Gas tariff snapshots not found. Run: npm run tariffs:ingest:ca:gas');
      }
    }
    files = [];
  }
  return files
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .map((f) => f.replace(/\.json$/i, ''))
    .sort((a, b) => a.localeCompare(b));
}

export async function loadGasSnapshot(
  utility: CaGasTariffUtility,
  versionTag: string,
  opts?: { baseDir?: string },
): Promise<GasTariffSnapshot | null> {
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

export async function loadLatestGasSnapshot(utility: CaGasTariffUtility, opts?: { baseDir?: string }): Promise<GasTariffSnapshot | null> {
  const tags = await listGasSnapshots(utility, opts);
  const latest = tags[tags.length - 1];
  if (!latest) return null;
  return loadGasSnapshot(utility, latest, opts);
}

