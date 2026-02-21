import type { NormalizedIntervalV1 } from '../utilityIntelligence/intervalNormalizationV1/types';
import { getZonedParts } from '../billingEngineV1/time/zonedTime';

type WeatherDayV1 = { dateIso: string; hdd: number; cdd: number };

export type HourlyObservationV1 = {
  tsStartIso: string;
  dateIso: string; // YYYY-MM-DD in timezoneUsed
  monthIso: string; // YYYY-MM in timezoneUsed
  dow: number; // 0=Sun..6=Sat
  hour: number; // 0..23
  observedKw: number;
};

export type BaselineFitTierV1 = 'A' | 'B' | 'C';

export type BaselineV1Output = {
  modelKind:
    | 'INTERVAL_WEATHER_HOURLY_REGRESSION_V1'
    | 'INTERVAL_PROFILE_SEASONAL_V1'
    | 'BILLS_MONTHLY_V1'
    | 'NONE';
  params: Record<string, unknown>;
  notes: string[];
  warnings: string[];
  fitQuality: { r2?: number; tier: BaselineFitTierV1 };
  timezoneUsed: string;
  expectedKwByHourSummary?: { all: number[]; weekday?: number[]; weekend?: number[] };
  expectedMonthlyKwhSummary?: Array<{ startIso: string; endIso: string; expectedKwh: number }>;
  expectedKwForObs: (o: HourlyObservationV1) => number | null;
};

function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return NaN;
  const p = 10 ** decimals;
  const out = Math.round(n * p) / p;
  return Object.is(out, -0) ? 0 : out;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function safeIanaTz(tz: unknown): string | null {
  const s = String(tz ?? '').trim();
  if (!s) return null;
  if (!s.includes('/') || s.includes(' ')) return null;
  return s;
}

function partsForIso(tsIso: string, tz: string | null): { dateIso: string; monthIso: string; dow: number; hour: number } | null {
  const ms = Date.parse(tsIso);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  const used = safeIanaTz(tz) || null;
  if (used) {
    const p = getZonedParts(d, used);
    if (!p) return null;
    const y = String(p.year).padStart(4, '0');
    const m = String(p.month).padStart(2, '0');
    const dd = String(p.day).padStart(2, '0');
    return { dateIso: `${y}-${m}-${dd}`, monthIso: `${y}-${m}`, dow: p.weekday, hour: p.hour };
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return { dateIso: `${y}-${m}-${dd}`, monthIso: `${y}-${m}`, dow: d.getUTCDay(), hour: d.getUTCHours() };
}

function mean(xs: number[]): number | null {
  let n = 0;
  let s = 0;
  for (const x of xs) {
    if (!Number.isFinite(x)) continue;
    n += 1;
    s += x;
  }
  return n ? s / n : null;
}

function invert3x3(m: number[][]): { inv: number[][]; det: number } | null {
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

function r2Deterministic(y: number[], yhat: number[]): number | null {
  if (y.length !== yhat.length || !y.length) return null;
  const mu = mean(y);
  if (mu === null) return null;
  let sse = 0;
  let sst = 0;
  for (let i = 0; i < y.length; i++) {
    const a = y[i];
    const b = yhat[i];
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const e = a - b;
    sse += e * e;
    const d = a - mu;
    sst += d * d;
  }
  if (!Number.isFinite(sse) || !Number.isFinite(sst)) return null;
  if (sst <= 1e-12) return 1;
  const r2 = 1 - sse / sst;
  return clamp01(r2);
}

export function buildHourlyObservationsV1(args: { normalizedIntervalV1: NormalizedIntervalV1; timezoneHint?: string | null }): {
  timezoneUsed: string;
  hourly: HourlyObservationV1[];
} {
  const tz = safeIanaTz(args.normalizedIntervalV1.timezone) || safeIanaTz(args.timezoneHint) || 'UTC';

  const bins = new Map<string, { sumKw: number; n: number; tsStartIso: string; dateIso: string; monthIso: string; dow: number; hour: number }>();
  for (const p of args.normalizedIntervalV1.seriesKw) {
    const tsIso = String((p as any)?.tsIso || '').trim();
    const kw = Number((p as any)?.kw);
    if (!tsIso || !Number.isFinite(kw)) continue;
    const parts = partsForIso(tsIso, tz);
    if (!parts) continue;
    const key = `${parts.dateIso}T${String(parts.hour).padStart(2, '0')}`;
    const ex = bins.get(key) || { sumKw: 0, n: 0, tsStartIso: tsIso, ...parts };
    ex.sumKw += kw;
    ex.n += 1;
    // deterministic startIso: min by lexicographic ISO (matches timestamp ordering)
    if (tsIso < ex.tsStartIso) ex.tsStartIso = tsIso;
    bins.set(key, ex);
  }

  const hourly: HourlyObservationV1[] = Array.from(bins.values())
    .map((b) => ({
      tsStartIso: b.tsStartIso,
      dateIso: b.dateIso,
      monthIso: b.monthIso,
      dow: b.dow,
      hour: b.hour,
      observedKw: roundTo(b.sumKw / Math.max(1, b.n), 6),
    }))
    .sort((a, b) => a.tsStartIso.localeCompare(b.tsStartIso) || a.hour - b.hour);

  return { timezoneUsed: tz, hourly };
}

export function buildWeatherDaysFromIntervalPointsV1(args: {
  intervalPointsV1: Array<{ timestampIso: string; temperatureF?: number | null }>;
  timezoneHint?: string | null;
  hddBaseF?: number;
  cddBaseF?: number;
}): { timezoneUsed: string; weatherDays: WeatherDayV1[] } {
  const hddBaseF = Number.isFinite(Number(args.hddBaseF)) ? Number(args.hddBaseF) : 65;
  const cddBaseF = Number.isFinite(Number(args.cddBaseF)) ? Number(args.cddBaseF) : 65;
  const tz = safeIanaTz(args.timezoneHint) || 'UTC';

  const byDay = new Map<string, { tempSum: number; n: number }>();
  for (const p of args.intervalPointsV1) {
    const tsIso = String((p as any)?.timestampIso || '').trim();
    const tempF = Number((p as any)?.temperatureF);
    if (!tsIso || !Number.isFinite(tempF)) continue;
    const parts = partsForIso(tsIso, tz);
    if (!parts) continue;
    const ex = byDay.get(parts.dateIso) || { tempSum: 0, n: 0 };
    ex.tempSum += tempF;
    ex.n += 1;
    byDay.set(parts.dateIso, ex);
  }

  const keys = Array.from(byDay.keys()).sort((a, b) => a.localeCompare(b));
  const weatherDays: WeatherDayV1[] = [];
  for (const dateIso of keys) {
    const v = byDay.get(dateIso)!;
    if (!v.n) continue;
    const t = v.tempSum / v.n;
    const hdd = Math.max(0, hddBaseF - t);
    const cdd = Math.max(0, t - cddBaseF);
    weatherDays.push({ dateIso, hdd: roundTo(hdd, 6), cdd: roundTo(cdd, 6) });
  }
  return { timezoneUsed: tz, weatherDays };
}

function fitHourlyWeatherRegression(args: {
  hourly: HourlyObservationV1[];
  weatherByDay: Map<string, { hdd: number; cdd: number }>;
  minDaysPerHour: number;
}): {
  coeffByHour: Array<{ intercept: number; aHdd: number; aCdd: number; n: number }>;
  notes: string[];
} {
  const minDays = Math.max(5, Math.trunc(args.minDaysPerHour));
  const coeffByHour: Array<{ intercept: number; aHdd: number; aCdd: number; n: number }> = Array.from({ length: 24 }).map(() => ({
    intercept: 0,
    aHdd: 0,
    aCdd: 0,
    n: 0,
  }));
  const notes: string[] = [];

  const byHour: HourlyObservationV1[][] = Array.from({ length: 24 }).map(() => []);
  for (const o of args.hourly) {
    if (o.hour < 0 || o.hour > 23) continue;
    if (!args.weatherByDay.has(o.dateIso)) continue;
    byHour[o.hour].push(o);
  }

  for (let h = 0; h < 24; h++) {
    const rows = byHour[h];
    const n = rows.length;
    coeffByHour[h].n = n;
    if (n < minDays) {
      const mu = mean(rows.map((r) => r.observedKw)) ?? 0;
      coeffByHour[h] = { intercept: mu, aHdd: 0, aCdd: 0, n };
      continue;
    }

    // Normal equations for y = b0 + b1*hdd + b2*cdd
    let s00 = 0,
      s01 = 0,
      s02 = 0,
      s11 = 0,
      s12 = 0,
      s22 = 0;
    let t0 = 0,
      t1 = 0,
      t2 = 0;
    for (const r of rows) {
      const w = args.weatherByDay.get(r.dateIso)!;
      const x0 = 1;
      const x1 = Number(w.hdd);
      const x2 = Number(w.cdd);
      const y = Number(r.observedKw);
      if (![x1, x2, y].every(Number.isFinite)) continue;
      s00 += x0 * x0;
      s01 += x0 * x1;
      s02 += x0 * x2;
      s11 += x1 * x1;
      s12 += x1 * x2;
      s22 += x2 * x2;
      t0 += x0 * y;
      t1 += x1 * y;
      t2 += x2 * y;
    }
    const inv = invert3x3([
      [s00, s01, s02],
      [s01, s11, s12],
      [s02, s12, s22],
    ]);
    if (!inv) {
      const mu = mean(rows.map((r) => r.observedKw)) ?? 0;
      coeffByHour[h] = { intercept: mu, aHdd: 0, aCdd: 0, n };
      notes.push(`hour=${h}: regression_singular_fallback_mean`);
      continue;
    }
    const b0 = inv.inv[0][0] * t0 + inv.inv[0][1] * t1 + inv.inv[0][2] * t2;
    const b1 = inv.inv[1][0] * t0 + inv.inv[1][1] * t1 + inv.inv[1][2] * t2;
    const b2 = inv.inv[2][0] * t0 + inv.inv[2][1] * t1 + inv.inv[2][2] * t2;
    coeffByHour[h] = { intercept: b0, aHdd: b1, aCdd: b2, n };
  }

  return { coeffByHour, notes };
}

function computeProfileMeans(args: { hourly: HourlyObservationV1[] }): {
  overallByHour: number[];
  weekdayByHour: number[];
  weekendByHour: number[];
  byBucket: Map<string, { mean: number; n: number }>;
} {
  const sumByHour = Array.from({ length: 24 }).map(() => ({ s: 0, n: 0 }));
  const sumWeekdayByHour = Array.from({ length: 24 }).map(() => ({ s: 0, n: 0 }));
  const sumWeekendByHour = Array.from({ length: 24 }).map(() => ({ s: 0, n: 0 }));

  const byBucket = new Map<string, { s: number; n: number }>(); // key = month|dayType|hour
  for (const o of args.hourly) {
    const h = o.hour;
    if (h < 0 || h > 23) continue;
    const y = o.observedKw;
    if (!Number.isFinite(y) || y < 0) continue;

    sumByHour[h].s += y;
    sumByHour[h].n += 1;

    const isWeekend = o.dow === 0 || o.dow === 6;
    const tgt = isWeekend ? sumWeekendByHour[h] : sumWeekdayByHour[h];
    tgt.s += y;
    tgt.n += 1;

    const dayType = isWeekend ? 'WE' : 'WD';
    const key = `${o.monthIso}|${dayType}|${h}`;
    const ex = byBucket.get(key) || { s: 0, n: 0 };
    ex.s += y;
    ex.n += 1;
    byBucket.set(key, ex);
  }

  const overallByHour = sumByHour.map((b) => (b.n ? b.s / b.n : 0)).map((x) => roundTo(x, 6));
  const weekdayByHour = sumWeekdayByHour.map((b) => (b.n ? b.s / b.n : 0)).map((x) => roundTo(x, 6));
  const weekendByHour = sumWeekendByHour.map((b) => (b.n ? b.s / b.n : 0)).map((x) => roundTo(x, 6));

  const meanByBucket = new Map<string, { mean: number; n: number }>();
  for (const [k, v] of byBucket.entries()) {
    meanByBucket.set(k, { mean: roundTo(v.s / Math.max(1, v.n), 6), n: v.n });
  }
  return { overallByHour, weekdayByHour, weekendByHour, byBucket: meanByBucket };
}

function baselineTierFromR2AndCoverage(args: { r2: number | null; intervalDays: number | null; hasWeather: boolean }): BaselineFitTierV1 {
  const days = args.intervalDays ?? 0;
  const r2 = args.r2;
  if (days >= 28 && (r2 === null || r2 >= 0.55)) return 'A';
  if (days >= 14 && (r2 === null || r2 >= 0.35)) return 'B';
  return 'C';
}

export function computeBaselineV1(args: {
  generatedAtIso: string;
  normalizedIntervalV1: NormalizedIntervalV1 | null;
  intervalPointsV1?: Array<{ timestampIso: string; temperatureF?: number | null }> | null;
  hasBillText: boolean;
  billingMonthly?: Array<{ start: string; end: string; kWh?: number | null }> | null;
}): BaselineV1Output {
  const warnings: string[] = [];
  const notes: string[] = [];

  const intervalDays = args.normalizedIntervalV1?.coverage?.days ?? null;
  const granularityMinutes = args.normalizedIntervalV1?.granularityMinutes ?? null;
  const tz = safeIanaTz(args.normalizedIntervalV1?.timezone) || 'UTC';

  if (args.normalizedIntervalV1 && args.normalizedIntervalV1.seriesKw.length) {
    const { hourly, timezoneUsed } = buildHourlyObservationsV1({ normalizedIntervalV1: args.normalizedIntervalV1 });
    if ((intervalDays ?? 0) < 7) warnings.push('truth.baseline.interval_coverage_short');
    if (hourly.length < 24 * 7) warnings.push('truth.baseline.insufficient_hourly_samples');

    const weatherDays = (() => {
      const pts = Array.isArray(args.intervalPointsV1) ? (args.intervalPointsV1 as any[]) : null;
      if (!pts || !pts.length) return null;
      const anyTemp = pts.some((p) => Number.isFinite(Number((p as any)?.temperatureF)));
      if (!anyTemp) return null;
      return buildWeatherDaysFromIntervalPointsV1({ intervalPointsV1: pts as any, timezoneHint: timezoneUsed }).weatherDays;
    })();

    const weatherByDay = new Map<string, { hdd: number; cdd: number }>();
    if (weatherDays) for (const d of weatherDays) weatherByDay.set(d.dateIso, { hdd: d.hdd, cdd: d.cdd });

    if (weatherByDay.size >= 10) {
      const { coeffByHour, notes: fitNotes } = fitHourlyWeatherRegression({ hourly, weatherByDay, minDaysPerHour: 10 });
      notes.push(...fitNotes.slice(0, 40));
      const expected = (o: HourlyObservationV1): number | null => {
        const w = weatherByDay.get(o.dateIso);
        if (!w) return null;
        const h = Math.max(0, Math.min(23, Math.trunc(o.hour)));
        const c = coeffByHour[h]!;
        const y = c.intercept + c.aHdd * w.hdd + c.aCdd * w.cdd;
        return roundTo(Math.max(0, y), 6);
      };
      const y: number[] = [];
      const yhat: number[] = [];
      for (const o of hourly) {
        const e = expected(o);
        if (e === null) continue;
        y.push(o.observedKw);
        yhat.push(e);
      }
      const r2 = r2Deterministic(y, yhat);
      const tier = baselineTierFromR2AndCoverage({ r2, intervalDays, hasWeather: true });

      const profile = computeProfileMeans({ hourly });
      return {
        modelKind: 'INTERVAL_WEATHER_HOURLY_REGRESSION_V1',
        params: {
          granularityMinutes,
          intervalDays,
          timezoneUsed,
          weatherDays: weatherByDay.size,
          minDaysPerHour: 10,
          coeffsSummary: coeffByHour.map((c) => ({ intercept: roundTo(c.intercept, 6), aHdd: roundTo(c.aHdd, 6), aCdd: roundTo(c.aCdd, 6), n: c.n })),
        },
        notes,
        warnings,
        fitQuality: { ...(r2 !== null ? { r2: roundTo(r2, 6) } : {}), tier },
        timezoneUsed,
        expectedKwByHourSummary: { all: profile.overallByHour, weekday: profile.weekdayByHour, weekend: profile.weekendByHour },
        expectedKwForObs: (o) => expected(o),
      };
    }

    // Interval-only seasonal profile (month bucket + weekday/weekend + hour).
    if (!weatherByDay.size) warnings.push('truth.baseline.missing_weather_daily');
    const profile = computeProfileMeans({ hourly });
    const bucket = profile.byBucket;
    const overallByHour = profile.overallByHour;
    const weekdayByHour = profile.weekdayByHour;
    const weekendByHour = profile.weekendByHour;
    const expected = (o: HourlyObservationV1): number | null => {
      const isWeekend = o.dow === 0 || o.dow === 6;
      const dayType = isWeekend ? 'WE' : 'WD';
      const h = Math.max(0, Math.min(23, Math.trunc(o.hour)));
      const k = `${o.monthIso}|${dayType}|${h}`;
      const hit = bucket.get(k);
      if (hit && hit.n >= 8) return hit.mean;
      // backoff: month-only ignoring weekday/weekend
      const km = `${o.monthIso}|WD|${h}`;
      const km2 = `${o.monthIso}|WE|${h}`;
      const m1 = bucket.get(km);
      const m2 = bucket.get(km2);
      const combined = (() => {
        const xs: number[] = [];
        if (m1 && m1.n) xs.push(m1.mean);
        if (m2 && m2.n) xs.push(m2.mean);
        return mean(xs);
      })();
      if (combined !== null) return roundTo(combined, 6);
      // final backoff: overall hour mean
      return overallByHour[h] ?? 0;
    };
    const y: number[] = [];
    const yhat: number[] = [];
    for (const o of hourly) {
      const e = expected(o);
      if (e === null) continue;
      y.push(o.observedKw);
      yhat.push(e);
    }
    const r2 = r2Deterministic(y, yhat);
    const tier = baselineTierFromR2AndCoverage({ r2, intervalDays, hasWeather: false });

    return {
      modelKind: 'INTERVAL_PROFILE_SEASONAL_V1',
      params: {
        granularityMinutes,
        intervalDays,
        timezoneUsed,
        minSamplesPerBucket: 8,
        bucketsUsed: Array.from(new Set(hourly.map((o) => o.monthIso))).sort().slice(0, 24),
      },
      notes,
      warnings,
      fitQuality: { ...(r2 !== null ? { r2: roundTo(r2, 6) } : {}), tier },
      timezoneUsed,
      expectedKwByHourSummary: { all: overallByHour, weekday: weekdayByHour, weekend: weekendByHour },
      expectedKwForObs: (o) => expected(o),
    };
  }

  // Bills-only: coarse monthly baseline (bounded).
  const monthly = Array.isArray(args.billingMonthly) ? args.billingMonthly : [];
  const monthlyClean = monthly
    .map((m) => ({ start: String((m as any)?.start || '').trim(), end: String((m as any)?.end || '').trim(), kWh: Number((m as any)?.kWh) }))
    .filter((m) => m.start && m.end && Number.isFinite(m.kWh) && m.kWh >= 0)
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));

  if (monthlyClean.length) {
    const tail = monthlyClean.slice(-24);
    const kwhs = tail.map((m) => m.kWh);
    const mu = mean(kwhs) ?? 0;
    const expectedMonthlyKwhSummary = tail.map((m) => ({ startIso: m.start, endIso: m.end, expectedKwh: roundTo(mu, 3) }));
    notes.push(`billMonths=${monthlyClean.length}`);
    if (monthlyClean.length < 6) warnings.push('truth.baseline.bill_months_short');
    return {
      modelKind: 'BILLS_MONTHLY_V1',
      params: { billMonths: monthlyClean.length },
      notes,
      warnings,
      fitQuality: { tier: monthlyClean.length >= 12 ? 'B' : 'C' },
      timezoneUsed: tz,
      expectedMonthlyKwhSummary,
      expectedKwForObs: () => null,
    };
  }

  if (args.hasBillText) warnings.push('truth.baseline.bill_text_present_but_no_structured_bills');
  warnings.push('truth.baseline.no_interval_or_bills');
  return {
    modelKind: 'NONE',
    params: {},
    notes,
    warnings,
    fitQuality: { tier: 'C' },
    timezoneUsed: tz,
    expectedKwForObs: () => null,
  };
}

