# Program Intelligence v1 (Deterministic)

## What it is
Program Intelligence v1 provides deterministic program matching and recommendation generation based on:
- Utility territory (required)
- Customer segment + NAICS (prefix-based include/exclude)
- Thresholds (peak kW, monthly/annual kWh)
- Interval/AMI requirements (enforced conservatively)

Files:
- Types: `src/modules/programIntelligence/types.ts`
- Catalog: `src/modules/programIntelligence/catalogs/pge_programs_v1.json`
- Matcher: `src/modules/programIntelligence/matchPrograms.ts`
- Recommendation adapter: `src/modules/programIntelligence/toRecommendations.ts`

## Catalog schema + versioning
Catalogs are versioned JSON payloads with:
- top-level `version`, `lastUpdated`, `entries[]`
- each entry has `programId` (stable), `version`, and `lastUpdated`

`programId` should remain stable across catalog updates so:
- historical inbox items remain linkable
- downstream systems can track enrollment decisions

## NAICS prefix matching rules

### Include (`naicsInclude`)
- Treated as **prefixes**.
- If `naicsInclude` is empty or omitted, the program is not restricted by NAICS include rules.
- If provided, the customer NAICS must match **at least one** prefix.

### Exclude (`naicsExclude`)
- Treated as **prefixes**.
- If the customer NAICS matches an exclude prefix, the program is **ineligible** regardless of include matches.

### Missing NAICS
If an entry has any `naicsInclude` or `naicsExclude` rules and the customer NAICS is missing:
- `matchStatus="unknown"`
- `requiredInputsMissing` includes a NAICS message

## Deterministic rule evaluation

### Territory
Territory must match exactly (normalized) or the match is:
- `matchStatus="unlikely"`
- `score=0`

### Thresholds
If a threshold is defined and the metric is missing:
- `matchStatus="unknown"`
- `requiredInputsMissing` includes the needed metric

If a threshold is defined and not met:
- `matchStatus="unlikely"`
- Flags include `below_minPeakKw` / `below_minMonthlyKwh` / `below_minAnnualKwh`

### Interval/AMI requirements
If `requiresIntervalData` or `requiresAdvancedMetering` is true and the input does not confirm it:
- `matchStatus="unknown"`
- `requiredInputsMissing` includes the requirement

## DR recommendation generation (v1)
`toRecommendations.ts` converts top program matches into canonical `UtilityRecommendation` objects:
- DR programs produce `recommendationType="DEMAND_RESPONSE"` and `Measure.measureType="DEMAND_RESPONSE_ENROLLMENT"`
- Other programs produce `recommendationType="UTILITY_PROGRAM"` and `Measure.measureType="UTILITY_PROGRAM_ENROLLMENT"`

Measure `parameters` include:
- `programId`, `programName`, `administrator`, `category`, `territory`

## Governance note (playbooks later)
v1 ranks matches using deterministic rules and simple heuristic boosts (e.g., load shifting score boosts DR ranking).

Future versions may apply playbooks to boost/dampen recommendations, but:
- playbooks must never auto-apply scope changes
- playbooks should only change ranking/explanations, not eligibility truth

