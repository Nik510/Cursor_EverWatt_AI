import { percentile, mean, standardDeviation } from '../../../utils/math';
import type { LoadShapeMetrics } from '../types';

export type IntervalKwPoint = { timestampIso: string; kw: number };

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function toDate(tsIso: string): Date | null {
  const d = new Date(tsIso);
  return Number.isFinite(d.getTime()) ? d : null;
}

function dayKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function hourUtc(d: Date): number {
  return d.getUTCHours();
}

export type LoadShapeAnalysisResult = {
  metrics: LoadShapeMetrics;
  reasons: string[];
  requiredInputsMissing: string[];
};

export function analyzeLoadShape(args: { intervalKw?: IntervalKwPoint[] | null }): LoadShapeAnalysisResult {
  const rows = Array.isArray(args.intervalKw) ? args.intervalKw : [];
  if (!rows.length) {
    return {
      metrics: {},
      reasons: ['Interval series not provided; cannot compute load shape metrics.'],
      requiredInputsMissing: ['Interval kW series required to infer load shape (provide interval data or configure loader).'],
    };
  }

  const parsed = rows
    .map((r) => {
      const d = toDate(String(r.timestampIso || '').trim());
      const kw = Number(r.kw);
      if (!d || !Number.isFinite(kw)) return null;
      return { d, kw };
    })
    .filter(Boolean) as Array<{ d: Date; kw: number }>;

  if (!parsed.length) {
    return {
      metrics: {},
      reasons: ['Interval series contained no valid timestamps/values.'],
      requiredInputsMissing: ['Valid interval timestamps and kW values required to infer load shape.'],
    };
  }

  const kwArr = parsed.map((p) => p.kw).filter((n) => Number.isFinite(n));
  if (!kwArr.length) {
    return {
      metrics: {},
      reasons: ['Interval series contained no finite kW readings.'],
      requiredInputsMissing: ['Finite kW readings required to infer load shape.'],
    };
  }

  const base = percentile(kwArr, 0.1);
  const peak = percentile(kwArr, 0.95);
  const avg = mean(kwArr);
  const loadFactor = peak > 0 ? avg / peak : 0;
  const peakinessIndex = base > 0 ? peak / base : peak > 0 ? Infinity : 0;

  // Weekday vs weekend (UTC-based, deterministic without territory timezone).
  // Note: v1 uses UTC classification; callers can adapt in a future timezone-aware version.
  let weekdaySum = 0;
  let weekdayN = 0;
  let weekendSum = 0;
  let weekendN = 0;
  for (const p of parsed) {
    const dow = p.d.getUTCDay(); // 0=Sun
    const isWeekend = dow === 0 || dow === 6;
    if (isWeekend) {
      weekendSum += p.kw;
      weekendN++;
    } else {
      weekdaySum += p.kw;
      weekdayN++;
    }
  }
  const weekdayAvg = weekdayN ? weekdaySum / weekdayN : 0;
  const weekendAvg = weekendN ? weekendSum / weekendN : 0;
  const weekdayWeekendDelta = avg > 0 ? (weekdayAvg - weekendAvg) / avg : 0;

  // Night (00-06) vs Day (09-17) UTC.
  let nightSum = 0;
  let nightN = 0;
  let daySum = 0;
  let dayN = 0;
  for (const p of parsed) {
    const h = hourUtc(p.d);
    if (h >= 0 && h < 6) {
      nightSum += p.kw;
      nightN++;
    }
    if (h >= 9 && h < 17) {
      daySum += p.kw;
      dayN++;
    }
  }
  const nightAvg = nightN ? nightSum / nightN : 0;
  const dayAvg = dayN ? daySum / dayN : 0;
  const nightDayRatio = dayAvg > 0 ? nightAvg / dayAvg : 0;

  // Seasonality: coefficient of variation of monthly mean kW (UTC month buckets).
  const byMonth = new Map<string, { sum: number; n: number }>();
  for (const p of parsed) {
    const mk = monthKeyUtc(p.d);
    const cur = byMonth.get(mk) || { sum: 0, n: 0 };
    cur.sum += p.kw;
    cur.n++;
    byMonth.set(mk, cur);
  }
  const monthMeans = [...byMonth.values()].map((x) => (x.n ? x.sum / x.n : 0)).filter((n) => Number.isFinite(n));
  const monthMean = mean(monthMeans);
  const seasonalityIndex = monthMean > 0 ? standardDeviation(monthMeans) / monthMean : 0;

  // Signature vector: average kW by hour-of-day (24 elements), normalized by peak (p95).
  const byHour = new Array(24).fill(0).map(() => ({ sum: 0, n: 0 }));
  for (const p of parsed) {
    const h = hourUtc(p.d);
    byHour[h].sum += p.kw;
    byHour[h].n++;
  }
  const hourlyAvg = byHour.map((b) => (b.n ? b.sum / b.n : 0));
  const denom = peak > 0 ? peak : Math.max(1e-9, Math.max(...hourlyAvg));
  const signatureVector = hourlyAvg.map((v) => clamp01(v / denom));

  // Reasons/evidence strings
  const dayKeys = new Set(parsed.map((p) => dayKeyUtc(p.d)));
  const reasons: string[] = [
    `Computed baseload as 10th percentile of interval kW.`,
    `Computed peak as 95th percentile of interval kW.`,
    `Computed loadFactor as avg/peak using interval kW.`,
    `Computed weekdayWeekendDelta using UTC day-of-week buckets (days observed=${dayKeys.size}).`,
    `Computed nightDayRatio using UTC hours (night=00-06, day=09-17).`,
    `Computed seasonalityIndex as CV of monthly mean kW (months observed=${monthMeans.length}).`,
    `Computed signatureVector as normalized hourly average profile (length=24).`,
  ];

  return {
    metrics: {
      baseloadKw: Number.isFinite(base) ? base : undefined,
      peakKw: Number.isFinite(peak) ? peak : undefined,
      loadFactor: Number.isFinite(loadFactor) ? loadFactor : undefined,
      peakinessIndex: Number.isFinite(peakinessIndex) ? peakinessIndex : undefined,
      weekdayWeekendDelta: Number.isFinite(weekdayWeekendDelta) ? weekdayWeekendDelta : undefined,
      nightDayRatio: Number.isFinite(nightDayRatio) ? nightDayRatio : undefined,
      seasonalityIndex: Number.isFinite(seasonalityIndex) ? seasonalityIndex : undefined,
      signatureVector,
    },
    reasons,
    requiredInputsMissing: [],
  };
}

