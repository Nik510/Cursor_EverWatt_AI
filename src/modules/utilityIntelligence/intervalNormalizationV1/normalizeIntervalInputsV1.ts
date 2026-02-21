import type { NormalizeIntervalInputsV1Args, NormalizedIntervalV1 } from './types';

const MS_PER_DAY = 86_400_000;

function safeString(x: unknown): string {
  return String(x ?? '').trim();
}

function safeNumber(x: unknown): number {
  return Number(x);
}

function parseIsoMs(s: unknown): number | null {
  const t = safeString(s);
  if (!t) return null;
  const ms = Date.parse(t);
  return Number.isFinite(ms) ? ms : null;
}

function computeIntervalDaysFromTimestamps(timestampsIso: string[]): number | null {
  let minMs: number | null = null;
  let maxMs: number | null = null;
  for (const ts of timestampsIso) {
    const ms = parseIsoMs(ts);
    if (ms === null) continue;
    if (minMs === null || ms < minMs) minMs = ms;
    if (maxMs === null || ms > maxMs) maxMs = ms;
  }
  if (minMs === null || maxMs === null) return null;
  if (maxMs < minMs) return null;
  const days = (maxMs - minMs) / MS_PER_DAY;
  // keep bounded precision to avoid float noise
  return Math.round(days * 1000) / 1000;
}

function mostCommonIntervalMinutes(points: Array<{ intervalMinutes: number }>): number | null {
  const counts = new Map<number, number>();
  let best: { mins: number; count: number } | null = null;
  for (const p of points.slice(0, 500)) {
    const m = Number((p as any)?.intervalMinutes);
    if (!Number.isFinite(m) || m <= 0) continue;
    const next = (counts.get(m) || 0) + 1;
    counts.set(m, next);
    if (!best || next > best.count || (next === best.count && m < best.mins)) best = { mins: m, count: next };
  }
  return best ? best.mins : null;
}

function stableSortByTsIsoAsc<T extends { tsIso: string }>(rows: T[]): T[] {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.tsIso.localeCompare(b.r.tsIso) || a.i - b.i)
    .map((x) => x.r);
}

export function normalizeIntervalInputsV1(args: NormalizeIntervalInputsV1Args): NormalizedIntervalV1 | null {
  const warningsRaw: string[] = [];

  const tz = safeString(args.timezoneHint) || null;

  // v1 precedence: canonical interval points win over any kW series.
  const pts = Array.isArray(args.intervalPointsV1) && args.intervalPointsV1.length ? (args.intervalPointsV1 as any[]) : null;
  if (pts && pts.length) {
    const seriesKwRaw = pts
      .map((p) => {
        const tsIso = safeString((p as any)?.timestampIso);
        const mins = safeNumber((p as any)?.intervalMinutes);
        const kW = safeNumber((p as any)?.kW);
        const kWh = safeNumber((p as any)?.kWh);
        const derived = !Number.isFinite(kW) && Number.isFinite(kWh) && Number.isFinite(mins) && mins > 0 ? kWh * (60 / mins) : NaN;
        const kw = Number.isFinite(kW) ? kW : derived;
        return { tsIso, kw };
      })
      .filter((p) => p.tsIso && Number.isFinite((p as any).kw));

    const seriesKw = stableSortByTsIsoAsc(seriesKwRaw);
    const granularityMinutes = mostCommonIntervalMinutes(pts as any);
    const startIso = seriesKw.length ? seriesKw[0].tsIso : null;
    const endIso = seriesKw.length ? seriesKw[seriesKw.length - 1].tsIso : null;
    const days = seriesKw.length ? computeIntervalDaysFromTimestamps(seriesKw.map((p) => p.tsIso)) : null;

    return {
      granularityMinutes: granularityMinutes !== null ? granularityMinutes : null,
      timezone: tz,
      seriesKw,
      coverage: { startIso, endIso, days, points: seriesKw.length },
      warnings: warningsRaw
        .map((w) => safeString(w))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    };
  }

  // Otherwise use explicit interval kW series when present.
  const kwSeries = Array.isArray(args.intervalKwSeries) && args.intervalKwSeries.length ? (args.intervalKwSeries as any[]) : null;
  const fromKwSeries = (series: any[]): Array<{ tsIso: string; kw: number }> =>
    series
      .map((r) => ({ tsIso: safeString((r as any)?.timestampIso || (r as any)?.timestamp), kw: safeNumber((r as any)?.kw) }))
      .filter((r) => r.tsIso && Number.isFinite((r as any).kw));

  let seriesKwRaw: Array<{ tsIso: string; kw: number }> | null = null;
  if (kwSeries && kwSeries.length) {
    seriesKwRaw = fromKwSeries(kwSeries);
  } else {
    // Browser build intentionally does not support filesystem reads (intervalFilePath).
    // Node workflows should import `normalizeIntervalInputsV1` from `normalizeIntervalInputsV1.node.ts`.
    if (safeString(args.intervalFilePath)) warningsRaw.push('UIE_INTERVAL_FILE_PATH_UNSUPPORTED_IN_BROWSER');
  }

  if (!seriesKwRaw || !seriesKwRaw.length) return null;

  const seriesKw = stableSortByTsIsoAsc(seriesKwRaw);
  const startIso = seriesKw.length ? seriesKw[0].tsIso : null;
  const endIso = seriesKw.length ? seriesKw[seriesKw.length - 1].tsIso : null;
  const days = seriesKw.length ? computeIntervalDaysFromTimestamps(seriesKw.map((p) => p.tsIso)) : null;
  const granularityMinutes =
    Number.isFinite(Number(args.resolutionMinutesHint)) && Number(args.resolutionMinutesHint) > 0 ? Math.round(Number(args.resolutionMinutesHint)) : null;

  return {
    granularityMinutes,
    timezone: tz,
    seriesKw,
    coverage: { startIso, endIso, days, points: seriesKw.length },
    warnings: warningsRaw
      .map((w) => safeString(w))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b)),
  };
}

