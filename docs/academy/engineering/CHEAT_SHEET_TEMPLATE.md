# Engineering Academy cheat sheet template (v1)

Use this template to create consistent, practical “at-the-equipment” playbooks. Keep it **operational, safe, and vendor-agnostic**.

## Title
Example: “Simultaneous heating & cooling (reheat + cooling fighting)”

## Who this is for
- Role(s): Facilities engineer / controls tech / plant operator
- Prereqs: what they should already know (minimal)

## Safety & constraints (must read)
- LOTO / panel safety / live troubleshooting constraints
- “Do not do X without supervisor/controls admin approval”
- “Never change sequences without rollback plan”

## Symptom(s)
- What the complaint looks like in the building and in the BMS

## What’s happening (plain English)
- 2–5 sentences. Explain the mechanism (cause → effect).

## Likely causes (ranked)
- 3–8 causes, ordered by frequency/impact.

## What to check (fast triage)
- **Check 1**: Point(s) + expected range + “good vs bad”
- **Check 2**: Point(s) + expected range + “good vs bad”
- **Check 3**: Point(s) + expected range + “good vs bad”

## Trend signature(s)
- What the trend should look like if Cause A vs Cause B is true.
- Recommended trend interval + duration.

## Tests to perform (table)

| Test | When good | When bad | Notes |
|---|---|---|---|
| Visual inspection |  |  |  |
| Functional check |  |  |  |
| Input validation |  |  |  |
| Output validation |  |  |  |

## Fix / Mitigation steps (lowest risk first)
- Step-by-step, with explicit “stop conditions”
- Include rollback steps for any override/setpoint changes

## Verification
- What to confirm (comfort, kW trend, reheat %, valve positions, runtime)
- When to re-check (15 min / 24 hours)

## Common mistakes
- 3–8 “don’t do this” bullets

## References
- Vendor-agnostic references (ASHRAE, Guideline 36 concepts, etc.)
- Site docs if this becomes site-specific later

