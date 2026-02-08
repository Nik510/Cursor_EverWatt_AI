# SAT reset causing comfort complaints

## Who this is for
- Role(s): Facilities engineer / controls tech
- Prereqs: Volume 2 resets + point semantics

## Safety & constraints (must read)
- Do not change reset bounds/rates without rollback plan
- Confirm SAT sensor integrity before modifying control intent

## Symptom(s)
- Complaints correlate with SAT reset movement
- SAT setpoint changes cause zone swings

## Likely causes (ranked)
1) Reset bounds too aggressive  
2) Reset rate too fast  
3) SAT sensor bias/mapping issue  
4) Zone control mismatch (mins/deadbands)  

## What to check (fast triage)
- SAT_SP vs SAT tracking
- Complaint timing vs setpoint changes
- Representative zone behavior during reset movement

## Fix / Mitigation steps (lowest risk first)
- Stabilize reset rate first (slower changes)
- Adjust bounds conservatively within policy

## Verification
- Complaint frequency drops over 24–72 hours without major energy penalty

