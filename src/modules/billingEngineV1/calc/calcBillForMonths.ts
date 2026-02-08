import type { NormalizedIntervalV1 } from '../interval/normalizeIntervals';
import type { RateDefinitionV1 } from '../rates/types';
import { getZonedParts, zonedLocalToUtcDate } from '../time/zonedTime';
import { calcBill, type BillResultV1 } from './calcBill';

export type BillMonthResultV1 = {
  month: string; // YYYY-MM
  billingPeriod: { startIso: string; endIso: string; timezone: string };
  totals: BillResultV1['totals'];
  lineItems: BillResultV1['lineItems'];
  auditTrace: BillResultV1['auditTrace'];
};

function monthKey(parts: { year: number; month: number }): string {
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}`;
}

function nextMonth(parts: { year: number; month: number }): { year: number; month: number } {
  if (parts.month === 12) return { year: parts.year + 1, month: 1 };
  return { year: parts.year, month: parts.month + 1 };
}

export function calcBillForMonths(args: {
  intervals: NormalizedIntervalV1[];
  rate: RateDefinitionV1;
  timezoneOverride?: string;
}): { months: BillMonthResultV1[]; warnings: string[] } {
  const warnings: string[] = [];
  const tz = String(args.timezoneOverride || args.rate.timezone || 'UTC').trim() || 'UTC';

  const valid = (args.intervals || []).filter((x) => x.isValid);
  if (!valid.length) return { months: [], warnings: ['No valid intervals available for month grouping.'] };

  const monthSet = new Map<string, { year: number; month: number }>();
  for (const iv of valid) {
    const parts = getZonedParts(new Date(iv.ts), tz);
    if (!parts) continue;
    const key = monthKey(parts);
    monthSet.set(key, { year: parts.year, month: parts.month });
  }

  const months = Array.from(monthSet.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, parts]) => ({ key, parts }));

  const out: BillMonthResultV1[] = [];
  for (const m of months) {
    const startLocal = { year: m.parts.year, month: m.parts.month, day: 1, hour: 0, minute: 0, second: 0 };
    const next = nextMonth(m.parts);
    const endLocal = { year: next.year, month: next.month, day: 1, hour: 0, minute: 0, second: 0 };

    const startUtc = zonedLocalToUtcDate({ local: startLocal, timeZone: tz });
    const endUtc = zonedLocalToUtcDate({ local: endLocal, timeZone: tz });

    const bill = calcBill({
      intervals: args.intervals,
      rate: args.rate,
      billingPeriod: { start: startUtc, end: endUtc },
      timezoneOverride: tz,
    });

    out.push({
      month: m.key,
      billingPeriod: bill.billingPeriod,
      totals: bill.totals,
      lineItems: bill.lineItems,
      auditTrace: bill.auditTrace,
    });
  }

  return { months: out, warnings };
}

