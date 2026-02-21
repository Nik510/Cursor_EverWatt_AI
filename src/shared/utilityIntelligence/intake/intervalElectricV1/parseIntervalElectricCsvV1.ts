import { detectPgeCsvTypeV1 } from '../../../determinants/adapters/pge/detectPgeCsvType';
import { parsePgeIntervalCsvV1 } from '../../../determinants/adapters/pge/parsePgeIntervalCsv';
import { IntervalElectricIngestReasonCodesV1 } from './reasons';
import type { IntervalElectricMetaV1, IntervalElectricPointV1, ParseIntervalElectricCsvV1Result } from './types';
import { intervalIntakeVersion } from '../../../engineVersions';

export const MAX_INTERVAL_ROWS = 40_000;

function uniqWarnings(w: IntervalElectricMetaV1['warnings']): IntervalElectricMetaV1['warnings'] {
  const out: IntervalElectricMetaV1['warnings'] = [];
  const seen = new Set<string>();
  for (const w0 of Array.isArray(w) ? w : []) {
    const code = String((w0 as any)?.code || '').trim();
    if (!code) continue;
    const k = `${code}|${JSON.stringify((w0 as any)?.details || {})}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ code: w0.code, ...(w0.details ? { details: w0.details } : {}) });
  }
  return out;
}

function sortIsoAsc(a: string, b: string): number {
  return String(a).localeCompare(String(b));
}

function deriveRange(points: IntervalElectricPointV1[]): { startIso?: string; endIso?: string } {
  const ts = points.map((p) => String(p.timestampIso || '').trim()).filter(Boolean).sort(sortIsoAsc);
  if (!ts.length) return {};
  return { startIso: ts[0], endIso: ts[ts.length - 1] };
}

function dedupeByTimestampKeepFirst(points: IntervalElectricPointV1[]): {
  points: IntervalElectricPointV1[];
  droppedCount: number;
  sample: string[];
} {
  const out: IntervalElectricPointV1[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  const sample: string[] = [];
  for (const p of points) {
    const ts = String(p.timestampIso || '').trim();
    if (!ts) continue;
    const k = ts;
    if (seen.has(k)) {
      dropped++;
      if (sample.length < 5) sample.push(ts);
      continue;
    }
    seen.add(k);
    out.push(p);
  }
  return { points: out, droppedCount: dropped, sample };
}

function detectLargeGaps(args: {
  timestampIsos: string[];
  intervalMinutes: number;
  minMissingIntervals: number;
}): { gapsCount: number; largestGapMinutes: number; missingIntervalsTotal: number } {
  const intervalMinutes = Number(args.intervalMinutes);
  const minMissingIntervals = Number(args.minMissingIntervals);
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) return { gapsCount: 0, largestGapMinutes: 0, missingIntervalsTotal: 0 };
  if (!Number.isFinite(minMissingIntervals) || minMissingIntervals <= 0) return { gapsCount: 0, largestGapMinutes: 0, missingIntervalsTotal: 0 };

  const ts = (Array.isArray(args.timestampIsos) ? args.timestampIsos : []).map((s) => String(s || '').trim()).filter(Boolean).sort(sortIsoAsc);
  if (ts.length < 2) return { gapsCount: 0, largestGapMinutes: 0, missingIntervalsTotal: 0 };

  let gapsCount = 0;
  let largestGapMinutes = 0;
  let missingIntervalsTotal = 0;

  for (let i = 1; i < ts.length; i++) {
    const a = Date.parse(ts[i - 1]);
    const b = Date.parse(ts[i]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const deltaMinutes = Math.round((b - a) / 60_000);
    if (!Number.isFinite(deltaMinutes)) continue;
    const missingIntervals = Math.round(deltaMinutes / intervalMinutes) - 1;
    if (missingIntervals >= minMissingIntervals) {
      gapsCount += 1;
      missingIntervalsTotal += missingIntervals;
      largestGapMinutes = Math.max(largestGapMinutes, deltaMinutes - intervalMinutes);
    }
  }

  return { gapsCount, largestGapMinutes, missingIntervalsTotal };
}

export function parseIntervalElectricCsvV1(args: {
  csvText: string;
  filename?: string;
  timezoneHint?: string;
  maxPoints?: number;
}): ParseIntervalElectricCsvV1Result {
  const csvText = String(args.csvText || '');
  const tz = String(args.timezoneHint || 'America/Los_Angeles').trim() || 'America/Los_Angeles';
  const maxPoints = Number.isFinite(Number(args.maxPoints)) ? Number(args.maxPoints) : 200_000;

  const detection = detectPgeCsvTypeV1(csvText);
  const baseMeta: IntervalElectricMetaV1 = {
    schemaVersion: 'intervalElectricMetaV1',
    parserVersion: intervalIntakeVersion,
    detectedFormat: 'unknown',
    detection,
    timezoneUsed: tz,
    pointCount: 0,
    warnings: [],
    missingInfo: [],
  };

  const warnings: IntervalElectricMetaV1['warnings'] = [];
  if (detection.type === 'interval' && detection.confidence >= 0.6) {
    warnings.push({
      code: IntervalElectricIngestReasonCodesV1.CSV_DETECTED_PGE_INTERVAL,
      details: { confidence: detection.confidence, because: detection.because },
    });
  } else if (detection.type !== 'unknown') {
    warnings.push({
      code: IntervalElectricIngestReasonCodesV1.CSV_DETECTED_LOW_CONFIDENCE,
      details: { type: detection.type, confidence: detection.confidence, because: detection.because },
    });
  } else {
    warnings.push({
      code: IntervalElectricIngestReasonCodesV1.CSV_UNRECOGNIZED_FORMAT,
      details: { confidence: detection.confidence, because: detection.because },
    });
  }

  if (!(detection.type === 'interval' && detection.confidence >= 0.6)) {
    const meta: IntervalElectricMetaV1 = {
      ...baseMeta,
      warnings: uniqWarnings(warnings),
    };
    return { ok: false, points: [], meta };
  }

  const parsed = parsePgeIntervalCsvV1({ csvTextOrBuffer: csvText, timezoneHint: tz });
  const meters = (Array.isArray(parsed.meters) ? parsed.meters : []).slice().sort((a, b) => String(a.meterKey).localeCompare(String(b.meterKey)));

  if (!meters.length) {
    const meta: IntervalElectricMetaV1 = {
      ...baseMeta,
      detectedFormat: 'pge_interval_csv_v1',
      warnings: uniqWarnings([
        ...warnings,
        { code: IntervalElectricIngestReasonCodesV1.PGE_CSV_PARSE_NO_METERS, details: { parserWarnings: parsed.warnings || [] } },
      ]),
    };
    return { ok: false, points: [], meta };
  }

  const m0 = meters[0];
  const originalRowCount =
    Number(m0.sourceMeta?.rowCount) || (Array.isArray(m0.intervals) ? (m0.intervals as any[]).length : 0) || 0;
  const limit = Math.max(0, Math.min(originalRowCount, MAX_INTERVAL_ROWS, maxPoints));

  const limitedIntervals = (Array.isArray(m0.intervals) ? m0.intervals : []).slice(0, limit);
  const points: IntervalElectricPointV1[] = limitedIntervals.map((p: any) => {
    const ts = String(p?.timestampIso || '').trim();
    const intervalMinutes = Number(p?.intervalMinutes);
    const out: IntervalElectricPointV1 = { timestampIso: ts, intervalMinutes };
    if (Number.isFinite(Number(p?.kWh))) out.kWh = Number(p.kWh);
    if (Number.isFinite(Number(p?.kW))) out.kW = Number(p.kW);
    if (Number.isFinite(Number(p?.temperatureF))) out.temperatureF = Number(p.temperatureF);
    return out;
  });

  const upstreamBadTs = Array.isArray(m0.missingInfo) ? (m0.missingInfo as any[]).filter((it) => String(it?.id || '') === 'pge.interval.timestamp.unparseable') : [];
  if (upstreamBadTs.length) {
    const first = upstreamBadTs[0] || {};
    const meta: IntervalElectricMetaV1 = {
      ...baseMeta,
      detectedFormat: 'pge_interval_csv_v1',
      meterKey: String(m0.meterKey || '').trim() || undefined,
      pointCount: 0,
      rowCount: originalRowCount || undefined,
      inferredIntervalMinutes: (m0.sourceMeta?.inferredIntervalMinutes as any) ?? null,
      hasTemp: Boolean(m0.sourceMeta?.hasTemp),
      hasKwColumn: Boolean(m0.sourceMeta?.hasKwColumn),
      warnings: uniqWarnings([
        ...warnings,
        {
          code: IntervalElectricIngestReasonCodesV1.CSV_BAD_TIMESTAMP,
          details: {
            badRowsCount: upstreamBadTs.length,
            rowIndex: (first as any)?.details?.rowIndex,
            startRaw: (first as any)?.details?.startRaw,
            endRaw: (first as any)?.details?.endRaw,
          },
        },
      ]),
      missingInfo: Array.isArray(m0.missingInfo) ? m0.missingInfo : [],
    };
    return { ok: false, points: [], meta };
  }

  const deduped = dedupeByTimestampKeepFirst(points);
  const pointsDeduped = deduped.points;
  if (deduped.droppedCount > 0) {
    warnings.push({
      code: IntervalElectricIngestReasonCodesV1.INTERVAL_DUPLICATE_TIMESTAMPS,
      details: { droppedCount: deduped.droppedCount, keptCount: pointsDeduped.length, sample: deduped.sample, policy: 'keep_first' },
    });
  }

  const distinctMins = Array.from(
    new Set(pointsDeduped.map((p) => Number(p.intervalMinutes)).filter((n) => Number.isFinite(n) && n > 0).map((n) => Math.round(n))),
  ).sort((a, b) => a - b);
  if (distinctMins.length > 1) {
    warnings.push({
      code: IntervalElectricIngestReasonCodesV1.INTERVAL_NON_UNIFORM_GRANULARITY,
      details: { distinctIntervalMinutes: distinctMins, sampleCount: pointsDeduped.length },
    });
  }

  const inferredIntervalMinutes = Number(m0.sourceMeta?.inferredIntervalMinutes) || (pointsDeduped[0]?.intervalMinutes ?? null);
  const gapInfo =
    Number.isFinite(inferredIntervalMinutes) && Number(inferredIntervalMinutes) > 0
      ? detectLargeGaps({
          timestampIsos: pointsDeduped.map((p) => String(p.timestampIso || '')),
          intervalMinutes: Number(inferredIntervalMinutes),
          minMissingIntervals: 4,
        })
      : null;
  const gapWarning = gapInfo && gapInfo.gapsCount > 0 ? [{ code: IntervalElectricIngestReasonCodesV1.INTERVAL_LARGE_GAPS, details: gapInfo }] : [];

  const sizeWarnings: IntervalElectricMetaV1['warnings'] = [];
  if (originalRowCount > MAX_INTERVAL_ROWS) {
    sizeWarnings.push({
      code: IntervalElectricIngestReasonCodesV1.INTERVAL_TOO_MANY_ROWS,
      details: { maxRows: MAX_INTERVAL_ROWS, rowCount: originalRowCount, returnedRows: points.length },
    });
  }
  if (originalRowCount > maxPoints) {
    sizeWarnings.push({
      code: IntervalElectricIngestReasonCodesV1.POINTS_TOO_MANY,
      details: { maxPoints, originalPoints: originalRowCount },
    });
  }

  const meta: IntervalElectricMetaV1 = {
    ...baseMeta,
    detectedFormat: 'pge_interval_csv_v1',
    meterKey: String(m0.meterKey || '').trim() || undefined,
    pointCount: pointsDeduped.length,
    rowCount: originalRowCount || undefined,
    inferredIntervalMinutes: (m0.sourceMeta?.inferredIntervalMinutes as any) ?? null,
    hasTemp: Boolean(m0.sourceMeta?.hasTemp),
    hasKwColumn: Boolean(m0.sourceMeta?.hasKwColumn),
    range: deriveRange(pointsDeduped),
    warnings: uniqWarnings([...warnings, ...gapWarning, ...sizeWarnings, { code: IntervalElectricIngestReasonCodesV1.PGE_CSV_PARSED_OK }]),
    missingInfo: Array.isArray(m0.missingInfo) ? m0.missingInfo : [],
  };

  if (!pointsDeduped.length) {
    meta.warnings = uniqWarnings([...meta.warnings, { code: IntervalElectricIngestReasonCodesV1.PGE_CSV_PARSE_NO_POINTS }]);
    return { ok: false, points: [], meta };
  }

  return { ok: true, points: pointsDeduped, meta };
}

