# Module Isolation + Shared Contracts

This document defines the **shared contracts** and **allowed mutation paths** across modules.

## Goals

- **Prevent cross-module breakage**: modules should not import each other’s internals.
- **Prevent cross-module overwrites**: confirmed scope lives in one place (System of Record).
- **Make integration boring**: modules integrate via stable types + stable shared API calls.

## Module Registry (single source of truth)

- **Registry**: `src/modules/registry.ts`
- **Per-module env flag**: `VITE_ENABLE_<MODULE_ID>=true|false`
  - If not set, module defaults to `enabledByDefault`.
- **Labs gating**: modules with `statusTag: 'labs'` are hidden unless `VITE_SHOW_LABS=true`.

## Module boundaries (imports)

### Rule

Code under:

- `src/modules/<moduleId>/pages/**`
- `src/modules/<moduleId>/components/**`
- `src/modules/<moduleId>/services/**`

must **not** import from other modules’ folders.

### Enforcement

- **Checker**: `src/scripts/check-module-boundaries.ts`
- **Run**: `npm run check:module-boundaries`

This prevents `src/modules/<A>` from importing `src/modules/<B>` through relative paths.

## Shared code locations

Shared code must live in **one** of:

- `src/shared/**` (shared UI + API helpers)
- `src/core/**` (core platform primitives, if needed)
- `src/types/**` (shared types/contracts)
- `src/validation/**` (shared Zod schemas)

## Shared API layer (no ad-hoc server calls)

Modules should not call `fetch('/api/...')` directly. Use the shared API wrappers:

- **Fetch wrapper**: `src/shared/api/client.ts`
- **Project Builder API**: `src/shared/api/projectBuilder.ts`
- **Vault API**: `src/shared/api/vault.ts`
- **Calculator API**: `src/shared/api/calculators.ts`

## System of Record (SoR) rules

### Canonical persistence

The only canonical persisted objects are:

- **Project Vault** (evidence + extracted artifacts)
- **Project Graph** (`ProjectGraph`)
- **Proposal Packs** (`ProposalPack`)

### Allowed write paths

- **Suggestion sources** (any module) may produce:
  - a `ProposalPack`, and/or
  - inbox suggestions (`InboxItem[]`) that land in `graph.inbox`.

- **Confirmed changes** must happen only via the **Inbox decision** workflow:
  - Proposals → **commit** → `graph.inbox` (suggestions only)
  - Inbox → **decide** (Accept/Reject + required reason) → confirmed graph mutation (safe mapping only)
  - Every decision recorded in the **Decision Ledger** (`graph.decisions[]`)

### Forbidden write paths

- No module should directly mutate confirmed scope (assets/measures/BOM/etc) by writing arbitrary graph changes outside the approve/decide workflow.
- “UI edit” flows that bypass Inbox are considered **unsafe** unless explicitly part of the SoR workflow.

## Shared objects (contracts)

### `ProjectGraph` (SoR)

- **Location**: `src/types/project-graph.ts`
- Contains:
  - `assets[]`, `measures[]`
  - `inbox[]` + `inboxHistory[]`
  - `bomItems[]`
  - `decisions[]`

### `EvidenceRef` (provenance)

- **Location**: `src/types/project-graph.ts`
- Used everywhere a module needs to say **“why we believe this”**.

### `ProposalPack` (calculator outputs)

- **Location**: `src/types/proposal-contract.ts`
- Modules should emit `ProposalPack` for scenario results that should be reviewed/committed.

## Where to add new shared contracts

- New shared runtime types: `src/types/**`
- New shared validation: `src/validation/**`
- New shared API wrappers: `src/shared/api/**`

