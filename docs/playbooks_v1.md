## EverWatt Playbooks v1 (Standards Overlay)

Playbooks are an **explicit standards layer** that guides recommendations using intentional EverWatt best-practice rules, layered on top of historical memory.

### What “Memory” vs “Playbook” means

- **Memory** answers: **“We usually do X”**
  - Derived from completed projects (historical evidence).
  - Data-driven similarity: building type, size bucket, climate/territory, asset inventory, schedule.
  - Produces frequency-weighted suggestions with top contributing examples.

- **Playbooks** answer: **“We should do Y here”**
  - EverWatt doctrine: best-practice defaults for a given building context.
  - Deterministic and explicit (no LLM required).
  - Never auto-applies actions; it only **overlays** scoring and explanations.

When memory and playbook align, confidence and prioritization improve. When they diverge, we explicitly call it out so a human can decide why.

---

## Data model

Types:

- `src/modules/playbooks/types.ts`
- `src/modules/playbooks/registry.ts`

Core schema (`EverWattPlaybook`) includes:

- `playbookId`
- `buildingType` (e.g. `healthcare`, `office`, `commercial`)
- `applicabilityConditions` (optional):
  - sqft range (`sqftMin`/`sqftMax`)
  - schedule (`scheduleBucket`)
  - required system presence:
    - `systemAnyOf` (any-of asset types)
    - `systemAllOf` (all-of asset types)
- `preferredMeasures[]` (canonical `MeasureType` + rationale)
- `discouragedMeasures[]` (optional)
- `priority` (`LOW` | `MED` | `HIGH`)
- `version` + `authoredBy`

---

## How playbooks are applied to recommendations

Implementation: `src/modules/recommendations/generateRecommendations.ts`

For a target project:

1. We match applicable playbooks via `matchPlaybooks(project)` (deterministic).
2. For each suggested measure (from memory), we compute:
   - `playbookAlignment`: `preferred | neutral | discouraged`
   - `playbookRationale` (if any)
3. We apply a **score multiplier** (overlay only):
   - preferred → `× 1.15`
   - neutral → `× 1.00`
   - discouraged → `× 0.85`
4. We include playbook context in the suggestion’s explain payload and inbox notes.

Safety:

- Playbooks **never auto-apply** actions.
- Recommendations remain **inbox-only** (`ProjectGraph.inbox[]` items of kind `suggestedMeasure`).

---

## How to author / update playbooks (v1)

Edit the hardcoded registry (v1):

- `src/modules/playbooks/registry.ts`

Guidelines:

- Keep playbooks **explicit and conservative**.
- Prefer clear rationales that describe **why** a measure is baseline doctrine.
- Use **canonical** `MeasureType` values from `src/modules/measures/types.ts`.
- Keep applicability conditions narrow enough to avoid mismatches (e.g., require relevant system presence).

---

## Why playbooks exist

Completed-project memory can be noisy and biased by what happened historically (incentives, one-off constraints, portfolio sampling). Playbooks ensure EverWatt can encode intentional best practices and:

- reduce “historical accident” bias,
- improve explainability when memory and doctrine disagree,
- provide a stable baseline set of recommendations even when memory is sparse.

## EverWatt Playbooks v1

Playbooks are an explicit **standards layer** that guides recommendations using intentional EverWatt best-practice rules layered on top of historical memory.

### Memory vs Playbook

- **Memory** answers: “We usually do X”
  - Derived from similarity to completed projects (EverWatt Memory Index).
- **Playbooks** answer: “We should do Y here”
  - Based on authored EverWatt doctrine for building types and applicability conditions.

In v1, playbooks never auto-apply changes. They only:
- annotate suggestions with alignment (`preferred | neutral | discouraged`)
- adjust scores via a multiplier
- add explanation context (“why this is preferred/ discouraged”)

---

## Schema + registry

- Types: `src/modules/playbooks/types.ts`
- Registry + matcher: `src/modules/playbooks/registry.ts`

Playbooks include:
- `playbookId`
- `buildingType`
- `applicabilityConditions` (sqft ranges, schedule bucket, system presence)
- `preferredMeasures[]` (canonical `MeasureType` + rationale)
- `discouragedMeasures[]` (optional)
- `priority` + `version` + `authoredBy`

---

## How playbooks influence recommendations

Recommendation generation still starts with similarity + frequency from memory.
Then an overlay is applied:

- **preferred**: score × 1.15
- **neutral**: score × 1.00
- **discouraged**: score × 0.85

Each suggestion includes:
- `playbookAlignment`
- `playbookRationale` (if any)
- `explain.playbooksApplied` (what matched the project)
- `explain.scoreOverlay` (baseScore, multiplier, adjustedScore)

---

## Authoring / updating playbooks

In v1 playbooks are hardcoded in `getPlaybooksV1()`.
To update:

1. Add or edit playbooks in `src/modules/playbooks/registry.ts`
2. Keep measures in canonical `MeasureType` form (from `src/modules/measures/types.ts`)
3. Add/adjust unit tests to cover the new playbook logic

Why playbooks exist:
- Memory alone can replicate historical bias or under-represent best practices.
- Playbooks capture intentional EverWatt doctrine and help explain divergence:
  - “Memory suggests X, but playbook discourages it because …”

