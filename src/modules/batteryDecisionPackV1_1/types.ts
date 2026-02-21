import type { ConfidenceTierV1, BatteryEconomicsAuditLineItemV1 } from '../batteryEconomicsV1/types';

export type BatteryDecisionPackMethodV1_1 = 'battery_decision_pack_v1_1';

export type BatteryChemistryClassV1_1 = 'LFP_PLACEHOLDER' | 'NMC_PLACEHOLDER' | 'UNKNOWN';

export type BatteryDecisionCandidateV1_1 = {
  id: string;
  kw: number;
  kwh: number;
  durationH: number;
  chemistryClass: BatteryChemistryClassV1_1;
};

export type BatteryDecisionCandidateEconomicsSummaryV1_1 = {
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
    | 'CCA_GEN_V0_ALL_IN_WITH_EXIT_FEES_DEDUPED'
    | 'CCA_DELIVERY_FALLBACK'
    | 'DA_DELIVERY_FALLBACK';
};

export type BatteryDecisionTopCandidateV1_1 = BatteryDecisionCandidateV1_1 & {
  score: number;
  economicsSummary: BatteryDecisionCandidateEconomicsSummaryV1_1;
  whyThisWorks: string[];
  whyNotBetter: string[];
};

export type BatteryDecisionPackAuditV1_1 = {
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

export type BatteryDecisionPackConstraintsV1_1 = {
  gatesUsed: {
    minDurationH: number;
    maxCyclesPerDay: number;
    minPeakCoveragePct: number;
    maxPeakCoveragePct: number;
    maxPaybackYears: number;
    minNpvLiteUsd: number;
    minNetAnnualUsd: number;
  };
  rejected: Array<{ candidateId: string; reasons: string[] }>;
};

export type BatteryDecisionPackV1_1 = {
  method: BatteryDecisionPackMethodV1_1;
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
  constraints: BatteryDecisionPackConstraintsV1_1;
  topCandidates: BatteryDecisionTopCandidateV1_1[];
  selected: { candidateId: string | null; rationaleBullets: string[] };
  audit: BatteryDecisionPackAuditV1_1;
};

