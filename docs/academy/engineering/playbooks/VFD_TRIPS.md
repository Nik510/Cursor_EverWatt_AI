# VFD common issues (trips/alarms basics + safe checks)

## Who this is for
- Role(s): Facilities engineer / controls tech

## Safety & constraints (must read)
- Electrical safety and site policy first (LOTO, qualified personnel only)
- Repeated trips can damage equipment — escalate early

## Symptom(s)
- VFD trips (overcurrent/overtemp/etc.)
- Fan/pump stops unexpectedly

## Likely causes (ranked)
1) Mechanical load issues (bearings, belts, binding)  
2) Control instability causing rapid demand swings  
3) Cooling/ventilation issues for drive enclosure  
4) Electrical issues  

## What to check (fast triage)
- Capture fault code + timestamp
- Trend speed cmd/fb and current around the event
- Check for hunting/oscillation that could drive current spikes

## Fix / Mitigation steps (lowest risk first)
- Stabilize control demand before assuming hardware failure
- Coordinate mechanical inspection if faults persist

## Verification
- Fault frequency decreases over 24–72 hours

