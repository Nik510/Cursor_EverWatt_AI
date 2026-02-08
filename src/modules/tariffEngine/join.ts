import type { BillingPeriod, IntervalRow } from './schema';

export type CycleAssignmentRow = IntervalRow & { cycleId: string };

export type CycleJoinQa = {
  intervalsPerCycle: Record<string, number>;
  unassignedIntervals: number;
  unassignedSample: Array<{ timestamp: string; kw: number }>;
  maxKwTimestampByCycle: Record<string, { kw: number; timestamp: string }>;
};

function endOfDayInclusive(d: Date): Date {
  const x = new Date(d.getTime());
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

function startOfDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function assignIntervalsToBillingCycles(args: {
  intervals: IntervalRow[];
  billingPeriods: BillingPeriod[];
}): { assigned: CycleAssignmentRow[]; qa: CycleJoinQa } {
  const { intervals, billingPeriods } = args;
  const sortedCycles = [...billingPeriods].sort((a, b) => a.billStartDate.getTime() - b.billStartDate.getTime());

  const intervalsPerCycle: Record<string, number> = {};
  const maxKwTimestampByCycle: Record<string, { kw: number; timestamp: string }> = {};
  const unassignedSample: Array<{ timestamp: string; kw: number }> = [];

  const assigned: CycleAssignmentRow[] = [];
  let unassignedIntervals = 0;

  for (const i of intervals) {
    const ts = i.timestamp;
    let match: BillingPeriod | null = null;

    for (const c of sortedCycles) {
      const start = startOfDay(c.billStartDate);
      const end = endOfDayInclusive(c.billEndDate);
      if (start.getTime() <= ts.getTime() && ts.getTime() <= end.getTime()) {
        match = c;
        break;
      }
    }

    if (!match) {
      unassignedIntervals++;
      if (unassignedSample.length < 25) {
        unassignedSample.push({ timestamp: ts.toISOString(), kw: i.kw });
      }
      continue;
    }

    assigned.push({ ...i, cycleId: match.cycleId });
    intervalsPerCycle[match.cycleId] = (intervalsPerCycle[match.cycleId] || 0) + 1;

    const prev = maxKwTimestampByCycle[match.cycleId];
    if (!prev || i.kw > prev.kw) {
      maxKwTimestampByCycle[match.cycleId] = { kw: i.kw, timestamp: ts.toISOString() };
    }
  }

  return {
    assigned,
    qa: {
      intervalsPerCycle,
      unassignedIntervals,
      unassignedSample,
      maxKwTimestampByCycle,
    },
  };
}

