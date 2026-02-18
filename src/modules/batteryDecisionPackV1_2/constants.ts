export const batteryDecisionPackV1_2VersionTag = 'battery_decision_pack_v1.2' as const;

/**
 * Candidate ladder (deterministic).
 * Keep this list intentionally small to guarantee fixture-pack runtime under 5s.
 */
export const candidatePowerKwLadderV1_2 = [50, 100, 200, 300, 500, 750, 1000] as const;
export const candidateDurationHoursLadderV1_2 = [1, 2, 4] as const;

/**
 * Heuristic sizing band (deterministic).
 * Candidates are filtered to bracket peak, to avoid trivial too-small/too-large options.
 */
export const sizingHeuristicsV1_2 = {
  minPeakCoveragePct: 0.1,
  maxPeakCoveragePct: 0.6,
} as const;

/**
 * Constraints/gates (deterministic).
 * These are decision-safety gates, not optimization knobs.
 */
export const gatesV1_2 = {
  minDurationH: 1,
  maxPaybackYears: 12,
  minNpvLiteUsd: -50_000,
  minNetAnnualUsd: 1,
} as const;

/**
 * Recommendation tier bands (deterministic).
 * Keep these centralized and stable to preserve auditability.
 */
export const recommendationBandsV1_2 = {
  strongMaxPaybackYears: 6,
  moderateMaxPaybackYears: 9,
  weakMaxPaybackYears: 12,
  // NPV threshold used to down-tier when NPV is materially negative.
  npvDownTierThresholdUsd: -50_000,
} as const;

/**
 * Sensitivity scenarios (deterministic; fixed order).
 * Factors are multiplicative scalars applied to components (no recompute).
 */
export const sensitivityScenariosV1_2 = [
  { scenarioId: 'base', capexFactor: 1, energyValueFactor: 1, demandValueFactor: 1 },
  { scenarioId: 'capex_plus_15pct', capexFactor: 1.15, energyValueFactor: 1, demandValueFactor: 1 },
  { scenarioId: 'capex_minus_15pct', capexFactor: 0.85, energyValueFactor: 1, demandValueFactor: 1 },
  { scenarioId: 'tou_spread_minus_20pct', capexFactor: 1, energyValueFactor: 0.8, demandValueFactor: 1 },
  { scenarioId: 'demand_value_minus_20pct', capexFactor: 1, energyValueFactor: 1, demandValueFactor: 0.8 },
] as const;

export const auditBoundsV1_2 = {
  maxLineItems: 220,
  alwaysIncludeIds: [
    'capex.total',
    'opex.totalAnnual',
    'savings.energyAnnual',
    'savings.demandAnnual',
    'savings.ratchetAvoidedAnnual',
    'savings.drAnnual',
    'savings.otherAnnual',
    'savings.totalAnnual',
    'finance.npv',
    'finance.netAnnual',
  ],
} as const;

