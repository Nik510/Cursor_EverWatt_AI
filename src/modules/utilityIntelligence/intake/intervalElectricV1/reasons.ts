/**
 * Interval intake (electric) reason codes.
 *
 * CRITICAL:
 * - Codes are stable identifiers only (no UI strings).
 * - Use these codes in meta/warnings so UI can map to actions deterministically.
 */
export const IntervalElectricIngestReasonCodesV1 = {
  FILE_MISSING: 'interval.file.missing',
  FILE_UNSUPPORTED_TYPE: 'interval.file.unsupported_type',
  CSV_DETECTED_PGE_INTERVAL: 'interval.csv.detected.pge_interval',
  CSV_DETECTED_LOW_CONFIDENCE: 'interval.csv.detected.low_confidence',
  CSV_UNRECOGNIZED_FORMAT: 'interval.csv.unrecognized_format',
  PGE_CSV_PARSE_NO_HEADERS: 'interval.pge_csv.no_headers',
  PGE_CSV_PARSE_NO_METERS: 'interval.pge_csv.no_meters',
  PGE_CSV_PARSE_NO_POINTS: 'interval.pge_csv.no_points',
  PGE_CSV_PARSED_OK: 'interval.pge_csv.parsed_ok',
  INTERVAL_LARGE_GAPS: 'interval.points.large_gaps',
  INTERVAL_DUPLICATE_TIMESTAMPS: 'interval.points.duplicate_ts',
  INTERVAL_NON_UNIFORM_GRANULARITY: 'interval.points.non_uniform_granularity',
  CSV_BAD_TIMESTAMP: 'interval.csv.bad_timestamp',
  INTERVAL_TOO_MANY_ROWS: 'interval.csv.too_many_rows',
  POINTS_TOO_MANY: 'interval.points.too_many',
} as const;

export type IntervalElectricIngestReasonCodeV1 =
  (typeof IntervalElectricIngestReasonCodesV1)[keyof typeof IntervalElectricIngestReasonCodesV1];

