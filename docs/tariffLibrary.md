# Tariff Library (CA) v0

This module stores **versioned, metadata-only** tariff snapshots for CA IOUs (PG&E / SCE / SDG&E). It is designed to be CI-friendly and deterministic.

## Run ingestion (run now)

```bash
npm run tariffs:ingest:ca
```

This fetches the configured HTML sources, extracts rate schedule codes (metadata only), computes source content hashes, diffs vs the previous snapshot, and writes snapshots only when changes are detected.

## Where snapshots are written

- `data/tariffs/{UTILITY}/{versionTag}.json`
  - Example: `data/tariffs/PGE/2026-02-05T1200Z.json`

Optional override (useful for CI/tests):

- `EVERWATT_TARIFF_LIBRARY_BASEDIR=/some/path`

## Freshness / staleness

The UI/workflow marks a snapshot as **stale** when:

- `now - capturedAt > 14 days`

This is computed deterministically using ISO timestamps.

## Recommended cadence

- **Daily** (preferred) or **weekly**
- If unchanged, ingestion **skips writing** new snapshots (safe default).

## Quick status check (dev/ops)

```bash
npm run tariffs:status
```

Prints snapshot version + age/stale per CA IOU.## Production deployment (making snapshots available at runtime)

At runtime, the app loads the **latest snapshot** from the local filesystem. Production must ensure the snapshot files exist.

Two recommended approaches:

- **A) Bake snapshots into the image/container**
  - Run ingestion during build (or copy a known-good `data/tariffs` directory into the image).
  - Ensure the runtime filesystem contains `data/tariffs/{UTILITY}/...`.

- **B) Mount a persistent volume + ingest on a schedule**
  - Mount a writable directory that will store snapshots long-term.
  - Set `EVERWATT_TARIFF_LIBRARY_BASEDIR` to the mounted **tariffs directory** (the folder that contains `PGE/`, `SCE/`, `SDGE/`).
  - Run ingestion on a schedule (daily/weekly) writing into that directory.

## Dev note

If you see a runtime warning like:

> `Tariff snapshots not found. Run: npm run tariffs:ingest:ca`

Run the command above to generate `data/tariffs/...` locally.
