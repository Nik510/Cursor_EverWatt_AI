import { getZonedParts } from '../../billingEngineV1/time/zonedTime';
import type { IntervalElectricMetaV1, IntervalElectricPointV1 } from '../intake/intervalElectricV1/types';
import {
  WeatherRegressionWarningCodesV1,
  type UsageSeriesDayV1,
  type WeatherRegressionConfidenceTierV1,
  type WeatherRegressionV1,
  type WeatherSeriesDayV1,
} from './types';

function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return NaN;
  const p = 10 ** decimals;
  const out = Math.round(n * p) / p;
  // Normalize signed zero for stable JSON diffs.
  return Object.is(out, -0) ? 0 : out;
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

function isLikelyIanaTimezone(tz: unknown): boolean {
  const s = String(tz ?? '').trim();
  return Boolean(s && s.includes('/') && !s.includes(' '));
}

function safeGetZonedParts(d: Date, tz: string): ReturnType<typeof getZonedParts> | null {
  try {
    return getZonedParts(d, tz);
  } catch {
    return null;
  }
}

function localDateKey(d: Date, tz: string): string | null {
  const parts = safeGetZonedParts(d, tz);
  if (!parts) return null;
  const y = String(parts.year).padStart(4, '0');
  const m = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function quantileDeterministic(sortedAsc: number[], p: number): number | null {
  const xs = sortedAsc.filter((n) => Number.isFinite(n));
  if (!xs.length) return null;
  const pp = Math.max(0, Math.min(1, p));
  const idx = Math.floor(pp * (xs.length - 1));
  return xs[Math.max(0, Math.min(xs.length - 1, idx))];
}

// Abramowitz-Stegun approximation for normal CDF (deterministic, dependency-free).
function normalCdfApprox(x: number): number {
  if (!Number.isFinite(x)) return NaN;
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  const cdf = x >= 0 ? 1 - p : p;
  return cdf;
}

function twoSidedPApproxFromT(t: number): number | null {
  if (!Number.isFinite(t)) return null;
  const z = Math.abs(t);
  const cdf = normalCdfApprox(z);
  if (!Number.isFinite(cdf)) return null;
  const p = 2 * (1 - cdf);
  return Math.max(0, Math.min(1, p));
}

function invert3x3(m: number[][]): { inv: number[][]; det: number } | null {
  // m is 3x3
  const a = m[0][0],
    b = m[0][1],
    c = m[0][2];
  const d = m[1][0],
    e = m[1][1],
    f = m[1][2];
  const g = m[2][0],
    h = m[2][1],
    i = m[2][2];

  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  const invDet = 1 / det;
  return {
    det,
    inv: [
      [A * invDet, D * invDet, G * invDet],
      [B * invDet, E * invDet, H * invDet],
      [C * invDet, F * invDet, I * invDet],
    ],
  };
}

export function buildDailyUsageAndWeatherSeriesFromIntervalPointsV1(args: {
  points: IntervalElectricPointV1[] | null | undefined;
  meta?: IntervalElectricMetaV1 | null;
  timezoneHint?: string;
}): { usageByDay: UsageSeriesDayV1[]; weatherByDay: WeatherSeriesDayV1[]; timezoneUsed: string } {
  const raw = Array.isArray(args.points) ? args.points : [];
  const tzRaw =
    String((args.meta as any)?.timezoneUsed || args.timezoneHint || 'America/Los_Angeles').trim() || 'America/Los_Angeles';
  const tzEffective = isLikelyIanaTimezone(tzRaw) ? tzRaw : 'UTC';

  const byDay = new Map<string, { kwhSum: number; hasKwh: boolean; tempSum: number; tempN: number; hasTemp: boolean }>();
  for (const p of raw) {
    const ts = String((p as any)?.timestampIso || '').trim();
    const ms = ts ? Date.parse(ts) : NaN;
    if (!Number.isFinite(ms)) continue;
    const d = new Date(ms);
    const day = localDateKey(d, tzEffective) || d.toISOString().slice(0, 10);
    if (!day) continue;

    const kwh = Number((p as any)?.kWh);
    const hasKwh = Number.isFinite(kwh);
    const tempF = Number((p as any)?.temperatureF);
    const hasTemp = Number.isFinite(tempF);

    const ex = byDay.get(day) || { kwhSum: 0, hasKwh: false, tempSum: 0, tempN: 0, hasTemp: false };
    if (hasKwh) {
      ex.kwhSum += kwh;
      ex.hasKwh = true;
    }
    if (hasTemp) {
      ex.tempSum += tempF;
      ex.tempN += 1;
      ex.hasTemp = true;
    }
    byDay.set(day, ex);
  }

  const keys = Array.from(byDay.keys()).sort();
  const usageByDay: UsageSeriesDayV1[] = [];
  const weatherByDay: WeatherSeriesDayV1[] = [];
  for (const day of keys) {
    const v = byDay.get(day)!;
    if (v.hasKwh) usageByDay.push({ dateIso: day, kwh: roundTo(v.kwhSum, 6) });
    if (v.hasTemp && v.tempN > 0) weatherByDay.push({ dateIso: day, temperatureF: roundTo(v.tempSum / v.tempN, 6) });
  }
  return { usageByDay, weatherByDay, timezoneUsed: tzRaw };
}

export function regressUsageVsWeatherV1(args: {
  usageByDay: UsageSeriesDayV1[] | null | undefined;
  weatherByDay: WeatherSeriesDayV1[] | null | undefined;
  hddBaseF?: number;
  cddBaseF?: number;
  minOverlapDays?: number;
  timezoneHint?: string;
}): { weatherRegressionV1: WeatherRegressionV1 } {
  const usageRaw = Array.isArray(args.usageByDay) ? args.usageByDay : [];
  const weatherRaw = Array.isArray(args.weatherByDay) ? args.weatherByDay : [];

  const hddBaseF = Number.isFinite(Number(args.hddBaseF)) ? Number(args.hddBaseF) : 65;
  const cddBaseF = Number.isFinite(Number(args.cddBaseF)) ? Number(args.cddBaseF) : 65;
  const minOverlapDays = Number.isFinite(Number(args.minOverlapDays)) ? Math.max(3, Number(args.minOverlapDays)) : 10;

  const warnings: string[] = [];
  const tz = String(args.timezoneHint || '').trim();
  if (tz && !isLikelyIanaTimezone(tz)) warnings.push(WeatherRegressionWarningCodesV1.WEATHER_V1_TIMEZONE_UNKNOWN);

  const usageByDay = usageRaw
    .map((d) => ({ dateIso: String((d as any)?.dateIso || '').trim(), kwh: Number((d as any)?.kwh) }))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.dateIso) && Number.isFinite(d.kwh) && d.kwh >= 0)
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  const weatherMap = new Map<string, { tempF: number | null; hdd: number | null; cdd: number | null }>();
  for (const d of weatherRaw) {
    const dateIso = String((d as any)?.dateIso || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) continue;
    const tempF = Number((d as any)?.temperatureF);
    const hdd0 = Number((d as any)?.hdd);
    const cdd0 = Number((d as any)?.cdd);
    weatherMap.set(dateIso, {
      tempF: Number.isFinite(tempF) ? tempF : null,
      hdd: Number.isFinite(hdd0) ? Math.max(0, hdd0) : null,
      cdd: Number.isFinite(cdd0) ? Math.max(0, cdd0) : null,
    });
  }

  const coverageDays = usageByDay.length;

  const rows: Array<{ dateIso: string; y: number; hdd: number; cdd: number }> = [];
  let missingWeatherDays = 0;
  for (const u of usageByDay) {
    const w = weatherMap.get(u.dateIso);
    if (!w) {
      missingWeatherDays += 1;
      continue;
    }
    const cdd = (() => {
      if (typeof w.cdd === 'number' && Number.isFinite(w.cdd)) return w.cdd;
      if (Number.isFinite(Number(w.tempF))) return Math.max(0, Number(w.tempF) - cddBaseF);
      return null;
    })();
    const hdd = (() => {
      if (typeof w.hdd === 'number' && Number.isFinite(w.hdd)) return w.hdd;
      if (Number.isFinite(Number(w.tempF))) return Math.max(0, hddBaseF - Number(w.tempF));
      return null;
    })();
    if (cdd === null || hdd === null) {
      missingWeatherDays += 1;
      continue;
    }
    rows.push({ dateIso: u.dateIso, y: u.kwh, hdd, cdd });
  }

  const overlapDays = rows.length;
  if (missingWeatherDays > 0) warnings.push(WeatherRegressionWarningCodesV1.WEATHER_V1_MISSING_WEATHER_DAYS);
  if (overlapDays < minOverlapDays) warnings.push(WeatherRegressionWarningCodesV1.WEATHER_V1_INSUFFICIENT_OVERLAP_DAYS);

  // Outlier clipping on y (deterministic, conservative).
  const ySorted = rows.map((r) => r.y).slice().sort((a, b) => a - b);
  const p25 = quantileDeterministic(ySorted, 0.25);
  const p75 = quantileDeterministic(ySorted, 0.75);
  const iqr = p25 !== null && p75 !== null ? p75 - p25 : null;
  const lowFence = iqr !== null ? p25! - 4 * iqr : null;
  const highFence = iqr !== null ? p75! + 4 * iqr : null;
  let clippedCount = 0;
  const rowsClipped = rows.map((r) => {
    let y = r.y;
    if (lowFence !== null && y < lowFence) {
      y = lowFence;
      clippedCount += 1;
    }
    if (highFence !== null && y > highFence) {
      y = highFence;
      clippedCount += 1;
    }
    return { ...r, y };
  });
  if (clippedCount > 0) warnings.push(WeatherRegressionWarningCodesV1.WEATHER_V1_OUTLIERS_CLIPPED);

  const hasVar = (xs: number[]): boolean => {
    const x0 = xs[0];
    if (x0 === undefined) return false;
    for (let i = 1; i < xs.length; i++) if (xs[i] !== x0) return true;
    return false;
  };

  let intercept: number | null = null;
  let slopeHdd: number | null = null;
  let slopeCdd: number | null = null;
  let r2: number | null = null;
  let canFit = overlapDays >= minOverlapDays;

  if (canFit) {
    const ys = rowsClipped.map((r) => r.y);
    const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;
    const sst = ys.reduce((a, y) => a + (y - yMean) * (y - yMean), 0);
    const hdds = rowsClipped.map((r) => r.hdd);
    const cdds = rowsClipped.map((r) => r.cdd);
    const useHdd = hasVar(hdds);
    const useCdd = hasVar(cdds);

    // Degenerate variance cases.
    if (sst <= 0 || (!useHdd && !useCdd)) {
      warnings.push(WeatherRegressionWarningCodesV1.WEATHER_V1_INSUFFICIENT_VARIANCE);
      intercept = roundTo(yMean, 6);
      slopeHdd = 0;
      slopeCdd = 0;
      r2 = null;
      canFit = false;
    } else if (useHdd && useCdd) {
      // Full OLS with 2 predictors.
      let s00 = 0,
        s01 = 0,
        s02 = 0,
        s11 = 0,
        s12 = 0,
        s22 = 0;
      let t0 = 0,
        t1 = 0,
        t2 = 0;
      for (const r of rowsClipped) {
        const x0 = 1;
        const x1 = r.hdd;
        const x2 = r.cdd;
        s00 += x0 * x0;
        s01 += x0 * x1;
        s02 += x0 * x2;
        s11 += x1 * x1;
        s12 += x1 * x2;
        s22 += x2 * x2;
        t0 += x0 * r.y;
        t1 += x1 * r.y;
        t2 += x2 * r.y;
      }
      const xtx = [
        [s00, s01, s02],
        [s01, s11, s12],
        [s02, s12, s22],
      ];
      const inv = invert3x3(xtx);
      if (!inv) {
        warnings.push(WeatherRegressionWarningCodesV1.WEATHER_V1_INSUFFICIENT_VARIANCE);
        intercept = roundTo(yMean, 6);
        slopeHdd = 0;
        slopeCdd = 0;
        r2 = null;
        canFit = false;
      } else {
        const invM = inv.inv;
        const b0 = invM[0][0] * t0 + invM[0][1] * t1 + invM[0][2] * t2;
        const b1 = invM[1][0] * t0 + invM[1][1] * t1 + invM[1][2] * t2;
        const b2 = invM[2][0] * t0 + invM[2][1] * t1 + invM[2][2] * t2;

        let sse = 0;
        for (const r of rowsClipped) {
          const yHat = b0 + b1 * r.hdd + b2 * r.cdd;
          const err = r.y - yHat;
          sse += err * err;
        }
        r2 = sst > 0 ? 1 - sse / sst : null;
        intercept = roundTo(b0, 6);
        slopeHdd = roundTo(b1, 6);
        slopeCdd = roundTo(b2, 6);
      }
    } else {
      // Single-predictor OLS; the other slope is deterministically 0.
      const use = useHdd ? 'hdd' : 'cdd';
      const xs = rowsClipped.map((r) => (use === 'hdd' ? r.hdd : r.cdd));
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
      let sxx = 0;
      let sxy = 0;
      for (let idx = 0; idx < xs.length; idx++) {
        const dx = xs[idx] - mx;
        sxx += dx * dx;
        sxy += dx * (ys[idx] - yMean);
      }
      if (sxx <= 0) {
        warnings.push(WeatherRegressionWarningCodesV1.WEATHER_V1_INSUFFICIENT_VARIANCE);
        intercept = roundTo(yMean, 6);
        slopeHdd = 0;
        slopeCdd = 0;
        r2 = null;
        canFit = false;
      } else {
        const b1 = sxy / sxx;
        const b0 = yMean - b1 * mx;
        let sse = 0;
        for (let idx = 0; idx < xs.length; idx++) {
          const yHat = b0 + b1 * xs[idx];
          const err = ys[idx] - yHat;
          sse += err * err;
        }
        r2 = sst > 0 ? 1 - sse / sst : null;
        intercept = roundTo(b0, 6);
        slopeHdd = use === 'hdd' ? roundTo(b1, 6) : 0;
        slopeCdd = use === 'cdd' ? roundTo(b1, 6) : 0;
      }
    }
  }

  const confidenceTier: WeatherRegressionConfidenceTierV1 = (() => {
    const rr = typeof r2 === 'number' && Number.isFinite(r2) ? r2 : null;
    if (rr === null) return 'NONE';
    if (overlapDays >= 180 && rr >= 0.6 && clippedCount === 0) return 'HIGH';
    if (overlapDays >= 60 && rr >= 0.35) return 'MEDIUM';
    if (overlapDays >= 30 && rr >= 0.15) return 'LOW';
    return 'NONE';
  })();

  const annualization = (() => {
    if (confidenceTier === 'NONE') return { method: 'unavailable' as const, annualKwhEstimate: null, confidenceTier: 'NONE' as const };
    if (overlapDays < 90) return { method: 'unavailable' as const, annualKwhEstimate: null, confidenceTier: 'NONE' as const };
    if (intercept === null || slopeHdd === null || slopeCdd === null) {
      return { method: 'unavailable' as const, annualKwhEstimate: null, confidenceTier: 'NONE' as const };
    }
    const preds = rowsClipped.map((r) => intercept! + slopeHdd! * r.hdd + slopeCdd! * r.cdd);
    const meanPred = preds.reduce((a, b) => a + b, 0) / preds.length;
    const annual = meanPred * 365;
    const tier: WeatherRegressionConfidenceTierV1 = overlapDays >= 300 ? 'HIGH' : overlapDays >= 180 ? 'MEDIUM' : 'LOW';
    return { method: 'annualize_method_v1' as const, annualKwhEstimate: Number.isFinite(annual) ? Math.round(annual) : null, confidenceTier: tier };
  })();

  return {
    weatherRegressionV1: {
      schemaVersion: 'weatherRegressionV1',
      modelType: 'HDD_CDD_LINEAR_V1',
      coverageDays,
      overlapDays,
      hddBaseF,
      cddBaseF,
      intercept,
      slopeHdd,
      slopeCdd,
      r2: typeof r2 === 'number' && Number.isFinite(r2) ? roundTo(r2, 6) : null,
      confidenceTier,
      warnings: uniqSorted(warnings) as any,
      annualization,
    },
  };
}

