import type { LoadInterval } from '../../modules/battery/types';

export type CapEvent = {
  monthKey: string; // YYYY-MM
  start: Date;
  end: Date;
  durationHours: number;
  /** Max kW observed during the event */
  peakKw: number;
  /** Max exceedance above cap (kW) */
  maxExceedKw: number;
  /** Max exceedance above cap (%), e.g. 0.20 = 20% above cap */
  maxExceedPct: number;
  /** Total exceedance energy above cap (kWh) */
  exceedanceEnergyKwh: number;
};

export type BucketSummary = {
  label: string;
  count: number;
  totalDurationHours: number;
  maxDurationHours: number;
  maxExceedKw: number;
  maxExceedPct: number;
  exceedanceEnergyKwh: number;
};

export type MonthlyCapEventStats = {
  monthKey: string; // YYYY-MM
  capKw: number;
  peakBeforeKw: number;
  totalEvents: number;
  bucketsByExceedPct: BucketSummary[];
  bucketsByDuration: BucketSummary[];
};

function monthKey(ts: Date | string): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (!Number.isFinite(year) || !Number.isFinite(month)) return 'unknown';
  return `${year}-${String(month).padStart(2, '0')}`;
}

function safeDate(ts: Date | string): Date {
  const d = ts instanceof Date ? ts : new Date(ts);
  return Number.isFinite(d.getTime()) ? d : new Date(0);
}

export function splitIntervalsByMonth(intervals: LoadInterval[]): Map<string, LoadInterval[]> {
  const m = new Map<string, LoadInterval[]>();
  for (const i of intervals) {
    const k = monthKey(i.timestamp);
    const arr = m.get(k) ?? [];
    arr.push(i);
    m.set(k, arr);
  }
  return m;
}

/**
 * Detect cap-based events: consecutive intervals where demand > cap.
 * Event severity is tied to the billing determinant problem.
 */
export function detectCapEvents(
  intervals: LoadInterval[],
  capKw: number,
  intervalHours: number = 0.25
): CapEvent[] {
  const events: CapEvent[] = [];
  let current: Omit<CapEvent, 'monthKey'> | null = null;

  for (const interval of intervals) {
    const d = interval.kw;
    const above = d > capKw;
    if (above) {
      if (!current) {
        current = {
          start: safeDate(interval.timestamp),
          end: safeDate(interval.timestamp),
          durationHours: 0,
          peakKw: d,
          maxExceedKw: Math.max(0, d - capKw),
          maxExceedPct: capKw > 0 ? Math.max(0, (d - capKw) / capKw) : 0,
          exceedanceEnergyKwh: 0,
        };
      }
      current.durationHours += intervalHours;
      current.end = safeDate(interval.timestamp);
      current.peakKw = Math.max(current.peakKw, d);
      current.maxExceedKw = Math.max(current.maxExceedKw, d - capKw);
      current.maxExceedPct = Math.max(current.maxExceedPct, capKw > 0 ? (d - capKw) / capKw : 0);
      current.exceedanceEnergyKwh += (d - capKw) * intervalHours;
    } else if (current) {
      events.push({ monthKey: monthKey(current.start), ...current });
      current = null;
    }
  }

  if (current) events.push({ monthKey: monthKey(current.start), ...current });
  return events;
}

function initBuckets(labels: string[]): BucketSummary[] {
  return labels.map((label) => ({
    label,
    count: 0,
    totalDurationHours: 0,
    maxDurationHours: 0,
    maxExceedKw: 0,
    maxExceedPct: 0,
    exceedanceEnergyKwh: 0,
  }));
}

function addToBucket(bucket: BucketSummary, e: CapEvent) {
  bucket.count += 1;
  bucket.totalDurationHours += e.durationHours;
  bucket.maxDurationHours = Math.max(bucket.maxDurationHours, e.durationHours);
  bucket.maxExceedKw = Math.max(bucket.maxExceedKw, e.maxExceedKw);
  bucket.maxExceedPct = Math.max(bucket.maxExceedPct, e.maxExceedPct);
  bucket.exceedanceEnergyKwh += e.exceedanceEnergyKwh;
}

/**
 * Build per-month histograms for events above cap.
 *
 * You can pass the cap per month (e.g. the discovered minimum feasible cap),
 * and also the monthly peaks-before for context.
 */
export function buildMonthlyCapEventStats(params: {
  intervals: LoadInterval[];
  capByMonth: Map<string, number>;
  peakBeforeByMonth?: Map<string, number>;
  intervalHours?: number;
  exceedPctBuckets?: Array<{ label: string; minInclusive: number; maxExclusive?: number }>;
  durationBucketsHours?: Array<{ label: string; minInclusive: number; maxExclusive?: number }>;
}): MonthlyCapEventStats[] {
  const {
    intervals,
    capByMonth,
    peakBeforeByMonth,
    intervalHours = 0.25,
    exceedPctBuckets = [
      { label: '0-10%', minInclusive: 0.0, maxExclusive: 0.10 },
      { label: '10-20%', minInclusive: 0.10, maxExclusive: 0.20 },
      { label: '20-30%', minInclusive: 0.20, maxExclusive: 0.30 },
      { label: '30-40%', minInclusive: 0.30, maxExclusive: 0.40 },
      { label: '40-60%', minInclusive: 0.40, maxExclusive: 0.60 },
      { label: '60-100%', minInclusive: 0.60, maxExclusive: 1.00 },
      { label: '100%+', minInclusive: 1.00 },
    ],
    durationBucketsHours = [
      { label: '0-0.5h', minInclusive: 0, maxExclusive: 0.5 },
      { label: '0.5-1h', minInclusive: 0.5, maxExclusive: 1 },
      { label: '1-2h', minInclusive: 1, maxExclusive: 2 },
      { label: '2-4h', minInclusive: 2, maxExclusive: 4 },
      { label: '4h+', minInclusive: 4 },
    ],
  } = params;

  const byMonth = splitIntervalsByMonth(intervals);
  const months = Array.from(byMonth.keys()).sort();

  const out: MonthlyCapEventStats[] = [];
  for (const mk of months) {
    const monthIntervals = byMonth.get(mk) ?? [];
    const capKw = capByMonth.get(mk) ?? Math.max(...monthIntervals.map((i) => i.kw), 0);
    const peakBeforeKw =
      peakBeforeByMonth?.get(mk) ??
      (monthIntervals.length > 0 ? Math.max(...monthIntervals.map((i) => i.kw)) : 0);

    const events = detectCapEvents(monthIntervals, capKw, intervalHours);

    const bucketsByExceedPct = initBuckets(exceedPctBuckets.map((b) => b.label));
    const bucketsByDuration = initBuckets(durationBucketsHours.map((b) => b.label));

    for (const e of events) {
      // Exceedance bucket by maxExceedPct
      const pct = e.maxExceedPct;
      const pctIdx = exceedPctBuckets.findIndex((b) => pct >= b.minInclusive && (b.maxExclusive === undefined || pct < b.maxExclusive));
      if (pctIdx >= 0) addToBucket(bucketsByExceedPct[pctIdx], e);

      // Duration bucket by durationHours
      const dur = e.durationHours;
      const durIdx = durationBucketsHours.findIndex((b) => dur >= b.minInclusive && (b.maxExclusive === undefined || dur < b.maxExclusive));
      if (durIdx >= 0) addToBucket(bucketsByDuration[durIdx], e);
    }

    out.push({
      monthKey: mk,
      capKw,
      peakBeforeKw,
      totalEvents: events.length,
      bucketsByExceedPct,
      bucketsByDuration,
    });
  }

  return out;
}

