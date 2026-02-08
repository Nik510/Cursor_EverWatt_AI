# Project Builder — 30-day ship slice runbook (staging)

This runbook validates the **ship-first** workflow end-to-end using the existing **System-of-Record** APIs (Vault + Graph + Inbox + Decision Ledger).

## Preconditions

- **Backend env**
  - `ENABLE_PROPOSAL_COMMIT=true` (staging only)
  - In production default is **off** (`ENABLE_PROPOSAL_COMMIT` unset/false)
- **Frontend env (Vite)**
  - `VITE_ENABLE_PROPOSAL_COMMIT=true` (staging only; controls whether UI shows “Commit scenario → Inbox”)
  - `VITE_SHOW_LABS=false` (default; hides calculators/analyzer/workbook ingestion UI)
- **Public Academy**
  - `/academy` must be accessible **without login** (public).
  - The module hub should keep the Academy link discoverable while internal modules stay hidden by default.

## Smoke flow (UI)

### 1) Create/open project
- Go to `Project Builder` from the module hub.
- Create a project (Drive folder link + Project # + Company name).
- Open the project.

### 2) Upload/view evidence in Vault
- In `Vault` tab, upload a PDF/XLSX/image.
- Confirm the upload success banner appears.
- Open the uploaded file in the evidence viewer.

### 3) Import + view ProposalPacks
- Go to `Proposals` tab.
- Import a valid `ProposalPack` JSON (paste into textarea → Import).
- Select the imported pack; confirm scenarios/deltas render.

### 4) Commit proposal scenario → Inbox (flagged)
- If commit is enabled (staging), click **Commit scenario → Inbox**.
- Expected:
  - Commit success banner shows created/skipped/inboxCount
  - `Inbox` tab count increases
- If commit is disabled:
  - UI shows “Proposal commit is disabled” banner (and/or server returns 404 with `enabled:false`)
  - If the UI flag is on but the server is off, a notice should say “Commit disabled server-side”

### 5) Review Inbox item → Accept/Reject with required reason
- Go to `Inbox` tab.
- Select an inbox item to view payload + provenance.
- Click `Accept` or `Reject` → modal appears.
- Enter a reason (required) and submit.
- Expected:
  - Item disappears from pending list
  - Success banner appears
  - Repeat decision on the same inbox item id returns 404 (no double-decide)

### 6) View confirmed graph + decision ledger
- Go to `Graph` tab:
  - Confirm measures/assets reflect accepted items
  - Confirm `Confirmed BOM (by measure)` shows any accepted BOM records
- Go to `Decisions` tab:
  - Confirm recent decisions show disposition + rationale + provenance context

### 7) Academy quick check (public)
- From the module hub, click **Open Academy**.
- Confirm the Academy loads without requiring auth.

## Acceptance criteria

- No UI path directly mutates confirmed graph for inbox decisions (all Accept/Reject via decide endpoint).
- Vault upload + evidence viewing works.
- Proposal import + view works.
- Commit-to-inbox is gated (staging on, production off).
- Inbox decision requires reason, writes decision ledger, and does not allow double-decide.
- Academy is public and reachable at `/academy` without auth.

