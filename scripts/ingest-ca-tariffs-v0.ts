import { ingestCaTariffsV0 } from '../src/modules/tariffLibrary/ingest/ingestCaTariffs';

(async () => {
  const { snapshots, results, warnings } = await ingestCaTariffsV0();
  for (const w of warnings) {
    // eslint-disable-next-line no-console
    console.warn(w);
  }

  const wrote = results.filter((r) => r.action === 'wrote').length;
  const skipped = results.filter((r) => r.action === 'skipped').length;
  const failed = results.filter((r) => r.action === 'fetch_failed').length;

  for (const r of results) {
    if (r.action === 'wrote') {
      // eslint-disable-next-line no-console
      console.log(
        `[tariffLibrary:v0] ${r.utility}: added=${r.added} removed=${r.removed} unchanged=${r.unchanged} wrote snapshot ${r.versionTag}`,
      );
    } else if (r.action === 'skipped') {
      // eslint-disable-next-line no-console
      console.log(`[tariffLibrary:v0] ${r.utility}: no changes; skipped (latest=${r.versionTag})`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[tariffLibrary:v0] ${r.utility}: fetch failed; skipped`);
    }
  }
  // eslint-disable-next-line no-console
  console.log(
    `[tariffLibrary:v0] done snapshots=${snapshots.length} utilities=${snapshots.map((s) => s.utility).join(',')}`,
  );

  // eslint-disable-next-line no-console
  console.log(`[tariffLibrary:v0] Tariff ingestion complete: wrote ${wrote} snapshots, skipped ${skipped}, warnings ${warnings.length}`);

  // Exit code contract:
  // - Exit 1 only if ALL utilities failed to fetch.
  // - Otherwise exit 0 (even with warnings), since partial updates are still useful in CI.
  if (results.length > 0 && failed === results.length) {
    // eslint-disable-next-line no-console
    console.error('[tariffLibrary:v0] Fatal: all utilities failed to fetch. See warnings above.');
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

