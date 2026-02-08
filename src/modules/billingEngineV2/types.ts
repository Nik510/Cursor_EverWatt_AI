import type { EvidenceItemV1 } from '../determinants/types';
import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';

export type BillLineItemTypeV2 = 'energy' | 'demand' | 'fixed' | 'taxes_fees' | 'other' | 'unknown';
export type TouPeriodKeyV2 = 'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak';

export type BillLineItemV2 = {
  /** Stable-ish id within the cycle for audit diffs. */
  id: string;
  type: BillLineItemTypeV2;
  cycleLabel: string;
  /** Optional canonical TOU bucket for energy or TOU demand. */
  touPeriod?: TouPeriodKeyV2;
  /** Human label from rate catalog when applicable (e.g. PEAK, OFF_PEAK). */
  rateTouLabel?: string;
  quantity: number | null;
  unit: 'kWh' | 'kW' | 'day' | 'month' | 'unknown';
  rate: number | null;
  rateUnit: '$/kWh' | '$/kW' | '$/day' | '$/month' | 'unknown';
  dollars: number | null;
  /** Deterministic evidence pointers: rate source + determinants source. */
  evidence: EvidenceItemV1[];
  /** Notes for operators; deterministic strings only. */
  notes?: string[];
};

export type BillCycleSimV2 = {
  cycleLabel: string;
  cycleStartIso: string;
  cycleEndIso: string;
  /** Deterministic explanation of incompleteness/missing paths for this cycle. */
  partialReasons: string[];
  /** Deterministic list of missing rate inputs (catalog gaps, missing charge rates). */
  missingRateInputs: string[];
  /** Deterministic list of missing determinants inputs for this cycle. */
  missingDeterminants: string[];
  totals: {
    energyDollars: number | null;
    demandDollars: number | null;
    fixedDollars: number | null;
    otherDollars: number | null;
    totalDollars: number | null;
    /** True if any component is null/unmodeled. */
    isPartial: boolean;
  };
  lineItems: BillLineItemV2[];
  warnings: string[];
  missingInfo: MissingInfoItemV0[];
};

export type BillSimV2 = {
  version: 'billSimV2.v1';
  utility: string;
  rateCode: string;
  businessFamilyKey?: string | null;
  rateCatalogId?: string | null;
  ratchetModelStatus?: 'not_applicable' | 'likely_applies_unmodeled' | 'modeled' | 'unknown';
  ratchetModelPlaceholder?: {
    kind: 'unmodeled_hook_v0';
    notes: string[];
  } | null;
  meters: Array<{
    meterId: string;
    cycles: BillCycleSimV2[];
  }>;
  warnings: string[];
  missingInfo: MissingInfoItemV0[];
};

