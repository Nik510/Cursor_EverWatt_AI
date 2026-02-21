export const WeatherRegressionWarningCodesV1 = {
  WEATHER_V1_INSUFFICIENT_OVERLAP_DAYS: 'weather.v1.insufficient_overlap_days',
  WEATHER_V1_MISSING_WEATHER_DAYS: 'weather.v1.missing_weather_days',
  WEATHER_V1_INSUFFICIENT_VARIANCE: 'weather.v1.insufficient_variance',
  WEATHER_V1_OUTLIERS_CLIPPED: 'weather.v1.outliers_clipped',
  WEATHER_V1_TIMEZONE_UNKNOWN: 'weather.v1.timezone_unknown',
} as const;

export type WeatherRegressionWarningCodeV1 =
  (typeof WeatherRegressionWarningCodesV1)[keyof typeof WeatherRegressionWarningCodesV1];

export type WeatherRegressionConfidenceTierV1 = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export type WeatherSeriesDayV1 = {
  dateIso: string; // YYYY-MM-DD
  temperatureF?: number | null;
  hdd?: number | null;
  cdd?: number | null;
};

export type UsageSeriesDayV1 = {
  dateIso: string; // YYYY-MM-DD
  kwh: number;
};

export type WeatherRegressionV1 = {
  schemaVersion: 'weatherRegressionV1';
  modelType: 'HDD_CDD_LINEAR_V1';

  coverageDays: number; // days of usage coverage (kWh present)
  overlapDays: number; // days with both usage + weather

  hddBaseF: number;
  cddBaseF: number;

  intercept: number | null;
  slopeHdd: number | null;
  slopeCdd: number | null;
  r2: number | null;

  confidenceTier: WeatherRegressionConfidenceTierV1;
  warnings: WeatherRegressionWarningCodeV1[]; // sorted reason codes only

  annualization: {
    method: 'annualize_method_v1' | 'unavailable';
    annualKwhEstimate: number | null;
    confidenceTier: WeatherRegressionConfidenceTierV1;
  };
};

