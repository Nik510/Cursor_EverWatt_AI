# Economizer not economizing (bad mixed-air reality)

## Who this is for
- Role(s): Facilities engineer / controls tech
- Prereqs: Volume 1 (airside basics) + Volume 2 (point semantics)

## Safety & constraints (must read)
- Do not override smoke/freeze/IAQ/humidity lockouts
- Trend and validate sensors before changing changeover logic

## Symptom(s)
- OA dampers stay closed when conditions seem favorable
- Mechanical cooling runs during “free cooling” weather
- MAT doesn’t make physical sense

## What’s happening (plain English)
Either the system is legitimately locked out (safety/IAQ), or the sensors/actuators are lying (mapping, bias, stuck damper). Economizer logic depends on physically plausible inputs.

## Likely causes (ranked)
1) OAT/RAT/MAT sensor bias or mis-mapped points  
2) OA damper actuator failure (command ≠ position)  
3) Lockouts active (smoke, freeze, humidity, IAQ)  
4) Changeover limits wrong (enthalpy/drybulb)  

## What to check (fast triage)
- Verify MAT is between OAT and RAT
- Check damper command vs feedback (or physical position)
- Check any economizer enable/disable/lockout points

## Trend signature(s)
- Bad MAT: MAT outside the [min(OAT,RAT), max(OAT,RAT)] range
- Stuck damper: OADamperCmd changes but OADamperFb does not

## Fix / Mitigation steps (lowest risk first)
- Correct mapping/scaling or sensor bias before touching sequences
- Repair actuator if feedback doesn’t track command

## Verification
- MAT becomes physically plausible
- Mechanical cooling reduces during favorable conditions (when allowed)

## References
- Site sequences + lockout policies

