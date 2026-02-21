import type { RateDefinitionV1, TouPeriodDefinitionV1 } from '../rates/types';
import type { NormalizedIntervalV1 } from '../interval/normalizeIntervals';
import { getZonedParts } from '../time/zonedTime';
import { isUsHolidayYmd } from './usHolidays';

export type TouMappingAuditV1 = {
  timezone: string;
  totalIntervals: number;
  validIntervals: number;
  invalidIntervals: number;
  labelCounts: Record<string, number>;
  unmappedCount: number;
  sample: Array<{ ts: string; localHour: number; weekday: number; isWeekend: boolean; touLabel: string }>;
  warnings: string[];
};

function clampHour(h: number): number {
  if (!Number.isFinite(h)) return 0;
  return Math.max(0, Math.min(24, h));
}

function inWindow(hour: number, w: { startHour: number; endHour: number }): boolean {
  const h = clampHour(hour);
  const start = clampHour(w.startHour);
  const end = clampHour(w.endHour);
  if (start === end) return false;
  if (end > start) return h >= start && h < end;
  // Wrap across midnight
  return h >= start || h < end;
}

function pickWindows(period: TouPeriodDefinitionV1, isWeekend: boolean): Array<{ startHour: number; endHour: number }> {
  const wk = Array.isArray(period.weekend) ? period.weekend : undefined;
  return isWeekend ? (wk && wk.length ? wk : []) : period.weekday;
}

function isHolidayDeterministic(args: { year: number; month: number; day: number; timeZone: string }): boolean {
  // Note: args.year/month/day are already computed in local time via getZonedParts(..., timeZone).
  // We intentionally ignore timeZone here and treat the provided calendar day as authoritative.
  return isUsHolidayYmd({ year: args.year, month: args.month, day: args.day });
}

export function mapTou(args: {
  intervals: NormalizedIntervalV1[];
  rate: RateDefinitionV1;
  timezoneOverride?: string;
}): { intervals: NormalizedIntervalV1[]; audit: TouMappingAuditV1 } {
  const warnings: string[] = [];
  const tz = String(args.timezoneOverride || args.rate.timezone || 'UTC').trim() || 'UTC';
  const periods: TouPeriodDefinitionV1[] = Array.isArray(args.rate.touPeriods) ? args.rate.touPeriods : [];
  if (!periods.length) warnings.push('Rate has no TOU periods; all intervals will be labeled UNMAPPED.');

  const labelCounts: Record<string, number> = {};
  let unmappedCount = 0;
  let valid = 0;
  let invalid = 0;
  const sample: TouMappingAuditV1['sample'] = [];

  const mapped = (args.intervals || []).map((iv) => {
    if (!iv.isValid) {
      invalid++;
      return { ...iv, touLabel: iv.touLabel || 'INVALID' };
    }
    valid++;
    const d = new Date(iv.ts);
    const parts = getZonedParts(d, tz);
    if (!parts) {
      warnings.push(`Failed to apply timezone "${tz}" via Intl; labeling as UNMAPPED.`);
      unmappedCount++;
      labelCounts.UNMAPPED = (labelCounts.UNMAPPED || 0) + 1;
      return { ...iv, touLabel: 'UNMAPPED' };
    }

    const isWeekend = parts.weekday === 0 || parts.weekday === 6;
    const holiday = isHolidayDeterministic({ year: parts.year, month: parts.month, day: parts.day, timeZone: tz });
    // Future: holiday override schedules; currently treat holiday as weekend-like.
    const dayTypeWeekend = isWeekend || holiday;
    const hour = parts.hour + parts.minute / 60;

    let touLabel: string | null = null;
    for (const p of periods) {
      const windows = pickWindows(p, dayTypeWeekend);
      for (const w of windows) {
        if (inWindow(hour, w)) {
          touLabel = p.label;
          break;
        }
      }
      if (touLabel) break;
    }

    if (!touLabel) {
      touLabel = 'UNMAPPED';
      unmappedCount++;
    }
    labelCounts[touLabel] = (labelCounts[touLabel] || 0) + 1;

    if (sample.length < 12) {
      sample.push({ ts: iv.ts, localHour: parts.hour, weekday: parts.weekday, isWeekend: dayTypeWeekend, touLabel });
    }

    return { ...iv, touLabel };
  });

  const audit: TouMappingAuditV1 = {
    timezone: tz,
    totalIntervals: mapped.length,
    validIntervals: valid,
    invalidIntervals: invalid,
    labelCounts,
    unmappedCount,
    sample,
    warnings,
  };

  return { intervals: mapped, audit };
}

