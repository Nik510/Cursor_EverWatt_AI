# Everwatt Academy (Engineering + Sales)

This repo implements the **Everwatt Academy entry surface** (in-app links + role gating) and contains the **runbooks/templates** for standing up two separate Academy portals:

- **Engineering Academy** (invite-only, free for healthcare engineers)
- **Sales Academy** (internal enablement only)

## Non-goals (by design)

- No shared course catalog between Engineering and Sales.
- No embedded LMS inside calculator flows.
- No requirement that training blocks product usage.

## Where things live

- **In-app Academy entry page**: `/academy`
- **In-app Engineering standards library (reference)**: `/academy/standards`
- **LMS setup runbook**: `docs/academy/LMS_SETUP.md`
- **Invite / provisioning workflow**: `docs/academy/INVITE_WORKFLOW.md`
- **Engineering Level 1 curriculum**: `docs/academy/engineering/LEVEL_1_CURRICULUM.md`
- **Engineering curriculum overview (volumes)**: `docs/academy/engineering/CURRICULUM_OVERVIEW.md`
- **Engineering Volume 1 (Equipment & behavior)**: `docs/academy/engineering/VOLUME_1_EQUIPMENT.md`
- **Engineering Volume 2 (Controls & sequences)**: `docs/academy/engineering/VOLUME_2_CONTROLS_AND_SEQUENCES.md`
- **Engineering Volume 3 (Troubleshooting playbooks)**: `docs/academy/engineering/VOLUME_3_TROUBLESHOOTING.md`
- **Cheat sheet template**: `docs/academy/engineering/CHEAT_SHEET_TEMPLATE.md`
- **Troubleshooting playbooks (markdown)**: `docs/academy/engineering/playbooks/README.md`
- **Pilot runbook**: `docs/academy/PILOT_RUNBOOK.md`

## Configuration

Set these environment variables for the frontend:

- `VITE_ACADEMY_ENGINEERING_URL` (default: `https://academy.everwatt.com/engineering`)
- `VITE_ACADEMY_SALES_URL` (default: `https://academy.everwatt.com/sales`)

