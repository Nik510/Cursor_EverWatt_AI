import type { NormalizedIntervalV1 } from '../interval/normalizeIntervals';
import type { RateDefinitionV1 } from '../rates/types';
import { calcBill, type BillResultV1 } from '../calc/calcBill';
import { calcBillForMonths, type BillMonthResultV1 } from '../calc/calcBillForMonths';

export type CompareRatesResultV1 = {
  baselineRateId: string;
  billingPeriod?: { startIso: string; endIso: string; timezone: string };
  monthsUsed: number;
  baseline: { totalDollars: number; totalKwh: number; peakKw: number };
  baselineMonthlyTotals: Array<{ month: string; totalDollars: number; totalKwh: number; peakKw: number }>;
  ranked: Array<{
    rateId: string;
    totalDollars: number;
    deltaDollarsVsBaseline: number;
    estimatedDeltaDollars: number; // baseline - candidate
    totalKwh: number;
    peakKw: number;
    monthlyTotals?: Array<{ month: string; totalDollars: number; totalKwh: number; peakKw: number }>;
    auditSummary?: {
      warningsCount: number;
      demandDeterminants: Array<{ kind: string; touLabel: string; peakKw: number; ts: string | null }>;
    };
  }>;
  topAuditTraces: Record<string, BillResultV1['auditTrace']>;
  warnings: string[];
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function compareRates(args: {
  intervals: NormalizedIntervalV1[];
  baseline: RateDefinitionV1;
  candidates: RateDefinitionV1[];
  billingPeriod?: { start: string | Date; end: string | Date };
  timezoneOverride?: string;
}): CompareRatesResultV1 {
  const warnings: string[] = [];

  let baselineBill: BillResultV1 | null = null;
  let baselineMonths: BillMonthResultV1[] = [];
  if (args.billingPeriod) {
    baselineBill = calcBill({
      intervals: args.intervals,
      rate: args.baseline,
      billingPeriod: args.billingPeriod,
      timezoneOverride: args.timezoneOverride,
    });
  } else {
    const calc = calcBillForMonths({ intervals: args.intervals, rate: args.baseline, timezoneOverride: args.timezoneOverride });
    baselineMonths = calc.months;
    warnings.push(...calc.warnings);
  }

  const bills: BillResultV1[] = [];
  const billsByRateId: Record<string, { monthly?: BillMonthResultV1[]; total?: BillResultV1 }> = {};
  for (const r of args.candidates || []) {
    try {
      if (args.billingPeriod) {
        const b = calcBill({
          intervals: args.intervals,
          rate: r,
          billingPeriod: args.billingPeriod,
          timezoneOverride: args.timezoneOverride,
        });
        bills.push(b);
        billsByRateId[r.rateId] = { total: b };
      } else {
        const b = calcBillForMonths({ intervals: args.intervals, rate: r, timezoneOverride: args.timezoneOverride });
        warnings.push(...b.warnings);
        billsByRateId[r.rateId] = { monthly: b.months };
      }
    } catch (e) {
      warnings.push(`Failed to compute bill for rate "${r?.rateId}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const baselineTotals = baselineBill
    ? baselineBill.totals
    : {
        totalDollars: round2(baselineMonths.reduce((s, m) => s + m.totals.totalDollars, 0)),
        totalKwh: round2(baselineMonths.reduce((s, m) => s + m.totals.totalKwh, 0)),
        peakKw: round2(baselineMonths.reduce((m, b) => Math.max(m, b.totals.peakKw), 0)),
      };
  const baselineMonthlyTotals = baselineMonths.map((m) => ({
    month: m.month,
    totalDollars: m.totals.totalDollars,
    totalKwh: m.totals.totalKwh,
    peakKw: m.totals.peakKw,
  }));

  const ranked = (() => {
    if (args.billingPeriod) {
      return bills
        .map((b) => ({
          rateId: b.rateId,
          totalDollars: b.totals.totalDollars,
          deltaDollarsVsBaseline: round2(b.totals.totalDollars - baselineTotals.totalDollars),
          estimatedDeltaDollars: round2(baselineTotals.totalDollars - b.totals.totalDollars),
          totalKwh: b.totals.totalKwh,
          peakKw: b.totals.peakKw,
          audit: b.auditTrace,
        }))
        .sort((a, b) => {
          const d = a.totalDollars - b.totalDollars;
          if (d !== 0) return d;
          return a.rateId.localeCompare(b.rateId);
        });
    }

    return Object.entries(billsByRateId)
      .map(([rateId, rec]) => {
        const months = rec.monthly || [];
        const totalDollars = round2(months.reduce((s, m) => s + m.totals.totalDollars, 0));
        const totalKwh = round2(months.reduce((s, m) => s + m.totals.totalKwh, 0));
        const peakKw = round2(months.reduce((m, b) => Math.max(m, b.totals.peakKw), 0));
        return {
          rateId,
          totalDollars,
          deltaDollarsVsBaseline: round2(totalDollars - baselineTotals.totalDollars),
          estimatedDeltaDollars: round2(baselineTotals.totalDollars - totalDollars),
          totalKwh,
          peakKw,
          monthlyTotals: months.map((m) => ({
            month: m.month,
            totalDollars: m.totals.totalDollars,
            totalKwh: m.totals.totalKwh,
            peakKw: m.totals.peakKw,
          })),
          audit: months[0]?.auditTrace || { warnings: [], touEnergyBreakdown: { labelCounts: {}, totalIntervals: 0, validIntervals: 0, invalidIntervals: 0, unmappedCount: 0, sample: [] }, demandDeterminants: [] },
        };
      })
      .sort((a, b) => {
        const d = a.totalDollars - b.totalDollars;
        if (d !== 0) return d;
        return a.rateId.localeCompare(b.rateId);
      });
  })();

  const topAuditTraces: Record<string, BillResultV1['auditTrace']> = {};
  for (const r of ranked.slice(0, 3)) {
    topAuditTraces[r.rateId] = r.audit;
  }

  const rankedOut = ranked.map((r, idx) => {
    const auditSummary =
      idx < 3
        ? {
            warningsCount: r.audit.warnings.length,
            demandDeterminants: r.audit.demandDeterminants.map((d) => ({
              kind: d.kind,
              touLabel: d.touLabel,
              peakKw: d.peakKw,
              ts: d.determinantIntervals[0]?.ts || null,
            })),
          }
        : undefined;
    return {
      rateId: r.rateId,
      totalDollars: r.totalDollars,
      deltaDollarsVsBaseline: r.deltaDollarsVsBaseline,
      estimatedDeltaDollars: r.estimatedDeltaDollars,
      totalKwh: r.totalKwh,
      peakKw: r.peakKw,
      ...(r.monthlyTotals ? { monthlyTotals: r.monthlyTotals } : {}),
      ...(auditSummary ? { auditSummary } : {}),
    };
  });

  return {
    baselineRateId: baselineBill ? baselineBill.rateId : args.baseline.rateId,
    ...(baselineBill ? { billingPeriod: baselineBill.billingPeriod } : {}),
    monthsUsed: baselineBill ? 1 : baselineMonthlyTotals.length,
    baseline: baselineTotals,
    baselineMonthlyTotals,
    ranked: rankedOut,
    topAuditTraces,
    warnings,
  };
}

