import type { HourlyObservationV1 } from './baselineV1';

type ChangepointTypeV1 = 'BASELOAD_SHIFT' | 'PEAK_SHIFT' | 'SCHEDULE_SHIFT' | 'WEATHER_SENS_SHIFT';

export type ChangepointV1 = {
  atIso: string;
  type: ChangepointTypeV1;
  magnitude: number;
  confidence: number;
  notes: string[];
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

function mean(xs: number[]): number | null {
  let s = 0;
  let n = 0;
  for (const x of xs) {
    if (!Number.isFinite(x)) continue;
    s += x;
    n += 1;
  }
  return n ? s / n : null;
}

function quantileDeterministic(sortedAsc: number[], p: number): number | null {
  const xs = sortedAsc.filter((n) => Number.isFinite(n));
  if (!xs.length) return null;
  const pp = Math.max(0, Math.min(1, p));
  const idx = Math.floor(pp * (xs.length - 1));
  return xs[Math.max(0, Math.min(xs.length - 1, idx))];
}

type DailyMetrics = {
  dateIso: string;
  dayStartIso: string;
  baseloadKw: number;
  peakKw: number;
  operatingHours: number;
};

function computeDailyMetrics(hourly: HourlyObservationV1[]): DailyMetrics[] {
  const byDay = new Map<string, { startIso: string; hours: number[] }>();
  for (const o of hourly) {
    const day = o.dateIso;
    const ex = byDay.get(day) || { startIso: o.tsStartIso, hours: [] as number[] };
    ex.hours.push(o.observedKw);
    if (o.tsStartIso < ex.startIso) ex.startIso = o.tsStartIso;
    byDay.set(day, ex);
  }

  const days = Array.from(byDay.keys()).sort((a, b) => a.localeCompare(b));
  const out: DailyMetrics[] = [];
  for (const d of days) {
    const v = byDay.get(d)!;
    const xs = v.hours.filter((n) => Number.isFinite(n) && n >= 0).slice().sort((a, b) => a - b);
    if (xs.length < 12) continue; // require at least half-day of hourly bins
    const base = quantileDeterministic(xs, 0.1) ?? xs[0] ?? 0;
    const peak = quantileDeterministic(xs, 0.9) ?? xs[xs.length - 1] ?? base;
    const thresh = base + 0.4 * Math.max(0, peak - base);
    const operatingHours = xs.filter((x) => x >= thresh).length;
    out.push({
      dateIso: d,
      dayStartIso: v.startIso,
      baseloadKw: roundTo(base, 6),
      peakKw: roundTo(peak, 6),
      operatingHours: Math.max(0, Math.min(24, Math.trunc(operatingHours))),
    });
  }
  return out;
}

function detectSustainedShift(args: {
  days: DailyMetrics[];
  windowDays: number;
  minGapDays: number;
  metric: (d: DailyMetrics) => number;
  threshold: (prevMean: number) => number;
  type: ChangepointTypeV1;
}): ChangepointV1[] {
  const w = Math.max(3, Math.trunc(args.windowDays));
  const gap = Math.max(1, Math.trunc(args.minGapDays));
  const out: ChangepointV1[] = [];
  const xs = args.days;
  if (xs.length < 2 * w + gap) return out;

  let i = w;
  while (i + w <= xs.length) {
    const prev = xs.slice(i - w, i).map(args.metric);
    const next = xs.slice(i, i + w).map(args.metric);
    const muPrev = mean(prev);
    const muNext = mean(next);
    if (muPrev === null || muNext === null) {
      i += 1;
      continue;
    }
    const delta = muNext - muPrev;
    const thresh = args.threshold(muPrev);
    if (Math.abs(delta) < thresh) {
      i += 1;
      continue;
    }

    // persistence check: after-window should stay near new mean for half-window
    const post = xs.slice(i, Math.min(xs.length, i + Math.max(2, Math.floor(w / 2)))).map(args.metric);
    const muPost = mean(post);
    if (muPost === null || Math.abs(muPost - muNext) > thresh) {
      i += 1;
      continue;
    }

    const conf = clamp01(0.35 + 0.5 * Math.min(1, Math.abs(delta) / Math.max(1e-6, 2 * thresh)));
    out.push({
      atIso: xs[i]?.dayStartIso || xs[i]?.dateIso,
      type: args.type,
      magnitude: roundTo(delta, 6),
      confidence: roundTo(conf, 6),
      notes: [
        `windowDays=${w}`,
        `prevMean=${roundTo(muPrev, 6)}`,
        `nextMean=${roundTo(muNext, 6)}`,
        `threshold=${roundTo(thresh, 6)}`,
      ],
    });

    i += w; // skip ahead to avoid duplicate detections
  }

  return out;
}

export function computeChangepointsV1(args: { hourly: HourlyObservationV1[]; maxChangepoints?: number }): { changepoints: ChangepointV1[]; warnings: string[] } {
  const max = Number.isFinite(Number(args.maxChangepoints)) ? Math.max(0, Math.trunc(Number(args.maxChangepoints))) : 20;
  const warnings: string[] = [];
  const daily = computeDailyMetrics(args.hourly);
  if (daily.length < 21) warnings.push('truth.changepoints.insufficient_days');

  const windowDays = 7;
  const base = detectSustainedShift({
    days: daily,
    windowDays,
    minGapDays: 1,
    metric: (d) => d.baseloadKw,
    threshold: (prev) => Math.max(5, 0.15 * Math.max(0, prev)),
    type: 'BASELOAD_SHIFT',
  });
  const peak = detectSustainedShift({
    days: daily,
    windowDays,
    minGapDays: 1,
    metric: (d) => d.peakKw,
    threshold: (prev) => Math.max(10, 0.15 * Math.max(0, prev)),
    type: 'PEAK_SHIFT',
  });
  const sched = detectSustainedShift({
    days: daily,
    windowDays,
    minGapDays: 1,
    metric: (d) => d.operatingHours,
    threshold: () => 2.5,
    type: 'SCHEDULE_SHIFT',
  });

  const all = [...base, ...peak, ...sched]
    .sort((a, b) => a.atIso.localeCompare(b.atIso) || a.type.localeCompare(b.type))
    .slice(0, max);

  return { changepoints: all, warnings };
}

