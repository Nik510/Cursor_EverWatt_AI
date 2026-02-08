export type UtilityCurationV1 = {
  hidden?: boolean;
  internalNotes?: string;
  notes?: string;
  priorityRank?: number;
  tags?: string[];
};

export type TariffCurationTierV1 = 'featured' | 'common' | 'all';

export type TariffCurationV1 = {
  utilityKey: string;
  /** Rate code or prefix pattern ending with '*' (e.g. 'B-19*', 'AG-*', 'A-*'). */
  rateCode: string;
  tier?: TariffCurationTierV1;
  hidden?: boolean;
  notes?: string;
  tags?: string[];
  preferredForEverWatt?: boolean;
};

export type ProgramCurationV1 = {
  hidden?: boolean;
  excludeReason?: string;
  labels?: { participated?: boolean; recommended?: boolean; avoid?: boolean };
  worthItScore?: number; // 0-100
  customerSizeThresholds?: { minKw?: number; minKwhAnnual?: number; minSqft?: number; notes?: string };
  sectors?: string[]; // e.g., healthcare, schools, govt
  internalNotes?: string;
  /** Allow residential programs when true (default policy otherwise excludes residential-only). */
  allowResidential?: boolean;

  /** EverWatt ops fields */
  participatedBefore?: boolean;
  /**
   * Standardized on numeric 1–5.
   * Backward-compatible parsing may accept legacy 'A'|'B'|'C' inputs.
   */
  internalRating?: 'A' | 'B' | 'C' | 1 | 2 | 3 | 4 | 5;
  worthItThresholds?: {
    minCustomerKw?: number;
    minAnnualKwh?: number;
    minAnnualSpendUsd?: number;
    minIncentiveUsd?: number;
    notes?: string;
  };
  prominentCallouts?: string[];
};

export type ImplementerCurationV1 = {
  hidden?: boolean;
  internalNotes?: string;
};

export type CurationBundleV1 = {
  utilities: Record<string, UtilityCurationV1>;
  programs: Record<string, ProgramCurationV1>;
  implementers: Record<string, ImplementerCurationV1>;
};

