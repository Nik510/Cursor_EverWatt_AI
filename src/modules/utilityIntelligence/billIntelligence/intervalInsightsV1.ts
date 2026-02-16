import {
  BillIntelligenceWarningCodesV1,
  type BillIntelligenceIntervalInsightsV1,
  type BillIntelligenceV1,
  type BillIntelligenceDayOfWeekV1,
} from './typesV1';

const MIN_POINTS_FOR_HOURLY = 24;
const MIN_DAYS_FOR_WEEKDAY_WEEKEND = 2;

function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return NaN;
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

function addWarning(
  warnings: BillIntelligenceV1['warnings'],
  code: BillIntelligenceV1['warnings'][number]['code'],
  reason: string
): void {
  const key = `${code}|${reason}`.toLowerCase();
  if (warnings.some((w) => `${w.code}|${w.reason}`.toLowerCase() === key)) return;
  warnings.push({ code, reason });
}

function toUtcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayOfWeekLabelUtc(d: Date): BillIntelligenceDayOfWeekV1 {
  // JS getUTCDay(): 0=Sun ... 6=Sat
  const idx = d.getUTCDay();
  switch (idx) {
    case 0:
      return 'Sun';
    case 1:
      return 'Mon';
    case 2:
      return 'Tue';
    case 3:
      return 'Wed';
    case 4:
      return 'Thu';
    case 5:
      return 'Fri';
    case 6:
      return 'Sat';
    default:
      return 'Sun';
  }
}

function isWeekendUtc(d: Date): boolean {
  const idx = d.getUTCDay();
  return idx === 0 || idx === 6;
}

export type IntervalPointV1 = { timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number; temperatureF?: number };

export function analyzeBillIntelligenceIntervalInsightsV1(args: {
  intervalPointsV1?: IntervalPointV1[] | null;
  explicitPeakKwFromBill?: number | null;
}): { intervalInsightsV1: BillIntelligenceIntervalInsightsV1; warnings: BillIntelligenceV1['warnings'] } {
  const warnings: BillIntelligenceV1['warnings'] = [];
  const reasons: BillIntelligenceIntervalInsightsV1['reasons'] = [];

  const rawPts = Array.isArray(args.intervalPointsV1) ? args.intervalPointsV1 : [];
  if (!rawPts.length) {
    addWarning(warnings, BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_REQUIRED, 'Interval data required for interval-derived bill intelligence insights.');
    reasons.push({ code: BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_REQUIRED, reason: 'No interval points provided.' });
    return {
      intervalInsightsV1: { available: false, reasons },
      warnings,
    };
  }

  const pts = rawPts
    .map((p) => {
      const ts = String((p as any)?.timestampIso || '').trim();
      const mins = Number((p as any)?.intervalMinutes);
      const kWh = Number((p as any)?.kWh);
      const kWExplicit = Number((p as any)?.kW);
      const d = ts ? new Date(ts) : null;
      const okDate = d && Number.isFinite(d.getTime());
      const kWDerived = !Number.isFinite(kWExplicit) && Number.isFinite(kWh) && Number.isFinite(mins) && mins > 0 ? kWh * (60 / mins) : NaN;
      const kW = Number.isFinite(kWExplicit) ? kWExplicit : kWDerived;
      return {
        ts,
        date: okDate ? (d as Date) : null,
        hourUtc: okDate ? (d as Date).getUTCHours() : null,
        dateKeyUtc: okDate ? toUtcDateKey(d as Date) : null,
        weekendUtc: okDate ? isWeekendUtc(d as Date) : null,
        kWh: Number.isFinite(kWh) ? kWh : null,
        kW: Number.isFinite(kW) ? kW : null,
      };
    })
    .filter((p) => p.date && p.dateKeyUtc && p.hourUtc !== null);

  if (!pts.length) {
    addWarning(
      warnings,
      BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_INSUFFICIENT_POINTS,
      'Interval points were provided, but no valid timestampIso values were parseable as ISO timestamps.'
    );
    reasons.push({
      code: BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_INSUFFICIENT_POINTS,
      reason: 'No parseable timestampIso values.',
    });
    return { intervalInsightsV1: { available: false, reasons }, warnings };
  }

  const kWhPts = pts.filter((p) => p.kWh !== null) as Array<(typeof pts)[number] & { kWh: number }>;
  const kWPts = pts.filter((p) => p.kW !== null) as Array<(typeof pts)[number] & { kW: number }>;

  if (!kWhPts.length) {
    addWarning(warnings, BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_MISSING_KWH, 'Interval points do not include explicit kWh values.');
    reasons.push({ code: BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_MISSING_KWH, reason: 'No kWh values found in interval points.' });
  }
  if (!kWPts.length) {
    addWarning(
      warnings,
      BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_MISSING_KW,
      'Interval points do not include explicit kW values (or derivable kW from kWh + intervalMinutes).'
    );
    reasons.push({ code: BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_MISSING_KW, reason: 'No kW values found/derivable from interval points.' });
  }

  const out: BillIntelligenceIntervalInsightsV1 = { available: false, reasons };

  // Top hour by kWh share
  if (kWhPts.length >= MIN_POINTS_FOR_HOURLY) {
    const hourTotals = new Array<number>(24).fill(0);
    let total = 0;
    for (const p of kWhPts) {
      const hr = Number(p.hourUtc);
      hourTotals[hr] += p.kWh;
      total += p.kWh;
    }
    if (total > 0) {
      let bestHour = 0;
      let bestVal = hourTotals[0];
      for (let h = 1; h < 24; h++) {
        const v = hourTotals[h];
        if (v > bestVal || (v === bestVal && h < bestHour)) {
          bestVal = v;
          bestHour = h;
        }
      }
      out.topHourOfDayKwh = { hourOfDay: bestHour, percentOfTotal: roundTo(bestVal / total, 4) };
      out.available = true;
    }
  } else if (kWhPts.length) {
    addWarning(
      warnings,
      BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_INSUFFICIENT_POINTS,
      `Insufficient kWh interval points for hourly distribution (need >=${MIN_POINTS_FOR_HOURLY}, got ${kWhPts.length}).`
    );
    reasons.push({
      code: BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_INSUFFICIENT_POINTS,
      reason: `Not enough kWh points for topHourOfDayKwh (need >=${MIN_POINTS_FOR_HOURLY}).`,
    });
  }

  // Top hour by kW peak
  if (kWPts.length >= MIN_POINTS_FOR_HOURLY) {
    const hourMax = new Array<number>(24).fill(Number.NEGATIVE_INFINITY);
    for (const p of kWPts) {
      const hr = Number(p.hourUtc);
      hourMax[hr] = Math.max(hourMax[hr], p.kW);
    }
    let bestHour = 0;
    let bestVal = hourMax[0];
    for (let h = 1; h < 24; h++) {
      const v = hourMax[h];
      if (v > bestVal || (v === bestVal && h < bestHour)) {
        bestVal = v;
        bestHour = h;
      }
    }
    if (Number.isFinite(bestVal) && bestVal !== Number.NEGATIVE_INFINITY) {
      out.topHourOfDayKw = { hourOfDay: bestHour, value: roundTo(bestVal, 3) };
      out.available = true;
    }
  } else if (kWPts.length) {
    addWarning(
      warnings,
      BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_INSUFFICIENT_POINTS,
      `Insufficient kW interval points for hourly peak hour (need >=${MIN_POINTS_FOR_HOURLY}, got ${kWPts.length}).`
    );
    reasons.push({
      code: BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_INSUFFICIENT_POINTS,
      reason: `Not enough kW points for topHourOfDayKw (need >=${MIN_POINTS_FOR_HOURLY}).`,
    });
  }

  // Weekday vs weekend kWh/day
  if (kWhPts.length) {
    const dayTotals = new Map<string, { totalKwh: number; weekend: boolean; date: Date }>();
    for (const p of kWhPts) {
      const key = String(p.dateKeyUtc);
      const ex = dayTotals.get(key);
      if (!ex) {
        dayTotals.set(key, { totalKwh: p.kWh, weekend: Boolean(p.weekendUtc), date: p.date as Date });
      } else {
        ex.totalKwh += p.kWh;
      }
    }

    const weekday: number[] = [];
    const weekend: number[] = [];
    for (const v of dayTotals.values()) {
      (v.weekend ? weekend : weekday).push(v.totalKwh);
    }

    if (weekday.length >= MIN_DAYS_FOR_WEEKDAY_WEEKEND && weekend.length >= 1) {
      const weekdayAvg = weekday.reduce((a, b) => a + b, 0) / weekday.length;
      const weekendAvg = weekend.reduce((a, b) => a + b, 0) / weekend.length;
      out.weekdayAvgKwhPerDay = roundTo(weekdayAvg, 3);
      out.weekendAvgKwhPerDay = roundTo(weekendAvg, 3);
      out.deltaWeekdayMinusWeekendKwhPerDay = roundTo(weekdayAvg - weekendAvg, 3);
      out.available = true;
    } else {
      addWarning(
        warnings,
        BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_INSUFFICIENT_POINTS,
        `Insufficient distinct days for weekday/weekend kWh/day comparison (weekdayDays=${weekday.length}, weekendDays=${weekend.length}).`
      );
      reasons.push({
        code: BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_INSUFFICIENT_POINTS,
        reason: 'Not enough distinct weekday/weekend days for kWh/day comparison.',
      });
    }
  }

  // Weekday vs weekend avg kW across points
  if (kWPts.length) {
    const weekdayKw: number[] = [];
    const weekendKw: number[] = [];
    for (const p of kWPts) {
      (p.weekendUtc ? weekendKw : weekdayKw).push(p.kW);
    }
    if (weekdayKw.length && weekendKw.length) {
      const weekdayAvg = weekdayKw.reduce((a, b) => a + b, 0) / weekdayKw.length;
      const weekendAvg = weekendKw.reduce((a, b) => a + b, 0) / weekendKw.length;
      out.weekdayAvgKw = roundTo(weekdayAvg, 3);
      out.weekendAvgKw = roundTo(weekendAvg, 3);
      out.deltaWeekdayMinusWeekendKw = roundTo(weekdayAvg - weekendAvg, 3);
      out.available = true;
    } else {
      addWarning(
        warnings,
        BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_INSUFFICIENT_POINTS,
        `Insufficient kW points for weekday/weekend kW comparison (weekdayPoints=${weekdayKw.length}, weekendPoints=${weekendKw.length}).`
      );
      reasons.push({
        code: BillIntelligenceWarningCodesV1.BILL_INTEL_INTERVAL_DATA_INSUFFICIENT_POINTS,
        reason: 'Not enough weekday/weekend kW points for comparison.',
      });
    }
  }

  // loadFactorApprox = avgKw / explicitPeakKwFromBill
  if (kWPts.length) {
    const avgKw = kWPts.reduce((a, b) => a + b.kW, 0) / kWPts.length;
    const peakKw = Number(args.explicitPeakKwFromBill);
    if (Number.isFinite(peakKw) && peakKw > 0 && Number.isFinite(avgKw) && avgKw >= 0) {
      out.loadFactorApprox = roundTo(avgKw / peakKw, 4);
      out.available = true;
    } else {
      addWarning(
        warnings,
        BillIntelligenceWarningCodesV1.BILL_INTEL_MISSING_PEAK_KW,
        'Explicit peak kW (from bill PDF) required to compute loadFactorApprox.'
      );
      reasons.push({ code: BillIntelligenceWarningCodesV1.BILL_INTEL_MISSING_PEAK_KW, reason: 'Missing explicit peak kW from bill facts.' });
    }
  }

  // peakDayOfWeek: prefer kWh daily total
  if (kWhPts.length) {
    const dayTotals = new Map<string, { totalKwh: number; date: Date }>();
    for (const p of kWhPts) {
      const key = String(p.dateKeyUtc);
      const ex = dayTotals.get(key);
      if (!ex) dayTotals.set(key, { totalKwh: p.kWh, date: p.date as Date });
      else ex.totalKwh += p.kWh;
    }
    let bestKey = '';
    let bestVal = Number.NEGATIVE_INFINITY;
    let bestDate: Date | null = null;
    for (const [key, v] of dayTotals.entries()) {
      if (v.totalKwh > bestVal || (v.totalKwh === bestVal && key < bestKey)) {
        bestVal = v.totalKwh;
        bestKey = key;
        bestDate = v.date;
      }
    }
    if (bestDate && Number.isFinite(bestVal) && bestVal !== Number.NEGATIVE_INFINITY) {
      out.peakDayOfWeek = dayOfWeekLabelUtc(bestDate);
      out.peakDayOfWeekBasis = 'kWh';
      out.available = true;
    }
  } else if (kWPts.length) {
    const dayMax = new Map<string, { maxKw: number; date: Date }>();
    for (const p of kWPts) {
      const key = String(p.dateKeyUtc);
      const ex = dayMax.get(key);
      if (!ex) dayMax.set(key, { maxKw: p.kW, date: p.date as Date });
      else ex.maxKw = Math.max(ex.maxKw, p.kW);
    }
    let bestKey = '';
    let bestVal = Number.NEGATIVE_INFINITY;
    let bestDate: Date | null = null;
    for (const [key, v] of dayMax.entries()) {
      if (v.maxKw > bestVal || (v.maxKw === bestVal && key < bestKey)) {
        bestVal = v.maxKw;
        bestKey = key;
        bestDate = v.date;
      }
    }
    if (bestDate && Number.isFinite(bestVal) && bestVal !== Number.NEGATIVE_INFINITY) {
      out.peakDayOfWeek = dayOfWeekLabelUtc(bestDate);
      out.peakDayOfWeekBasis = 'kW';
      out.available = true;
    }
  }

  return { intervalInsightsV1: out, warnings };
}

