# Excessive reheat / high heating hot water consumption

## Who this is for
- Role(s): Facilities engineer / energy manager / controls tech
- Prereqs: Volume 1 + Volume 2 basics

## Safety & constraints (must read)
- Any changes impacting critical spaces require escalation
- Avoid “fixing” by pinning SAT/HW temps without understanding cause

## Symptom(s)
- HW usage elevated vs baseline
- Many zones reheating while cooling is present
- Comfort complaints + energy waste

## What’s happening (plain English)
The building is adding heat at terminals (reheat) that often cancels upstream cooling. This usually indicates a system-level control mismatch (SAT/min flows/deadbands) or bad sensor inputs.

## Likely causes (ranked)
1) SAT too cold / pinned low  
2) VAV mins too high  
3) Deadband too tight  
4) Sensor bias/mapping errors  
5) Overrides left on  

## What to check (fast triage)
- Check whether reheat is widespread (sample zones)
- Check SAT behavior and whether it’s pinned at a limit
- Check VAV min airflow settings vs actual

## Fix / Mitigation steps (lowest risk first)
- Remove non-essential overrides
- Correct mapping/sensor bias before reset changes
- Adjust reset bounds cautiously within policy

## Verification
- Reheat reduces across representative zones
- HW usage trend improves within 24 hours without new complaints

