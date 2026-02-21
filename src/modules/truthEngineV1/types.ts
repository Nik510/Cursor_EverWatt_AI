export type TruthSnapshotV1 = {
  schemaVersion: 'truthSnapshotV1';
  generatedAtIso: string;
  coverage: {
    hasInterval: boolean;
    intervalDays: number | null;
    granularityMinutes: number | null;
    hasWeatherDaily: boolean;
    weatherDays: number | null;
    hasBillText: boolean;
  };
  baselineModelV1: {
    modelKind:
      | 'INTERVAL_WEATHER_HOURLY_REGRESSION_V1'
      | 'INTERVAL_PROFILE_SEASONAL_V1'
      | 'BILLS_MONTHLY_V1'
      | 'NONE';
    params: Record<string, unknown>;
    fitQuality: { r2?: number; tier: 'A' | 'B' | 'C' };
    notes: string[];
  };
  expectedSeriesSummaryV1: {
    kind: 'HOURLY_PROFILE' | 'MONTHLY_KWH' | 'NONE';
    timezoneUsed: string;
    sampleCount: number;
    /** Mean expected kW by hour (0..23) when interval-derived. */
    expectedKwByHour?: number[];
    /** Optional: weekday/weekend split profiles. */
    expectedKwByHourWeekday?: number[];
    expectedKwByHourWeekend?: number[];
    /** Bounded monthly expectations when bill-derived. */
    expectedMonthlyKwh?: Array<{ startIso: string; endIso: string; expectedKwh: number }>;
    notes: string[];
  };
  residualMapsV1: {
    /** Mean residual kW by [dow][hour], 7x24. 0=Sun..6=Sat. */
    hourlyResidualByDow: number[][];
    peakResidualHours: Array<{ dow: number; hour: number; meanResidualKw: number; sampleCount: number }>;
  };
  changepointsV1: Array<{
    atIso: string;
    type: 'BASELOAD_SHIFT' | 'PEAK_SHIFT' | 'SCHEDULE_SHIFT' | 'WEATHER_SENS_SHIFT';
    magnitude: number;
    confidence: number;
    notes: string[];
  }>;
  anomalyLedgerV1: Array<{
    id: string;
    window: { startIso: string; endIso: string };
    class: 'SPIKE' | 'DROP' | 'DRIFT' | 'VOLATILITY' | 'SCHEDULE';
    magnitudeKwhOrKw: number;
    confidence: number;
    likelyDrivers: string[];
    requiredNextData: string[];
  }>;
  truthWarnings: string[];
  truthConfidence: { tier: 'A' | 'B' | 'C'; reasons: string[] };
};

