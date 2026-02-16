export const BillIntelligenceWarningCodesV1 = {
  BILL_INTEL_MISSING_TOTAL_KWH: 'BILL_INTEL_MISSING_TOTAL_KWH',
  BILL_INTEL_MISSING_TOTAL_DOLLARS: 'BILL_INTEL_MISSING_TOTAL_DOLLARS',
  BILL_INTEL_MISSING_BILLING_PERIOD_DATES: 'BILL_INTEL_MISSING_BILLING_PERIOD_DATES',
  BILL_INTEL_MISSING_PEAK_KW: 'BILL_INTEL_MISSING_PEAK_KW',
  BILL_INTEL_INTERVAL_DATA_REQUIRED: 'BILL_INTEL_INTERVAL_DATA_REQUIRED',
  BILL_INTEL_INTERVAL_DATA_INSUFFICIENT_POINTS: 'BILL_INTEL_INTERVAL_DATA_INSUFFICIENT_POINTS',
  BILL_INTEL_INTERVAL_DATA_MISSING_KWH: 'BILL_INTEL_INTERVAL_DATA_MISSING_KWH',
  BILL_INTEL_INTERVAL_DATA_MISSING_KW: 'BILL_INTEL_INTERVAL_DATA_MISSING_KW',
  BILL_INTEL_WEATHER_DATA_REQUIRED: 'BILL_INTEL_WEATHER_DATA_REQUIRED',
  BILL_INTEL_WEATHER_DATA_INSUFFICIENT_POINTS: 'BILL_INTEL_WEATHER_DATA_INSUFFICIENT_POINTS',
  BILL_INTEL_WEATHER_DATA_MISSING_OAT: 'BILL_INTEL_WEATHER_DATA_MISSING_OAT',
  BILL_INTEL_BILLING_PERIOD_AMBIGUOUS_DATE_FORMAT: 'BILL_INTEL_BILLING_PERIOD_AMBIGUOUS_DATE_FORMAT',
  BILL_INTEL_BILLING_PERIOD_INVALID_RANGE: 'BILL_INTEL_BILLING_PERIOD_INVALID_RANGE',
  BILL_INTEL_MULTIPLE_DOLLARS_CANDIDATES: 'BILL_INTEL_MULTIPLE_DOLLARS_CANDIDATES',
  BILL_INTEL_MULTIPLE_PEAK_KW_CANDIDATES: 'BILL_INTEL_MULTIPLE_PEAK_KW_CANDIDATES',
  BILL_INTEL_SANITY_OUTLIER: 'BILL_INTEL_SANITY_OUTLIER',
} as const;

export type BillIntelligenceWarningCodeV1 =
  (typeof BillIntelligenceWarningCodesV1)[keyof typeof BillIntelligenceWarningCodesV1];

export type BillIntelligenceEvidence = {
  ruleId: string;
  matchedText: string;
  source: 'bill_pdf';
};

export type BillIntelligenceNumberFact = {
  value: number;
  unit?: string;
  source: 'bill_pdf';
  evidence: BillIntelligenceEvidence;
};

export type BillIntelligenceStringFact = {
  value: string;
  source: 'bill_pdf';
  evidence: BillIntelligenceEvidence;
};

export type BillIntelligenceBillingPeriodFact = {
  startDateIso: string;
  endDateIso: string;
  days?: number;
  source: 'bill_pdf';
  evidence: BillIntelligenceEvidence;
};

export type BillIntelligenceDerivedMetric = {
  value: number;
  unit: string;
  source: 'derived_math';
  confidence: 'derived';
  inputsUsed: string[];
};

export type BillIntelligenceDayOfWeekV1 = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type BillIntelligenceIntervalInsightsV1 = {
  /**
   * True when at least one insight is computed from explicit interval inputs.
   * All metrics are computed deterministically using `timestampIso` interpreted in UTC.
   */
  available: boolean;
  reasons: Array<{ code: BillIntelligenceWarningCodeV1; reason: string }>;

  /** Hour-of-day (0-23 UTC) with highest share of interval kWh (requires explicit kWh). */
  topHourOfDayKwh?: { hourOfDay: number; percentOfTotal: number };
  /** Hour-of-day (0-23 UTC) with highest kW (requires explicit kW, or explicit kWh+intervalMinutes -> derived kW). */
  topHourOfDayKw?: { hourOfDay: number; value: number };

  /** Average total kWh per weekday/weekend day (requires explicit kWh). */
  weekdayAvgKwhPerDay?: number;
  weekendAvgKwhPerDay?: number;
  deltaWeekdayMinusWeekendKwhPerDay?: number;

  /** Average kW per weekday/weekend hour (requires explicit kW, or explicit kWh+intervalMinutes -> derived kW). */
  weekdayAvgKw?: number;
  weekendAvgKw?: number;
  deltaWeekdayMinusWeekendKw?: number;

  /**
   * Approx load factor computed from interval avg kW and explicit peak kW from bill.
   * Only present when explicitPeakKwFromBill is provided and > 0.
   */
  loadFactorApprox?: number;

  /** Peak day-of-week based on daily total kWh (preferred) or daily max kW (fallback). */
  peakDayOfWeek?: BillIntelligenceDayOfWeekV1;
  peakDayOfWeekBasis?: 'kWh' | 'kW';
};

export type WeatherCorrelationSignatureV1 = 'COOLING_DOMINANT' | 'HEATING_DOMINANT' | 'FLAT' | 'MIXED' | 'UNKNOWN';

export type WeatherCorrelationV1 = {
  /** True when correlation metrics are computed from explicit hourly OAT alignment. */
  available: boolean;
  reasons: Array<{ code: BillIntelligenceWarningCodeV1; reason: string }>;

  /** Pearson r for kWh vs OAT (°F). Only present when enough points exist. */
  correlationCoeff_kwh_vs_oat?: number;
  /** Pearson r for kW vs OAT (°F). Only present when enough points exist. */
  correlationCoeff_kw_vs_oat?: number;
  signature: WeatherCorrelationSignatureV1;
};

export type BillIntelligenceV1 = {
  extractedFacts: {
    billingPeriod?: BillIntelligenceBillingPeriodFact;
    totalKwh?: BillIntelligenceNumberFact;
    totalDollars?: BillIntelligenceNumberFact;
    peakKw?: BillIntelligenceNumberFact;
    rateScheduleText?: BillIntelligenceStringFact;
    utilityHint?: BillIntelligenceStringFact;
  };
  derivedMetrics: {
    blendedRate?: BillIntelligenceDerivedMetric;
    avgDailyKwh?: BillIntelligenceDerivedMetric;
    avgKw?: BillIntelligenceDerivedMetric;
    demandFactorApprox?: BillIntelligenceDerivedMetric;
  };
  intervalInsightsV1?: BillIntelligenceIntervalInsightsV1;
  weatherCorrelationV1?: WeatherCorrelationV1;
  warnings: Array<{ code: BillIntelligenceWarningCodeV1; reason: string }>;
};

