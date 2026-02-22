import type { VerifierCheckResultV1 } from '../types';

function safeString(x: unknown, max = 220): string {
  const s = String(x ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, Math.max(0, max - 12)) + '…(truncated)' : s;
}

function numOrNull(x: unknown): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function hasWarningCode(meta: any, code: string): boolean {
  const ws: any[] = Array.isArray(meta?.warnings) ? meta.warnings : [];
  return ws.some((w) => safeString(w?.code, 160) === code);
}

export function checkIntervalSanityV1(args: { reportJson: any }): VerifierCheckResultV1[] {
  const reportJson = args.reportJson && typeof args.reportJson === 'object' ? args.reportJson : {};
  const meta: any = reportJson?.telemetry?.intervalElectricMetaV1 ?? null;
  const trace: any = reportJson?.analysisTraceV1 ?? null;
  const coverage: any = trace?.coverage ?? null;

  if (!meta || typeof meta !== 'object') return [];

  const pointCount = numOrNull(meta?.pointCount);
  const inferredIntervalMinutes = numOrNull(meta?.inferredIntervalMinutes);
  const startIso = safeString(meta?.range?.startIso);
  const endIso = safeString(meta?.range?.endIso);
  const intervalDays = numOrNull(coverage?.intervalDays);

  const failures: string[] = [];
  if (pointCount !== null && pointCount < 0) failures.push('pointCount<0');
  if (inferredIntervalMinutes !== null && inferredIntervalMinutes <= 0) failures.push('inferredIntervalMinutes<=0');

  const startMs = startIso ? Date.parse(startIso) : NaN;
  const endMs = endIso ? Date.parse(endIso) : NaN;
  if (startIso && !Number.isFinite(startMs)) failures.push('range.startIso_unparseable');
  if (endIso && !Number.isFinite(endMs)) failures.push('range.endIso_unparseable');
  if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs < startMs) failures.push('range.end_before_start');

  if (intervalDays !== null && intervalDays < 0) failures.push('coverage.intervalDays<0');

  // Hard invalid signals from intake.
  if (hasWarningCode(meta, 'interval.csv.bad_timestamp')) failures.push('warning:interval.csv.bad_timestamp');
  if (hasWarningCode(meta, 'interval.pge_csv.no_points')) failures.push('warning:interval.pge_csv.no_points');

  // Coverage consistency (fail only on severe mismatch to avoid false positives with gaps/truncation).
  if (pointCount !== null && pointCount > 0 && inferredIntervalMinutes !== null && inferredIntervalMinutes > 0 && intervalDays !== null) {
    const expectedDays = (pointCount * inferredIntervalMinutes) / 1440;
    const diff = Math.abs(intervalDays - expectedDays);
    if (Number.isFinite(expectedDays) && expectedDays > 0 && diff > Math.max(30, expectedDays * 0.35)) {
      failures.push('coverage.intervalDays_severely_inconsistent');
    }
  }

  if (failures.length) {
    failures.sort((a, b) => a.localeCompare(b));
    return [
      {
        code: 'verifier.interval.invalid_values',
        status: 'FAIL',
        message: 'Interval meta/coverage appear invalid or inconsistent.',
        details: {
          failures,
          pointCount,
          inferredIntervalMinutes,
          range: meta?.range ?? null,
          coverage: { intervalDays },
          warningsSample: (Array.isArray(meta?.warnings) ? meta.warnings : []).slice(0, 8),
        },
        paths: ['reportJson.telemetry.intervalElectricMetaV1', 'reportJson.analysisTraceV1.coverage'],
      },
    ];
  }

  return [
    {
      code: 'verifier.interval.invalid_values',
      status: 'PASS',
      message: 'Interval meta/coverage basic sanity checks passed.',
      details: { pointCount, inferredIntervalMinutes, range: meta?.range ?? null, coverage: { intervalDays } },
      paths: ['reportJson.telemetry.intervalElectricMetaV1', 'reportJson.analysisTraceV1.coverage'],
    },
  ];
}

