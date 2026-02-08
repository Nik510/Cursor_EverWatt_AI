import type { NormalizedIntervalV1 } from '../interval/normalizeIntervals';
import type { DemandChargeRuleV1, RateDefinitionV1, RateFixedChargeV1 } from '../rates/types';
import { countLocalDaysInRange } from '../time/zonedTime';
import { mapTou } from '../tou/mapTou';

export type BillLineItemEnergyV1 = {
  touLabel: string;
  kwh: number;
  dollarsPerKwh: number;
  dollars: number;
};

export type BillLineItemDemandV1 = {
  kind: DemandChargeRuleV1['kind'];
  touLabel: string; // 'ANY' or TOU label
  dollarsPerKw: number;
  peakKw: number;
  dollars: number;
};

export type BillLineItemFixedV1 = {
  kind: RateFixedChargeV1['kind'];
  quantity: number;
  dollarsEach: number;
  dollars: number;
};

export type BillAuditTraceV1 = {
  warnings: string[];
  touEnergyBreakdown: {
    labelCounts: Record<string, number>;
    totalIntervals: number;
    validIntervals: number;
    invalidIntervals: number;
    unmappedCount: number;
    sample: Array<{ ts: string; touLabel: string }>;
  };
  demandDeterminants: Array<{
    kind: DemandChargeRuleV1['kind'];
    touLabel: string;
    peakKw: number;
    determinantIntervals: Array<{ ts: string; kw: number; touLabel: string }>;
  }>;
};

export type BillResultV1 = {
  rateId: string;
  billingPeriod: { startIso: string; endIso: string; timezone: string };
  totals: {
    totalDollars: number;
    totalKwh: number;
    peakKw: number;
  };
  lineItems: {
    energy: BillLineItemEnergyV1[];
    demand: BillLineItemDemandV1[];
    fixed: BillLineItemFixedV1[];
  };
  auditTrace: BillAuditTraceV1;
};

function safeNum(n: unknown): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function inPeriod(tsIso: string, startMs: number, endMs: number): boolean {
  const t = new Date(tsIso).getTime();
  return Number.isFinite(t) && t >= startMs && t < endMs;
}

function computeFixedCharges(args: {
  fixedCharges: RateFixedChargeV1[];
  startUtc: Date;
  endUtc: Date;
  timeZone: string;
  warnings: string[];
}): { items: BillLineItemFixedV1[]; dollars: number } {
  const items: BillLineItemFixedV1[] = [];
  let total = 0;

  const days = countLocalDaysInRange({ startUtc: args.startUtc, endUtc: args.endUtc, timeZone: args.timeZone });
  if (days == null) args.warnings.push('Unable to compute local day count for per-day fixed charges; treating as 0.');

  for (const fc of args.fixedCharges || []) {
    if (fc.kind === 'perMonth') {
      const dollars = safeNum(fc.dollars);
      items.push({ kind: 'perMonth', quantity: 1, dollarsEach: dollars, dollars: round2(dollars) });
      total += dollars;
    } else if (fc.kind === 'perDay') {
      const qty = days ?? 0;
      const each = safeNum(fc.dollars);
      const dollars = qty * each;
      items.push({ kind: 'perDay', quantity: qty, dollarsEach: each, dollars: round2(dollars) });
      total += dollars;
    }
  }
  return { items, dollars: total };
}

export function calcBill(args: {
  intervals: NormalizedIntervalV1[];
  rate: RateDefinitionV1;
  billingPeriod: { start: string | Date; end: string | Date };
  timezoneOverride?: string;
}): BillResultV1 {
  const warnings: string[] = [];
  const tz = String(args.timezoneOverride || args.rate.timezone || 'UTC').trim() || 'UTC';

  const startUtc = args.billingPeriod.start instanceof Date ? args.billingPeriod.start : new Date(String(args.billingPeriod.start));
  const endUtc = args.billingPeriod.end instanceof Date ? args.billingPeriod.end : new Date(String(args.billingPeriod.end));
  if (!Number.isFinite(startUtc.getTime()) || !Number.isFinite(endUtc.getTime()) || endUtc.getTime() <= startUtc.getTime()) {
    throw new Error('Invalid billingPeriod start/end (must be parseable dates with end > start)');
  }

  const startMs = startUtc.getTime();
  const endMs = endUtc.getTime();

  // Ensure TOU labels exist.
  const mapped = mapTou({ intervals: args.intervals, rate: args.rate, timezoneOverride: tz });
  warnings.push(...mapped.audit.warnings);

  const inRange = mapped.intervals.filter((iv) => inPeriod(iv.ts, startMs, endMs));
  if (!inRange.length) warnings.push('No intervals fell within the billing period.');

  // Totals + energy aggregation.
  const energyKwhByLabel: Record<string, number> = {};
  const energyDollarsByLabel: Record<string, number> = {};
  const energyRateByLabel: Record<string, number> = {};
  let totalKwh = 0;
  let peakKw = 0;

  for (const iv of inRange) {
    if (!iv.isValid) continue;
    totalKwh += iv.kwhForInterval;
    peakKw = Math.max(peakKw, iv.kw);
    const label = String(iv.touLabel || 'UNMAPPED');
    const dollarsPerKwh = args.rate.energyCharges[label];
    if (!Number.isFinite(dollarsPerKwh ?? NaN)) {
      warnings.push(`Missing energy charge for TOU label "${label}" on rate "${args.rate.rateId}"; treating as $0/kWh.`);
      energyRateByLabel[label] = 0;
    } else {
      energyRateByLabel[label] = dollarsPerKwh;
    }
    const rate = Number.isFinite(dollarsPerKwh ?? NaN) ? Number(dollarsPerKwh) : 0;
    energyKwhByLabel[label] = (energyKwhByLabel[label] || 0) + iv.kwhForInterval;
    energyDollarsByLabel[label] = (energyDollarsByLabel[label] || 0) + iv.kwhForInterval * rate;
  }

  const energyItems: BillLineItemEnergyV1[] = Object.keys(energyKwhByLabel)
    .sort()
    .map((label) => ({
      touLabel: label,
      kwh: round2(energyKwhByLabel[label] || 0),
      dollarsPerKwh: safeNum(energyRateByLabel[label]),
      dollars: round2(energyDollarsByLabel[label] || 0),
    }));

  // Demand charges + determinants.
  const demandItems: BillLineItemDemandV1[] = [];
  const demandDeterminants: BillAuditTraceV1['demandDeterminants'] = [];

  for (const rule of args.rate.demandCharges || []) {
    const kind = rule.kind;
    const label = rule.touLabel;
    const dollarsPerKw = safeNum(rule.dollarsPerKw);

    const candidates =
      kind === 'monthlyMaxKw'
        ? inRange
        : inRange.filter((iv) => iv.isValid && String(iv.touLabel || '') === String(label));

    let peak = 0;
    for (const iv of candidates) {
      if (!iv.isValid) continue;
      peak = Math.max(peak, iv.kw);
    }

    const dets = candidates
      .filter((iv) => iv.isValid && Math.abs(iv.kw - peak) < 1e-9)
      .slice(0, 12)
      .map((iv) => ({ ts: iv.ts, kw: iv.kw, touLabel: String(iv.touLabel || 'UNMAPPED') }));

    const dollars = peak * dollarsPerKw;
    demandItems.push({
      kind,
      touLabel: label,
      dollarsPerKw,
      peakKw: round2(peak),
      dollars: round2(dollars),
    });
    demandDeterminants.push({
      kind,
      touLabel: label,
      peakKw: round2(peak),
      determinantIntervals: dets,
    });
  }

  const fixed = computeFixedCharges({
    fixedCharges: args.rate.billing?.fixedCharges || [],
    startUtc,
    endUtc,
    timeZone: tz,
    warnings,
  });

  const totalEnergy = energyItems.reduce((s, x) => s + safeNum(x.dollars), 0);
  const totalDemand = demandItems.reduce((s, x) => s + safeNum(x.dollars), 0);
  const totalFixed = fixed.items.reduce((s, x) => s + safeNum(x.dollars), 0);
  const totalDollars = round2(totalEnergy + totalDemand + totalFixed);

  const touSample = mapped.audit.sample.map((s) => ({ ts: s.ts, touLabel: s.touLabel }));

  return {
    rateId: args.rate.rateId,
    billingPeriod: { startIso: startUtc.toISOString(), endIso: endUtc.toISOString(), timezone: tz },
    totals: {
      totalDollars,
      totalKwh: round2(totalKwh),
      peakKw: round2(peakKw),
    },
    lineItems: {
      energy: energyItems,
      demand: demandItems,
      fixed: fixed.items,
    },
    auditTrace: {
      warnings,
      touEnergyBreakdown: {
        labelCounts: mapped.audit.labelCounts,
        totalIntervals: mapped.audit.totalIntervals,
        validIntervals: mapped.audit.validIntervals,
        invalidIntervals: mapped.audit.invalidIntervals,
        unmappedCount: mapped.audit.unmappedCount,
        sample: touSample,
      },
      demandDeterminants,
    },
  };
}

