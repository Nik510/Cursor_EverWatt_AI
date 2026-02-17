export const IntervalIntelligenceWarningCodesV1 = {
  INTERVAL_INTEL_INTERVAL_DATA_REQUIRED: 'interval.intel.interval_data_required',
  INTERVAL_INTEL_INSUFFICIENT_POINTS: 'interval.intel.insufficient_points',
  INTERVAL_INTEL_INSUFFICIENT_DAYS: 'interval.intel.insufficient_days',
  INTERVAL_INTEL_MISSING_KWH: 'interval.intel.missing_kwh',
  INTERVAL_INTEL_MISSING_INTERVAL_MINUTES: 'interval.intel.missing_interval_minutes',
} as const;

export type IntervalIntelligenceWarningCodeV1 =
  (typeof IntervalIntelligenceWarningCodesV1)[keyof typeof IntervalIntelligenceWarningCodesV1];

export type IntervalIntelligenceV1PeakEvent = {
  timestampIso: string;
  kw: number;
};

export type IntervalIntelligenceV1DailyProfileBucket = {
  bucketStartHourLocal: number; // inclusive
  bucketEndHourLocalExclusive: number; // exclusive
  avgKw: number;
};

export type IntervalIntelligenceV1 = {
  schemaVersion: 'intervalIntelligenceV1';
  available: boolean;
  timezoneUsed: string;

  coverageDays: number;
  granularityMinutes: number | null;
  pointsReturnedCount: number;

  totalKwh: number | null;
  avgDailyKwh: number | null;
  avgKw: number | null;

  baseloadKw: number | null;
  baseloadMethod: 'p10_night_v1' | 'min_bucket_v1' | 'unavailable';
  baseloadConfidence: 'high' | 'medium' | 'low';

  peakKw: number | null;
  peakTimestampIso: string | null;

  weekdayAvgKw: number | null;
  weekendAvgKw: number | null;
  weekdayWeekendDeltaPct: number | null;

  dailyProfileBuckets: IntervalIntelligenceV1DailyProfileBucket[];
  dailyProfileBucketsMethod: 'avg_kw_by_4h_bucket_v1';

  topPeakEvents: IntervalIntelligenceV1PeakEvent[];
  topPeakEventsMethod: 'top_kw_points_v1';

  warnings: string[]; // sorted, stable codes only
};

