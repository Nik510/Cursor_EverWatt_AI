import type { LoadInterval, LoadProfile, PeakEvent, UsageOptimization, LoadShiftingOpportunity, PeakSpreadingAnalysis, DemandResponseOpportunity, EfficiencySynergy } from './types';

function safeDate(ts: Date | string): Date {
  const d = ts instanceof Date ? ts : new Date(ts);
  return Number.isFinite(d.getTime()) ? d : new Date(0);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function hourLabel(h: number): string {
  const hh = String(((h % 24) + 24) % 24).padStart(2, '0');
  return `${hh}:00`;
}

function topHoursFromIntervals(intervals: LoadInterval[], thresholdKw?: number): number[] {
  const counts = new Array(24).fill(0);
  for (const i of intervals) {
    const ts = safeDate(i.timestamp);
    if (thresholdKw == null || i.kw > thresholdKw) counts[ts.getHours()] += 1;
  }
  return counts
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((x) => x.hour);
}

/**
 * Heuristic load shifting opportunities inferred from peak event timing.
 * This does NOT identify exact equipment; it produces a set of common operational levers
 * with site-specific timing and magnitude estimates.
 */
export function analyzeLoadShiftingOpportunities(
  loadProfile: LoadProfile,
  peakEvents: PeakEvent[],
  opts?: { thresholdKw?: number; demandRatePerKwMonth?: number }
): LoadShiftingOpportunity[] {
  const thresholdKw = opts?.thresholdKw;
  const demandRate = opts?.demandRatePerKwMonth ?? 0;

  const topEventHours = peakEvents.length
    ? peakEvents
        .map((e) => safeDate(e.start).getHours())
        .reduce((acc, h) => {
          acc.set(h, (acc.get(h) ?? 0) + 1);
          return acc;
        }, new Map<number, number>())
    : new Map<number, number>();

  const dominantEventHour =
    [...topEventHours.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    topHoursFromIntervals(loadProfile.intervals, thresholdKw)[0] ??
    16;

  const typicalExcessKw = median(
    peakEvents.map((e) => (e.durationHours > 0 ? e.totalExcessKwh / e.durationHours : 0)).filter((x) => Number.isFinite(x))
  );
  const potentialPeakReductionKw = Math.max(0, typicalExcessKw);
  const estSavings = demandRate > 0 ? potentialPeakReductionKw * demandRate * 12 : 0;

  // Simple “shift-to” windows: night/early morning and midday (often lower peaks depending on site)
  const recommendShiftHour = dominantEventHour >= 16 && dominantEventHour <= 21 ? 10 : 2;

  const common: Array<Omit<LoadShiftingOpportunity, 'currentPeakTime' | 'recommendedShiftTime'>> = [
    {
      equipment: 'HVAC pre-cool / setpoint strategy',
      potentialPeakReductionKw: potentialPeakReductionKw * 0.35,
      estimatedSavings: estSavings * 0.35,
      feasibility: 'high',
      notes:
        'If peaks are driven by afternoon HVAC, pre-cooling earlier can reduce 4–9pm demand without affecting comfort.',
    },
    {
      equipment: 'Process scheduling / batch timing',
      potentialPeakReductionKw: potentialPeakReductionKw * 0.45,
      estimatedSavings: estSavings * 0.45,
      feasibility: 'medium',
      notes:
        'If peaks are driven by short process overlaps, staggering start times can reduce instantaneous kW peaks.',
    },
    {
      equipment: 'EV / fleet charging control',
      potentialPeakReductionKw: potentialPeakReductionKw * 0.20,
      estimatedSavings: estSavings * 0.20,
      feasibility: 'high',
      notes:
        'If any EV charging is present, ensure it does not occur during peak windows; shift to overnight.',
    },
  ];

  return common
    .map((c) => ({
      equipment: c.equipment,
      currentPeakTime: `${hourLabel(dominantEventHour)}–${hourLabel((dominantEventHour + 1) % 24)}`,
      recommendedShiftTime: `${hourLabel(recommendShiftHour)}–${hourLabel((recommendShiftHour + 2) % 24)}`,
      potentialPeakReductionKw: Math.max(0, c.potentialPeakReductionKw),
      estimatedSavings: Math.max(0, c.estimatedSavings),
      feasibility: c.feasibility,
      notes: c.notes,
    }))
    .filter((x) => x.potentialPeakReductionKw > 0.1);
}

export function calculatePeakSpreading(loadProfile: LoadProfile, opts?: { thresholdKw?: number }): PeakSpreadingAnalysis {
  const thresholdKw = opts?.thresholdKw;
  const intervals = loadProfile.intervals;
  if (!intervals.length) {
    return { currentPeakConcentration: 0, recommendedSpread: 'Insufficient interval data.', potentialBenefit: 0 };
  }

  // Concentration: how much of all “above-threshold” time falls into the single busiest hour-of-day bucket
  const counts = new Array(24).fill(0);
  let total = 0;
  for (const i of intervals) {
    if (thresholdKw != null && i.kw <= thresholdKw) continue;
    const h = safeDate(i.timestamp).getHours();
    counts[h] += 1;
    total += 1;
  }
  const maxBucket = Math.max(...counts);
  const concentration = total > 0 ? maxBucket / total : 0;

  const recommendedSpread =
    concentration >= 0.35
      ? 'Peaks are highly concentrated in a single hour. Stagger major loads to widen the peak window and reduce the billing max.'
      : 'Peaks are relatively distributed. Focus on the highest-peak events rather than broad spreading.';

  // Potential benefit is intentionally conservative here (dollars computed elsewhere with tariffs)
  const potentialBenefit = 0;

  return { currentPeakConcentration: concentration, recommendedSpread, potentialBenefit };
}

export function estimateDemandResponseOpportunity(loadProfile: LoadProfile, opts?: { thresholdKw?: number }): DemandResponseOpportunity {
  const thresholdKw = opts?.thresholdKw;
  const intervals = loadProfile.intervals;
  if (!intervals.length) return { eligible: false, potentialSavings: 0, participationLevel: 'conservative' };

  // Simple heuristic: if a meaningful share of exceedances occur 16–21, DR is plausible.
  let exceed = 0;
  let peakWindowExceed = 0;
  for (const i of intervals) {
    if (thresholdKw != null && i.kw <= thresholdKw) continue;
    exceed += 1;
    const h = safeDate(i.timestamp).getHours();
    if (h >= 16 && h < 21) peakWindowExceed += 1;
  }
  const share = exceed > 0 ? peakWindowExceed / exceed : 0;
  const eligible = share >= 0.35;
  const participationLevel: DemandResponseOpportunity['participationLevel'] =
    share >= 0.6 ? 'aggressive' : share >= 0.4 ? 'moderate' : 'conservative';

  return { eligible, potentialSavings: 0, participationLevel };
}

export function identifyEfficiencySynergies(loadProfile: LoadProfile, opts?: { thresholdKw?: number }): EfficiencySynergy[] {
  const thresholdKw = opts?.thresholdKw;
  const intervals = loadProfile.intervals;
  if (!intervals.length) return [];

  // Simple time-of-day excess profile as a proxy for end-use hints
  const excessByHour = new Array(24).fill(0);
  for (const i of intervals) {
    const h = safeDate(i.timestamp).getHours();
    const excess = thresholdKw != null ? Math.max(0, i.kw - thresholdKw) : i.kw;
    excessByHour[h] += excess;
  }

  const topHour = excessByHour
    .map((v, h) => ({ h, v }))
    .sort((a, b) => b.v - a.v)[0]?.h ?? 16;

  const synergies: EfficiencySynergy[] = [];

  // HVAC-heavy guess: afternoon peaks
  if (topHour >= 12 && topHour <= 18) {
    synergies.push({
      measure: 'HVAC optimization (controls + economizer + VFDs)',
      peakReductionKw: 0,
      batterySavingsIncrease: 0,
      standaloneSavings: 0,
      combinedSavings: 0,
      notes:
        'If afternoon peaks are temperature-driven, HVAC tuning reduces both baseline peaks and battery size needed for the same cap.',
    });
  }

  // Lighting/occupancy or process overlap guess: early evening
  if (topHour >= 16 && topHour <= 21) {
    synergies.push({
      measure: 'Operational overlap reduction (stagger shifts / equipment start sequences)',
      peakReductionKw: 0,
      batterySavingsIncrease: 0,
      standaloneSavings: 0,
      combinedSavings: 0,
      notes:
        'If peaks coincide with late-day overlap, sequencing reduces instantaneous kW and improves battery effectiveness.',
    });
  }

  return synergies;
}

export function buildUsageOptimization(loadProfile: LoadProfile, peakEvents: PeakEvent[], opts?: { thresholdKw?: number; demandRatePerKwMonth?: number }): UsageOptimization {
  return {
    loadShifting: analyzeLoadShiftingOpportunities(loadProfile, peakEvents, opts),
    peakSpreading: calculatePeakSpreading(loadProfile, { thresholdKw: opts?.thresholdKw }),
    demandResponse: estimateDemandResponseOpportunity(loadProfile, { thresholdKw: opts?.thresholdKw }),
    efficiencySynergies: identifyEfficiencySynergies(loadProfile, { thresholdKw: opts?.thresholdKw }),
  };
}


