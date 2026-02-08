# Overrides and “set it and forget it” failures

## Who this is for
- Role(s): Facilities engineer / controls tech / energy manager

## Safety & constraints (must read)
- Remove overrides one subsystem at a time and verify after each change
- Always document overrides: what, why, by whom, and rollback plan

## Symptom(s)
- System never returns to normal control
- Energy use elevated after a service call
- Comfort issues persist despite “fixes”

## Likely causes (ranked)
1) Manual overrides left enabled  
2) Temporary setpoints never reverted  
3) Schedule bypass  

## What to check (fast triage)
- Active overrides / manual modes
- Change history around the issue start
- Whether feedback points match commanded values

## Fix / Mitigation steps (lowest risk first)
- Remove overrides systematically; verify each removal
- Implement a timeboxed override policy (process fix)

## Verification
- System returns to expected sequence behavior within 24 hours

