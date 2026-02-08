import { loadLatestSnapshot } from '../src/modules/tariffLibrary/storage';
import { isSnapshotStale } from '../src/modules/tariffLibrary';

function daysBetween(nowIso: string, capturedAtIso: string): number | null {
  const a = new Date(capturedAtIso).getTime();
  const b = new Date(nowIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}

(async () => {
  const nowIso = new Date().toISOString();
  const utilities = ['PGE', 'SCE', 'SDGE'] as const;

  // eslint-disable-next-line no-console
  console.log('[tariffLibrary:v0] Tariff snapshot status (CA IOUs)');

  let anyFound = false;
  for (const u of utilities) {
    const snap = await loadLatestSnapshot(u);
    if (!snap) {
      // eslint-disable-next-line no-console
      console.log(`- ${u}: (missing) → run: npm run tariffs:ingest:ca`);
      continue;
    }
    anyFound = true;
    const ageDays = daysBetween(nowIso, snap.capturedAt);
    const stale = isSnapshotStale(snap.capturedAt, nowIso, 14);
    // eslint-disable-next-line no-console
    console.log(
      `- ${u}: ${snap.versionTag} capturedAt=${snap.capturedAt}${ageDays !== null ? ` ageDays=${ageDays}` : ''} stale=${stale ? 'yes' : 'no'} rates=${snap.rates?.length || 0}`,
    );
  }

  if (!anyFound) {
    // eslint-disable-next-line no-console
    console.log('[tariffLibrary:v0] No snapshots found for any utility.');
  }
  process.exitCode = 0;
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

