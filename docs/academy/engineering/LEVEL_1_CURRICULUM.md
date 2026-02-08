# Engineering Academy — Level 1 (Healthcare) curriculum (v2, troubleshooting-first)

Target: healthcare facilities / energy engineers. Designed to be completed in **90–150 minutes** with optional deeper labs.

This curriculum is intentionally **vendor-agnostic** and **troubleshooting-first**. Standards can help frame “what good looks like”, but this training is optimized for operational diagnosis, trending, and safe mitigations.

For the full volume structure, see `CURRICULUM_OVERVIEW.md`.

## Outcomes (what Level 1 means)
Graduates can:
- Build a correct mental model of how plant → airside → zone control interactions produce comfort/energy outcomes
- Read BMS trends confidently (command vs status vs feedback) and separate signal vs noise
- Apply a safe, repeatable troubleshooting process with rollback-friendly changes
- Recognize high-impact “controls energy leaks” (reheat fighting, hunting, bad resets, overrides)
- Know where to reference standards (and how to ask vendors for evidence)

## Module 0 — Safety, scope, and what we are *not* doing
**Goal:** set guardrails and reduce risk.
- LOTO / live troubleshooting constraints / escalation norms
- “No clinical advice”, “no sequence rewriting in Level 1”, “rollback plan required”
- What evidence looks like: point lists, sequences, trends, alarms, commissioning docs

## Module 1 — How hospital energy systems actually work (interactions)
**Goal:** build a working mental model (not a component list).
- Chillers/boilers/AHUs/VAVs: roles, coupling, and common failure propagation
- Why “local” changes create “remote” symptoms (e.g., SAT reset → reheat → plant load)
- Hospital realities: 24/7 loads, IEQ constraints, critical spaces, redundancy

Assessment prompts:
- Explain “simultaneous heat/cool” in one sentence
- Name two ways an airside change increases plant kW

## Module 2 — Sequences in plain English (resets, deadbands, stability)
**Goal:** understand the sequence patterns that dominate outcomes.
- Resets: SAT, static pressure, CHW, HW (what they’re for; how they fail)
- Deadbands and “fighting” (zones vs AHU vs plant)
- Hunting/oscillation: causes, how it looks in trends, and why it wastes energy
- Overrides: why they break savings; safe rollback habits

Assessment prompts:
- Choose a safe first check for suspected hunting
- Identify a risky override pattern and the safer alternative

## Module 3 — Reading your BMS without fear (trending + first checks)
**Goal:** know what to trend, how to interpret it, and what to do next.
- Point types: command vs status vs feedback; sensors vs calculated points
- Trend basics: interval selection, duration, timestamps, missing data
- Red flags vs noise: sensor drift, stuck values, mis-mapped points
- “First 10 minutes” comfort triage checklist (what to gather before changing anything)

Assessment prompts:
- Pick the right trend interval for diagnosing hunting vs slow drift
- Explain “command ≠ feedback” with one example

## Module 4 — Vendor myths (how to verify claims without a fight)
**Goal:** give engineers a respectful, evidence-driven way to validate “proprietary” assertions.
- “Can’t be changed” vs “not allowed” vs “risky”
- How to request evidence: sequences, point lists, trends, commissioning artifacts
- When a service call is warranted (and when it’s not)

## Module 5 — Troubleshooting playbooks (the core library)
**Goal:** apply a repeatable process to common issues.

Use the standard cheat sheet format (see `CHEAT_SHEET_TEMPLATE.md`) and ship v1 with 10 playbooks:

1) Simultaneous heat/cool (reheat vs cooling)  
2) Excessive reheat / high HW consumption  
3) Static pressure hunting / unstable VFD control  
4) SAT reset causing comfort complaints  
5) CHW reset causing coil performance problems  
6) Overnight runtime creep / scheduling drift  
7) Economizer not economizing (false mixed-air readings)  
8) Sensor drift / bias (RAT/SAT/MAT)  
9) Overrides and “set it and forget it” failures  
10) VFD common issues (trips/alarms basics + safe checks)

Mini-assessment:
- Given a symptom + 3 trends, pick the most likely cause and next check.

## Module 6 — Reference library (what to look up, when)
**Goal:** teach “how to reference” authoritative material without requiring memorization or paid books.

- Where to look for **equipment behavior** vs **sequence intent** vs **maintenance practices**
- How EverWatt uses embedded reference content: search and reference inside the app for vendor-agnostic decision support

## Module 7 — Level 1 assessment + certification
Assessment format (recommended):
- 25 questions total
  - 15 multiple choice (concepts + safety)
  - 10 scenario questions (read a short trend/story and choose next step)
- Passing score: set in LMS (e.g., 80%)
- Retake policy: LMS-configured (e.g., 24h cooldown)

Certificate:
- “Everwatt Certified Healthcare Energy Operator — Level 1”
- Expiration/renewal: 12–18 months (tie to major updates)

## Content rules (non-negotiable)
- No clinical advice
- No UI-click-path dependence (versionable concepts over screenshots)
- Safety-first and rollback-friendly
- Vendor-agnostic language
- Do not reproduce proprietary, copyrighted course text verbatim

