import type { PeakEvent, PeakPattern, FrequencyAnalysis, PeakPatternType } from './types';

function safeDate(ts: Date | string): Date {
  const d = ts instanceof Date ? ts : new Date(ts);
  return Number.isFinite(d.getTime()) ? d : new Date(0);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function classifyEvent(e: PeakEvent): { patternType: PeakPatternType; reasoning: string } {
  const start = safeDate(e.start);
  const startHour = start.getHours();
  const dur = e.durationHours;

  if (dur >= 3) {
    return { patternType: 'sustained_high', reasoning: `Duration ${dur.toFixed(1)}h indicates a sustained high-demand period.` };
  }

  // Heuristics by typical commercial building rhythms
  if (startHour >= 5 && startHour < 11) {
    return { patternType: 'morning_spike', reasoning: `Start hour ${startHour} suggests morning start-up loads.` };
  }
  if (startHour >= 11 && startHour < 16) {
    return { patternType: 'afternoon_peak', reasoning: `Start hour ${startHour} suggests afternoon operational peak.` };
  }
  if (startHour >= 15 && startHour < 21) {
    return { patternType: 'evening_ramp', reasoning: `Start hour ${startHour} suggests late-day ramp/overlap peak.` };
  }

  return { patternType: 'random', reasoning: `No strong time-of-day signature; classified as irregular.` };
}

function seasonalTrendForMonths(months: number[]): PeakPattern['seasonalTrend'] {
  if (months.length === 0) return 'year_round';
  const counts = new Map<number, number>();
  for (const m of months) counts.set(m, (counts.get(m) ?? 0) + 1);
  const total = months.length;
  const summer = [6, 7, 8, 9].reduce((sum, m) => sum + (counts.get(m) ?? 0), 0);
  const winter = [12, 1, 2].reduce((sum, m) => sum + (counts.get(m) ?? 0), 0);
  if (summer / total >= 0.55) return 'summer';
  if (winter / total >= 0.55) return 'winter';
  return 'year_round';
}

function suitabilityFromDurationAndMagnitude(durationHours: number, avgExcessKw: number): PeakPattern['batterySuitability'] {
  // Batteries excel at shaving shorter, higher peaks; long duration peaks become energy-heavy.
  if (durationHours <= 1.0 && avgExcessKw >= 20) return 'excellent';
  if (durationHours <= 2.0) return 'good';
  return 'poor';
}

/**
 * Summarize peak events into a small set of “pattern” buckets to explain
 * what kind of peaks the customer has.
 */
export function classifyPeakPatterns(events: PeakEvent[]): PeakPattern[] {
  if (!events || events.length === 0) return [];

  const buckets = new Map<PeakPatternType, PeakEvent[]>();
  const reasonByBucket = new Map<PeakPatternType, string[]>();

  for (const e of events) {
    const { patternType, reasoning } = classifyEvent(e);
    const arr = buckets.get(patternType) ?? [];
    arr.push(e);
    buckets.set(patternType, arr);
    const rs = reasonByBucket.get(patternType) ?? [];
    rs.push(reasoning);
    reasonByBucket.set(patternType, rs);
  }

  const monthsAll = events.map((e) => safeDate(e.start).getMonth() + 1);
  const totalMonthsObserved = new Set(events.map((e) => monthKey(safeDate(e.start)))).size || 1;

  const out: PeakPattern[] = [];
  for (const [patternType, evs] of buckets.entries()) {
    const startHours = evs.map((e) => safeDate(e.start).getHours());
    const endHours = evs.map((e) => safeDate(e.end).getHours());
    const durations = evs.map((e) => e.durationHours);
    const avgExcess = evs.map((e) => (e.durationHours > 0 ? e.totalExcessKwh / e.durationHours : 0));
    const months = evs.map((e) => safeDate(e.start).getMonth() + 1);
    const dow = evs.map((e) => safeDate(e.start).getDay());

    const typicalDuration = median(durations);
    const typicalMagnitude = median(avgExcess);

    const dayCounts = new Map<number, number>();
    for (const d of dow) dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
    const commonDays = [...dayCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d);

    out.push({
      patternType,
      frequencyPerMonth: evs.length / totalMonthsObserved,
      typicalDurationHours: typicalDuration,
      typicalMagnitudeKw: typicalMagnitude,
      timeOfDay: {
        startHour: Math.round(median(startHours)),
        endHour: Math.round(median(endHours)),
      },
      dayOfWeek: commonDays,
      seasonalTrend: seasonalTrendForMonths(monthsAll.length ? months : monthsAll),
      batterySuitability: suitabilityFromDurationAndMagnitude(typicalDuration, typicalMagnitude),
      reasoning: (reasonByBucket.get(patternType) ?? [])[0] ?? 'Pattern derived from event timing and duration.',
    });
  }

  return out.sort((a, b) => b.frequencyPerMonth - a.frequencyPerMonth);
}

export function analyzeEventFrequency(events: PeakEvent[]): FrequencyAnalysis {
  const byMonth: Record<string, number> = {};
  const byDayOfWeek = Array.from({ length: 7 }, () => 0);
  const byHour = Array.from({ length: 24 }, () => 0);

  for (const e of events) {
    const d = safeDate(e.start);
    byMonth[monthKey(d)] = (byMonth[monthKey(d)] ?? 0) + 1;
    byDayOfWeek[d.getDay()] += 1;
    byHour[d.getHours()] += 1;
  }

  return { eventsPerMonth: byMonth, eventsPerDayOfWeek: byDayOfWeek, eventsPerHour: byHour };
}


