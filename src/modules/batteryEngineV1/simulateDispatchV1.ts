import { getZonedParts } from '../billingEngineV1/time/zonedTime';
import { defaultBatteryEngineConfigV1 } from './constants';
import { BatteryOpportunityReasonCodesV1, uniqSortedReasonCodes } from './reasons';
import type {
  BatteryConfigV1,
  BatteryEngineConfigV1,
  DispatchSimulationV1,
  DispatchStrategyIdV1,
  DispatchStrategyResultV1,
  EvaluateStorageOpportunityPackV1Args,
  IntervalPointV1,
  RangeEstimateV1,
  ScalarEstimateV1,
  TariffPriceSignalsV1,
} from './types';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return NaN;
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

function kwFromIntervalPoint(p: IntervalPointV1): number | null {
  const kW = Number((p as any)?.kW);
  if (Number.isFinite(kW)) return kW;
  const kWh = Number((p as any)?.kWh);
  const mins = Number((p as any)?.intervalMinutes);
  if (Number.isFinite(kWh) && Number.isFinite(mins) && mins > 0) return kWh * (60 / mins);
  return null;
}

function inferPeakAndBaseloadFromBuckets(args: { dailyProfileBuckets: Array<{ avgKw: number }>; baseloadKw: number | null }): {
  peakKw: number | null;
  baseloadKw: number | null;
} {
  const b = args.dailyProfileBuckets || [];
  const peak = b.length ? Math.max(...b.map((x) => Number(x.avgKw)).filter((n) => Number.isFinite(n))) : NaN;
  const peakKw = Number.isFinite(peak) ? peak : null;
  const baseloadKw = Number.isFinite(Number(args.baseloadKw)) ? Number(args.baseloadKw) : null;
  return { peakKw, baseloadKw };
}

function headroomKw(args: { peakKw: number | null; baseloadKw: number | null }): number {
  const peak = Number(args.peakKw);
  const base = Number(args.baseloadKw);
  if (!Number.isFinite(peak) || !Number.isFinite(base)) return 0;
  return Math.max(0, peak - base);
}

function estimateEnergyDeliverablePerDayKwh(args: { battery: BatteryConfigV1; dischargeDurationHours: number; headroomKw: number }): {
  dischargeKwh: number;
  constraintsHit: string[];
} {
  const constraintsHit: string[] = [];
  const dur = Math.max(0, Number(args.dischargeDurationHours) || 0);
  const P = Math.max(0, Number(args.battery.powerKw) || 0);
  const E = Math.max(0, Number(args.battery.energyKwh) || 0);
  const rte = clamp01(Number(args.battery.rte) || 0);

  // Discharge energy limited by power * duration and usable energy (E * rte).
  const maxByPower = P * dur;
  const maxByEnergy = E * rte;
  let dischargeKwh = Math.max(0, Math.min(maxByPower, maxByEnergy));

  // Also cap by available headroom over baseload.
  const capByHeadroom = Math.max(0, Number(args.headroomKw) || 0) * dur;
  dischargeKwh = Math.min(dischargeKwh, capByHeadroom);

  if (maxByEnergy + 1e-9 < maxByPower) constraintsHit.push('INSUFFICIENT_ENERGY');
  if (capByHeadroom + 1e-9 < dischargeKwh) constraintsHit.push('INSUFFICIENT_LOAD_HEADROOM');
  if (P <= 0) constraintsHit.push('ZERO_POWER');
  if (E <= 0) constraintsHit.push('ZERO_ENERGY');
  if (dur <= 0) constraintsHit.push('INVALID_DURATION');

  return { dischargeKwh: roundTo(dischargeKwh, 6), constraintsHit: constraintsHit.sort() };
}

function findPeakAndOffpeakPrices(args: { tariff: TariffPriceSignalsV1 | null | undefined }): {
  ok: boolean;
  peakPricePerKwh: number | null;
  offpeakPricePerKwh: number | null;
} {
  const t = args.tariff;
  const winsGenAllIn = Array.isArray((t as any)?.generationAllInTouEnergyPrices) ? (((t as any).generationAllInTouEnergyPrices as any[]) || []) : [];
  const winsGenEnergyOnly = Array.isArray((t as any)?.generationTouEnergyPrices) ? (((t as any).generationTouEnergyPrices as any[]) || []) : [];
  const winsDelivery = Array.isArray(t?.touEnergyPrices) ? (t!.touEnergyPrices as any[]) : [];
  const wins = winsGenAllIn.length ? (winsGenAllIn as any) : winsGenEnergyOnly.length ? (winsGenEnergyOnly as any) : (winsDelivery as any);
  const prices = wins.map((w) => Number((w as any)?.pricePerKwh)).filter((n) => Number.isFinite(n) && n >= 0);
  if (!wins.length || !prices.length) return { ok: false, peakPricePerKwh: null, offpeakPricePerKwh: null };
  const peak = Math.max(...prices);
  const off = Math.min(...prices);
  return { ok: true, peakPricePerKwh: peak, offpeakPricePerKwh: off };
}

function energySavingsFromArbitrage(args: { deliveredKwh: number; rte: number; peakPricePerKwh: number; offpeakPricePerKwh: number }): number {
  const x = Math.max(0, Number(args.deliveredKwh) || 0);
  const rte = clamp01(Number(args.rte) || 0);
  const peak = Number(args.peakPricePerKwh);
  const off = Number(args.offpeakPricePerKwh);
  if (!Number.isFinite(peak) || !Number.isFinite(off) || peak < 0 || off < 0) return 0;
  if (rte <= 0) return 0;
  // Net savings: avoid buying x kWh at peak, but buy x/rte at offpeak to charge.
  const net = x * peak - (x / rte) * off;
  return Math.max(0, net);
}

function mkRange(value: number | null, method: string): RangeEstimateV1 {
  const v = Number(value);
  if (!Number.isFinite(v)) return { min: null, max: null, method };
  return { min: roundTo(v, 6), max: roundTo(v, 6), method };
}

function mkScalar(value: number | null, method: string): ScalarEstimateV1 {
  const v = Number(value);
  if (!Number.isFinite(v)) return { value: null, method };
  return { value: roundTo(v, 6), method };
}

function peakHourLocalFromIntervals(args: { points: IntervalPointV1[]; timezone: string }): number | null {
  let bestKw = Number.NEGATIVE_INFINITY;
  let bestHour: number | null = null;
  for (const p of args.points || []) {
    const kw = kwFromIntervalPoint(p);
    if (!Number.isFinite(Number(kw))) continue;
    const ms = Date.parse(String((p as any)?.timestampIso || '').trim());
    if (!Number.isFinite(ms)) continue;
    const parts = getZonedParts(new Date(ms), args.timezone);
    if (!parts) continue;
    const hour = parts.hour;
    if (kw! > bestKw || (kw === bestKw && (bestHour === null || hour < bestHour))) {
      bestKw = kw!;
      bestHour = hour;
    }
  }
  return bestHour;
}

function peakHourLocalFromBuckets(args: { dailyProfileBuckets: Array<{ bucketStartHourLocal: number; avgKw: number }> }): number | null {
  const b = Array.isArray(args.dailyProfileBuckets) ? args.dailyProfileBuckets : [];
  let best = Number.NEGATIVE_INFINITY;
  let bestStart: number | null = null;
  for (const x of b) {
    const kw = Number((x as any)?.avgKw);
    const start = Number((x as any)?.bucketStartHourLocal);
    if (!Number.isFinite(kw) || !Number.isFinite(start)) continue;
    if (kw > best || (kw === best && (bestStart === null || start < bestStart))) {
      best = kw;
      bestStart = start;
    }
  }
  // Choose the start hour of the 4-hour bucket as the peak “hour anchor”.
  return bestStart;
}

export function simulateDispatchV1(args: {
  intervalInsightsV1: EvaluateStorageOpportunityPackV1Args['intervalInsightsV1'];
  intervalPointsV1?: EvaluateStorageOpportunityPackV1Args['intervalPointsV1'];
  tariffPriceSignalsV1?: EvaluateStorageOpportunityPackV1Args['tariffPriceSignalsV1'];
  determinantsV1?: EvaluateStorageOpportunityPackV1Args['determinantsV1'];
  battery: BatteryConfigV1;
  config?: Partial<BatteryEngineConfigV1>;
}): DispatchSimulationV1 {
  const cfg: BatteryEngineConfigV1 = { ...defaultBatteryEngineConfigV1, ...(args.config || {}) } as any;

  const warnings: string[] = [];
  const intervalInsights = args.intervalInsightsV1;
  const tariff = args.tariffPriceSignalsV1 || null;

  const tz = String((tariff as any)?.timezone || (intervalInsights as any)?.timezoneUsed || '').trim();
  const hasTimezone = Boolean(tz);

  const useIntervalPoints = Array.isArray(args.intervalPointsV1) && args.intervalPointsV1.length > 0;
  if (!useIntervalPoints) {
    warnings.push(BatteryOpportunityReasonCodesV1.BATTERY_DISPATCH_V1_MISSING_INTERVAL_POINTS);
    warnings.push(BatteryOpportunityReasonCodesV1.BATTERY_DISPATCH_V1_BUCKET_ONLY_SIMULATION);
  }

  const peakBaseload = intervalInsights
    ? inferPeakAndBaseloadFromBuckets({
        dailyProfileBuckets: (intervalInsights as any)?.dailyProfileBuckets || [],
        baseloadKw: (intervalInsights as any)?.baseloadKw ?? null,
      })
    : { peakKw: null, baseloadKw: null };

  const peakKw = Number.isFinite(Number((intervalInsights as any)?.peakKw)) ? Number((intervalInsights as any)?.peakKw) : peakBaseload.peakKw;
  const baseloadKw = Number.isFinite(Number((intervalInsights as any)?.baseloadKw)) ? Number((intervalInsights as any)?.baseloadKw) : peakBaseload.baseloadKw;

  const headroom = headroomKw({ peakKw, baseloadKw });
  const dur = Math.max(1, Math.min(4, Math.round(Number(cfg.drWindowDurationHours) || 2)));

  const prices = findPeakAndOffpeakPrices({ tariff });
  if (!prices.ok) warnings.push(BatteryOpportunityReasonCodesV1.BATTERY_V1_MISSING_TARIFF_PRICES);

  // A deterministic “anchor hour” for peak-based strategies.
  const peakHourLocal = (() => {
    if (useIntervalPoints && hasTimezone) return peakHourLocalFromIntervals({ points: args.intervalPointsV1!, timezone: tz });
    const buckets = (intervalInsights as any)?.dailyProfileBuckets || [];
    return peakHourLocalFromBuckets({ dailyProfileBuckets: buckets });
  })();
  if (!Number.isFinite(Number(peakHourLocal))) warnings.push(BatteryOpportunityReasonCodesV1.BATTERY_V1_INSUFFICIENT_LOAD_SHAPE);

  const days = Math.max(0, Math.floor(Number(cfg.dispatchDaysPerYear) || 0));

  const demandChargePerKw = Number((tariff as any)?.demandChargePerKw);
  const determinantsBillingDemandKw = Number((args.determinantsV1 as any)?.billingDemandKw);
  const demandEnabled = Number.isFinite(demandChargePerKw) && demandChargePerKw >= 0 && Number.isFinite(determinantsBillingDemandKw) && determinantsBillingDemandKw > 0;
  if (!demandEnabled) warnings.push(BatteryOpportunityReasonCodesV1.BATTERY_V1_MISSING_DEMAND_DETERMINANTS);

  const rte = clamp01(Number(args.battery.rte) || cfg.rte);
  const battery = { ...args.battery, rte, maxCyclesPerDay: Math.max(0, Number(args.battery.maxCyclesPerDay) || cfg.maxCyclesPerDay) };
  const cycles = Math.max(0, Math.floor(battery.maxCyclesPerDay));
  if (cycles <= 0) warnings.push('MAX_CYCLES_LIMIT');

  function runStrategy(strategyId: DispatchStrategyIdV1, weight: number): DispatchStrategyResultV1 {
    // For v1, all strategies share the same daily discharge energy estimate; strategies differ in how strongly they map to price/demand.
    const { dischargeKwh, constraintsHit } = estimateEnergyDeliverablePerDayKwh({
      battery,
      dischargeDurationHours: dur,
      headroomKw: headroom,
    });

    const deliveredPerDay = dischargeKwh * Math.max(0, cycles);
    const shiftedKwhAnnual = deliveredPerDay * days;
    const peakKwReduction = dur > 0 ? deliveredPerDay / dur : 0;

    const energySavingsAnnual =
      prices.ok && prices.peakPricePerKwh !== null && prices.offpeakPricePerKwh !== null
        ? energySavingsFromArbitrage({
            deliveredKwh: shiftedKwhAnnual * weight,
            rte: battery.rte,
            peakPricePerKwh: prices.peakPricePerKwh,
            offpeakPricePerKwh: prices.offpeakPricePerKwh,
          })
        : NaN;

    const demandSavingsAnnual = demandEnabled ? peakKwReduction * demandChargePerKw * 12 * weight : NaN;

    const constraints = [...constraintsHit];
    if (!prices.ok) constraints.push('MISSING_TARIFF_PRICES');
    if (!demandEnabled) constraints.push('MISSING_DEMAND_INPUTS');
    if (!Number.isFinite(Number(peakHourLocal))) constraints.push('UNKNOWN_PEAK_HOUR');

    return {
      strategyId,
      estimatedPeakKwReduction: mkRange(Number.isFinite(peakKwReduction) ? peakKwReduction : null, 'dispatch_peak_kw_reduction_v1'),
      estimatedShiftedKwhAnnual: mkScalar(Number.isFinite(shiftedKwhAnnual) ? shiftedKwhAnnual : null, 'dispatch_shifted_kwh_annual_v1'),
      estimatedEnergySavingsAnnual: mkRange(Number.isFinite(energySavingsAnnual) ? energySavingsAnnual : null, 'tou_arbitrage_simple_v1'),
      estimatedDemandSavingsAnnual: mkRange(Number.isFinite(demandSavingsAnnual) ? demandSavingsAnnual : null, 'demand_charge_simple_monthly_v1'),
      constraintsHit: uniqSortedReasonCodes(constraints),
    };
  }

  // Stable strategy ordering.
  const strategyResults: DispatchStrategyResultV1[] = [
    runStrategy('PEAK_SHAVE_DAILY_V1', 1.0),
    runStrategy('TOU_SHIFT_V1', 0.85),
    runStrategy('HYBRID_V1', 0.95),
  ];

  return {
    assumptions: {
      strategyId: 'DISPATCH_MULTI_STRATEGY_V1',
      rte: roundTo(battery.rte, 6),
      maxCyclesPerDay: Math.max(0, Math.floor(battery.maxCyclesPerDay)),
      dispatchDaysPerYear: days,
      demandWindowStrategy: cfg.demandWindowStrategy,
    },
    strategyResults,
    warnings: uniqSortedReasonCodes(warnings),
  };
}

