# Project Builder — Phase 1 Foundation (Vault + Graph)

This document defines the Phase 1 **Project Graph** schema (nodes + edges), provides a concrete walkthrough, and explicitly lists what Phase 1 does **not** attempt to solve yet.

## 1) Project Graph schema (nodes + edges)

### Storage model (Phase 1)
- **Project Vault**: files stored in object storage; metadata is recorded on the Project record under `project.vault.files[]`.
- **Project Graph**: structured nodes are stored on the Project record under `project.graph` (JSON).
- **Edges are implicit** in Phase 1, expressed by references in node fields (no standalone edge table/list yet).

### Nodes

#### Asset (confirmed)
- Purpose: stable equipment/fixture/control identities (“this AHU”) with evidence links.
- Key fields:
  - `id` (uuid)
  - `assetTag` (required unique string like `AHU-1`)
  - `type` enum (ahu, vav, chiller, boiler, coolingTower, lightingFixture, lightingControl)
  - `name`, `location` (optional)
  - `evidenceRefs[]` (optional)

#### Measure (confirmed)
- Purpose: placeholder for confirmed measures (Phase 1 keeps measure modeling minimal).
- Key fields:
  - `id` (uuid)
  - `name`
  - `category?`
  - `evidenceRefs[]?`

#### InboxItem (proposed / inferred)
- Purpose: the confirmation gateway (“AI suggests; engineer confirms/rejects/edits”).
- Key fields:
  - `id` (uuid)
  - `kind`: `asset | measure`
  - `status`: `inferred`
  - `name`, `category?`
  - `provenance` (required)
  - `confidence` (0..1)
  - `needsConfirmation` (true unless explicitly confirmed by engineer)

### Edges

#### Evidence edge (Node → VaultFile)
Every extracted/inferred/confirmed fact must be defensible via provenance.

Phase 1 expresses this via:
- `InboxItem.provenance` → identifies source file and location (page/sheet/cellRange)
- `Asset.evidenceRefs[]` / `Measure.evidenceRefs[]` → identifies source file and location

#### Confirmation edge (InboxItem → Asset/Measure)
Phase 1 expresses this via workflow:
- Confirmed inbox items are moved into `graph.assets[]` or `graph.measures[]`
- Rejected items are recorded into `graph.inboxHistory[]` with `dispositionReason`

## 2) Example walkthrough (single flow)

Goal: Upload a reflected ceiling plan, propose 2 lighting fixtures + 1 panel as suggested assets, attach evidence, confirm into Asset Registry.

1. **Add assets first (equipment-first, human-defined)**
   - Project page → **Graph** tab → Asset Registry
   - Create a first authoritative root object (example):
     - `Lighting Area` → `LA-1` (e.g. “2nd Floor West”)

2. **(Optional) Upload the RCP PDF as evidence-only**
   - Project page → **Vault** tab → Upload `RCP.pdf`
   - System stores file and creates:
     - `extracted.json` (best-effort metadata)
     - `chunks.json` (searchable chunks with provenance)

3. **Evidence Viewer: locate source page/sheet**
   - Select `RCP.pdf`
   - Search for fixture/panel references
   - Note the relevant page/sheet to use as provenance

4. **AI extracts facts → Inbox (unconfirmed)**
   - If AI is configured: Analyzer proposes items into Inbox with required provenance.
   - If AI is not configured: you can still manually create assets; Inbox remains optional.

   Example proposed items (InboxItem):
   - `Suggested Asset: Lighting fixture (2x4 Troffer)` (confidence 0.6, needsConfirmation true, provenance = {fileId, page})
   - `Suggested Asset: Lighting fixture (Downlight)` (confidence 0.55, needsConfirmation true, provenance = {fileId, page})
   - `Suggested Asset: Panel (LP-2)` (confidence 0.7, needsConfirmation true, provenance = {fileId, page})

5. **Attach evidence**
   - In the Inbox review panel:
     - Set `provenance.fileId` to the RCP vault file
     - Set `page` (and `sheet` if known)

6. **Human confirms → Asset Registry**
   - Confirm each item, edit names/tags as needed:
     - `FIX-1` “2x4 Troffer”
     - `FIX-2` “Downlight”
     - `PNL-1` “LP-2 Panel”
   - Attach evidence refs to each confirmed asset.

Result:
- Assets exist as authoritative, human-confirmed nodes.
- Evidence exists as files/chunks (non-authoritative) that support provenance.
- Inbox is the only place AI suggestions live until confirmed.
## 3) What Phase 1 explicitly does NOT attempt yet

- Fully automated takeoff or guaranteed quantity extraction
- CAD ingestion (DWG/DXF/IFC)
- XLSX mapping UI / schema mapping for schedules (user-assisted mapping comes later)
- Telemetry/BMS binding, point mapping, trend ingestion
- Commissioning / verification workflows
- “State of Knowledge” dashboards (only explainable foundations)
- Advanced graph edge modeling (Phase 1 uses implicit edges via references)
