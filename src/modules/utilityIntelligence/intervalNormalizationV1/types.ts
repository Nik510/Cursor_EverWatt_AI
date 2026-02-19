export type NormalizedIntervalV1 = {
  /** Canonical inferred (or hinted) interval length. */
  granularityMinutes: number | null;
  /**
   * Optional timezone associated with the interval data source.
   * Note: many interval exports are already UTC ISO timestamps; this may be null.
   */
  timezone: string | null;
  /** Canonical kW time series (deterministically sorted). */
  seriesKw: Array<{ tsIso: string; kw: number }>;
  /** Coverage summary derived from canonical series timestamps. */
  coverage: { startIso: string | null; endIso: string | null; days: number | null; points: number };
  /** Deterministically sorted warnings (best-effort). */
  warnings: string[];
};

export type NormalizeIntervalInputsV1Args = {
  /**
   * Preferred canonical interval points when present (kWh/kW/temperature).
   * When provided, these take precedence over any kW series inputs to preserve v1 behavior.
   */
  intervalPointsV1?:
    | Array<{
        timestampIso: string;
        intervalMinutes: number;
        kWh?: number;
        kW?: number;
        temperatureF?: number;
      }>
    | null;

  /** Optional kW series input (timestampIso, kw). */
  intervalKwSeries?: Array<{ timestampIso: string; kw: number }> | null;

  /** Optional file path source (typically from project telemetry). */
  intervalFilePath?: string | null;

  /**
   * Optional hint for granularity when only kW series is available.
   * (E.g. from `inputs.intervalDataRef.resolution` mapping in analyzeUtility.)
   */
  resolutionMinutesHint?: number | null;

  /** Optional timezone hint (best-effort). */
  timezoneHint?: string | null;

  /**
   * Optional allowlisted roots used when reading `intervalFilePath`.
   * If omitted, caller must only pass already-validated paths.
   */
  allowlistedRoots?: string[] | null;
};

