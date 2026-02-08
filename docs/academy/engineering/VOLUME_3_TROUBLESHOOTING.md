# Volume 3 — Troubleshooting (Healthcare)

Goal: turn knowledge into repeatable diagnosis and low-risk mitigation.

## Outcomes
- Triage comfort/energy complaints in under 10 minutes (evidence first)
- Use trend signatures to distinguish common root causes
- Apply mitigations with stop conditions + rollback steps
- Verify outcomes (comfort + kW + stability) and prevent recurrence

## The playbook system
All troubleshooting content uses `CHEAT_SHEET_TEMPLATE.md` so playbooks are consistent, safe, and actionable.

## Playbooks (starter set)
1) Simultaneous heat/cool (reheat fighting)  
2) Excessive reheat / high HW consumption  
3) Static pressure hunting / unstable VFD control  
4) SAT reset causing comfort complaints  
5) CHW reset causing coil performance problems  
6) Overnight runtime creep / scheduling drift  
7) Economizer not economizing (false mixed-air readings)  
8) Sensor drift / bias (RAT/SAT/MAT)  
9) Overrides and “set it and forget it” failures  
10) VFD issues (trips/alarms basics + safe checks)

## “First 10 minutes” triage checklist (seed)
- Confirm scope: which spaces, when, and what changed recently
- Pull the minimum trend set (AHU + representative zones + plant if needed)
- Validate point semantics (command vs feedback) before conclusions
- Look for signatures (hunting, bias, stuck values, schedule mismatches)
- Choose the next best check; avoid “random setpoint changes”

