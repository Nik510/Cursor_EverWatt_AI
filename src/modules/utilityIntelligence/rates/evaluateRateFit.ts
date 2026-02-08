import type { UtilityInputs, UtilityInsights } from '../types';
import type { RateCatalogEntry } from './types';
import { listRatesForTerritory } from './rateCatalog';
import { getDemandRateForCode } from '../../../utils/rates/demand-rate-lookup';
import { makeSimpleDemandTariff } from '../../tariffEngine/library/simple-demand';
import { BillingPeriodSchema, IntervalRowSchema } from '../../tariffEngine/schema';
import { assignIntervalsToBillingCycles } from '../../tariffEngine/join';
import { calculateBillsPerCycle } from '../../tariffEngine/billing';
import { normalizeIntervals } from '../../billingEngineV1/interval/normalizeIntervals';
import { compareRates } from '../../billingEngineV1/evaluate/compareRates';
import { PGE_CATALOG_V1, resolvePgeSimRateForCode } from '../../billingEngineV1/rates/pge_catalog_v1';

export type IntervalKwPoint = { timestampIso: string; kw: number };

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normTerritory(s: string | undefined | null): string {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function normRateCode(s: string | undefined | null): string {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '-');
}

function isOptionSLike(rateCode: string): boolean {
  const r = normRateCode(rateCode).replace(/-/g, '');
  return r.endsWith('S');
}

function safeNum(n: unknown): number | null {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

function buildBillingPeriodsFromSummary(inputs: UtilityInputs): Array<{
  cycleId: string;
  billStartDate: Date;
  billEndDate: Date;
  statedTotalBill?: number;
  rateCode?: string;
}> {
  const monthly = inputs.billingSummary?.monthly || [];
  const out: Array<{ cycleId: string; billStartDate: Date; billEndDate: Date; statedTotalBill?: number; rateCode?: string }> = [];
  for (const m of monthly) {
    const start = new Date(String(m.start || '').trim());
    const end = new Date(String(m.end || '').trim());
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) continue;
    const cycleId = `${inputs.projectId}:${end.toISOString().slice(0, 10)}`;
    out.push({
      cycleId,
      billStartDate: start,
      billEndDate: end,
      statedTotalBill: safeNum(m.dollars) ?? undefined,
      rateCode: inputs.currentRate?.rateCode ? String(inputs.currentRate.rateCode) : undefined,
    });
  }
  return out;
}

function buildIntervals(intervalKw: IntervalKwPoint[]): Array<{ timestamp: Date; kw: number }> {
  const out: Array<{ timestamp: Date; kw: number }> = [];
  for (const r of intervalKw) {
    const d = new Date(String(r.timestampIso || '').trim());
    const kw = Number(r.kw);
    if (!Number.isFinite(d.getTime()) || !Number.isFinite(kw)) continue;
    out.push({ timestamp: d, kw });
  }
  out.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return out;
}

function inferCandidateSet(args: {
  territory: string;
  currentRateCode?: string;
  scheduleBucket: UtilityInsights['operatingPatternInference']['scheduleBucket'];
  peakinessIndex?: number;
  hasDemandChargesKnown?: boolean;
}): Array<{ entry: RateCatalogEntry; status: 'candidate' | 'needs_eval' | 'unlikely'; because: string[] }> {
  const rates = listRatesForTerritory(args.territory);
  const current = args.currentRateCode ? normRateCode(args.currentRateCode) : '';
  const peakiness = Number.isFinite(args.peakinessIndex ?? NaN) ? Number(args.peakinessIndex) : null;

  const out: Array<{ entry: RateCatalogEntry; status: 'candidate' | 'needs_eval' | 'unlikely'; because: string[] }> = [];
  for (const r of rates) {
    const rc = normRateCode(r.rateCode);
    if (current && normRateCode(current) === rc) continue;

    const because: string[] = [];
    let status: 'candidate' | 'needs_eval' | 'unlikely' = 'needs_eval';

    if (r.optionSTag) {
      // Treat Option S as a candidate only when peaks are sharp or when demand charges are known to matter.
      if (peakiness != null && peakiness >= 2.2) {
        status = 'candidate';
        because.push(`Load is peaky (peakinessIndex≈${peakiness.toFixed(2)}), which can make daily-demand structures worth evaluating.`);
      } else {
        status = 'needs_eval';
        because.push('Option S is storage/rider-specific; evaluate only if storage or sharp daily peaks are present.');
      }
    }

    if (args.scheduleBucket === 'business_hours' && r.touSensitive) {
      because.push('Business-hours operation often benefits from TOU-aware rates (site-specific; needs evaluation).');
      if (status !== 'unlikely') status = 'needs_eval';
    }

    if (args.hasDemandChargesKnown === false && r.requiresDemand) {
      status = 'needs_eval';
      because.push('Demand charge presence is not confirmed; verify demand charges before comparing demand-heavy rates.');
    }

    out.push({ entry: r, status, because: because.length ? because : ['Candidate generated from territory rate catalog (v1).'] });
  }

  // Rank: prioritize Option S and common large C&I codes first.
  out.sort((a, b) => {
    const ao = a.entry.optionSTag ? 1 : 0;
    const bo = b.entry.optionSTag ? 1 : 0;
    if (ao !== bo) return bo - ao;
    return normRateCode(a.entry.rateCode).localeCompare(normRateCode(b.entry.rateCode));
  });
  return out.slice(0, 8);
}

function computeDemandOnlyDeltaFromTariffEngine(args: {
  utility: string;
  currentRateCode: string;
  candidateRateCode: string;
  billingPeriods: any[];
  intervalRows: Array<{ timestamp: Date; kw: number }>;
}): { deltaDollars: number; confidence: number; notes: string[] } | null {
  const notes: string[] = [];
  const curInfo = getDemandRateForCode(args.currentRateCode, args.utility);
  const candInfo = getDemandRateForCode(args.candidateRateCode, args.utility);
  if (!curInfo || !candInfo) return null;

  const curTariff = makeSimpleDemandTariff({
    rateCode: args.currentRateCode,
    utility: args.utility,
    demandRatePerKwMonth: curInfo.rate,
    timezone: 'UTC',
  });
  const candTariff = makeSimpleDemandTariff({
    rateCode: args.candidateRateCode,
    utility: args.utility,
    demandRatePerKwMonth: candInfo.rate,
    timezone: 'UTC',
  });

  const parsedPeriods = args.billingPeriods
    .map((p) => BillingPeriodSchema.safeParse(p))
    .filter((x) => x.success)
    .map((x) => (x as any).data);
  if (!parsedPeriods.length) return null;

  const parsedIntervals = args.intervalRows
    .map((r) => IntervalRowSchema.safeParse(r))
    .filter((x) => x.success)
    .map((x) => (x as any).data);
  if (!parsedIntervals.length) return null;

  const joined = assignIntervalsToBillingCycles({ intervals: parsedIntervals, billingPeriods: parsedPeriods });
  if (joined.qa.unassignedIntervals > 0) {
    notes.push('Some intervals could not be assigned to billing periods; skipping deterministic delta.');
    return null;
  }

  const runCur = calculateBillsPerCycle({
    tariff: curTariff,
    billingPeriods: parsedPeriods,
    assignedBefore: joined.assigned,
    assignedAfter: joined.assigned,
  });
  const runCand = calculateBillsPerCycle({
    tariff: candTariff,
    billingPeriods: parsedPeriods,
    assignedBefore: joined.assigned,
    assignedAfter: joined.assigned,
  });

  const curTotal = runCur.cycles.reduce((s, c) => s + c.total, 0);
  const candTotal = runCand.cycles.reduce((s, c) => s + c.total, 0);
  const delta = candTotal - curTotal;
  notes.push('Computed demand-only bill delta using tariffEngine simple-demand model (energy charges not modeled).');
  notes.push(`Demand rates from internal library: current=$${curInfo.rate.toFixed(2)}/kW-mo candidate=$${candInfo.rate.toFixed(2)}/kW-mo.`);
  const confidence = 0.55; // bounded: demand-only model
  return { deltaDollars: delta, confidence, notes };
}

function computeItemizedDeltaFromBillingEngineV1(args: {
  territory: string;
  currentRateCode: string;
  candidateRateCode: string;
  intervalKw: IntervalKwPoint[];
}): { deltaDollars: number; confidence: number; notes: string[] } | null {
  const territory = normTerritory(args.territory);
  if (territory !== 'PGE') return null;

  const baseRate = resolvePgeSimRateForCode(args.currentRateCode);
  const candRate = resolvePgeSimRateForCode(args.candidateRateCode);
  if (!baseRate || !candRate) return null;
  if (baseRate.rateId === candRate.rateId) return null;

  // Prefer the rate timezone (PG&E sim catalog defaults to America/Los_Angeles).
  const tz = String(baseRate.timezone || 'America/Los_Angeles');

  const norm = normalizeIntervals({
    intervals: args.intervalKw as any,
    inputUnit: 'kW',
    timezone: tz,
  });
  const intervals = norm.intervals;
  if (!intervals.some((x) => x.isValid)) return null;

  const cmp = compareRates({
    intervals,
    baseline: baseRate,
    candidates: PGE_CATALOG_V1.filter((r) => r.rateId !== baseRate.rateId),
    timezoneOverride: tz,
  });

  const deltaRec = cmp.ranked.find((r) => r.rateId === candRate.rateId);
  if (!deltaRec) return null;
  const delta = deltaRec.estimatedDeltaDollars;
  const notes: string[] = [];
  notes.push('Computed itemized bill delta using billingEngineV1 (energy + demand + fixed) with PG&E simulated catalog rates.');
  notes.push(`Catalog mapping: current=${baseRate.rateId} candidate=${candRate.rateId}.`);
  notes.push(`Computed using BillingEngineV1, monthsUsed=${cmp.monthsUsed}, tz=${tz}.`);
  if (norm.warnings.length) notes.push(`Interval normalization warnings: ${norm.warnings.slice(0, 2).join(' | ')}`);
  const confidence = 0.75; // bounded by simulated catalog placeholders, but itemized model is richer than demand-only.
  return { deltaDollars: delta, confidence, notes };
}

export function evaluateRateFit(args: {
  inputs: UtilityInputs;
  scheduleBucket: UtilityInsights['operatingPatternInference']['scheduleBucket'];
  loadShape?: UtilityInsights['inferredLoadShape'];
  intervalKw?: IntervalKwPoint[] | null;
}): UtilityInsights['rateFit'] {
  const territory = normTerritory(args.inputs.utilityTerritory);
  const currentRateCode = args.inputs.currentRate?.rateCode ? normRateCode(args.inputs.currentRate.rateCode) : '';

  const because: string[] = [];
  const alternatives: UtilityInsights['rateFit']['alternatives'] = [];

  if (!territory) {
    return {
      status: 'unknown',
      currentRateCode: currentRateCode || undefined,
      confidence: 0,
      because: ['Utility territory missing; cannot generate candidate rates.'],
      alternatives: [],
    };
  }

  if (!currentRateCode) {
    because.push('Current tariff/rate code is missing; cannot evaluate rate fit deterministically.');
    because.push('Collect the exact rate code from the utility bill or portal before comparing alternatives.');

    const candidates = inferCandidateSet({
      territory,
      currentRateCode: undefined,
      scheduleBucket: args.scheduleBucket,
      peakinessIndex: args.loadShape?.peakinessIndex,
      hasDemandChargesKnown: args.inputs.meterMeta?.hasDemandChargesKnown,
    });

    for (const c of candidates) {
      alternatives.push({
        utility: c.entry.utility,
        rateCode: c.entry.rateCode,
        status: 'needs_eval',
        because: [...c.because, 'Current rate code missing; evaluate only after collecting current schedule.'],
        requiredInputsMissing: ['Current tariff/rate code required to compare rates.'],
      });
    }

    return {
      status: 'unknown',
      currentRateCode: undefined,
      confidence: 0.1,
      because,
      alternatives,
    };
  }

  const peakiness = args.loadShape?.peakinessIndex;
  if (Number.isFinite(peakiness ?? NaN)) because.push(`Observed peakinessIndex≈${Number(peakiness).toFixed(2)} (from interval metrics).`);
  if (args.scheduleBucket !== 'unknown') because.push(`Operating schedule inferred as ${args.scheduleBucket}.`);

  const candidates = inferCandidateSet({
    territory,
    currentRateCode,
    scheduleBucket: args.scheduleBucket,
    peakinessIndex: args.loadShape?.peakinessIndex,
    hasDemandChargesKnown: args.inputs.meterMeta?.hasDemandChargesKnown,
  });

  // Determine a coarse status for current fit.
  let status: UtilityInsights['rateFit']['status'] = 'ok';
  let confidence = 0.35;
  if (Number.isFinite(args.loadShape?.loadFactor ?? NaN)) {
    const lf = Number(args.loadShape?.loadFactor);
    if (lf < 0.45) {
      status = 'likely_suboptimal';
      because.push('Load factor appears low (peaky); TOU/demand-optimized alternatives may be worth evaluating.');
      confidence = 0.55;
    } else if (lf > 0.7) {
      status = 'ok';
      because.push('Load factor appears moderate/high; rate changes may be lower-impact unless TOU alignment is poor.');
      confidence = 0.45;
    }
  } else {
    status = 'unknown';
    because.push('Load shape metrics missing; rate fit confidence is limited.');
    confidence = 0.2;
  }

  // Deterministic delta calculation (demand-only) when we have billing periods + intervals.
  const periods = buildBillingPeriodsFromSummary(args.inputs);
  const intervalRows = Array.isArray(args.intervalKw) ? buildIntervals(args.intervalKw) : [];

  for (const c of candidates) {
    const missing: string[] = [];
    const rc = normRateCode(c.entry.rateCode);
    let estimatedDeltaDollars: number | undefined;
    let estimatedDeltaConfidence: number | undefined;
    const altBecause = [...c.because];

    if (!intervalRows.length) {
      missing.push('Interval kW series required to compute deterministic bill deltas per billing cycle.');
    }

    // First try itemized billing engine (PG&E sim rates only). If not applicable, fall back to demand-only.
    const itemized =
      intervalRows.length > 0
        ? computeItemizedDeltaFromBillingEngineV1({
            territory,
            currentRateCode,
            candidateRateCode: rc,
            intervalKw: (args.intervalKw || []) as any,
          })
        : null;

    if (!itemized && !args.inputs.billingSummary?.monthly?.length) {
      missing.push('Billing cycle summary (start/end dates, demand/usage) required to compute bill deltas.');
    }

    if (intervalRows.length) {
      if (itemized) {
        estimatedDeltaDollars = itemized.deltaDollars;
        estimatedDeltaConfidence = itemized.confidence;
        altBecause.push(...itemized.notes);
      }

      const calc = periods.length
        ? computeDemandOnlyDeltaFromTariffEngine({
            utility: c.entry.utility,
            currentRateCode,
            candidateRateCode: rc,
            billingPeriods: periods,
            intervalRows,
          })
        : null;
      if (!itemized) {
        if (calc) {
          estimatedDeltaDollars = calc.deltaDollars;
          estimatedDeltaConfidence = calc.confidence;
          altBecause.push(...calc.notes);
        } else {
          altBecause.push('Potential improvement; needs additional inputs or better tariff modeling to compute deterministic savings.');
        }
      }
    } else {
      altBecause.push('Potential improvement; needs billing periods + interval data to compute deterministic delta.');
    }

    alternatives.push({
      utility: c.entry.utility,
      rateCode: c.entry.rateCode,
      status: c.status,
      because: altBecause,
      ...(Number.isFinite(estimatedDeltaDollars ?? NaN) ? { estimatedDeltaDollars } : {}),
      ...(Number.isFinite(estimatedDeltaConfidence ?? NaN) ? { estimatedDeltaConfidence } : {}),
      ...(missing.length ? { requiredInputsMissing: missing } : {}),
    });
  }

  return {
    status,
    currentRateCode,
    confidence: clamp01(confidence),
    because,
    alternatives,
  };
}

