import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';

export type EvidenceKindV1 = 'billingRecordField' | 'intervalCalc' | 'pdfTextMatch' | 'tariffSnapshot' | 'assumption';

export type EvidencePointerV1 = {
  /** e.g. \"billingRecords\", \"intervalSeries\", \"billPdfText\", \"tariffSnapshot:PGE@2026-02-05T1200Z\" */
  source: string;
  /** e.g. field name, or a logical key like \"kWMax\" */
  key?: string;
  /** raw value (or a compact string form) */
  value?: string | number | boolean | null;
  /** optional short snippet for pdf/text matches */
  snippet?: string;
  /** optional index range for snippets or arrays */
  range?: { start?: number; end?: number };
};

export type EvidenceItemV1 = {
  kind: EvidenceKindV1;
  pointer: EvidencePointerV1;
};

/**
 * Canonical interval point used by adapters/workflows.
 * Field names follow common utility export semantics (kWh / kW).
 */
export type CanonicalIntervalPointV1 = {
  timestampIso: string;
  intervalMinutes: number;
  kWh?: number;
  kW?: number;
  temperatureF?: number;
  isValid?: boolean;
};

/**
 * Canonical interval series input.
 *
 * Notes:
 * - Accepts either kWh (energy per interval) or kW (power for interval). The determinants
 *   pipeline will derive the missing quantity when intervalMinutes is known.
 * - timestampIso should be an ISO string parseable by Date().
 */
export type IntervalSeriesPointV1 = {
  timestampIso: string;
  /** Energy for this interval. If provided, kW can be derived for 15/30-min intervals. */
  kwh?: number;
  /** Alias for adapter/workflow canonical casing. */
  kWh?: number;
  /** Measured/normalized kW for this interval. If provided, kWh can be derived given intervalMinutes. */
  kw?: number;
  /** Alias for adapter/workflow canonical casing. */
  kW?: number;
  /** Minutes per interval (15, 30, 60...). If absent, may be provided at series level. */
  intervalMinutes?: number;
  /** Optional temperature in °F (from interval export) for attribution. */
  temperatureF?: number;
  /** Optional validity marker from upstream normalization. */
  isValid?: boolean;
};

export type IntervalSeriesV1 = {
  meterId: string; // meter number or SAID
  points: IntervalSeriesPointV1[];
  /** Default interval minutes for the series when points don't specify it. */
  intervalMinutes?: number;
  timezone?: string;
  /** Provenance label, e.g. \"telemetry.intervalKwSeries\" or a file path key. */
  source?: string;
};

export type BillingCycleV1 = {
  startIso: string;
  endIso: string;
  label: string;
  timezone: string;
};

export type BillComponentChargeV1 = { name: string; dollars: number };
export type BillComponentDemandChargeV1 = { name: string; kw: number; dollarsPerKw?: number; dollars: number };
export type BillComponentEnergyChargeV1 = { name: string; kwh: number; dollarsPerKwh?: number; dollars: number };

export type BillingCycleBillComponentsV1 = {
  fixedCharges?: BillComponentChargeV1[];
  demandCharges?: BillComponentDemandChargeV1[];
  energyCharges?: BillComponentEnergyChargeV1[];
  taxesAndFees?: BillComponentChargeV1[];
  /** Optional buckets for supply vs delivery when known. */
  generationPortion?: BillComponentChargeV1[];
  deliveryPortion?: BillComponentChargeV1[];
};

export type BillingCycleDeterminantsV1 = {
  cycle: BillingCycleV1;
  energy: {
    kwhTotal: number | null;
    /**
     * Canonical TOU energy buckets (when deterministically derivable).
     * Keys are canonical: onPeak, partialPeak, offPeak, superOffPeak.
     */
    kwhByTouPeriod?: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', number>>;
    kwhByTouPeriodSource?: 'computed' | 'usage_export' | 'unknown';
    /** Raw TOU labels observed from deterministic TOU labeling (e.g. PEAK/OFF_PEAK). */
    touLabelsObserved?: string[];
    /** Canonical buckets unused for this cycle/rate mapping. */
    unusedTouBuckets?: Array<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak'>;
  };
  maxTimestampIso?: string | null;
  demand: {
    intervalMinutes: number | null;
    /** billing-cycle max kW from intervals */
    kWMax: number | null;
    /**
     * Optional billing-cycle max kW by canonical TOU bucket.
     * Canonical keys: onPeak, partialPeak, offPeak, superOffPeak.
     */
    kWMaxByTouPeriod?: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', number>>;
    /**
     * Demand after applying demand window / ratchet rules.
     * In v1 this may equal kWMax with explicit MissingInfo when rules are not modeled.
     */
    billingDemandKw?: number | null;
    /** Optional ratchet floor demand used (kW), when applicable. */
    ratchetDemandKw?: number | null;
    /** Optional ratchet metadata for auditability. */
    ratchetFloorPct?: number | null;
    ratchetHistoryMaxKw?: number | null;
    /** Deterministic method tag for billing demand derivation. */
    billingDemandMethod?: string;
    coincidentPeakKw?: number | null;
    /** Coverage quality for the cycle. */
    intervalCount?: number;
    expectedIntervalCount?: number;
    coveragePct?: number; // 0..1
    firstIntervalTs?: string | null;
    lastIntervalTs?: string | null;
  };
  billComponents?: BillingCycleBillComponentsV1;
  evidence: EvidenceItemV1[];
  because: string[];
  missingInfo: MissingInfoItemV0[];
  warnings?: string[];
  confidence: number; // 0..1
};

export type ReconciliationMatchV1 = {
  cycleLabel: string;
  startIso: string;
  endIso: string;
  billDemandKw?: number | null;
  computedDemandKw?: number | null;
  billKwh?: number | null;
  computedKwh?: number | null;
  deltaDemandPct?: number | null;
  deltaKwhPct?: number | null;
  isInOverlapWindow?: boolean;
  isReconcilable?: boolean;
  reconcileSkipReason?: 'no_usage' | 'out_of_overlap_window' | 'low_interval_coverage';
  ok?: boolean;
  notes: string[];
  evidence: EvidenceItemV1[];
};

export type ReconciliationSummaryV1 = {
  matches: ReconciliationMatchV1[];
  demandMismatchCount: number;
  kwhMismatchCount: number;
  overlapStartIso?: string | null;
  overlapEndExclusiveIso?: string | null;
  reconciledCycleCount?: number;
  skippedCycleCountByReason?: {
    no_usage: number;
    out_of_overlap_window: number;
    low_interval_coverage: number;
  };
  latestReconcilableBillEndDate?: string | null;
  earliestReconcilableBillEndDate?: string | null;
  missingInfo: MissingInfoItemV0[];
  warnings: string[];
  confidenceImpact: number; // 0..1 multiplier suggested
};

export type MeterDeterminantsV1 = {
  meterId: string;
  cycles: BillingCycleDeterminantsV1[];
  reconciliation: ReconciliationSummaryV1;
};

export type DeterminantsConfidenceSummaryV1 = {
  confidence: number; // 0..1
  because: string[];
};

export type DeterminantsPackV1 = {
  utility: string;
  rateCode: string;
  supplyType?: 'bundled' | 'CCA' | 'DA' | 'unknown';
  meters: MeterDeterminantsV1[];
  aggregated?: {
    site?: {
      last12Cycles?: Array<{
        cycleLabel: string;
        kwhTotal: number | null;
        kWMax: number | null;
        billingDemandKw?: number | null;
        ratchetDemandKw?: number | null;
        billingDemandMethod?: string;
        coveragePct?: number | null;
      }>;
    };
  };
  confidenceSummary: DeterminantsConfidenceSummaryV1;
  missingInfo: MissingInfoItemV0[];
  warnings: string[];
  /** Reproducibility: determinants computation version tag. */
  determinantsVersionTag: string;
  /** Reproducibility: TOU labeling version tag (when used). */
  touLabelerVersionTag: string;
  /** Backwards-compatible alias for early v1. */
  rulesVersionTag: string;
};

