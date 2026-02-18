import type { ConfidenceTierV1, BatteryEconomicsAuditLineItemV1 } from '../batteryEconomicsV1/types';

export type BatteryDecisionPackMethodV1_2 = 'battery_decision_pack_v1.2';

export type BatteryDecisionConstraintsV1 = {
  maxKw?: number;
  maxKwh?: number;
  maxDurationHours?: number;
  minDurationHours?: number;
  minKw?: number;
  excludeDurationsHours?: number[];
  requireIndoorRated?: boolean;
  requireNemaRating?: '3R' | '4' | '4X' | null;
  interconnectionLimitKw?: number;
  noExport?: boolean;
  backupOnly?: boolean;
  siteNotes?: string;
};

export type BatteryChemistryClassV1_2 = 'LFP_PLACEHOLDER' | 'NMC_PLACEHOLDER' | 'UNKNOWN';

export type BatteryDecisionCandidateV1_2 = {
  id: string;
  kw: number;
  kwh: number;
  durationH: number;
  chemistryClass: BatteryChemistryClassV1_2;
};

export type BatteryDecisionCandidateEconomicsSummaryV1_2 = {
  annualSavingsTotalUsd: number | null;
  savingsByCategoryUsd: {
    energyArbitrageUsd: number | null;
    demandUsd: number | null;
    drUsd: number | null;
    ratchetUsd: number | null;
    otherUsd: number | null;
  };
  capexTotalUsd: number | null;
  opexAnnualTotalUsd: number | null;
  netAnnualUsd: number | null;
  paybackYears: number | null;
  npvLiteUsd: number | null;
  rateSourceKind:
    | 'DELIVERY'
    | 'CCA_GEN_V0_ENERGY_ONLY'
    | 'CCA_GEN_V0_ALL_IN'
    | 'CCA_GEN_V0_ALL_IN_WITH_EXIT_FEES'
    | 'CCA_DELIVERY_FALLBACK'
    | 'DA_DELIVERY_FALLBACK';
  /**
   * v1.3+ additive summary for report cards (explicit flags only; deterministic).
   * Null when incentives/tax inputs were not provided.
   */
  incentivesAndTaxSummaryV0?: {
    sgipAwardUsd: number | null;
    itcUsd: number | null;
    macrsDeprBenefitTotalUsd: number | null;
    warnings: string[];
  } | null;
  /**
   * v1.3+ additive summary for report cards (deterministic).
   * Null when degradation inputs were not provided.
   */
  degradationSummaryV0?: {
    annualCapacityFadePct: number | null;
    augmentationStrategy: 'none' | 'augment_to_hold_usable_kwh' | 'replace_at_eol';
    replacementYear: number | null;
    augmentationEventCount: number;
    warnings: string[];
  } | null;
};

export type BatteryDecisionTopCandidateV1_2 = BatteryDecisionCandidateV1_2 & {
  score: number;
  economicsSummary: BatteryDecisionCandidateEconomicsSummaryV1_2;
  whyThisWorks: string[];
  whyNotBetter: string[];
};

export type BatteryDecisionPackAuditV1_2 = {
  /**
   * Bounded, stable-ordered audit items. Each $ should be traceable by `sourcePath`, `rateSource`, and `quantities`.
   */
  lineItems: BatteryEconomicsAuditLineItemV1[];
  reconcile: {
    total: number | null;
    sumLineItems: number | null;
    delta: number | null;
  };
};

export type BatteryDecisionPackSensitivityScenarioIdV1_2 =
  | 'base'
  | 'capex_plus_15pct'
  | 'capex_minus_15pct'
  | 'tou_spread_minus_20pct'
  | 'demand_value_minus_20pct';

export type BatteryDecisionSensitivityScenarioV1_2 = {
  scenarioId: BatteryDecisionPackSensitivityScenarioIdV1_2;
  simplePaybackYears: number | null;
  npvLite: number | null;
  annualSavingsTotal: number | null;
  warnings: string[];
};

export type BatteryDecisionSensitivityV1_2 = {
  ok: boolean;
  reasonCodes: string[];
  scenarios: BatteryDecisionSensitivityScenarioV1_2[];
};

export type BatteryRecommendationTierV1_2 = 'STRONG' | 'MODERATE' | 'WEAK' | 'DO_NOT_PROCEED';

export type BatteryRecommendationV1_2 = {
  recommendedCandidateId: string | null;
  recommendationTier: BatteryRecommendationTierV1_2;
  reasonsTop: string[];
  whyNotOthers: Array<{ candidateId: string; reasons: string[] }>;
  keyAssumptions: string[];
  risks: string[];
};

export type BatteryDecisionPackConstraintsSummaryV1_2 = {
  input: BatteryDecisionConstraintsV1 | null;
  applied: {
    maxKwEffective: number | null;
    minKwEffective: number | null;
    maxKwhEffective: number | null;
    minDurationHoursEffective: number | null;
    maxDurationHoursEffective: number | null;
    excludeDurationsHoursEffective: number[];
    backupOnly: boolean;
    noExport: boolean;
    interconnectionLimitKw: number | null;
    requireIndoorRated: boolean;
    requireNemaRating: '3R' | '4' | '4X' | null;
    siteNotes: string | null;
  };
  hardFilter: {
    candidatesBefore: number;
    candidatesAfter: number;
    bindingConstraintIds: string[];
  };
  rejectedByGates: Array<{ candidateId: string; reasons: string[] }>;
};

export type BatteryDecisionPackV1_2 = {
  method: BatteryDecisionPackMethodV1_2;
  ok: boolean;
  confidenceTier: ConfidenceTierV1;
  warnings: string[];
  missingInfo: string[];
  inputsSummary: {
    utility: string | null;
    rate: string | null;
    providerType: 'NONE' | 'CCA' | 'DA';
    hasIntervals: boolean;
    hasAllInGenPrices: boolean;
  };
  constraints: BatteryDecisionPackConstraintsSummaryV1_2;
  topCandidates: BatteryDecisionTopCandidateV1_2[];
  selected: { candidateId: string | null; rationaleBullets: string[] };
  batteryDecisionSensitivityV1: BatteryDecisionSensitivityV1_2;
  recommendationV1: BatteryRecommendationV1_2;
  audit: BatteryDecisionPackAuditV1_2;
};

