# Simultaneous heating & cooling (reheat fighting)

## Who this is for
- Role(s): Facilities engineer / controls tech / plant operator
- Prereqs: Volume 1 (Equipment) + Volume 2 (Controls) basics

## Safety & constraints (must read)
- Do not change sequences without controls admin approval and a rollback plan
- Prefer trending + verification over setpoint “guessing”
- Document any override: what, why, when, and rollback time

## Symptom(s)
- High reheat while cooling is active
- Comfort complaints with elevated HW usage
- Low CHW ΔT / higher plant kW than expected

## What’s happening (plain English)
The building is cooling air (or delivering excess cold air) and then reheating it at terminals to satisfy zone control. This “fighting” often looks like comfort instability and reliably wastes energy.

## Likely causes (ranked)
1) SAT is too cold or pinned at a low limit  
2) VAV minimum airflow is too high (or stuck high)  
3) Deadband too tight or misconfigured (zones fighting AHU intent)  
4) Sensor bias (zone temp or discharge temp) creating false demand  
5) Overrides left in place (min airflow, setpoints, schedules)

## What to check (fast triage)
- **Check 1**: Command vs feedback (cooling/reheat)  
  - Expected: feedback follows command; if not, don’t trust the command value
- **Check 2**: SAT setpoint vs SAT actual  
  - Expected: SAT tracks setpoint and resets logically (not pinned)
- **Check 3**: Representative VAV min airflow vs actual airflow  
  - Expected: actual airflow isn’t stuck at a high minimum across many zones

## Trend signature(s)
- If SAT is pinned low: SAT_SP at low limit most of the day; reheat opens in many zones simultaneously.
- If VAV mins too high: airflow stays elevated even with low load; reheat cycles to maintain zone temp.

Recommended trend interval + duration:
- 5-minute interval for 24 hours (plus 1-minute interval for 30–60 minutes if diagnosing hunting)

## Tests to perform (table)

| Test | When good | When bad | Notes |
|---|---|---|---|
| Sensor plausibility check | OAT/RAT/SAT/MAT/Zone make physical sense | Values flatline or violate physics | Fix mapping/bias before “control tuning” |
| Command vs feedback check | Feedback tracks | Feedback stuck/lagging | Mechanical/actuator issue or mis-mapped point |
| Compare multiple zones | Only a few zones reheating | Many zones reheating at once | System-level issue (SAT/min flow/deadband) |

## Fix / Mitigation steps (lowest risk first)
- Remove unnecessary overrides (with rollback + timebox)
- Verify sensor mapping and bias before changing control intent
- If allowed within site policy: adjust SAT reset bounds cautiously (small changes, one at a time)

Rollback:
- Restore prior values; capture before/after screenshots or exported point history; record time window.

## Verification
- Reheat command/feedback reduces while zone temps remain stable (15–60 minutes)
- Plant kW and HW usage improve without new complaints (24 hours)

## Common mistakes
- “Lower SAT for comfort” without checking VAV mins (often increases reheat)
- Trusting command points without feedback validation
- Making multiple setpoint changes at once (no attribution)

## References
- Internal: EverWatt Academy Volume 2 (Controls & sequences)
- General: vendor sequence documents; site O&M policies

