export const batteryDecisionPackV1_1VersionTag = 'battery_decision_pack_v1_1' as const;

/**
 * Candidate ladder (deterministic).
 * Keep this list intentionally small to guarantee fixture-pack runtime under 5s.
 */
export const candidatePowerKwLadderV1_1 = [50, 100, 200, 300, 500, 750, 1000] as const;
export const candidateDurationHoursLadderV1_1 = [1, 2, 4] as const;

/**
 * Heuristic sizing band (deterministic).
 * Candidates are filtered to bracket peak, to avoid trivial too-small/too-large options.
 */
export const sizingHeuristicsV1_1 = {
  minPeakCoveragePct: 0.1,
  maxPeakCoveragePct: 0.6,
} as const;

/**
 * Constraints/gates (deterministic).
 * These are decision-safety gates, not optimization knobs.
 */
export const constraintsV1_1 = {
  minDurationH: 1,
  maxCyclesPerDay: 1,
  maxPaybackYears: 12,
  minNpvLiteUsd: -50_000,
  minNetAnnualUsd: 1,
} as const;

/**
 * Scoring weights (deterministic).
 * Documented constants: do not tune without a version bump.
 */
export const scoreWeightsV1_1 = {
  npvLiteUsd: 1 / 50_000, // +1 score per $50k NPV
  netAnnualUsd: 1 / 10_000, // +1 score per $10k net annual
  paybackYears: -0.35, // negative weight (lower payback is better)
  capexUsd: -1 / 500_000, // mild penalty for extreme capex
  warningPenalty: -0.05, // per unique warning code (bounded by scorer)
} as const;

export const auditBoundsV1_1 = {
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

