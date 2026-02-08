# Sensor drift / bias (RAT/SAT/MAT/zone)

## Who this is for
- Role(s): Facilities engineer / controls tech

## Safety & constraints (must read)
- If a sensor drives safety interlocks, escalate before changes
- Fix mapping/scaling before calibration assumptions

## Symptom(s)
- Trends don’t match reality
- Control behavior seems wrong even though equipment responds

## Likely causes (ranked)
1) Bias/drift  
2) Bad placement  
3) Mis-mapped points  
4) Scaling/unit conversion errors  

## What to check (fast triage)
- Physical plausibility (MAT between OAT and RAT)
- Cross-check with a known-good reference (if allowed)
- Look for abrupt step changes (mapping changes)

## Fix / Mitigation steps (lowest risk first)
- Correct mapping/scaling and document
- Calibrate/replace sensor per site policy

## Verification
- Values align with reality and control stabilizes

