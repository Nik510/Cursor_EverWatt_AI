/**
 * Regression Analysis Utilities
 * Statistical analysis for energy consumption patterns and savings verification
 * Supports daily, weekly, monthly, and yearly aggregations
 */

export type Granularity = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface IntervalDataPoint {
  timestamp: Date;
  usage: number; // kWh
  demand: number; // kW
  temperature: number; // °F
}

export interface AggregatedDataPoint {
  period: string;
  startDate: Date;
  endDate: Date;
  totalUsage: number; // kWh
  avgDemand: number; // kW
  maxDemand: number; // kW
  avgTemperature: number; // °F
  heatingDegreeDays: number; // HDD
  coolingDegreeDays: number; // CDD
  dataPoints: number;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  adjustedRSquared: number;
  standardError: number;
  pValue: number;
  confidence95: { lower: number; upper: number };
  residuals: number[];
  predictedValues: number[];
  equation: string;
  model: 'simple' | 'multivariate';
  // Extended stats (optional; filled by OLS-based models)
  coefficients?: Array<{
    name: string;
    value: number;
    standardError: number;
    tStat: number;
    pValue: number;
    ci90: { lower: number; upper: number };
    ci95: { lower: number; upper: number };
  }>;
  anova?: {
    regression: { df: number; ss: number; ms: number };
    residual: { df: number; ss: number; ms: number };
    total: { df: number; ss: number };
    fStatistic: number;
    significanceF: number;
  };
  diagnostics?: {
    n: number;
    p: number;
    multipleR: number;
    rmse: number;
    yBar: number;
    sse: number;
    mse: number;
  };
}

export interface RegressionAnalysisResult {
  granularity: Granularity;
  aggregatedData: AggregatedDataPoint[];
  temperatureRegression: RegressionResult;
  cddRegression: RegressionResult | null;
  hddRegression: RegressionResult | null;
  multivariateRegression: RegressionResult | null;
  towtRegression: RegressionResult | null;
  changePointRegression: RegressionResult | null;
  baseload: number;
  heatingSlope: number;
  coolingSlope: number;
  changePoint: { heating: number; cooling: number };
  statistics: {
    totalUsage: number;
    avgUsage: number;
    maxUsage: number;
    minUsage: number;
    stdDevUsage: number;
    cvrmse: number; // Coefficient of Variation of RMSE
    nmbe: number; // Normalized Mean Bias Error
    mbe: number; // Mean Bias Error
  };
  // PG&E NMEC Compliance
  nmecCompliance: {
    cvrmsePass: boolean; // Must be < 25%
    nmbePass: boolean; // Must be ± 0.5% for NMEC (stricter) or ± 10% for general
    overallPass: boolean;
    modelType: 'TOWT' | 'Change-Point' | 'Mean' | 'Linear';
    savingsDetectable: boolean; // True if model can detect 10%+ savings
    uncertainty: number; // Fractional uncertainty at 90% confidence
  };
}

function olsToRegressionResult(
  fit: ReturnType<typeof ols>,
  columnNames: string[],
  y: number[],
  equation: string,
  primarySlopeName?: string
): RegressionResult {
  const dfErr = fit.dfErr;
  const t95 = dfErr > 0 ? tCriticalTwoSided(dfErr, 0.05) : 1.96;
  const t90 = dfErr > 0 ? tCriticalTwoSided(dfErr, 0.1) : 1.645;
  const coefficients = fit.beta.map((value, i) => ({
    name: columnNames[i],
    value,
    standardError: fit.se[i],
    tStat: fit.t[i],
    pValue: fit.p[i],
    ci90: { lower: value - t90 * fit.se[i], upper: value + t90 * fit.se[i] },
    ci95: { lower: value - t95 * fit.se[i], upper: value + t95 * fit.se[i] },
  }));

  const yBar = y.reduce((a, b) => a + b, 0) / y.length;
  const rmse = Math.sqrt(fit.sse / Math.max(1, fit.dfErr));
  const multipleR = Math.sqrt(Math.max(0, fit.r2));
  const mbe = fit.residuals.reduce((a, b) => a + b, 0) / Math.max(1, fit.residuals.length);
  const nmbe = yBar !== 0 ? (mbe / yBar) * 100 : 0;
  const cvrmse = yBar !== 0 ? (rmse / yBar) * 100 : 0;

  const intercept = coefficients[0]?.value ?? 0;
  const slope = primarySlopeName
    ? (coefficients.find((c) => c.name === primarySlopeName)?.value ?? 0)
    : (coefficients[1]?.value ?? 0);

  return {
    slope,
    intercept,
    rSquared: Math.max(0, Math.min(1, fit.r2)),
    adjustedRSquared: Math.max(0, Math.min(1, fit.adjR2)),
    standardError: Math.sqrt(Math.max(0, fit.mse)),
    pValue: Math.max(0, Math.min(1, fit.sigF)),
    confidence95: { lower: 0, upper: 0 },
    residuals: fit.residuals,
    predictedValues: fit.yHat,
    equation,
    model: 'multivariate',
    coefficients,
    anova: {
      regression: { df: fit.dfReg, ss: fit.ssr, ms: fit.dfReg > 0 ? fit.ssr / fit.dfReg : 0 },
      residual: { df: fit.dfErr, ss: fit.sse, ms: fit.mse },
      total: { df: y.length - 1, ss: fit.sst },
      fStatistic: fit.f,
      significanceF: fit.sigF,
    },
    diagnostics: {
      n: y.length,
      p: columnNames.length,
      multipleR,
      rmse,
      yBar,
      sse: fit.sse,
      mse: fit.mse,
      // GOF metrics (ASHRAE Guideline 14 style)
      // Note: for interval models, users often compute these on aggregated observations.
      // We expose them per-model; the top-level RegressionAnalysisResult also includes
      // GOF for the primary temperature model.
      cvrmse,
      nmbe,
      mbe,
    },
  };
}

/**
 * HDD/CDD regression using OLS (y = β0 + β1*HDD + β2*CDD)
 */
export function hddCddRegression(y: number[], hdd: number[], cdd: number[]): RegressionResult | null {
  const n = y.length;
  if (n < 4) return null;
  const X: Matrix = [];
  for (let i = 0; i < n; i++) X.push([1, hdd[i], cdd[i]]);
  const columnNames = ['Intercept', 'HDD', 'CDD'];
  try {
    const fit = ols(X, y, columnNames);
    const equation = `y = ${fit.beta[0].toFixed(2)} + ${fit.beta[1].toFixed(4)}×HDD + ${fit.beta[2].toFixed(4)}×CDD`;
    return olsToRegressionResult(fit, columnNames, y, equation, 'HDD');
  } catch {
    // Singular / collinear predictors (e.g., all HDD+CDD are zero) -> skip this model
    return null;
  }
}

export interface ChangePointFit {
  baseTempF: number;
  result: RegressionResult;
}

export interface UncertaintyMetrics {
  M: number; // number of aggregated observations
  m: number; // number of interval points backing those observations
  df: number; // degrees of freedom (M - p)
  CI: number; // confidence interval (0-1)
  alpha: number; // 1 - CI
  t: number; // t-critical (two-sided)
  F: number; // assumed fractional savings (e.g. 0.1 for 10%)
  U: number; // fractional uncertainty (0-1)
}

export function computeUncertaintyMetrics(args: {
  aggregatedData: AggregatedDataPoint[];
  regression: RegressionResult;
  confidence?: number; // 0-1
  assumedSavingsFraction?: number; // 0-1
}): UncertaintyMetrics {
  const M = args.aggregatedData.length;
  const m = args.aggregatedData.reduce((sum, d) => sum + (d.dataPoints || 0), 0);
  const p = args.regression.diagnostics?.p ?? 2;
  const df = Math.max(1, M - p);
  const CI = args.confidence ?? 0.9;
  const alpha = 1 - CI;
  const t = tCriticalTwoSided(df, alpha);
  const F = args.assumedSavingsFraction ?? 0.1;

  // Simple baseline fractional uncertainty model (exposed for UI; can be refined later)
  const rmse = args.regression.diagnostics?.rmse ?? args.regression.standardError;
  const yBar = args.regression.diagnostics?.yBar ?? 0;
  const U = yBar > 0 && M > 0 ? (t * rmse) / (yBar * Math.sqrt(M)) : 1;

  return { M, m, df, CI, alpha, t, F, U };
}

/**
 * 3-parameter change-point (single balance point):
 * y = β0 + β1*max(0, baseTemp - T) + β2*max(0, T - baseTemp)
 *
 * We grid-search baseTemp to maximize R² (tie-breaker: minimize SSE).
 */
export function changePointRegression(
  aggregated: AggregatedDataPoint[],
  baseTempSearch?: { minF?: number; maxF?: number; stepF?: number }
): ChangePointFit | null {
  const temps = aggregated.map((d) => d.avgTemperature);
  const y = aggregated.map((d) => d.totalUsage);
  const n = y.length;
  if (n < 10) return null;

  const minF = baseTempSearch?.minF ?? 45;
  const maxF = baseTempSearch?.maxF ?? 75;
  const stepF = baseTempSearch?.stepF ?? 1;

  let best: ChangePointFit | null = null;
  let bestR2 = -Infinity;
  let bestSse = Infinity;

  for (let base = minF; base <= maxF + 1e-9; base += stepF) {
    const X: Matrix = [];
    for (let i = 0; i < n; i++) {
      const t = temps[i];
      const heat = Math.max(0, base - t);
      const cool = Math.max(0, t - base);
      X.push([1, heat, cool]);
    }
    const columnNames = ['Intercept', 'Heating', 'Cooling'];
    let fit: ReturnType<typeof ols>;
    try {
      fit = ols(X, y, columnNames);
    } catch {
      continue;
    }
    if (fit.r2 > bestR2 + 1e-9 || (Math.abs(fit.r2 - bestR2) < 1e-9 && fit.sse < bestSse)) {
      bestR2 = fit.r2;
      bestSse = fit.sse;
      const equation = `y = ${fit.beta[0].toFixed(2)} + ${fit.beta[1].toFixed(4)}×max(0,${base.toFixed(
        0
      )}-T) + ${fit.beta[2].toFixed(4)}×max(0,T-${base.toFixed(0)})`;
      best = { baseTempF: base, result: olsToRegressionResult(fit, columnNames, y, equation, 'Heating') };
    }
  }

  return best;
}

type Matrix = number[][];

function transpose(A: Matrix): Matrix {
  const rows = A.length;
  const cols = A[0]?.length ?? 0;
  const T: Matrix = Array.from({ length: cols }, () => Array.from({ length: rows }, () => 0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      T[j][i] = A[i][j];
    }
  }
  return T;
}

function matMul(A: Matrix, B: Matrix): Matrix {
  const rA = A.length;
  const cA = A[0]?.length ?? 0;
  const rB = B.length;
  const cB = B[0]?.length ?? 0;
  if (cA !== rB) throw new Error('Matrix multiply dimension mismatch');
  const C: Matrix = Array.from({ length: rA }, () => Array.from({ length: cB }, () => 0));
  for (let i = 0; i < rA; i++) {
    for (let k = 0; k < cA; k++) {
      const aik = A[i][k];
      for (let j = 0; j < cB; j++) {
        C[i][j] += aik * B[k][j];
      }
    }
  }
  return C;
}

function matVecMul(A: Matrix, v: number[]): number[] {
  const rA = A.length;
  const cA = A[0]?.length ?? 0;
  if (cA !== v.length) throw new Error('Matrix-vector multiply dimension mismatch');
  const out = Array.from({ length: rA }, () => 0);
  for (let i = 0; i < rA; i++) {
    let sum = 0;
    for (let j = 0; j < cA; j++) sum += A[i][j] * v[j];
    out[i] = sum;
  }
  return out;
}

function identity(n: number): Matrix {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

function invert(A: Matrix): Matrix {
  const n = A.length;
  const m = A[0]?.length ?? 0;
  if (n === 0 || n !== m) throw new Error('Matrix must be square to invert');

  // Augment A with I and perform Gauss-Jordan
  const aug: Matrix = A.map((row, i) => [...row.map((x) => x), ...identity(n)[i]]);
  const N = 2 * n;

  for (let col = 0; col < n; col++) {
    // Find pivot
    let pivotRow = col;
    let maxAbs = Math.abs(aug[col][col]);
    for (let r = col + 1; r < n; r++) {
      const abs = Math.abs(aug[r][col]);
      if (abs > maxAbs) {
        maxAbs = abs;
        pivotRow = r;
      }
    }
    if (maxAbs < 1e-12) throw new Error('Matrix is singular (pivot too small)');

    // Swap
    if (pivotRow !== col) {
      const tmp = aug[col];
      aug[col] = aug[pivotRow];
      aug[pivotRow] = tmp;
    }

    // Normalize pivot row
    const pivot = aug[col][col];
    for (let c = 0; c < N; c++) aug[col][c] /= pivot;

    // Eliminate other rows
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      if (factor === 0) continue;
      for (let c = 0; c < N; c++) aug[r][c] -= factor * aug[col][c];
    }
  }

  // Extract inverse
  return aug.map((row) => row.slice(n));
}

// --- Distribution helpers (Numerical Recipes style approximations) ---
function logGamma(z: number): number {
  // Lanczos approximation
  const p = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) x += p[i] / (z + i + 1);
  const t = z + p.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(a: number, b: number, x: number): number {
  // Continued fraction for incomplete beta
  const MAXIT = 200;
  const EPS = 3e-7;
  const FPMIN = 1e-30;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt =
    Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)) / a;
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betacf(a, b, x);
  }
  return 1 - (bt * betacf(b, a, 1 - x));
}

function studentTCdf(t: number, df: number): number {
  // CDF for Student's t using incomplete beta
  // Based on relationship with regularized incomplete beta.
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;
  const ib = betai(a, b, x);
  if (t >= 0) return 1 - 0.5 * ib;
  return 0.5 * ib;
}

function fCdf(f: number, d1: number, d2: number): number {
  if (f <= 0) return 0;
  const x = (d1 * f) / (d1 * f + d2);
  return betai(d1 / 2, d2 / 2, x);
}

function tCriticalTwoSided(df: number, alpha: number): number {
  // Find t such that P(|T| <= t) = 1 - alpha
  // Binary search on t >= 0
  const target = 1 - alpha / 2;
  let lo = 0;
  let hi = 50;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const cdf = studentTCdf(mid, df);
    if (cdf < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function ols(
  X: Matrix,
  y: number[],
  columnNames: string[]
): {
  beta: number[];
  se: number[];
  t: number[];
  p: number[];
  yHat: number[];
  residuals: number[];
  r2: number;
  adjR2: number;
  sse: number;
  sst: number;
  ssr: number;
  mse: number;
  dfReg: number;
  dfErr: number;
  f: number;
  sigF: number;
} {
  const n = y.length;
  const p = columnNames.length;
  if (X.length !== n) throw new Error('X/y length mismatch');
  if (p === 0) throw new Error('No predictors');
  if (n <= p) throw new Error('Not enough observations for regression');

  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const XtXInv = invert(XtX);
  const Xty = matVecMul(Xt, y);
  const beta = matVecMul(XtXInv, Xty);

  const yHat = X.map((row) => row.reduce((sum, v, j) => sum + v * beta[j], 0));
  const residuals = y.map((yi, i) => yi - yHat[i]);

  const yBar = y.reduce((a, b) => a + b, 0) / n;
  const sse = residuals.reduce((sum, r) => sum + r * r, 0);
  const sst = y.reduce((sum, yi) => sum + (yi - yBar) * (yi - yBar), 0);
  const ssr = sst - sse;

  const r2 = sst !== 0 ? 1 - sse / sst : 0;
  const adjR2 = 1 - ((1 - r2) * (n - 1)) / (n - p);

  const dfReg = p - 1; // assumes intercept included
  const dfErr = n - p;
  const msr = dfReg > 0 ? ssr / dfReg : 0;
  const mse = dfErr > 0 ? sse / dfErr : 0;
  const f = mse > 0 ? msr / mse : 0;
  const sigF = dfReg > 0 && dfErr > 0 ? 1 - fCdf(f, dfReg, dfErr) : 1;

  const se = beta.map((_, j) => Math.sqrt(Math.max(0, mse * XtXInv[j][j])));
  const t = beta.map((b, j) => (se[j] > 0 ? b / se[j] : 0));
  const pvals = t.map((tv) => {
    if (dfErr <= 0) return 1;
    const cdf = studentTCdf(Math.abs(tv), dfErr);
    return Math.max(0, Math.min(1, 2 * (1 - cdf)));
  });

  return { beta, se, t, p: pvals, yHat, residuals, r2, adjR2, sse, sst, ssr, mse, dfReg, dfErr, f, sigF };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export interface TowtOptions {
  /**
   * Temperature knots used to create piecewise linear temperature basis variables.
   * Default matches the spreadsheet-style template (can be edited in the UI later).
   */
  temperatureKnotsF?: number[]; // e.g. [29,34,39,44,49,54,59] -> T1..T6
  /**
   * If true, include a Weekday indicator (Mon-Fri) instead of day dummies.
   * Default false -> include Monday..Saturday dummies, Sunday baseline.
   */
  useWeekdayIndicator?: boolean;
}

function buildTowtDesignMatrix(
  aggregated: AggregatedDataPoint[],
  opts: TowtOptions
): { X: Matrix; y: number[]; columnNames: string[] } {
  const knots = (opts.temperatureKnotsF?.length ? opts.temperatureKnotsF : [29, 34, 39, 44, 49, 54, 59]).slice().sort((a, b) => a - b);
  if (knots.length < 2) throw new Error('temperatureKnotsF must have at least 2 values');
  const segCount = knots.length - 1; // T1..TsegCount

  const columnNames: string[] = ['Intercept'];
  const useWeekday = Boolean(opts.useWeekdayIndicator);
  if (useWeekday) {
    columnNames.push('Weekday');
  } else {
    // Monday..Saturday; Sunday baseline (getDay() === 0)
    columnNames.push('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');
  }
  for (let i = 0; i < segCount; i++) columnNames.push(`T${i + 1}`);

  const X: Matrix = [];
  const y: number[] = [];

  for (const d of aggregated) {
    const row: number[] = [];
    row.push(1); // intercept

    const dow = d.startDate.getDay(); // 0=Sun,1=Mon,...6=Sat
    if (useWeekday) {
      row.push(dow >= 1 && dow <= 5 ? 1 : 0);
    } else {
      row.push(dow === 1 ? 1 : 0);
      row.push(dow === 2 ? 1 : 0);
      row.push(dow === 3 ? 1 : 0);
      row.push(dow === 4 ? 1 : 0);
      row.push(dow === 5 ? 1 : 0);
      row.push(dow === 6 ? 1 : 0);
    }

    const t = d.avgTemperature;
    for (let i = 0; i < segCount; i++) {
      const lo = knots[i];
      const hi = knots[i + 1];
      row.push(clamp(t - lo, 0, hi - lo));
    }

    X.push(row);
    y.push(d.totalUsage);
  }

  return { X, y, columnNames };
}

/**
 * Time-of-Week and Temperature regression (TOWT)
 * Day-of-week effects + piecewise-linear temperature basis.
 */
export function towtRegression(
  aggregated: AggregatedDataPoint[],
  opts: TowtOptions = {}
): RegressionResult | null {
  if (aggregated.length < 14) return null; // need enough points to fit dummies + knots stably
  const { X, y, columnNames } = buildTowtDesignMatrix(aggregated, opts);
  const n = y.length;
  const p = columnNames.length;
  if (n <= p) return null;

  try {
    const fit = ols(X, y, columnNames);
    const dfErr = fit.dfErr;
    const t95 = dfErr > 0 ? tCriticalTwoSided(dfErr, 0.05) : 1.96;
    const t90 = dfErr > 0 ? tCriticalTwoSided(dfErr, 0.1) : 1.645;

    const coefficients = fit.beta.map((value, i) => ({
      name: columnNames[i],
      value,
      standardError: fit.se[i],
      tStat: fit.t[i],
      pValue: fit.p[i],
      ci90: { lower: value - t90 * fit.se[i], upper: value + t90 * fit.se[i] },
      ci95: { lower: value - t95 * fit.se[i], upper: value + t95 * fit.se[i] },
    }));

    const yBar = y.reduce((a, b) => a + b, 0) / y.length;
    const rmse = Math.sqrt(fit.sse / Math.max(1, fit.dfErr));
    const multipleR = Math.sqrt(Math.max(0, fit.r2));

    // Provide a compact equation string (full equation is long for TOWT)
    const equation = `y = ${coefficients[0]?.value.toFixed(2)} + day_of_week + temp_knots`;

    return {
      slope: coefficients.find((c) => c.name === 'T1')?.value ?? 0,
      intercept: coefficients[0]?.value ?? 0,
      rSquared: Math.max(0, Math.min(1, fit.r2)),
      adjustedRSquared: Math.max(0, Math.min(1, fit.adjR2)),
      standardError: Math.sqrt(Math.max(0, fit.mse)),
      pValue: Math.max(0, Math.min(1, fit.sigF)),
      confidence95: { lower: 0, upper: 0 },
      residuals: fit.residuals,
      predictedValues: fit.yHat,
      equation,
      model: 'multivariate',
      coefficients,
      anova: {
        regression: { df: fit.dfReg, ss: fit.ssr, ms: fit.dfReg > 0 ? fit.ssr / fit.dfReg : 0 },
        residual: { df: fit.dfErr, ss: fit.sse, ms: fit.mse },
        total: { df: y.length - 1, ss: fit.sst },
        fStatistic: fit.f,
        significanceF: fit.sigF,
      },
      diagnostics: {
        n,
        p,
        multipleR,
        rmse,
        yBar,
        sse: fit.sse,
        mse: fit.mse,
      },
    };
  } catch {
    // Singular / collinear model matrix -> skip TOWT rather than failing analysis
    return null;
  }
}

/**
 * Parse interval CSV data into structured format
 */
export function parseIntervalData(csvContent: string): IntervalDataPoint[] {
  const lines = csvContent.trim().split('\n');
  const header = lines[0].split(',');
  
  // Find column indices
  const startDateIdx = header.findIndex(h => h.toLowerCase().includes('start date'));
  const usageIdx = header.findIndex(h => h.toLowerCase() === 'usage');
  const demandIdx = header.findIndex(h => h.toLowerCase().includes('peak demand') || h.toLowerCase().includes('demand'));
  const tempIdx = header.findIndex(h => h.toLowerCase().includes('temperature'));

  const data: IntervalDataPoint[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 3) continue;
    
    const timestamp = new Date(values[startDateIdx]);
    const usage = parseFloat(values[usageIdx]) || 0;
    const demand = demandIdx >= 0 ? parseFloat(values[demandIdx]) || 0 : usage * 4;
    const temperature = tempIdx >= 0 ? parseFloat(values[tempIdx]) || 65 : 65;
    
    if (!isNaN(timestamp.getTime()) && usage >= 0) {
      data.push({ timestamp, usage, demand, temperature });
    }
  }
  
  return data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Calculate Heating Degree Days (HDD) and Cooling Degree Days (CDD)
 */
function calculateDegreeDaysFromTemps(
  temperatures: number[],
  intervalHours: number,
  baseTemp: number = 65
): { hdd: number; cdd: number } {
  // Convert degree-hours to degree-days by scaling with intervalHours/24.
  let hdd = 0;
  let cdd = 0;

  for (const temp of temperatures) {
    if (temp < baseTemp) {
      hdd += (baseTemp - temp) * (intervalHours / 24);
    } else if (temp > baseTemp) {
      cdd += (temp - baseTemp) * (intervalHours / 24);
    }
  }

  return { hdd, cdd };
}

function inferIntervalHours(data: IntervalDataPoint[]): number {
  if (data.length < 2) return 0.25;
  const diffs: number[] = [];
  for (let i = 1; i < Math.min(data.length, 2000); i++) {
    const dt = data[i].timestamp.getTime() - data[i - 1].timestamp.getTime();
    if (dt > 0 && Number.isFinite(dt)) diffs.push(dt);
  }
  if (!diffs.length) return 0.25;
  diffs.sort((a, b) => a - b);
  const mid = diffs[Math.floor(diffs.length / 2)];
  const minutes = mid / 60000;
  if (!Number.isFinite(minutes) || minutes <= 0) return 0.25;
  return minutes / 60;
}

/**
 * Get week number from date
 */
function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}

/**
 * Get period key based on granularity
 */
function getPeriodKey(date: Date, granularity: Granularity): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  
  switch (granularity) {
    case 'hourly':
      return `${year}-${month}-${day} ${hour}:00`;
    case 'daily':
      return `${year}-${month}-${day}`;
    case 'weekly':
      return `${year}-W${String(getWeekNumber(date)).padStart(2, '0')}`;
    case 'monthly':
      return `${year}-${month}`;
    case 'yearly':
      return `${year}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

/**
 * Aggregate interval data by specified granularity
 */
export function aggregateData(data: IntervalDataPoint[], granularity: Granularity): AggregatedDataPoint[] {
  const groupedData = new Map<string, IntervalDataPoint[]>();
  const intervalHours = inferIntervalHours(data);
  
  // Group data by period
  for (const point of data) {
    const key = getPeriodKey(point.timestamp, granularity);
    if (!groupedData.has(key)) {
      groupedData.set(key, []);
    }
    groupedData.get(key)!.push(point);
  }
  
  // Aggregate each group
  const aggregated: AggregatedDataPoint[] = [];
  
  for (const [period, points] of groupedData) {
    const totalUsage = points.reduce((sum, p) => sum + p.usage, 0);
    const avgDemand = points.reduce((sum, p) => sum + p.demand, 0) / points.length;
    const maxDemand = Math.max(...points.map(p => p.demand));
    const temperatures = points.map(p => p.temperature);
    const avgTemperature = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;
    const { hdd, cdd } = calculateDegreeDaysFromTemps(temperatures, intervalHours);
    
    aggregated.push({
      period,
      startDate: new Date(Math.min(...points.map(p => p.timestamp.getTime()))),
      endDate: new Date(Math.max(...points.map(p => p.timestamp.getTime()))),
      totalUsage,
      avgDemand,
      maxDemand,
      avgTemperature,
      heatingDegreeDays: hdd,
      coolingDegreeDays: cdd,
      dataPoints: points.length,
    });
  }
  
  return aggregated.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Perform simple linear regression
 */
export function linearRegression(x: number[], y: number[]): RegressionResult {
  const n = x.length;
  if (n < 2) {
    return {
      slope: 0,
      intercept: 0,
      rSquared: 0,
      adjustedRSquared: 0,
      standardError: 0,
      pValue: 1,
      confidence95: { lower: 0, upper: 0 },
      residuals: [],
      predictedValues: [],
      equation: 'y = 0',
      model: 'simple',
    };
  }

  // Guard against singular matrix when x has (near) zero variance (e.g., temperature column missing -> constant)
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const varX = x.reduce((sum, xi) => sum + (xi - meanX) * (xi - meanX), 0) / n;
  if (varX < 1e-12) {
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    const predictedValues = y.map(() => meanY);
    const residuals = y.map((yi) => yi - meanY);
    const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
    const ssTot = y.reduce((sum, yi) => sum + (yi - meanY) * (yi - meanY), 0);
    const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
    const adjustedRSquared = 1 - ((1 - rSquared) * (n - 1)) / Math.max(1, n - 2);
    const rmse = Math.sqrt(ssRes / Math.max(1, n - 1));
    const mbe = residuals.reduce((a, b) => a + b, 0) / Math.max(1, residuals.length);
    const cvrmse = meanY !== 0 ? (rmse / meanY) * 100 : 0;
    const nmbe = meanY !== 0 ? (mbe / meanY) * 100 : 0;

    return {
      slope: 0,
      intercept: meanY,
      rSquared: Math.max(0, Math.min(1, rSquared)),
      adjustedRSquared: Math.max(0, Math.min(1, adjustedRSquared)),
      standardError: rmse,
      pValue: 1,
      confidence95: { lower: 0, upper: 0 },
      residuals,
      predictedValues,
      equation: `y = ${meanY.toFixed(2)}`,
      model: 'simple',
      diagnostics: {
        n,
        p: 1,
        multipleR: Math.sqrt(Math.max(0, rSquared)),
        rmse,
        yBar: meanY,
        sse: ssRes,
        mse: ssRes / Math.max(1, n - 1),
        cvrmse,
        nmbe,
        mbe,
      },
    };
  }

  const X: Matrix = [];
  for (let i = 0; i < n; i++) X.push([1, x[i]]);
  const columnNames = ['Intercept', 'x'];
  try {
    const fit = ols(X, y, columnNames);
    const equation = `y = ${fit.beta[1].toFixed(4)}x + ${fit.beta[0].toFixed(2)}`;
    // Keep model:'simple' for backward UI expectations
    const res = olsToRegressionResult(fit, columnNames, y, equation, 'x');
    return { ...res, model: 'simple' };
  } catch {
    // As a last resort, fall back to a mean-only model
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    const predictedValues = y.map(() => meanY);
    const residuals = y.map((yi) => yi - meanY);
    return {
      slope: 0,
      intercept: meanY,
      rSquared: 0,
      adjustedRSquared: 0,
      standardError: 0,
      pValue: 1,
      confidence95: { lower: 0, upper: 0 },
      residuals,
      predictedValues,
      equation: `y = ${meanY.toFixed(2)}`,
      model: 'simple',
    };
  }
}

/**
 * Perform multivariate regression (usage vs HDD + CDD)
 */
export function multivariateRegression(
  y: number[],
  hdd: number[],
  cdd: number[]
): RegressionResult | null {
  // Backward-compatible wrapper around OLS-based HDD/CDD model
  return hddCddRegression(y, hdd, cdd);
}

/**
 * Perform comprehensive regression analysis
 */
export function performRegressionAnalysis(
  data: IntervalDataPoint[],
  granularity: Granularity
): RegressionAnalysisResult {
  // Aggregate data
  const aggregatedData = aggregateData(data, granularity);
  
  // Extract arrays for regression
  const usage = aggregatedData.map(d => d.totalUsage);
  const temperature = aggregatedData.map(d => d.avgTemperature);
  const hdd = aggregatedData.map(d => d.heatingDegreeDays);
  const cdd = aggregatedData.map(d => d.coolingDegreeDays);
  
  // Perform regressions
  const temperatureRegression = linearRegression(temperature, usage);
  const cddRegression = cdd.some(v => v > 0) ? linearRegression(cdd, usage) : null;
  const hddRegression = hdd.some(v => v > 0) ? linearRegression(hdd, usage) : null;
  const multivariateReg = multivariateRegression(usage, hdd, cdd);
  const cpFit = changePointRegression(aggregatedData);
  const towtReg = towtRegression(aggregatedData);
  
  // Calculate statistics
  const totalUsage = usage.reduce((a, b) => a + b, 0);
  const avgUsage = totalUsage / usage.length;
  const maxUsage = Math.max(...usage);
  const minUsage = Math.min(...usage);
  const variance = usage.reduce((sum, u) => sum + (u - avgUsage) ** 2, 0) / usage.length;
  const stdDevUsage = Math.sqrt(variance);
  
  // CVRMSE (Coefficient of Variation of RMSE)
  const rmse = Math.sqrt(
    temperatureRegression.residuals.reduce((sum, r) => sum + r ** 2, 0) / 
    temperatureRegression.residuals.length
  );
  const cvrmse = (rmse / avgUsage) * 100;
  
  // NMBE (Normalized Mean Bias Error)
  const mbe = temperatureRegression.residuals.reduce((a, b) => a + b, 0) / 
    temperatureRegression.residuals.length;
  const nmbe = (mbe / avgUsage) * 100;
  
  // Estimate baseload (intercept) and slopes
  const baseload = temperatureRegression.intercept;
  const heatingSlope = hddRegression?.slope || 0;
  const coolingSlope = cddRegression?.slope || 0;
  
  // PG&E NMEC Compliance Checks
  const cvrmsePass = cvrmse < 25; // ASHRAE/NMEC threshold
  const nmbePass = Math.abs(nmbe) < 0.5; // Strict NMEC threshold (0.5%)
  const nmbePassGeneral = Math.abs(nmbe) < 10; // General ASHRAE threshold (10%)
  
  // Determine model type based on analysis
  let modelType: 'TOWT' | 'Change-Point' | 'Mean' | 'Linear' = 'Linear';
  if (temperatureRegression.rSquared < 0.1) {
    modelType = 'Mean';
  } else if (towtReg && towtReg.rSquared > Math.max(temperatureRegression.rSquared, multivariateReg?.rSquared ?? 0)) {
    modelType = 'TOWT';
  } else if (cpFit && cpFit.result.rSquared > Math.max(temperatureRegression.rSquared, multivariateReg?.rSquared ?? 0)) {
    modelType = 'Change-Point';
  } else if (multivariateReg && multivariateReg.rSquared > temperatureRegression.rSquared) {
    modelType = 'Change-Point'; // Using HDD/CDD suggests change-point behavior
  }
  
  // Calculate fractional uncertainty at 90% confidence
  // Simplified ASHRAE uncertainty calculation
  const tValue90 = 1.645; // t-value for 90% confidence
  const n = aggregatedData.length;
  const uncertainty = n > 2 ? (tValue90 * temperatureRegression.standardError) / (avgUsage * Math.sqrt(n)) : 1;
  
  // Savings detectable if uncertainty < 50% (can detect 10% savings with confidence)
  const savingsDetectable = uncertainty < 0.5 && temperatureRegression.rSquared > 0.5;
  
  return {
    granularity,
    aggregatedData,
    temperatureRegression,
    cddRegression,
    hddRegression,
    multivariateRegression: multivariateReg,
    towtRegression: towtReg,
    changePointRegression: cpFit?.result ?? null,
    baseload,
    heatingSlope,
    coolingSlope,
    changePoint: { heating: cpFit?.baseTempF ?? 65, cooling: cpFit?.baseTempF ?? 65 }, // Best-fit (or default) balance temp
    statistics: {
      totalUsage,
      avgUsage,
      maxUsage,
      minUsage,
      stdDevUsage,
      cvrmse,
      nmbe,
      mbe,
    },
    nmecCompliance: {
      cvrmsePass,
      nmbePass,
      overallPass: cvrmsePass && nmbePassGeneral, // Use general threshold for overall
      modelType,
      savingsDetectable,
      uncertainty,
    },
  };
}

/**
 * Format regression results for display
 */
export function formatRegressionSummary(result: RegressionAnalysisResult, regression?: RegressionResult): string {
  const temperatureRegression = regression ?? result.temperatureRegression;
  const { statistics, granularity } = result;
  
  return `
Regression Analysis Summary (${granularity.charAt(0).toUpperCase() + granularity.slice(1)})
==========================================================================

Model Equation: ${temperatureRegression.equation}

Model Fit Statistics:
  R² (Coefficient of Determination): ${(temperatureRegression.rSquared * 100).toFixed(2)}%
  Adjusted R²: ${(temperatureRegression.adjustedRSquared * 100).toFixed(2)}%
  Standard Error: ${temperatureRegression.standardError.toFixed(2)}
  p-value: ${temperatureRegression.pValue.toFixed(4)}

ASHRAE Guideline 14 Metrics:
  CV(RMSE): ${statistics.cvrmse.toFixed(2)}% (${statistics.cvrmse < 25 ? 'PASS' : 'FAIL'} - limit 25%)
  NMBE: ${statistics.nmbe.toFixed(2)}% (${Math.abs(statistics.nmbe) < 10 ? 'PASS' : 'FAIL'} - limit ±10%)

Energy Statistics:
  Total Usage: ${statistics.totalUsage.toLocaleString()} kWh
  Average Usage: ${statistics.avgUsage.toLocaleString()} kWh
  Max Usage: ${statistics.maxUsage.toLocaleString()} kWh
  Min Usage: ${statistics.minUsage.toLocaleString()} kWh
  Std. Deviation: ${statistics.stdDevUsage.toLocaleString()} kWh

Baseload Estimate: ${result.baseload.toFixed(2)} kWh
Heating Slope: ${result.heatingSlope.toFixed(4)} kWh/HDD
Cooling Slope: ${result.coolingSlope.toFixed(4)} kWh/CDD
`.trim();
}

/**
 * Generate chart data for regression visualization
 */
export function generateRegressionChartData(result: RegressionAnalysisResult, regression?: RegressionResult) {
  const { aggregatedData } = result;
  const temperatureRegression = regression ?? result.temperatureRegression;
  
  // Scatter plot data with regression line
  const scatterData = aggregatedData.map((d, i) => ({
    period: d.period,
    temperature: d.avgTemperature,
    actualUsage: d.totalUsage,
    predictedUsage: temperatureRegression.predictedValues[i],
    residual: temperatureRegression.residuals[i],
  }));
  
  // Time series data
  const timeSeriesData = aggregatedData.map((d, i) => ({
    period: d.period,
    date: d.startDate,
    actualUsage: d.totalUsage,
    predictedUsage: temperatureRegression.predictedValues[i],
    temperature: d.avgTemperature,
    hdd: d.heatingDegreeDays,
    cdd: d.coolingDegreeDays,
    maxDemand: d.maxDemand,
  }));
  
  // Regression line endpoints for overlay
  const temps = aggregatedData.map(d => d.avgTemperature);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  
  const regressionLine = [
    { temperature: minTemp, usage: temperatureRegression.slope * minTemp + temperatureRegression.intercept },
    { temperature: maxTemp, usage: temperatureRegression.slope * maxTemp + temperatureRegression.intercept },
  ];
  
  return {
    scatterData,
    timeSeriesData,
    regressionLine,
  };
}
