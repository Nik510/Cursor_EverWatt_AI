# Engineering Academy (Healthcare) — Curriculum Overview (Volumes)

This Academy is built for **real-world troubleshooting** in healthcare facilities. The curriculum is organized into volumes so learners build correct mental models before they touch “fixes”.

Core design principles:
- **Vendor-agnostic** concepts (portable across BMS vendors)
- **Safety-first** and rollback-friendly
- **Evidence-driven** troubleshooting (trends + point semantics + sequences)
- **Standards-informed**, but **operations-focused** (not “design class”)

## Volume 1 — Equipment & system behavior (the mental model)
**Purpose:** understand what the equipment *is*, what it *does*, and what “normal” looks like.

Modules (typical):
- Plant: chillers, boilers, pumps, towers, valves, meters
- Airside: AHUs (OA/RA/EA), coils, fans/VFDs, economizers
- Zones: VAVs, reheat, thermostats/sensors, terminal unit behavior
- Measurement: what sensors mean, where they fail, and what to trust

Outcomes:
- Explain plant → airside → zone interactions
- Identify “normal” operating regimes and common constraints
- Understand failure propagation paths (symptom vs cause)

## Volume 2 — Controls & sequences (how intent becomes behavior)
**Purpose:** connect equipment behavior to control logic and point semantics.

Modules (typical):
- Point types: command vs status vs feedback; calculated vs physical
- Core sequences: resets (SAT, SP, CHW, HW), deadbands, staging
- Stability: hunting/oscillation, limits, rate-of-change, tuning basics
- Overrides: safe usage, rollback, and auditability

Outcomes:
- Read trends and infer sequence behavior
- Spot bad resets, missing feedback, and unstable loops
- Ask for the right artifacts (sequences, point lists, trend sets)

## Volume 3 — Troubleshooting (playbooks + signatures)
**Purpose:** turn knowledge into repeatable diagnosis and low-risk mitigation.

Structure:
- Standard playbook format (see `CHEAT_SHEET_TEMPLATE.md`)
- “Trend signatures” library: what Cause A vs Cause B looks like
- First-response checklists (10-minute triage)
- Verification and rollback steps

Outcomes:
- Triage comfort/energy issues quickly and safely
- Choose the next best check (not the next guess)
- Apply mitigations with explicit stop conditions

## Volume 4 — Advanced operations (optional)
**Purpose:** institutionalize performance: persistence, M&V, and continuous commissioning.

Modules (typical):
- Ongoing maintenance and performance preservation
- Measurement, baselines, and proving impact
- Control strategy upgrades (when appropriate)
- Site-specific knowledge capture into the EverWatt twin

Outcomes:
- Prevent regressions and prove savings
- Create building-specific playbooks and training loops

