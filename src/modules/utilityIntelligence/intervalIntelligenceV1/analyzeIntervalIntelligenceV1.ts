import { getZonedParts } from '../../billingEngineV1/time/zonedTime';
import { IntervalElectricIngestReasonCodesV1 } from '../intake/intervalElectricV1/reasons';
import type { IntervalElectricMetaV1, IntervalElectricPointV1 } from '../intake/intervalElectricV1/types';
import {
  IntervalIntelligenceWarningCodesV1,
  type IntervalIntelligenceV1,
  type IntervalIntelligenceV1DailyProfileBucket,
  type IntervalIntelligenceV1PeakEvent,
} from './types';

function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return NaN;
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

function uniqSorted(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr) {
    const s = String(v || '').trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function quantileDeterministic(sortedAsc: number[], p: number): number | null {
  const xs = sortedAsc.filter((n) => Number.isFinite(n));
  if (!xs.length) return null;
  const pp = Math.max(0, Math.min(1, p));
  const idx = Math.floor(pp * (xs.length - 1));
  return xs[Math.max(0, Math.min(xs.length - 1, idx))];
}

function localDateKey(d: Date, tz: string): string | null {
  const parts = getZonedParts(d, tz);
  if (!parts) return null;
  const y = String(parts.year).padStart(4, '0');
  const m = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isWeekendLocal(d: Date, tz: string): boolean | null {
  const parts = getZonedParts(d, tz);
  if (!parts) return null;
  return parts.weekday === 0 || parts.weekday === 6;
}

function hourLocal(d: Date, tz: string): number | null {
  const parts = getZonedParts(d, tz);
  if (!parts) return null;
  return parts.hour;
}

function fourHourBucketStart(hour: number): number {
  return Math.max(0, Math.min(23, Math.floor(hour / 4) * 4));
}

function deriveKw(args: { kwh: number | null; kwExplicit: number | null; intervalMinutes: number | null }): number | null {
  // IMPORTANT: treat null/undefined as missing (do not coerce null -> 0).
  if (args.kwExplicit !== null && Number.isFinite(Number(args.kwExplicit))) return Number(args.kwExplicit);
  if (Number.isFinite(Number(args.kwh)) && Number.isFinite(Number(args.intervalMinutes)) && Number(args.intervalMinutes) > 0) {
    return Number(args.kwh) * (60 / Number(args.intervalMinutes));
  }
  return null;
}

export function analyzeIntervalIntelligenceV1(args: {
  points: IntervalElectricPointV1[] | null | undefined;
  meta?: IntervalElectricMetaV1 | null;
  timezoneHint?: string;
  topPeakEventsCount?: number;
}): { intervalIntelligenceV1: IntervalIntelligenceV1 } {
  const raw = Array.isArray(args.points) ? args.points : [];
  const tz =
    String((args.meta as any)?.timezoneUsed || args.timezoneHint || 'America/Los_Angeles').trim() || 'America/Los_Angeles';
  const topN = Number.isFinite(Number(args.topPeakEventsCount)) ? Math.max(1, Math.min(10, Number(args.topPeakEventsCount))) : 7;

  const baseWarnings: string[] = [];

  if (!raw.length) {
    baseWarnings.push(IntervalIntelligenceWarningCodesV1.INTERVAL_INTEL_INTERVAL_DATA_REQUIRED);
    return {
      intervalIntelligenceV1: {
        schemaVersion: 'intervalIntelligenceV1',
        available: false,
        timezoneUsed: tz,
        coverageDays: 0,
        granularityMinutes: null,
        pointsReturnedCount: 0,
        totalKwh: null,
        avgDailyKwh: null,
        avgKw: null,
        baseloadKw: null,
        baseloadMethod: 'unavailable',
        baseloadConfidence: 'low',
        peakKw: null,
        peakTimestampIso: null,
        weekdayAvgKw: null,
        weekendAvgKw: null,
        weekdayWeekendDeltaPct: null,
        dailyProfileBuckets: [],
        dailyProfileBucketsMethod: 'avg_kw_by_4h_bucket_v1',
        topPeakEvents: [],
        topPeakEventsMethod: 'top_kw_points_v1',
        warnings: uniqSorted(baseWarnings),
      },
    };
  }

  // Start with intake warnings when meta is available (filter out purely informational codes).
  if (args.meta && Array.isArray((args.meta as any).warnings)) {
    for (const w of (args.meta as any).warnings as any[]) {
      const code = String(w?.code || '').trim();
      if (!code) continue;
      if (code === IntervalElectricIngestReasonCodesV1.PGE_CSV_PARSED_OK) continue;
      if (code.startsWith('interval.csv.detected.')) continue;
      baseWarnings.push(code);
    }
  }

  // Normalize + validate points.
  const pts = raw
    .map((p) => {
      const ts = String((p as any)?.timestampIso || '').trim();
      const ms = ts ? Date.parse(ts) : NaN;
      const d = Number.isFinite(ms) ? new Date(ms) : null;
      const intervalMinutes = Number((p as any)?.intervalMinutes);
      const mins = Number.isFinite(intervalMinutes) && intervalMinutes > 0 ? intervalMinutes : null;
      const kwh0 = Number((p as any)?.kWh);
      const kwh = Number.isFinite(kwh0) ? kwh0 : null;
      const kw0 = Number((p as any)?.kW);
      const kwExplicit = Number.isFinite(kw0) ? kw0 : null;
      const kw = deriveKw({ kwh, kwExplicit, intervalMinutes: mins });
      return {
        ts,
        date: d,
        mins,
        kwh,
        kw,
        localDateKey: d ? localDateKey(d, tz) : null,
        localHour: d ? hourLocal(d, tz) : null,
        weekend: d ? isWeekendLocal(d, tz) : null,
      };
    })
    .filter((p) => p.date && p.localDateKey && p.localHour !== null);

  const pointsReturnedCount = pts.length;
  if (!pointsReturnedCount) {
    baseWarnings.push(IntervalIntelligenceWarningCodesV1.INTERVAL_INTEL_INSUFFICIENT_POINTS);
  }

  const dateKeys = new Set<string>();
  for (const p of pts) dateKeys.add(String(p.localDateKey));
  const coverageDays = dateKeys.size;

  const granularityMinutes: number | null = (() => {
    const m = Number((args.meta as any)?.inferredIntervalMinutes);
    if (Number.isFinite(m) && m > 0) return Math.round(m);
    const distinct = Array.from(new Set(pts.map((p) => p.mins).filter((n): n is number => Number.isFinite(Number(n)) && Number(n) > 0).map((n) => Math.round(n)))).sort(
      (a, b) => a - b,
    );
    if (!distinct.length) return null;
    if (distinct.length === 1) return distinct[0];
    // Non-uniform: choose smallest as canonical granularity.
    return distinct[0];
  })();

  const sumHours = pts.reduce((a, p) => a + (p.mins ? p.mins / 60 : 0), 0);
  const totalKwh = pts.reduce((a, p) => a + (p.kwh !== null ? p.kwh : 0), 0);
  const hasAnyKwh = pts.some((p) => p.kwh !== null);
  if (!hasAnyKwh) baseWarnings.push(IntervalIntelligenceWarningCodesV1.INTERVAL_INTEL_MISSING_KWH);
  if (!granularityMinutes) baseWarnings.push(IntervalIntelligenceWarningCodesV1.INTERVAL_INTEL_MISSING_INTERVAL_MINUTES);
  if (coverageDays < 2) baseWarnings.push(IntervalIntelligenceWarningCodesV1.INTERVAL_INTEL_INSUFFICIENT_DAYS);

  const avgDailyKwh = coverageDays > 0 && hasAnyKwh ? totalKwh / coverageDays : null;
  const avgKw = sumHours > 0 && hasAnyKwh ? totalKwh / sumHours : null;

  // Daily profile buckets (4-hour buckets, local).
  const buckets = new Map<number, { kwh: number; hours: number }>();
  for (const p of pts) {
    const hr = Number(p.localHour);
    const start = fourHourBucketStart(hr);
    const ex = buckets.get(start) || { kwh: 0, hours: 0 };
    const hours = p.mins ? p.mins / 60 : 0;
    const kwh = p.kwh !== null ? p.kwh : (Number.isFinite(Number(p.kw)) ? Number(p.kw) * hours : 0);
    ex.kwh += kwh;
    ex.hours += hours;
    buckets.set(start, ex);
  }
  const dailyProfileBuckets: IntervalIntelligenceV1DailyProfileBucket[] = [0, 4, 8, 12, 16, 20].map((start) => {
    const ex = buckets.get(start) || { kwh: 0, hours: 0 };
    const avg = ex.hours > 0 ? ex.kwh / ex.hours : 0;
    return { bucketStartHourLocal: start, bucketEndHourLocalExclusive: start + 4, avgKw: roundTo(avg, 3) };
  });

  // Baseload: prefer p10 over night hours (00:00–05:59 local). Fallback: min 4-hour bucket avg.
  const nightKw = pts
    .filter((p) => Number(p.localHour) >= 0 && Number(p.localHour) <= 5 && Number.isFinite(Number(p.kw)))
    .map((p) => Number(p.kw))
    .sort((a, b) => a - b);
  const p10Night = nightKw.length ? quantileDeterministic(nightKw, 0.1) : null;
  const baseloadFallback = (() => {
    // Only consider buckets that actually have hours; ignore missing buckets (which render as 0 for determinism).
    const present: number[] = [];
    for (const start of [0, 4, 8, 12, 16, 20]) {
      const ex = buckets.get(start);
      if (ex && ex.hours > 0) present.push(ex.kwh / ex.hours);
    }
    if (!present.length) return 0;
    return Math.min(...present);
  })();
  const baseload = p10Night !== null ? p10Night : baseloadFallback;
  const baseloadMethod = p10Night !== null ? 'p10_night_v1' : 'min_bucket_v1';
  const baseloadKw = Number.isFinite(Number(baseload)) ? Number(baseload) : null;

  const baseloadConfidence: IntervalIntelligenceV1['baseloadConfidence'] = (() => {
    if (coverageDays >= 7 && pointsReturnedCount >= 7 * 96) return 'high';
    if (coverageDays >= 2 && pointsReturnedCount >= 2 * 96) return 'medium';
    return 'low';
  })();

  // Peak + top events
  const kwPts = pts.filter((p) => Number.isFinite(Number(p.kw))) as Array<(typeof pts)[number] & { kw: number }>;
  kwPts.sort((a, b) => {
    const da = Number(b.kw) - Number(a.kw);
    if (da !== 0) return da;
    return String(a.ts).localeCompare(String(b.ts));
  });
  const topPeakEvents: IntervalIntelligenceV1PeakEvent[] = kwPts.slice(0, topN).map((p) => ({ timestampIso: p.ts, kw: roundTo(Number(p.kw), 3) }));
  const peak = topPeakEvents.length ? topPeakEvents[0] : null;
  const peakKw = peak ? Number(peak.kw) : null;
  const peakTimestampIso = peak ? String(peak.timestampIso) : null;

  // Weekday vs weekend averages (weighted by interval duration).
  const ww = { weekday: { kwh: 0, hours: 0 }, weekend: { kwh: 0, hours: 0 } };
  for (const p of pts) {
    const hours = p.mins ? p.mins / 60 : 0;
    const kwh = p.kwh !== null ? p.kwh : (Number.isFinite(Number(p.kw)) ? Number(p.kw) * hours : 0);
    if (p.weekend === true) {
      ww.weekend.kwh += kwh;
      ww.weekend.hours += hours;
    } else if (p.weekend === false) {
      ww.weekday.kwh += kwh;
      ww.weekday.hours += hours;
    }
  }
  const weekdayAvgKw = ww.weekday.hours > 0 ? ww.weekday.kwh / ww.weekday.hours : null;
  const weekendAvgKw = ww.weekend.hours > 0 ? ww.weekend.kwh / ww.weekend.hours : null;
  const weekdayWeekendDeltaPct =
    weekdayAvgKw !== null && weekendAvgKw !== null && weekendAvgKw > 0 ? ((weekdayAvgKw - weekendAvgKw) / weekendAvgKw) * 100 : null;

  const available =
    pointsReturnedCount > 0 &&
    coverageDays > 0 &&
    (Number.isFinite(Number(avgKw)) || Number.isFinite(Number(avgDailyKwh)) || Number.isFinite(Number(baseloadKw)) || Number.isFinite(Number(peakKw)));

  const warnings = uniqSorted(baseWarnings);

  return {
    intervalIntelligenceV1: {
      schemaVersion: 'intervalIntelligenceV1',
      available,
      timezoneUsed: tz,
      coverageDays,
      granularityMinutes,
      pointsReturnedCount: pointsReturnedCount,
      totalKwh: hasAnyKwh ? roundTo(totalKwh, 3) : null,
      avgDailyKwh: avgDailyKwh !== null ? roundTo(avgDailyKwh, 3) : null,
      avgKw: avgKw !== null ? roundTo(avgKw, 3) : null,
      baseloadKw: baseloadKw !== null ? roundTo(baseloadKw, 3) : null,
      baseloadMethod: baseloadKw !== null ? baseloadMethod : 'unavailable',
      baseloadConfidence,
      peakKw: peakKw !== null ? roundTo(peakKw, 3) : null,
      peakTimestampIso,
      weekdayAvgKw: weekdayAvgKw !== null ? roundTo(weekdayAvgKw, 3) : null,
      weekendAvgKw: weekendAvgKw !== null ? roundTo(weekendAvgKw, 3) : null,
      weekdayWeekendDeltaPct: weekdayWeekendDeltaPct !== null ? roundTo(weekdayWeekendDeltaPct, 3) : null,
      dailyProfileBuckets,
      dailyProfileBucketsMethod: 'avg_kw_by_4h_bucket_v1',
      topPeakEvents,
      topPeakEventsMethod: 'top_kw_points_v1',
      warnings,
    },
  };
}

