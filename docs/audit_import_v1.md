## Audit Import v1 (Vendor-agnostic)

This module ingests audit exports from spreadsheets/CSV/any tool by first converting them into a canonical **EverWattAuditExport v1** JSON format. Later, SnapCount support becomes a thin adapter: **SnapCount export → EverWattAuditExport → same importer**.

### What Audit Import v1 does

- Validates a canonical audit export format (strict, collects all errors).
- Ingests artifacts into a vendor-agnostic evidence store.
- Creates **inbox-only** suggestions for Project Builder (never mutates the Project Graph directly):
  - asset_create → `suggestedAsset`
  - asset_update → `suggestedProperty`
  - relation_create → `suggestedProperty` with key `audit_exchange:relationsToAdd`
  - missing_info → `suggestedProperty` with key `audit_exchange:missingInfo`

### What it does NOT do (by design)

- No LLM usage.
- No direct graph mutation (no assets/measures/relations written authoritatively).
- No overwriting of existing project data; everything is reviewable in the Inbox.

---

## EverWatt Audit Exchange Format (v1)

Type + schema live in:

- `src/modules/audit/exchange/types.ts`

Template:

- `samples/everwatt_audit_export_template.json`

Small example fixture:

- `samples/everwatt_audit_export_example_small.json`

### Supported asset types

The exchange format supports these `assetType` values (v1):

- `AHU`, `VAV`, `PANEL`, `METER`, `LIGHTING_ZONE`, `RTU`, `FAN`, `PUMP`, `CHILLER`, `BOILER`, `COOLING_TOWER`, `OTHER`

### Supported relation types

- `SERVES`, `HAS_VFD`, `POWERED_BY`, `MEASURED_BY`, `CONTROLS`

### Evidence linking

- Global artifacts are listed under `artifacts[]` (photos, PDFs, spreadsheets, notes, etc.)
- Per-field evidence references are under `assets[].evidence[]` and reference artifacts by `artifactId`.
- The importer creates `EvidenceLink` records tying `auditAssetId + fieldKey` → the created inbox item.

Evidence storage (dev file-based):

- `data/dev/evidence/<orgId>/<projectId>.json`

---

## How to produce an EverWattAuditExport from a spreadsheet

1. Export your audit spreadsheet to CSV (or keep it in sheets).
2. Create a JSON following the template:
   - Put each row/system as an entry in `assets[]`
   - Put numeric/string/bool fields in `fields` (e.g. `airflowCfm`, `fanHp`, `hasVfd`)
   - Put photos/files/notes into `artifacts[]`
   - Link photos/files to fields using `assets[].evidence[]` with `artifactId` + `fieldKey`

---

## CLI usage

Run with `tsx`:

```bash
npx tsx scripts/import-audit-export.ts --projectId <id> --file samples/everwatt_audit_export_example_small.json
```

If running in database mode (or if orgId cannot be inferred), pass org explicitly:

```bash
npx tsx scripts/import-audit-export.ts --org <orgId> --projectId <id> --file <export.json>
```

### Inbox confirmation workflow

The importer only creates Phase-1 inbox items. A human must review and confirm/reject them in Project Builder.
No changes are auto-applied.

---

## Future adapters (SnapCount later)

SnapCount adapter strategy:
`SnapCountExport → transform_to_EverWattAuditExportV1() → import-audit-export`.

