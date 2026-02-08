# CHW reset causing coil performance problems

## Who this is for
- Role(s): Controls tech / facilities engineer
- Prereqs: Volume 1 coils + Volume 2 plant resets

## Safety & constraints (must read)
- Humidity control in critical areas may be a safety requirement — escalate if impacted
- Avoid major plant strategy changes during initial diagnosis

## Symptom(s)
- Humidity or temperature issues after CHW reset changes
- Cooling valves saturate (near 100%) without meeting SAT/space needs

## Likely causes (ranked)
1) LCHW setpoint reset too warm for latent load  
2) Valve authority / coil capacity constraints  
3) Sensor bias or mis-mapped SAT/RH points  
4) Staging limits or plant constraints  

## What to check (fast triage)
- LCHW_SP vs LCHW tracking
- Cooling valve cmd vs SAT response
- Whether problem occurs during high latent periods

## Fix / Mitigation steps (lowest risk first)
- Temporarily constrain reset during diagnosis (within policy) and verify effect
- Validate sensor mapping and coil assumptions before altering reset strategy

## Verification
- Coil meets targets without persistent valve saturation
- Comfort/humidity stabilizes; energy impact understood

