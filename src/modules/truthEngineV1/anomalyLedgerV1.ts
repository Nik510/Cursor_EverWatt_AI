import type { HourlyObservationV1 } from './baselineV1';

export type AnomalyClassV1 = 'SPIKE' | 'DROP' | 'DRIFT' | 'VOLATILITY' | 'SCHEDULE';

export type AnomalyLedgerItemV1 = {
  id: string;
  window: { startIso: string; endIso: string };
  class: AnomalyClassV1;
  magnitudeKwhOrKw: number;
  confidence: number;
  likelyDrivers: string[];
  requiredNextData: string[];
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

function medianDeterministic(sortedAsc: number[]): number | null {
  const xs = sortedAsc.filter((n) => Number.isFinite(n));
  if (!xs.length) return null;
  const mid = Math.floor((xs.length - 1) / 2);
  return xs[mid] ?? null;
}

function madScale(xs: number[]): number | null {
  const vals = xs.filter((n) => Number.isFinite(n)).slice().sort((a, b) => a - b);
  const med = medianDeterministic(vals);
  if (med === null) return null;
  const dev = vals.map((x) => Math.abs(x - med)).sort((a, b) => a - b);
  const mad = medianDeterministic(dev);
  if (mad === null) return null;
  // Convert MAD to ~sigma for normal distribution (deterministic constant).
  return mad * 1.4826;
}

function addHoursIso(tsIso: string, hours: number): string {
  const ms = Date.parse(tsIso);
  if (!Number.isFinite(ms)) return tsIso;
  const out = new Date(ms + Math.trunc(hours) * 3_600_000).toISOString();
  return out;
}

function stableId(parts: string[]): string {
  const raw = parts.map((p) => String(p || '').trim()).filter(Boolean).join('|');
  return raw
    .replace(/[^0-9A-Za-z|_.:-]+/g, '_')
    .slice(0, 140);
}

function driversAndDataForClass(cls: AnomalyClassV1): { likelyDrivers: string[]; requiredNextData: string[] } {
  if (cls === 'SPIKE')
    return {
      likelyDrivers: ['one-time event', 'equipment test/startup', 'meter artifact'],
      requiredNextData: ['operations notes for the window', 'BMS trend of major loads (if available)'],
    };
  if (cls === 'DROP')
    return {
      likelyDrivers: ['shutdown/holiday', 'curtailment', 'meter gap or partial data'],
      requiredNextData: ['occupancy/holiday calendar', 'meter data quality checks for the window'],
    };
  if (cls === 'DRIFT')
    return {
      likelyDrivers: ['setpoint change', 'controls degradation', 'occupancy change'],
      requiredNextData: ['controls change log', 'trend AHU/CHW/HW supply temps and runtimes'],
    };
  if (cls === 'VOLATILITY')
    return {
      likelyDrivers: ['unstable controls', 'intermittent process loads', 'irregular occupancy'],
      requiredNextData: ['trend major equipment states', 'check interval data completeness'],
    };
  return {
    likelyDrivers: ['schedule mismatch', 'weekend occupancy', 'timezone/DST issue'],
    requiredNextData: ['confirm operating hours', 'export schedules (BMS) and compare to interval data'],
  };
}

type ResidualPoint = {
  tsStartIso: string;
  dateIso: string;
  dow: number;
  hour: number;
  observedKw: number;
  expectedKw: number;
  residualKw: number;
};

function residualPoints(args: { hourly: HourlyObservationV1[]; expectedKwForObs: (o: HourlyObservationV1) => number | null }): ResidualPoint[] {
  const out: ResidualPoint[] = [];
  for (const o of args.hourly) {
    const e = args.expectedKwForObs(o);
    if (e === null || !Number.isFinite(e)) continue;
    const r = o.observedKw - e;
    out.push({
      tsStartIso: o.tsStartIso,
      dateIso: o.dateIso,
      dow: o.dow,
      hour: o.hour,
      observedKw: o.observedKw,
      expectedKw: e,
      residualKw: roundTo(r, 6),
    });
  }
  out.sort((a, b) => a.tsStartIso.localeCompare(b.tsStartIso) || a.hour - b.hour);
  return out;
}

function groupExtremeWindows(args: { points: ResidualPoint[]; thresholdSigma: number; scale: number; maxWindows: number }): AnomalyLedgerItemV1[] {
  const thr = Math.max(0.1, Number(args.thresholdSigma) * Math.max(1e-9, args.scale));
  const wins: Array<{ startIso: string; endIso: string; cls: AnomalyClassV1; maxAbs: number; n: number }> = [];

  let cur: { startIso: string; lastIso: string; sign: 1 | -1; maxAbs: number; n: number } | null = null;
  for (const p of args.points) {
    const r = p.residualKw;
    const sign: 1 | -1 | 0 = r >= thr ? 1 : r <= -thr ? -1 : 0;
    if (sign === 0) {
      if (cur) {
        wins.push({ startIso: cur.startIso, endIso: addHoursIso(cur.lastIso, 1), cls: cur.sign === 1 ? 'SPIKE' : 'DROP', maxAbs: cur.maxAbs, n: cur.n });
        cur = null;
      }
      continue;
    }
    if (!cur) {
      cur = { startIso: p.tsStartIso, lastIso: p.tsStartIso, sign: sign as any, maxAbs: Math.abs(r), n: 1 };
      continue;
    }
    const gapHours = (() => {
      const a = Date.parse(cur.lastIso);
      const b = Date.parse(p.tsStartIso);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return 999;
      return Math.round((b - a) / 3_600_000);
    })();
    const contiguous = gapHours >= 0 && gapHours <= 2;
    if (contiguous && cur.sign === sign) {
      cur.lastIso = p.tsStartIso;
      cur.maxAbs = Math.max(cur.maxAbs, Math.abs(r));
      cur.n += 1;
    } else {
      wins.push({ startIso: cur.startIso, endIso: addHoursIso(cur.lastIso, 1), cls: cur.sign === 1 ? 'SPIKE' : 'DROP', maxAbs: cur.maxAbs, n: cur.n });
      cur = { startIso: p.tsStartIso, lastIso: p.tsStartIso, sign: sign as any, maxAbs: Math.abs(r), n: 1 };
    }
  }
  if (cur) wins.push({ startIso: cur.startIso, endIso: addHoursIso(cur.lastIso, 1), cls: cur.sign === 1 ? 'SPIKE' : 'DROP', maxAbs: cur.maxAbs, n: cur.n });

  wins.sort((a, b) => b.maxAbs - a.maxAbs || b.n - a.n || a.startIso.localeCompare(b.startIso) || a.cls.localeCompare(b.cls));
  const picked = wins.slice(0, Math.max(0, Math.trunc(args.maxWindows)));

  return picked.map((w, idx) => {
    const conf = clamp01(0.4 + 0.5 * Math.min(1, w.maxAbs / Math.max(thr, 1e-6)) + 0.1 * Math.min(1, w.n / 6));
    const aux = driversAndDataForClass(w.cls);
    return {
      id: stableId([`truthv1`, w.cls, w.startIso, w.endIso, String(idx + 1)]),
      window: { startIso: w.startIso, endIso: w.endIso },
      class: w.cls,
      magnitudeKwhOrKw: roundTo(w.maxAbs, 6),
      confidence: roundTo(conf, 6),
      likelyDrivers: aux.likelyDrivers,
      requiredNextData: aux.requiredNextData,
    };
  });
}

function dailyResidualStats(points: ResidualPoint[]): Array<{ dateIso: string; startIso: string; meanResidualKw: number; stdResidualKw: number; n: number; meanObservedKw: number }> {
  const byDay = new Map<string, { startIso: string; rs: number[]; obs: number[] }>();
  for (const p of points) {
    const ex = byDay.get(p.dateIso) || { startIso: p.tsStartIso, rs: [] as number[], obs: [] as number[] };
    ex.rs.push(p.residualKw);
    ex.obs.push(p.observedKw);
    if (p.tsStartIso < ex.startIso) ex.startIso = p.tsStartIso;
    byDay.set(p.dateIso, ex);
  }
  const keys = Array.from(byDay.keys()).sort((a, b) => a.localeCompare(b));
  const out: Array<{ dateIso: string; startIso: string; meanResidualKw: number; stdResidualKw: number; n: number; meanObservedKw: number }> = [];
  for (const k of keys) {
    const v = byDay.get(k)!;
    const n = v.rs.length;
    if (n < 8) continue;
    const mu = v.rs.reduce((a, b) => a + b, 0) / n;
    let ss = 0;
    for (const r of v.rs) ss += (r - mu) * (r - mu);
    const std = Math.sqrt(ss / Math.max(1, n - 1));
    const muObs = v.obs.reduce((a, b) => a + b, 0) / Math.max(1, v.obs.length);
    out.push({ dateIso: k, startIso: v.startIso, meanResidualKw: roundTo(mu, 6), stdResidualKw: roundTo(std, 6), n, meanObservedKw: roundTo(muObs, 6) });
  }
  return out;
}

export function computeAnomalyLedgerV1(args: {
  hourly: HourlyObservationV1[];
  expectedKwForObs: (o: HourlyObservationV1) => number | null;
  maxItems?: number;
}): { anomalies: AnomalyLedgerItemV1[]; warnings: string[] } {
  const max = Number.isFinite(Number(args.maxItems)) ? Math.max(0, Math.trunc(Number(args.maxItems))) : 50;
  const warnings: string[] = [];

  const pts = residualPoints({ hourly: args.hourly, expectedKwForObs: args.expectedKwForObs });
  if (pts.length < 7 * 24) warnings.push('truth.anomalies.insufficient_points');
  const scale = madScale(pts.map((p) => p.residualKw)) ?? null;
  if (scale === null || scale <= 1e-9) warnings.push('truth.anomalies.residual_scale_unstable');

  const spikesDrops = scale ? groupExtremeWindows({ points: pts, thresholdSigma: 4, scale, maxWindows: 30 }) : [];

  const daily = dailyResidualStats(pts);
  const drift = (() => {
    if (daily.length < 28) return null;
    const first = daily.slice(0, 7);
    const last = daily.slice(-7);
    const mu0 = first.reduce((s, d) => s + d.meanResidualKw, 0) / Math.max(1, first.length);
    const mu1 = last.reduce((s, d) => s + d.meanResidualKw, 0) / Math.max(1, last.length);
    const delta = mu1 - mu0;
    const obsMu = daily.reduce((s, d) => s + d.meanObservedKw, 0) / Math.max(1, daily.length);
    const thresh = Math.max(3, 0.12 * Math.max(1e-6, obsMu));
    if (Math.abs(delta) < thresh) return null;
    const cls: AnomalyClassV1 = 'DRIFT';
    const aux = driversAndDataForClass(cls);
    const conf = clamp01(0.45 + 0.45 * Math.min(1, Math.abs(delta) / Math.max(thresh, 1e-6)));
    return {
      id: stableId(['truthv1', cls, daily[0]!.startIso, addHoursIso(daily[daily.length - 1]!.startIso, 24), '1']),
      window: { startIso: daily[0]!.startIso, endIso: addHoursIso(daily[daily.length - 1]!.startIso, 24) },
      class: cls,
      magnitudeKwhOrKw: roundTo(Math.abs(delta), 6),
      confidence: roundTo(conf, 6),
      likelyDrivers: aux.likelyDrivers,
      requiredNextData: aux.requiredNextData,
    } satisfies AnomalyLedgerItemV1;
  })();

  const volatility = (() => {
    if (daily.length < 14) return [] as AnomalyLedgerItemV1[];
    const stds = daily.map((d) => d.stdResidualKw).filter((n) => Number.isFinite(n)).slice().sort((a, b) => a - b);
    const med = medianDeterministic(stds) ?? 0;
    const thresh = Math.max(1e-6, 2.2 * med);
    const worst = daily
      .filter((d) => d.stdResidualKw >= thresh)
      .slice()
      .sort((a, b) => b.stdResidualKw - a.stdResidualKw || a.dateIso.localeCompare(b.dateIso))
      .slice(0, 6);
    return worst.map((d, i) => {
      const cls: AnomalyClassV1 = 'VOLATILITY';
      const aux = driversAndDataForClass(cls);
      const conf = clamp01(0.35 + 0.55 * Math.min(1, d.stdResidualKw / Math.max(thresh, 1e-6)));
      return {
        id: stableId(['truthv1', cls, d.startIso, addHoursIso(d.startIso, 24), String(i + 1)]),
        window: { startIso: d.startIso, endIso: addHoursIso(d.startIso, 24) },
        class: cls,
        magnitudeKwhOrKw: roundTo(d.stdResidualKw, 6),
        confidence: roundTo(conf, 6),
        likelyDrivers: aux.likelyDrivers,
        requiredNextData: aux.requiredNextData,
      };
    });
  })();

  const schedule = (() => {
    if (pts.length < 21 * 24) return null;
    let sWe = 0,
      nWe = 0,
      sWd = 0,
      nWd = 0;
    for (const p of pts) {
      const isWe = p.dow === 0 || p.dow === 6;
      if (isWe) {
        sWe += p.residualKw;
        nWe += 1;
      } else {
        sWd += p.residualKw;
        nWd += 1;
      }
    }
    if (!nWe || !nWd) return null;
    const muWe = sWe / nWe;
    const muWd = sWd / nWd;
    const diff = muWe - muWd;
    const thresh = Math.max(2, 0.08 * Math.max(1e-6, Math.abs(muWd)));
    if (Math.abs(diff) < thresh) return null;
    const cls: AnomalyClassV1 = 'SCHEDULE';
    const aux = driversAndDataForClass(cls);
    const conf = clamp01(0.35 + 0.5 * Math.min(1, Math.abs(diff) / Math.max(thresh, 1e-6)));
    return {
      id: stableId(['truthv1', cls, pts[0]!.tsStartIso, addHoursIso(pts[pts.length - 1]!.tsStartIso, 1), '1']),
      window: { startIso: pts[0]!.tsStartIso, endIso: addHoursIso(pts[pts.length - 1]!.tsStartIso, 1) },
      class: cls,
      magnitudeKwhOrKw: roundTo(Math.abs(diff), 6),
      confidence: roundTo(conf, 6),
      likelyDrivers: aux.likelyDrivers,
      requiredNextData: aux.requiredNextData,
    } satisfies AnomalyLedgerItemV1;
  })();

  const all = [
    ...spikesDrops,
    ...(drift ? [drift] : []),
    ...volatility,
    ...(schedule ? [schedule] : []),
  ];

  const classRank: Record<AnomalyClassV1, number> = { DRIFT: 0, SPIKE: 1, DROP: 2, SCHEDULE: 3, VOLATILITY: 4 };
  all.sort(
    (a, b) =>
      Math.abs(b.magnitudeKwhOrKw) - Math.abs(a.magnitudeKwhOrKw) ||
      classRank[a.class] - classRank[b.class] ||
      b.confidence - a.confidence ||
      a.window.startIso.localeCompare(b.window.startIso) ||
      a.id.localeCompare(b.id),
  );

  const bounded = all.slice(0, max);
  if (bounded.length < all.length) warnings.push('truth.anomalies.bounded');
  return { anomalies: bounded, warnings };
}

