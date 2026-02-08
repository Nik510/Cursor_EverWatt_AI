import type { LoadShapeMetrics } from '../types';
import type { IntervalKwPoint } from './analyzeLoadShape';

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

export type LoadShiftPotentialResult = {
  score: number; // 0..1
  candidateShiftWindows: Array<{ name: string; startHour: number; endHour: number; reasons: string[] }>;
  constraintsDetected: string[];
  reasons: string[];
  requiredInputsMissing: string[];
};

/**
 * Deterministic heuristic (v1):
 * - Higher when load is peaky and repeatable in a narrow window
 * - Higher when evening/late-afternoon peaks exist (common TOU windows)
 * - Penalize when constraints suggest curtailment is hard
 */
export function evaluateLoadShiftPotential(args: {
  intervalKw?: IntervalKwPoint[] | null;
  loadShape?: LoadShapeMetrics;
  constraints?: { canCurtail?: boolean; criticalOperations?: boolean; hasGenerator?: boolean; hasBms?: boolean } | undefined;
}): LoadShiftPotentialResult {
  const rows = Array.isArray(args.intervalKw) ? args.intervalKw : [];
  const metrics = args.loadShape || {};

  if (!rows.length) {
    return {
      score: 0,
      candidateShiftWindows: [],
      constraintsDetected: [],
      reasons: ['Interval series not provided; cannot infer repeatable peak windows.'],
      requiredInputsMissing: ['Interval kW series required to evaluate load shifting potential.'],
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
      score: 0,
      candidateShiftWindows: [],
      constraintsDetected: [],
      reasons: ['Interval series contained no valid timestamps/values.'],
      requiredInputsMissing: ['Valid interval timestamps and kW values required to evaluate load shifting potential.'],
    };
  }

  // Hourly aggregation (UTC-based v1).
  const byHour = new Array(24).fill(0).map(() => ({ sum: 0, n: 0 }));
  for (const p of parsed) {
    const h = p.d.getUTCHours();
    byHour[h].sum += p.kw;
    byHour[h].n++;
  }
  const hourlyAvg = byHour.map((b) => (b.n ? b.sum / b.n : 0));
  const overallAvg = mean(hourlyAvg);
  const overallMax = Math.max(...hourlyAvg);

  const evening = hourlyAvg.slice(16, 21); // 16-20
  const eveningAvg = mean(evening);
  const night = [...hourlyAvg.slice(0, 6), ...hourlyAvg.slice(22, 24)];
  const nightAvg = mean(night);

  const peakiness = Number.isFinite(metrics.peakinessIndex ?? NaN) ? Number(metrics.peakinessIndex) : overallAvg > 0 ? overallMax / overallAvg : 0;
  const loadFactor = Number.isFinite(metrics.loadFactor ?? NaN) ? Number(metrics.loadFactor) : overallMax > 0 ? overallAvg / overallMax : 0;

  // Repeatable-window score: how concentrated the load is in top 5 hours.
  const sorted = [...hourlyAvg].sort((a, b) => b - a);
  const top5 = sorted.slice(0, 5);
  const concentration = overallAvg > 0 ? mean(top5) / overallAvg : 1;

  let score =
    0.35 * clamp01((peakiness - 1) / 3) +
    0.25 * clamp01((concentration - 1) / 2) +
    0.25 * clamp01((eveningAvg - nightAvg) / Math.max(1e-9, overallAvg)) +
    0.15 * clamp01((1 - loadFactor) / 0.7);

  const constraintsDetected: string[] = [];
  const c = args.constraints || {};
  if (c.criticalOperations === true) {
    constraintsDetected.push('criticalOperations');
    score *= 0.75;
  }
  if (c.canCurtail === false) {
    constraintsDetected.push('cannotCurtailKnown');
    score *= 0.7;
  }
  if (c.hasBms === true) {
    constraintsDetected.push('hasBms');
    score = Math.min(1, score + 0.05);
  }
  if (c.hasGenerator === true) {
    constraintsDetected.push('hasGenerator');
    score = Math.min(1, score + 0.03);
  }

  score = clamp01(score);

  const windows: Array<{ name: string; startHour: number; endHour: number; reasons: string[] }> = [];
  if (eveningAvg > overallAvg * 1.15) {
    windows.push({
      name: 'late_afternoon_evening_peak',
      startHour: 16,
      endHour: 21,
      reasons: ['Average load in 16:00–21:00 exceeds all-day average (UTC-based).', 'Peak concentration suggests repeatable peaks in a narrow window.'],
    });
  }
  const mid = mean(hourlyAvg.slice(9, 17));
  if (mid > overallAvg * 1.1 && nightAvg < mid * 0.7) {
    windows.push({
      name: 'daytime_operating_load',
      startHour: 9,
      endHour: 17,
      reasons: ['Daytime average exceeds all-day average (UTC-based).', 'Nighttime average materially lower, suggesting discretionary daytime loads.'],
    });
  }

  const reasons: string[] = [
    `Heuristic score based on peakiness (peakinessIndex≈${Number.isFinite(peakiness) ? peakiness.toFixed(2) : 'n/a'}), concentration (top5/avg≈${Number.isFinite(concentration) ? concentration.toFixed(2) : 'n/a'}), and evening-vs-night delta (UTC).`,
    'This v1 model does not assume any specific controllable end uses; it only flags candidate windows and required inputs for confirmation.',
  ];

  return {
    score,
    candidateShiftWindows: windows,
    constraintsDetected,
    reasons,
    requiredInputsMissing: [],
  };
}

