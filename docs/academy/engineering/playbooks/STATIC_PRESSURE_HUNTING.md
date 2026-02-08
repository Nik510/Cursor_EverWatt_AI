# Static pressure hunting / unstable fan control

## Who this is for
- Role(s): Facilities engineer / controls tech
- Prereqs: Volume 2 (Controls & sequences) loop stability basics

## Safety & constraints (must read)
- Do not change loop tuning unless authorized and you can roll back immediately
- Prefer stabilizing reset logic before touching tuning gains
- Trend at higher resolution before taking action

## Symptom(s)
- Fan speed oscillates repeatedly
- Static pressure oscillates; airflow “surges”
- Comfort instability; potential VFD alarms

## What’s happening (plain English)
The static pressure loop is unstable: either the measurement is unreliable, the reset is thrashing, or the controller is reacting too aggressively. The result is oscillation that drives discomfort and wasted energy.

## Likely causes (ranked)
1) Bad/static pressure sensor (bias, noise, poor location)
2) Static pressure setpoint reset changing too fast or conflicting
3) Control loop tuning too aggressive (P/I gains, rate limits)
4) Terminal demand instability (VAV hunting) driving rapid swings

## What to check (fast triage)
- **Check 1**: SP sensor plausibility  
  - Expected: no flatlines/spikes; responds to fan speed changes
- **Check 2**: SP setpoint stability  
  - Expected: setpoint changes slowly; not bouncing between limits
- **Check 3**: Downstream driver  
  - Expected: only a subset of VAVs driving demand; not widespread hunting

## Trend signature(s)
- Reset thrash: SP_SP swings while SP tracks; oscillation correlates with setpoint movement.
- Sensor noise: SP noisy while fan speed changes are smooth; SP jitter not physically plausible.

Recommended trend interval + duration:
- 1-minute interval for 60–180 minutes (during the complaint window)

## Tests to perform (table)

| Test | When good | When bad | Notes |
|---|---|---|---|
| Compare SP to fan speed | SP responds smoothly to speed | SP noisy/flat despite speed changes | Sensor/mapping/location issue |
| Reset rate check | SP_SP moves slowly | SP_SP jumps frequently | Stabilize reset logic first |
| Terminal instability scan | Few zones unstable | Many zones unstable | Fix root causes at terminals |

## Fix / Mitigation steps (lowest risk first)
- Stabilize resets: slow reset rate / add deadband / widen limits (within policy)
- Validate and correct sensor/mapping before tuning
- If authorized: small tuning adjustments, one at a time, with rollback ready

Rollback:
- Restore prior reset parameters/tuning values; note timestamps for comparison.

## Verification
- Fan speed and SP settle (15–30 minutes)
- Comfort complaints do not increase (24 hours)

## Common mistakes
- Changing tuning before validating the sensor
- Changing multiple parameters at once
- “Fixing” by pinning setpoints (creates new issues)

## References
- Internal: EverWatt Academy Volume 2 (Controls & sequences)
- Site: commissioning docs, original tuning parameters

