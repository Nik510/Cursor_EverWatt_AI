import type { MissingInfoItemV0 } from '../../missingInfo/types';
import type { IntervalElectricIngestReasonCodeV1 } from './reasons';

export type IntervalElectricPointV1 = {
  timestampIso: string;
  intervalMinutes: number;
  kWh?: number;
  kW?: number;
  temperatureF?: number;
};

export type IntervalElectricWarningV1 = {
  code: IntervalElectricIngestReasonCodeV1;
  details?: Record<string, unknown>;
};

export type IntervalElectricMetaV1 = {
  schemaVersion: 'intervalElectricMetaV1';
  parserVersion: 'interval_csv_v1';
  detectedFormat: 'pge_interval_csv_v1' | 'unknown';
  detection: { type: 'interval' | 'usage' | 'unknown'; confidence: number; because: string[] };
  timezoneUsed: string;
  meterKey?: string;
  pointCount: number;
  rowCount?: number;
  inferredIntervalMinutes?: number | null;
  hasTemp?: boolean;
  hasKwColumn?: boolean;
  range?: { startIso?: string; endIso?: string };
  warnings: IntervalElectricWarningV1[];
  missingInfo: MissingInfoItemV0[];
  source?: {
    kind: 'vaultFile';
    vaultFileId: string;
    storageKey?: string;
    filename?: string;
    contentType?: string;
    uploadedAtIso?: string;
  };
  savedAtIso?: string;
};

export type ParseIntervalElectricCsvV1Result =
  | {
      ok: true;
      points: IntervalElectricPointV1[];
      meta: IntervalElectricMetaV1;
    }
  | {
      ok: false;
      points: IntervalElectricPointV1[];
      meta: IntervalElectricMetaV1;
    };

