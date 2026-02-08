import type { EvidenceItemV1 } from '../determinants/types';
import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';
import type { LoadAttributionClassificationV1, LoadAttributionResultV1 } from './types';

export type LoadAttributionPointV1 = {
  timestampIso?: string;
  kw: number;
  temperatureF: number;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
}

function stddev(xs: number[]): number {
  const m = mean(xs);
  const v = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(Math.max(0, v));
}

function percentile(xs: number[], p: number): number | null {
  const vals = xs.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!vals.length) return null;
  const q = Math.max(0, Math.min(1, p));
  const idx = Math.min(vals.length - 1, Math.max(0, Math.round((vals.length - 1) * q)));
  return vals[idx];
}

type FitV1 = {
  tb: number;
  base: number;
  heatSlope: number;
  coolSlope: number;
  r2: number;
  sse: number;
};

function solve3x3(A: number[][], b: number[]): number[] | null {
  // Gaussian elimination with partial pivoting.
  const M = A.map((row) => row.slice());
  const x = b.slice();
  const n = 3;

  for (let i = 0; i < n; i++) {
    // Pivot
    let pivotRow = i;
    let pivotAbs = Math.abs(M[i][i] || 0);
    for (let r = i + 1; r < n; r++) {
      const v = Math.abs(M[r][i] || 0);
      if (v > pivotAbs) {
        pivotAbs = v;
        pivotRow = r;
      }
    }
    if (pivotAbs < 1e-12) return null;
    if (pivotRow !== i) {
      const tmp = M[i];
      M[i] = M[pivotRow];
      M[pivotRow] = tmp;
      const tb = x[i];
      x[i] = x[pivotRow];
      x[pivotRow] = tb;
    }

    // Eliminate
    const piv = M[i][i];
    for (let r = i + 1; r < n; r++) {
      const f = (M[r][i] || 0) / piv;
      for (let c = i; c < n; c++) M[r][c] = (M[r][c] || 0) - f * (M[i][c] || 0);
      x[r] = x[r] - f * x[i];
    }
  }

  // Back substitution
  const sol = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = x[i];
    for (let c = i + 1; c < n; c++) sum -= (M[i][c] || 0) * sol[c];
    const piv = M[i][i];
    if (Math.abs(piv) < 1e-12) return null;
    sol[i] = sum / piv;
  }
  return sol;
}

function fitForTb(points: LoadAttributionPointV1[], tb: number): FitV1 | null {
  // Model: y = b0 + b1*heat + b2*cool
  // heat=max(0, tb - T), cool=max(0, T - tb)
  let n = 0;
  let sumY = 0;

  // Accumulate X'X and X'Y
  // X = [1, heat, cool]
  const XtX = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const Xty = [0, 0, 0];

  for (const p of points) {
    const y = Number(p.kw);
    const T = Number(p.temperatureF);
    if (!Number.isFinite(y) || !Number.isFinite(T)) continue;
    const heat = Math.max(0, tb - T);
    const cool = Math.max(0, T - tb);
    const x0 = 1;
    const x1 = heat;
    const x2 = cool;

    sumY += y;
    n++;

    XtX[0][0] += x0 * x0;
    XtX[0][1] += x0 * x1;
    XtX[0][2] += x0 * x2;
    XtX[1][0] += x1 * x0;
    XtX[1][1] += x1 * x1;
    XtX[1][2] += x1 * x2;
    XtX[2][0] += x2 * x0;
    XtX[2][1] += x2 * x1;
    XtX[2][2] += x2 * x2;

    Xty[0] += x0 * y;
    Xty[1] += x1 * y;
    Xty[2] += x2 * y;
  }

  if (n < 3) return null;
  const beta = solve3x3(XtX, Xty);
  if (!beta) return null;

  let base = beta[0];
  let heatSlope = beta[1];
  let coolSlope = beta[2];

  // Enforce non-negative slopes (deterministic clamp).
  if (heatSlope < 0) heatSlope = 0;
  if (coolSlope < 0) coolSlope = 0;

  // Recompute intercept as mean residual when slopes clamped.
  const yBar = sumY / n;
  // b0 = mean(y - b1*heat - b2*cool)
  let sumAdj = 0;
  let n2 = 0;
  for (const p of points) {
    const y = Number(p.kw);
    const T = Number(p.temperatureF);
    if (!Number.isFinite(y) || !Number.isFinite(T)) continue;
    const heat = Math.max(0, tb - T);
    const cool = Math.max(0, T - tb);
    sumAdj += y - heatSlope * heat - coolSlope * cool;
    n2++;
  }
  if (n2 > 0) base = sumAdj / n2;

  let sse = 0;
  let sst = 0;
  for (const p of points) {
    const y = Number(p.kw);
    const T = Number(p.temperatureF);
    if (!Number.isFinite(y) || !Number.isFinite(T)) continue;
    const heat = Math.max(0, tb - T);
    const cool = Math.max(0, T - tb);
    const yHat = base + heatSlope * heat + coolSlope * cool;
    const e = y - yHat;
    sse += e * e;
    const dy = y - yBar;
    sst += dy * dy;
  }

  const r2 = sst > 0 ? 1 - sse / sst : 0;
  return { tb, base, heatSlope, coolSlope, r2: Math.max(0, Math.min(1, r2)), sse };
}

function classify(args: { r2: number; heatSlope: number; coolSlope: number }): LoadAttributionClassificationV1 {
  const r2ok = args.r2 >= 0.4;
  const h = Math.max(0, args.heatSlope);
  const c = Math.max(0, args.coolSlope);
  const eps = 0.08;

  if (h < eps && c < eps) return 'base_load';
  if (!r2ok) return 'mixed';

  if (c >= eps && h < eps) return 'cooling_driven';
  if (h >= eps && c < eps) return 'heating_driven';

  if (c >= h * 1.5) return 'cooling_driven';
  if (h >= c * 1.5) return 'heating_driven';
  return 'mixed';
}

export function analyzeLoadAttributionV1(args: {
  points: Array<{ kw: number; temperatureF?: number | null; timestampIso?: string }>;
  tbSearch?: { minF?: number; maxF?: number; stepF?: number };
  minPoints?: number;
  minTempStddevF?: number;
}): LoadAttributionResultV1 {
  const evidence: EvidenceItemV1[] = [];
  const because: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];
  const warnings: string[] = [];

  const ptsAll = Array.isArray(args.points) ? args.points : [];
  const pts = ptsAll
    .map((p) => ({ kw: Number(p.kw), temperatureF: Number(p.temperatureF), timestampIso: p.timestampIso }))
    .filter((p) => Number.isFinite(p.kw) && Number.isFinite(p.temperatureF)) as LoadAttributionPointV1[];

  const hasWeather = pts.length > 0;
  if (!hasWeather) {
    missingInfo.push({
      id: 'loadAttribution.weather.missing',
      category: 'tariff',
      severity: 'info',
      description: 'Weather data missing in interval export; load attribution unavailable.',
    });
    return {
      hasWeather: false,
      status: 'no_weather',
      modelType: 'change_point_v0',
      loadAttributionVersionTag: 'cp_v0',
      because: ['No temperatureF present on interval points; cannot perform load attribution.'],
      evidence,
      missingInfo,
      warnings,
    };
  }

  const temps = pts.map((p) => p.temperatureF);
  const tStd = stddev(temps);
  const minPoints = Math.max(50, Math.floor(Number(args.minPoints ?? 1000)));
  const minStd = Number(args.minTempStddevF ?? 3);

  const p10 = percentile(temps, 0.1);
  const p90 = percentile(temps, 0.9);

  evidence.push({ kind: 'assumption', pointer: { source: 'loadAttribution', key: 'model', value: 'kW = base + coolSlope*max(0,T-Tb) + heatSlope*max(0,Tb-T)' } });
  evidence.push({ kind: 'assumption', pointer: { source: 'loadAttribution', key: 'minPoints', value: minPoints } });
  evidence.push({ kind: 'assumption', pointer: { source: 'loadAttribution', key: 'minTempStddevF', value: minStd } });
  if (Number.isFinite(p10) && Number.isFinite(p90)) {
    evidence.push({ kind: 'intervalCalc', pointer: { source: 'loadAttribution', key: 'tempP10F', value: Number(p10) } });
    evidence.push({ kind: 'intervalCalc', pointer: { source: 'loadAttribution', key: 'tempP90F', value: Number(p90) } });
  }

  if (pts.length < minPoints || !Number.isFinite(tStd) || tStd < minStd) {
    missingInfo.push({
      id: 'loadAttribution.insufficientData',
      category: 'tariff',
      severity: 'info',
      description: 'Insufficient weather/interval data to fit change-point model (need more points and temperature variation).',
    });
    because.push(`Eligible points with temperature=${pts.length}; minPoints=${minPoints}.`);
    because.push(`Temperature stddev≈${Number.isFinite(tStd) ? tStd.toFixed(2) : 'n/a'}F; minStddev=${minStd}F.`);
    return {
      hasWeather: true,
      status: 'insufficient_data',
      modelType: 'change_point_v0',
      loadAttributionVersionTag: 'cp_v0',
      because,
      evidence,
      missingInfo,
      warnings,
    };
  }

  const baseMinF = Number(args.tbSearch?.minF ?? 40);
  const baseMaxF = Number(args.tbSearch?.maxF ?? 85);
  const stepF = Number(args.tbSearch?.stepF ?? 1);
  let minF = baseMinF;
  let maxF = baseMaxF;
  if (Number.isFinite(p10) && Number.isFinite(p90)) {
    minF = Math.max(45, Math.floor(Number(p10)));
    maxF = Math.min(85, Math.ceil(Number(p90)));
    if (minF > maxF) {
      minF = Math.max(45, Math.min(85, Math.floor(Number(p10))));
      maxF = Math.min(85, Math.max(45, Math.ceil(Number(p90))));
    }
  }
  evidence.push({ kind: 'assumption', pointer: { source: 'loadAttribution', key: 'tbSearchBase', value: `${baseMinF}..${baseMaxF} step ${stepF}` } });
  evidence.push({ kind: 'assumption', pointer: { source: 'loadAttribution', key: 'tbSearch', value: `${minF}..${maxF} step ${stepF}` } });
  if ((minF !== baseMinF || maxF !== baseMaxF) && Number.isFinite(p10) && Number.isFinite(p90)) {
    evidence.push({
      kind: 'assumption',
      pointer: { source: 'loadAttribution', key: 'tbSearchClamped', value: `clamped to p10/p90 with [45,85] bounds` },
    });
  }

  let best: FitV1 | null = null;
  for (let tb = minF; tb <= maxF + 1e-9; tb += stepF) {
    const fit = fitForTb(pts, tb);
    if (!fit) continue;
    if (!best) {
      best = fit;
      continue;
    }
    if (fit.r2 > best.r2 + 1e-9) best = fit;
    else if (Math.abs(fit.r2 - best.r2) <= 1e-9 && fit.sse < best.sse) best = fit;
  }

  if (!best) {
    missingInfo.push({
      id: 'loadAttribution.fit.failed',
      category: 'tariff',
      severity: 'warning',
      description: 'Change-point regression could not be fit (singular or insufficient variability).',
    });
    because.push('Grid search did not produce a valid fit.');
    return {
      hasWeather: true,
      status: 'insufficient_data',
      modelType: 'change_point_v0',
      loadAttributionVersionTag: 'cp_v0',
      because,
      evidence,
      missingInfo,
      warnings,
    };
  }

  const classification = classify({ r2: best.r2, heatSlope: best.heatSlope, coolSlope: best.coolSlope });
  const summary = `Best Tb=${best.tb.toFixed(0)}F; R²=${best.r2.toFixed(2)}; base≈${best.base.toFixed(1)}kW; coolSlope≈${best.coolSlope.toFixed(2)}kW/°F; heatSlope≈${best.heatSlope.toFixed(2)}kW/°F.`;
  because.push(summary);
  because.push(`classification=${classification}. points=${pts.length} tempStddev≈${tStd.toFixed(2)}F.`);

  evidence.push({ kind: 'intervalCalc', pointer: { source: 'loadAttribution', key: 'selectedTbF', value: best.tb } });
  evidence.push({ kind: 'intervalCalc', pointer: { source: 'loadAttribution', key: 'baseLoadKw', value: best.base } });
  evidence.push({ kind: 'intervalCalc', pointer: { source: 'loadAttribution', key: 'coolingSlopeKwPerF', value: best.coolSlope } });
  evidence.push({ kind: 'intervalCalc', pointer: { source: 'loadAttribution', key: 'heatingSlopeKwPerF', value: best.heatSlope } });
  evidence.push({ kind: 'intervalCalc', pointer: { source: 'loadAttribution', key: 'r2', value: best.r2 } });

  if (best.r2 < 0.25) warnings.push('Model fit is weak (low R²); treat classification as indicative only.');

  return {
    hasWeather: true,
    status: 'ok',
    modelType: 'change_point_v0',
    loadAttributionVersionTag: 'cp_v0',
    balanceTempF: best.tb,
    baseLoadKw: best.base,
    coolingSlopeKwPerF: best.coolSlope,
    heatingSlopeKwPerF: best.heatSlope,
    r2: best.r2,
    classification,
    because,
    evidence,
    missingInfo,
    warnings: warnings.length ? warnings : undefined,
  };
}

