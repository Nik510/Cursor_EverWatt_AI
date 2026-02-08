import type { WeatherProvider } from './provider';
import type { UtilityInputs } from '../types';
import type { WeatherSeriesPoint } from './types';

export type IntervalKwPointWithTemp = { timestampIso: string; kw: number; tempF?: number };

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function toDate(tsIso: string): Date | null {
  const d = new Date(tsIso);
  return Number.isFinite(d.getTime()) ? d : null;
}

function mean(arr: number[]): number {
  const v = arr.filter((n) => Number.isFinite(n));
  if (!v.length) return 0;
  return v.reduce((s, x) => s + x, 0) / v.length;
}

/**
 * OLS for y = a + b*x1 + c*x2
 */
function ols2(X1: number[], X2: number[], Y: number[]): { a: number; b: number; c: number; r2: number } | null {
  const n = Math.min(X1.length, X2.length, Y.length);
  if (n < 8) return null;

  // Build sums
  let s1 = 0,
    s2 = 0,
    sy = 0,
    s11 = 0,
    s22 = 0,
    s12 = 0,
    s1y = 0,
    s2y = 0;
  for (let i = 0; i < n; i++) {
    const x1 = X1[i];
    const x2 = X2[i];
    const y = Y[i];
    if (!Number.isFinite(x1) || !Number.isFinite(x2) || !Number.isFinite(y)) return null;
    s1 += x1;
    s2 += x2;
    sy += y;
    s11 += x1 * x1;
    s22 += x2 * x2;
    s12 += x1 * x2;
    s1y += x1 * y;
    s2y += x2 * y;
  }

  // Solve normal equations for [a,b,c] in:
  // [ n   s1   s2 ] [a] = [ sy  ]
  // [ s1  s11  s12] [b] = [ s1y ]
  // [ s2  s12  s22] [c] = [ s2y ]
  const A = [
    [n, s1, s2],
    [s1, s11, s12],
    [s2, s12, s22],
  ];
  const B = [sy, s1y, s2y];

  const det =
    A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;

  const inv = (m: number[][]): number[][] => {
    const d = det;
    return [
      [(m[1][1] * m[2][2] - m[1][2] * m[2][1]) / d, (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / d, (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / d],
      [(m[1][2] * m[2][0] - m[1][0] * m[2][2]) / d, (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / d, (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / d],
      [(m[1][0] * m[2][1] - m[1][1] * m[2][0]) / d, (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / d, (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / d],
    ];
  };

  const Ai = inv(A);
  const a = Ai[0][0] * B[0] + Ai[0][1] * B[1] + Ai[0][2] * B[2];
  const b = Ai[1][0] * B[0] + Ai[1][1] * B[1] + Ai[1][2] * B[2];
  const c = Ai[2][0] * B[0] + Ai[2][1] * B[1] + Ai[2][2] * B[2];

  const yBar = sy / n;
  let sst = 0;
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const y = Y[i];
    const yHat = a + b * X1[i] + c * X2[i];
    sst += (y - yBar) * (y - yBar);
    sse += (y - yHat) * (y - yHat);
  }
  const r2 = sst > 0 ? 1 - sse / sst : 0;
  return { a, b, c, r2: clamp01(r2) };
}

function indexSeriesByTs(points: Array<{ timestampIso: string; v: number }>): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of points) {
    const k = String(p.timestampIso || '').trim();
    const v = Number(p.v);
    if (!k || !Number.isFinite(v)) continue;
    // If duplicates, keep last (deterministic).
    m.set(k, v);
  }
  return m;
}

export async function runWeatherRegressionV1(args: {
  inputs: UtilityInputs;
  intervalKw: IntervalKwPointWithTemp[] | null;
  provider?: WeatherProvider;
}): Promise<{
  available: boolean;
  coolingSlope?: number;
  heatingSlope?: number;
  r2?: number;
  method: 'regression_v1';
  reasons: string[];
  requiredInputsMissing: string[];
}> {
  const reasons: string[] = [];
  const requiredInputsMissing: string[] = [];

  if (!args.provider) {
    return {
      available: false,
      method: 'regression_v1',
      reasons: ['Weather provider not configured.'],
      requiredInputsMissing: ['Weather series not available; provide weather data or configure provider.'],
    };
  }
  if (!Array.isArray(args.intervalKw) || args.intervalKw.length < 100) {
    return {
      available: false,
      method: 'regression_v1',
      reasons: ['Insufficient interval data to run regression.'],
      requiredInputsMissing: ['Interval kW series required for weather regression (at least ~100 points).'],
    };
  }

  const parsed = args.intervalKw
    .map((r) => {
      const d = toDate(String(r.timestampIso || '').trim());
      const kw = Number(r.kw);
      if (!d || !Number.isFinite(kw)) return null;
      return { ts: d.toISOString(), t: d.getTime(), kw };
    })
    .filter(Boolean) as Array<{ ts: string; t: number; kw: number }>;

  if (!parsed.length) {
    return {
      available: false,
      method: 'regression_v1',
      reasons: ['Interval series contained no valid points.'],
      requiredInputsMissing: ['Valid interval timestamps and kW values required for weather regression.'],
    };
  }

  const startIso = parsed[0].ts;
  const endIso = parsed[parsed.length - 1].ts;

  const weather = await args.provider.getWeatherSeries({ inputs: args.inputs, startIso, endIso });
  if (!weather || !Array.isArray(weather.points) || weather.points.length === 0) {
    return {
      available: false,
      method: 'regression_v1',
      reasons: ['Weather provider returned no series for requested date range.'],
      requiredInputsMissing: ['Weather series not available; provide weather data or configure provider.'],
    };
  }

  const tempPoints = (weather.points || [])
    .map((p: WeatherSeriesPoint) => ({ timestampIso: String(p.timestampIso || '').trim(), v: Number(p.tempF) }))
    .filter((p) => p.timestampIso && Number.isFinite(p.v));
  const byTs = indexSeriesByTs(tempPoints);

  // Align on exact timestamps for v1.
  const Y: number[] = [];
  const coolX: number[] = [];
  const heatX: number[] = [];
  const baseF = 65;
  for (const r of parsed) {
    const temp = byTs.get(r.ts);
    if (!Number.isFinite(temp ?? NaN)) continue;
    Y.push(r.kw);
    coolX.push(Math.max(0, (temp as number) - baseF));
    heatX.push(Math.max(0, baseF - (temp as number)));
  }

  if (Y.length < 40) {
    return {
      available: false,
      method: 'regression_v1',
      reasons: ['Not enough overlapping timestamps between load series and weather series.'],
      requiredInputsMissing: ['Aligned weather series required; provide weather points at the same timestamps as interval load or provide an adapter that aligns series.'],
    };
  }

  const fit = ols2(heatX, coolX, Y);
  if (!fit) {
    return {
      available: false,
      method: 'regression_v1',
      reasons: ['Regression could not be fit (singular or invalid inputs).'],
      requiredInputsMissing: ['Sufficient variability and aligned weather/load series required for regression.'],
    };
  }

  const yBar = mean(Y);
  reasons.push(`Fit OLS model: kw = a + heatingSlope*HDD65 + coolingSlope*CDD65 (n=${Y.length}).`);
  reasons.push(`Mean load=${yBar.toFixed(2)} kW; r2=${fit.r2.toFixed(3)}.`);
  reasons.push('v1 uses exact timestamp alignment and a fixed 65°F balance point for explainability.');

  return {
    available: true,
    method: 'regression_v1',
    heatingSlope: fit.b,
    coolingSlope: fit.c,
    r2: fit.r2,
    reasons,
    requiredInputsMissing,
  };
}

