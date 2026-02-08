import type { Measure } from '../measures/types';
import type { ProgramMatchResult } from '../programIntelligence/types';
import type { ComprehensiveBillRecord } from '../../utils/utility-data-types';
import type { TariffRateMetadata } from '../tariffLibrary/types';
import type { MissingInfoItemV0 } from './missingInfo/types';
import type { ApplicabilityResult } from '../tariffApplicability/types';
import type { LoadAttributionResultV1 } from '../loadAttribution/types';
import type { BillSimV2 } from '../billingEngineV2/types';

export type UtilityServiceType = 'electric' | 'gas' | 'both';

export type UtilityInputs = {
  orgId: string;
  projectId: string;
  serviceType: UtilityServiceType;
  address?: { line1: string; city: string; state: string; zip: string; country: string };
  utilityTerritory?: string; // e.g. "PGE"
  climateZone?: string; // e.g. "CEC-3"
  customerType?: string; // e.g. "healthcare", "k12", "office", "industrial"
  naicsCode?: string;
  currentRate?: { utility: string; rateCode: string; effectiveDate?: string }; // if known
  billingSummary?: {
    monthly: Array<{
      start: string;
      end: string;
      kWh?: number;
      kW?: number;
      therms?: number;
      dollars?: number;
    }>;
  };
  /**
   * Optional comprehensive monthly bill records when available (parsed from utility exports).
   * These allow supply/delivery structure inference (CCA/DA/bundled).
   */
  billingRecords?: ComprehensiveBillRecord[];
  /** Optional extracted bill PDF text (if available). */
  billPdfText?: string;
  intervalDataRef?: { telemetrySeriesId: string; resolution: '15min' | 'hourly' | 'daily'; channels: string[] };
  meterMeta?: { voltage?: string; phase?: string; serviceClass?: string; hasDemandChargesKnown?: boolean };
  constraints?: { canCurtail?: boolean; criticalOperations?: boolean; hasGenerator?: boolean; hasBms?: boolean };
};

export type LoadShapeMetrics = {
  baseloadKw?: number;
  peakKw?: number;
  loadFactor?: number;
  peakinessIndex?: number;
  weekdayWeekendDelta?: number;
  nightDayRatio?: number;
  seasonalityIndex?: number;
  signatureVector?: number[];
};

export type UtilityInsights = {
  inferredLoadShape: LoadShapeMetrics;
  /**
   * Proven metrics computed directly from interval data via Billing Engine v1 normalization/mapping,
   * when enough data is available. These are additive and optional.
   */
  provenPeakKw?: number;
  provenMonthlyKwh?: number;
  provenAnnualKwhEstimate?: {
    annualKwhEstimate: number;
    monthsUsed: number;
    confidence: number; // 0..1
    because: string[];
  };
  provenTouExposureSummary?: {
    /** Month key in local timezone, YYYY-MM */
    month: string;
    timezone: string;
    rateIdUsed: string;
    peakEnergyPct: number; // 0..1
    offPeakEnergyPct: number; // 0..1
    peakKwh: number;
    offPeakKwh: number;
  };
  operatingPatternInference: {
    scheduleBucket: '24_7' | 'business_hours' | 'mixed' | 'unknown';
    confidence: number;
    reasons: string[];
  };
  loadShiftingFeasibility: {
    score: number; // 0..1
    candidateShiftWindows: Array<{ name: string; startHour: number; endHour: number; reasons: string[] }>;
    constraintsDetected: string[];
  };
  weatherSensitivity?: {
    available: boolean;
    coolingSlope?: number;
    heatingSlope?: number;
    r2?: number;
    method: 'regression_v1';
    reasons: string[];
  };
  rateFit: {
    status: 'good' | 'ok' | 'likely_suboptimal' | 'unknown';
    currentRateCode?: string;
    confidence: number;
    because: string[];
    alternatives: Array<{
      utility: string;
      rateCode: string;
      status: 'candidate' | 'needs_eval' | 'unlikely';
      because: string[];
      estimatedDeltaDollars?: number; // only if deterministically computed
      estimatedDeltaConfidence?: number;
      requiredInputsMissing?: string[];
    }>;
  };
  optionSRelevance: {
    status: 'relevant' | 'not_relevant' | 'unknown';
    confidence: number;
    because: string[];
    requiredInputsMissing: string[];
  };
  programs: {
    matches: Array<ProgramMatchResult>;
    topRecommendations: Array<UtilityRecommendation>;
  };
  supplyStructure?: {
    supplyType: 'bundled' | 'CCA' | 'DA' | 'unknown';
    confidence: number;
    because: string[];
    evidence?: {
      serviceProvider?: string;
      espTotalRevenueAmount?: number;
      pgeRevenueAmount?: number;
      totalBillAmount?: number;
      trueTotalUsed?: number;
      source?: 'bill_records' | 'bill_pdf' | 'rate_context';
    };
    recommendation?: {
      title: string;
      because: string[];
      confidence: number;
    };
  };
  /**
   * Optional CA Tariff Library (v0) lookup for the current rate code.
   * This is metadata-only and additive; it does not affect billing math yet.
   */
  tariffLibrary?: {
    snapshotVersionTag?: string;
    snapshotCapturedAt?: string;
    /** Alias for snapshotCapturedAt (UI-friendly naming) */
    lastUpdatedAt?: string;
    isStale?: boolean;
    changeSummary?: { addedRateCodes: string[]; removedRateCodes: string[] };
    rateMetadata?: TariffRateMetadata | null;
  };
  /**
   * Optional deterministic tariff applicability resolution (v1).
   * This is a rule-based evaluator (metadata + extracted determinants) that can return
   * applicable / not_applicable / unknown with explicit missing inputs.
   */
  tariffApplicability?: ApplicabilityResult;
  /**
   * Optional deterministic determinants pack summary (v1).
   *
   * This is a compact, UI-friendly view of the canonical determinants output layer:
   * billing-cycle kWh totals, max kW, (placeholder) billing demand after demand rules,
   * interval coverage, and reconciliation flags.
   */
  determinantsPackSummary?: {
    rulesVersionTag: string;
    meters: Array<{
      meterId: string;
      last12Cycles: Array<{
        cycleLabel: string;
        startIso: string;
        endIso: string;
        kwhTotal: number | null;
        kWMax: number | null;
        kWMaxByTouPeriod?: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', number>>;
        billingDemandKw: number | null;
        coveragePct: number | null;
        intervalMinutes: number | null;
      }>;
      reconciliation: {
        demandMismatchCount: number;
        kwhMismatchCount: number;
        overlapStartIso?: string | null;
        overlapEndExclusiveIso?: string | null;
        reconciledCycleCount?: number;
        skippedCycleCountByReason?: { no_usage: number; out_of_overlap_window: number; low_interval_coverage: number };
        latestReconcilableBillEndDate?: string | null;
        earliestReconcilableBillEndDate?: string | null;
      };
    }>;
    warnings: string[];
  };
  /** Deterministic multi-year utility behavior insights (v1). */
  behaviorInsights?: import('./behavior/types').BehaviorInsightsV1;
  /** Deterministic multi-year utility behavior insights (v2, overlap-aware). */
  behaviorInsightsV2?: import('./behaviorV2/types').BehaviorInsightsV2;
  /** Deterministic multi-year utility behavior insights (v3, commodity tabs: electric/gas). */
  behaviorInsightsV3?: import('./behaviorV3/types').BehaviorInsightsV3;
  /** Optional deterministic weather/load attribution (change-point regression) when temperature is present in intervals. */
  loadAttribution?: LoadAttributionResultV1;
  /** Optional audit-first monthly bill simulation using DeterminantsPack (v2). */
  billSimV2?: BillSimV2;
  /** Reproducibility tags for deterministic engines used in this analysis. */
  versionTags?: {
    determinantsVersionTag: string;
    touLabelerVersionTag: string;
    loadAttributionVersionTag: string;
  };
  /** Decision-safety checklist items (additive). */
  missingInfo?: MissingInfoItemV0[];
  requiredInputsMissing: string[]; // global
};

export type UtilityRecommendation = {
  recommendationId: string;
  recommendationType: 'RATE_CHANGE' | 'LOAD_SHIFTING' | 'OPTION_S' | 'TOU_OPT' | 'DEMAND_RESPONSE' | 'UTILITY_PROGRAM';
  score: number; // 0..1
  confidence: number; // 0..1
  because: string[];
  requiredInputsMissing: string[];
  suggestedMeasure: Measure;
};

