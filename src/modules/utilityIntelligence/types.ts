import type { Measure } from '../measures/types';
import type { ProgramMatchResult } from '../programIntelligence/types';
import type { ComprehensiveBillRecord } from '../../utils/utility-data-types';
import type { TariffRateMetadata } from '../tariffLibrary/types';
import type { MissingInfoItemV0 } from './missingInfo/types';
import type { ApplicabilityResult } from '../tariffApplicability/types';
import type { LoadAttributionResultV1 } from '../loadAttribution/types';
import type { BillSimV2 } from '../billingEngineV2/types';
import type { BillIntelligenceV1 } from './billIntelligence/typesV1';
import type { IntervalIntelligenceV1 } from './intervalIntelligenceV1/types';
import type { WeatherRegressionV1 } from './weatherRegressionV1/types';
import type { StorageOpportunityPackV1 } from '../batteryEngineV1/types';
import type { BatteryEconomicsOutputsV1 } from '../batteryEconomicsV1/types';
import type { BatteryDecisionPackV1 } from '../batteryEconomicsV1/decisionPackV1';
import type { BatteryDecisionPackV1_2 } from '../batteryDecisionPackV1_2/types';
import type { EffectiveRateContextV1 } from '../supplyStructureAnalyzerV1/types';

export type UtilityServiceType = 'electric' | 'gas' | 'both';

export type EngineWarning = {
  /** Stable warning code (machine-readable). */
  code: string;
  /** Module path or logical subsystem (no PII). */
  module: string;
  /** Operation name (no PII). */
  operation: string;
  /** Exception class name only (no stack traces in client payloads). */
  exceptionName: string;
  /** Short key for grouping/debugging (no PII). */
  contextKey: string;
};

export type CurrentRateSelectionSourceV1 = 'USER_OVERRIDE' | 'BILL_MATCH' | 'DEFAULT';

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
  /**
   * Optional source tag for how `currentRate` was determined (v1).
   * This is additive metadata only; it must not affect pricing math.
   */
  currentRateSelectionSource?: CurrentRateSelectionSourceV1;
  /**
   * Optional tariff override metadata provided by the user/UI (v1).
   * Keep shape minimal and non-PII.
   */
  tariffOverrideV1?:
    | {
        schemaVersion?: number;
        commodity?: 'electric' | 'gas';
        utilityId?: string;
        snapshotId?: string;
        tariffIdOrRateCode?: string;
        selectedBy?: 'user' | 'system';
        selectedAt?: string;
        selectionSource?: string;
        matchType?: string;
        notes?: string;
      }
    | null;
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
   * Engine warnings (operability/debug truth): structured, best-effort,
   * no stack traces, no PII.
   */
  engineWarnings?: EngineWarning[];
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
   * Effective rate context (SSA v1): IOU delivery + optional CCA/DA generation context.
   * Additive and warnings-first; does not change billing math unless explicitly plumbed downstream.
   */
  effectiveRateContextV1?: EffectiveRateContextV1;
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
  /** Deterministic bill intelligence extracted from billPdfText (v1). */
  billIntelligenceV1?: BillIntelligenceV1;
  /** Deterministic interval intelligence computed directly from interval series (v1). */
  intervalIntelligenceV1?: IntervalIntelligenceV1;
  /**
   * Deterministic Storage Opportunity Pack (v1): battery sizing + dispatch simulation + DR readiness.
   * Always present when attached by `analyzeUtility` (warnings-first when inputs are missing).
   */
  storageOpportunityPackV1?: StorageOpportunityPackV1;
  /**
   * Deterministic Battery Economics (v1): CAPEX/OPEX + savings + finance (NPV/payback) + audit trail.
   * Always attached by `analyzeUtility` (warnings-first when inputs are missing).
   */
  batteryEconomicsV1?: BatteryEconomicsOutputsV1;
  /**
   * Deterministic Battery Decision Pack (v1): sizing search + decision-ready option shortlist with audited savings.
   * Always attached by `analyzeUtility` (confidence NONE when key inputs are missing).
   */
  batteryDecisionPackV1?: BatteryDecisionPackV1;
  /**
   * Deterministic Battery Decision Pack (v1.2): constraints + sensitivity + deterministic recommendation narrative.
   * Always attached by `analyzeUtility` (confidence NONE when key inputs are missing).
   */
  batteryDecisionPackV1_2?: BatteryDecisionPackV1_2;
  /** Deterministic weather regression + annualization computed from interval + temperature (v1). */
  weatherRegressionV1?: WeatherRegressionV1;
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

export * from './billIntelligence/typesV1';