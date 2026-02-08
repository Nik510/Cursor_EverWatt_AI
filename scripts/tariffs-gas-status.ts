import { loadLatestGasSnapshot } from '../src/modules/tariffLibraryGas/storage';
import { isGasSnapshotStale } from '../src/modules/tariffLibraryGas';

function daysBetween(nowIso: string, capturedAtIso: string): number | null {
  const a = new Date(capturedAtIso).getTime();
  const b = new Date(nowIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}

(async () => {
  const nowIso = new Date().toISOString();
  const utilities = ['PGE', 'SDGE', 'SOCALGAS'] as const;

  // eslint-disable-next-line no-console
  console.log('[tariffLibraryGas:v0] Gas tariff snapshot status (CA)');

  let anyFound = false;
  for (const u of utilities) {
    const snap = await loadLatestGasSnapshot(u as any);
    if (!snap) {
      // eslint-disable-next-line no-console
      console.log(`- ${u}: (missing) → run: npm run tariffs:ingest:ca:gas`);
      continue;
    }
    anyFound = true;
    const ageDays = daysBetween(nowIso, snap.capturedAt);
    const stale = isGasSnapshotStale(snap.capturedAt, nowIso, 14);
    // eslint-disable-next-line no-console
    console.log(
      `- ${u}: ${snap.versionTag} capturedAt=${snap.capturedAt}${ageDays !== null ? ` ageDays=${ageDays}` : ''} stale=${stale ? 'yes' : 'no'} rates=${snap.rates?.length || 0}`,
    );
  }

  if (!anyFound) {
    // eslint-disable-next-line no-console
    console.log('[tariffLibraryGas:v0] No snapshots found for any gas utility.');
  }
  process.exitCode = 0;
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

