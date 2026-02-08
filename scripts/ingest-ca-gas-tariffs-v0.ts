import { ingestCaGasTariffsV0 } from '../src/modules/tariffLibraryGas/ingest/ingestCaGasTariffs';

(async () => {
  const { snapshots, results, warnings } = await ingestCaGasTariffsV0();
  for (const w of warnings) {
    // eslint-disable-next-line no-console
    console.warn(w);
  }

  const wrote = results.filter((r) => r.action === 'wrote').length;
  const skipped = results.filter((r) => r.action === 'skipped').length;
  const failed = results.filter((r) => r.action === 'fetch_failed').length;
  const seeded = results.filter((r) => r.action === 'seeded').length;

  for (const r of results) {
    if (r.action === 'wrote') {
      // eslint-disable-next-line no-console
      console.log(`[tariffLibraryGas:v0] ${r.utility}: added=${r.added} removed=${r.removed} unchanged=${r.unchanged} wrote snapshot ${r.versionTag}`);
    } else if (r.action === 'skipped') {
      // eslint-disable-next-line no-console
      console.log(`[tariffLibraryGas:v0] ${r.utility}: no changes; skipped (latest=${r.versionTag})`);
    } else if (r.action === 'seeded') {
      // eslint-disable-next-line no-console
      console.log(`[tariffLibraryGas:v0] ${r.utility}: fetch failed; wrote seed snapshot ${r.versionTag}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[tariffLibraryGas:v0] ${r.utility}: fetch failed; skipped`);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[tariffLibraryGas:v0] done snapshots=${snapshots.length} utilities=${snapshots.map((s) => s.utility).join(',')}`);
  // eslint-disable-next-line no-console
  console.log(
    `[tariffLibraryGas:v0] Gas tariff ingestion complete: wrote ${wrote} snapshots, seeded ${seeded}, skipped ${skipped}, warnings ${warnings.length}`,
  );

  // Exit code contract:
  // - Exit 1 only if ALL utilities failed to fetch AND no seed snapshots were written.
  // - Otherwise exit 0 (even with warnings).
  if (results.length > 0 && failed === results.length && seeded === 0) {
    // eslint-disable-next-line no-console
    console.error('[tariffLibraryGas:v0] Fatal: all utilities failed to fetch and no seed snapshots were written. See warnings above.');
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

