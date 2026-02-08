import type { IntervalKwPoint } from '../../utilityIntelligence/interval/provenMetrics';

export type DrOperationalFitResultV1 = {
  drFitScore: number; // 0..1
  because: string[];
  whyNow: string[];
  whyNotNow: string[];
  flags: string[];
  nextStepsChecklist: string[];
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function safeNum(n: unknown): number | null {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

function dayKeyUtc(tsIso: string): string | null {
  const d = new Date(tsIso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function computeDrOperationalFitV1(args: {
  intervalKw?: IntervalKwPoint[] | null;
  loadShiftScore?: number;
  scheduleBucket?: '24_7' | 'business_hours' | 'mixed' | 'unknown';
}): DrOperationalFitResultV1 {
  const because: string[] = [];
  const whyNow: string[] = [];
  const whyNotNow: string[] = [];
  const flags: string[] = [];
  const nextStepsChecklist: string[] = [];

  const shiftScore = clamp01(Number(args.loadShiftScore ?? 0));
  if (Number.isFinite(args.loadShiftScore ?? NaN)) {
    because.push(`Load shifting feasibility score≈${shiftScore.toFixed(2)} (deterministic heuristic).`);
  } else {
    whyNotNow.push('Load shifting score unavailable; operational fit is uncertain.');
    flags.push('missing_load_shift_score');
    nextStepsChecklist.push('Compute load shifting feasibility from interval data.');
  }

  const bucket = (args.scheduleBucket || 'unknown') as any;
  if (bucket !== 'unknown') because.push(`Operating pattern inferred as ${bucket}.`);

  // Repeatable peak presence: analyze daily maxima vs overall peak.
  let repeatability = 0;
  let spiky = false;
  const intervals = Array.isArray(args.intervalKw) ? args.intervalKw : [];
  if (!intervals.length) {
    whyNotNow.push('Interval data not available; cannot assess repeatable peaks.');
    flags.push('missing_interval_data');
    nextStepsChecklist.push('Collect interval kW data (hourly or 15-min) to evaluate DR operational fit.');
  } else {
    const dayMax = new Map<string, { maxKw: number; countNearMax: number }>();
    let overallPeak = 0;
    for (const r of intervals) {
      const ts = String(r.timestampIso || '').trim();
      const kw = safeNum((r as any).kw);
      const dk = dayKeyUtc(ts);
      if (!dk || kw == null) continue;
      overallPeak = Math.max(overallPeak, kw);
      const rec = dayMax.get(dk) || { maxKw: 0, countNearMax: 0 };
      rec.maxKw = Math.max(rec.maxKw, kw);
      dayMax.set(dk, rec);
    }

    if (overallPeak > 0 && dayMax.size >= 2) {
      // Second pass: count how many intervals are near the daily max for each day.
      for (const r of intervals) {
        const ts = String(r.timestampIso || '').trim();
        const kw = safeNum((r as any).kw);
        const dk = dayKeyUtc(ts);
        if (!dk || kw == null) continue;
        const rec = dayMax.get(dk);
        if (!rec) continue;
        if (kw >= 0.9 * rec.maxKw) rec.countNearMax++;
      }

      const days = Array.from(dayMax.values());
      const daysNearOverall = days.filter((d) => d.maxKw >= 0.85 * overallPeak).length;
      repeatability = clamp01(daysNearOverall / days.length);

      const avgNearMax = days.reduce((s, d) => s + d.countNearMax, 0) / days.length;
      spiky = avgNearMax <= 1.2 && repeatability <= 0.45;

      because.push(`Repeatable peaks ratio≈${repeatability.toFixed(2)} (days with daily max ≥ 85% of overall peak).`);
      if (spiky) {
        flags.push('startup_spikes');
        whyNotNow.push('Peaks appear infrequent and spike-like (possible startups), which reduces DR operational fit.');
        nextStepsChecklist.push('Verify whether peaks are controllable loads vs one-off startup spikes.');
      } else if (repeatability >= 0.6) {
        whyNow.push('Peaks appear repeatable across days (good candidate for DR operations).');
      } else {
        flags.push('peaks_infrequent');
        whyNotNow.push('Peaks are present but not consistently repeatable across days.');
        nextStepsChecklist.push('Collect longer interval history to confirm peak repeatability.');
      }
    } else {
      flags.push('insufficient_interval_history');
      whyNotNow.push('Not enough interval history to assess repeatable peaks.');
      nextStepsChecklist.push('Provide at least ~2 weeks of interval data for DR fit assessment.');
    }
  }

  // Score composition
  let score = 0.15;
  score += 0.45 * shiftScore;
  score += 0.25 * repeatability;
  if (bucket === 'business_hours') score += 0.1;
  else if (bucket === 'mixed') score += 0.05;
  else if (bucket === '24_7') score -= 0.05;

  if (spiky) score -= 0.15;
  score = clamp01(score);

  if (score >= 0.65) whyNow.push('Operational fit score is strong for DR enrollment (v1).');
  else if (score >= 0.45) whyNow.push('Operational fit score is moderate; consider DR programs with flexible commitments.');
  else whyNotNow.push('Operational fit score is low; address data/operational constraints before enrolling.');

  // Always include a basic checklist for deterministic next steps.
  if (!nextStepsChecklist.length) {
    nextStepsChecklist.push('Confirm interval data quality (timezone, resolution, missing gaps).');
    nextStepsChecklist.push('Identify controllable loads during peak windows (HVAC, process, storage, controls).');
    nextStepsChecklist.push('Validate DR event participation constraints (notice time, duration, max events).');
  }

  return {
    drFitScore: score,
    because,
    whyNow,
    whyNotNow,
    flags,
    nextStepsChecklist,
  };
}

