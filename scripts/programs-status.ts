import { listProgramSnapshotsV1, loadProgramSnapshotV1, isSnapshotStaleV1 } from '../src/modules/programLibrary/v1/storage';

async function main() {
  const utilities = ['PGE', 'SCE', 'SDGE', 'SMUD', 'LADWP', 'EBCE', 'PCE', 'SVCE', 'SCP', 'CPA'];
  const nowIso = new Date().toISOString();
  for (const u of utilities) {
    const tags = await listProgramSnapshotsV1(u);
    const latest = tags[tags.length - 1];
    if (!latest) {
      // eslint-disable-next-line no-console
      console.log(`[programLibrary:v1] ${u}: (missing) → run: npm run programs:ingest:ca`);
      continue;
    }
    const snap = await loadProgramSnapshotV1(u, latest);
    if (!snap) {
      // eslint-disable-next-line no-console
      console.log(`[programLibrary:v1] ${u}: failed to load ${latest}`);
      continue;
    }
    const isStale = isSnapshotStaleV1(snap.capturedAt, nowIso, 14);
    // eslint-disable-next-line no-console
    console.log(`[programLibrary:v1] ${u}@${snap.versionTag} (${isStale ? 'stale' : 'fresh'}) capturedAt=${snap.capturedAt} programs=${snap.programs?.length || 0}`);
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});

