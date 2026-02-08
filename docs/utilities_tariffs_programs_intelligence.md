# How EverWatt Thinks About Utilities, Tariffs, and Programs (Decision-Safe Intelligence)

EverWatt’s **Utilities, Tariffs, and Programs Intelligence System** is an **inspection and traceability layer**. It is designed to mirror the strengths of DSIRE-style systems—**versioning, provenance, and auditability**—while staying grounded in real utility operations.

This is intentionally **not** a calculator and **not** a recommendation engine.

## What this system is

- **A versioned, metadata-only library** of utility tariffs and (future) program records.
- **An auditable read layer** that exposes “what we know,” “when we knew it,” and “where it came from.”
- **A decision-safety surface** inside analyses that warns when snapshots are missing/stale or applicability is unknown.

## What this system is not (explicit non-goals)

- No tariff math parsing (beyond metadata fields).
- No bill calculations inside this library.
- No incentive dollar calculations.
- No optimization or “recommended actions.”
- No claims of correctness beyond **captured metadata**.

## Why versioning matters

Utilities and regulators change tariffs and programs frequently. Without versioning, any analysis becomes hard to defend:

- “Which tariff definition was used?”
- “What changed since last time?”
- “Can we reproduce results for an audit date?”

EverWatt snapshots are stored with a **versionTag** (timestamp-like), **capturedAt**, and source fingerprints.

## Why freshness (staleness) matters

A tariff snapshot might be accurate when captured, but **stale** later.

EverWatt marks snapshots stale when:

- `now - capturedAt > 14 days`

This is not a claim that the tariff changed—only a signal that the snapshot should be refreshed to maintain confidence.

## Provenance: how evidence is preserved

Tariff snapshots preserve:

- **Source URLs** (where the schedule was discovered)
- **Source fingerprints**: SHA-256 hash of fetched HTML per source URL
- **Diff from previous snapshot**: added/removed/unchanged rate codes
- **LastVerifiedAt** on each rate metadata item

This enables DSIRE-like traceability:

- “What changed and when?”
- “Which upstream sources changed?”
- “Which snapshot did an analysis use?”

## Decision safety: degrade gracefully and never overclaim

Every surface is designed to degrade gracefully:

- Missing snapshots → show **warnings** + instructions (`npm run tariffs:ingest:ca`)
- Missing rate metadata → show “not found” and prompt verification
- Unknown applicability (territory/voltage/eligibility) → **explicitly labeled as unknown**

This keeps analysts, engineers, and reviewers from inferring correctness where the system has not earned it.

## How to inspect tariffs (UI)

- Navigate to **Utilities & Programs → Tariffs (CA)**.
- Filter by utility, select snapshot, and inspect:
  - snapshot version + captured date
  - stale status
  - added/removed rate codes
  - source fingerprint changes

## How analyses link back to snapshots

In **Analysis Results v1**, the Tariff Library panel:

- shows snapshot version + captured date + stale status
- provides a deep link to the Tariff Browser with `utility`, `snapshot`, and `rate` preselected
- surfaces decision-safety notes when snapshots are missing or stale

## Programs and incentives: why they are separate

Programs and incentives have different rules than tariffs:

- program definitions change independently
- eligibility depends on territory, customer class, technologies, and filings
- incentives often include stacking rules, caps, and M&V requirements

EverWatt scaffolds a **Program Library** structure, but does not ingest or compute incentive values in this phase.

## Operational model (dev + CI + prod)

- **Run ingestion now**:

```bash
npm run tariffs:ingest:ca
```

- **Check status**:

```bash
npm run tariffs:status
```

- **Where snapshots live**:
  - `data/tariffs/{UTILITY}/{versionTag}.json`

Production options:

- Bake snapshots into the image/container
- Or mount a persistent volume and ingest into it on a schedule

(See `docs/tariffLibrary.md` for details.)

---

## Summary

EverWatt’s utilities intelligence layer is designed to be:

- **inspectable** (humans can audit it)
- **traceable** (provenance and versioning are first-class)
- **decision-safe** (explicit uncertainty, no overclaims)
- **extensible** (future tariff math and program logic can plug in cleanly)

