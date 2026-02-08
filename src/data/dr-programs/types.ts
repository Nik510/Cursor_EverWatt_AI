import type { DrFitResult } from '../../modules/battery/dr-fit-score';

export type DrPaymentUnit = 'per_kw_event' | 'per_kwh';

export type DrEventWindow = {
  /** Local hour [0..23] */
  startHour: number;
  /** Local hour [0..24], non-inclusive */
  endHour: number;
  weekdaysOnly: boolean;
  /** Optional: months to include (1..12). If omitted, all months allowed. */
  months?: number[];
};

export type DrProgramEligibility = {
  /** If set, require current rate code to match one of these (normalized). */
  allowedRateBases?: string[];
  /** Minimum total deliverable commitment in kW. */
  minimumCommitmentKw: number;
  /** If true, requires interval meter / interval data present. */
  requiresIntervalData: boolean;
};

export type DrProgramPayments = {
  /** Optional capacity payment ($/kW-month) */
  capacityPaymentPerKwMonth?: number;
  /** Event payment, interpreted using `paymentUnit` */
  eventPayment: number;
  paymentUnit: DrPaymentUnit;
  /** Expected events per year (can be a range later) */
  estimatedEventsPerYear: number;
};

export type DrProgram = {
  id: string;
  utility: 'PG&E' | 'SCE' | 'SDG&E' | 'Other';
  name: string;
  description: string;
  eventWindow: DrEventWindow;
  eligibility: DrProgramEligibility;
  payments: DrProgramPayments;
  links?: Array<{ label: string; url: string }>;
  lastUpdated?: string;
};

export type DrDeliverables = {
  deliverableOpsKw: number;
  deliverableTotalKw: number;
  deliverableBatteryKw: number;
  /** how many candidate event days were evaluated */
  daysEvaluated: number;
  /** selection method and any notes */
  notes: string[];
};

export type DrMoneyResult = {
  committedKw: number;
  /** Enrollment realism: committed kW rounded down (e.g. nearest 10kW). */
  committedKwRounded?: number;
  /** Payment inputs used (for transparency / UI). */
  capacityPaymentPerKwMonth?: number;
  eventPayment?: number;
  paymentUnit?: DrPaymentUnit;
  estimatedEventsPerYear?: number;
  capacityGrossAnnualUsd: number;
  eventGrossAnnualUsd: number;
  customerGrossAnnualUsd: number;
  /** EverWatt fee model inputs */
  everwattFeeModel?: 'hybrid_floor_or_pct';
  feePct?: number;
  feePerKwYear?: number;
  everwattFeeFloorAnnualUsd: number;
  everwattFeePctAnnualUsd: number;
  everwattFeeAnnualUsd: number;
  customerNetAnnualUsd: number;
  /** Only meaningful for per_kwh programs. */
  avgCurtailKwhPerEvent?: number;
};

export type DrProgramEvaluation = {
  program: DrProgram;
  eligible: boolean;
  eligibilityReasons: string[];
  deliverables: DrDeliverables;
  /** computed annual money with hybrid fee */
  money?: DrMoneyResult;
  riskFlags: string[];
  fit?: DrFitResult;
};

export type DrPanel = {
  fitScore: number; // 0..100
  why: string[];
  fit?: DrFitResult;
  deliverables: DrDeliverables;
  feeModel: {
    feePerKwYear: number;
    feePct: number;
  };
  programs: DrProgramEvaluation[];
  bestByCustomerNet?: DrProgramEvaluation;
  bestByEverwattFee?: DrProgramEvaluation;
};

