import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';

export type EvidenceKindV1 = 'billingRecordField' | 'intervalCalc' | 'pdfTextMatch' | 'tariffSnapshot' | 'assumption';

export type EvidencePointerV1 = {
  /** e.g. "billingRecords", "intervalSeries", "billPdfText", "tariffSnapshot:PGE@2026-02-05T1200Z" */
  source: string;
  /** e.g. field name, or a logical key like "kWMax" */
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

export type IntervalSeriesPointV1 = {
  timestampIso: string;
  kwh?: number;
  kWh?: number;
  kw?: number;
  kW?: number;
  intervalMinutes?: number;
  temperatureF?: number;
  isValid?: boolean;
};

export type IntervalSeriesV1 = {
  meterId: string;
  points: IntervalSeriesPointV1[];
  intervalMinutes?: number;
  timezone?: string;
  source?: string;
};

export type BillingCycleV1 = {
  startIso: string;
  endIso: string;
  label: string;
  timezone: string;
};

export type BillingCycleDeterminantsV1 = {
  cycle: BillingCycleV1;
  energy: {
    kwhTotal: number | null;
    kwhByTouPeriod?: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', number>>;
    kwhByTouPeriodSource?: 'computed' | 'usage_export' | 'unknown';
    touLabelsObserved?: string[];
    unusedTouBuckets?: Array<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak'>;
  };
  maxTimestampIso?: string | null;
  demand: {
    intervalMinutes: number | null;
    kWMax: number | null;
    kWMaxByTouPeriod?: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', number>>;
    billingDemandKw?: number | null;
    ratchetDemandKw?: number | null;
    ratchetFloorPct?: number | null;
    ratchetHistoryMaxKw?: number | null;
    billingDemandMethod?: string;
    coincidentPeakKw?: number | null;
    intervalCount?: number;
    expectedIntervalCount?: number;
    coveragePct?: number;
    firstIntervalTs?: string | null;
    lastIntervalTs?: string | null;
  };
  evidence: EvidenceItemV1[];
  because: string[];
  missingInfo: MissingInfoItemV0[];
  warnings?: string[];
  confidence: number;
};

