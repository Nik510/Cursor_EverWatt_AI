export type SgipLibrarySelectionRuleV0 = 'BILL_PERIOD_START_ELSE_LATEST';

export type SgipIncentiveCategoryV0 = 'general_market' | 'equity_resiliency' | 'equity' | 'residential';

export type SgipIncentiveRateV0 = {
  category: SgipIncentiveCategoryV0;
  /** $/Wh */
  rateUsdPerWh: number;
  /** Optional program cap ($) for this category within a snapshot (not budget availability). */
  programCapUsd?: number | null;
  /** Optional notes about explicit adders/caps included/excluded. */
  notes?: string | null;
};

export type SgipSnapshotV0 = {
  snapshotId: string;
  effectiveStartYmd: string;
  acquisitionMethodUsed: 'MANUAL_SEED_V0';
  notes: string;
  programRules: Record<string, unknown>;
  incentiveRates: Record<SgipIncentiveCategoryV0, SgipIncentiveRateV0>;
};

export type SgipSnapshotSelectionResultV0 = {
  ok: boolean;
  snapshot: SgipSnapshotV0 | null;
  snapshotIdUsed: string | null;
  acquisitionMethodUsed: SgipSnapshotV0['acquisitionMethodUsed'] | null;
  warnings: string[];
};

