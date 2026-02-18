import { defaultBatteryEngineConfigV1, batteryEngineVersionTagV1 } from './constants';
import { BatteryOpportunityReasonCodesV1, uniqSortedReasonCodes } from './reasons';
import { drReadinessV1 } from './drReadinessV1';
import { simulateDispatchV1 } from './simulateDispatchV1';
import { storageEconomicsV1 } from './storageEconomicsV1';
import { incentivesStubV1 } from './incentivesStubV1';
import type {
  BatteryConfigV1,
  BatteryEngineConfigV1,
  BatteryOpportunityV1,
  BatteryValueDriverIdV1,
  ConfidenceTierV1,
  EvaluateStorageOpportunityPackV1Args,
  RangeEstimateV1,
  StorageOpportunityPackV1,
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

function mkRange(value: number | null, method: string): RangeEstimateV1 {
  const v = Number(value);
  if (!Number.isFinite(v)) return { min: null, max: null, method };
  return { min: roundTo(v, 6), max: roundTo(v, 6), method };
}

function rangeAdd(a: RangeEstimateV1, b: RangeEstimateV1, method: string): RangeEstimateV1 {
  if (a.min === null || a.max === null || b.min === null || b.max === null) return { min: null, max: null, method };
  return { min: roundTo(a.min + b.min, 6), max: roundTo(a.max + b.max, 6), method };
}

function confidenceTierFrom(args: { intervalInsightsPresent: boolean; coverageDays: number | null; hasTariffPrices: boolean }): ConfidenceTierV1 {
  if (!args.intervalInsightsPresent) return 'NONE';
  const d = Number(args.coverageDays);
  if (!Number.isFinite(d) || d < 2) return 'NONE';
  if (d >= 30 && args.hasTariffPrices) return 'HIGH';
  if (d >= 14) return 'MEDIUM';
  return 'LOW';
}

function inferDurationHoursFromBuckets(dailyProfileBuckets: Array<{ avgKw: number }>): number {
  const vals = (dailyProfileBuckets || []).map((b) => Number((b as any)?.avgKw)).filter((n) => Number.isFinite(n) && n >= 0);
  if (!vals.length) return 2;
  const peak = Math.max(...vals);
  if (!(peak > 0)) return 2;
  // Count buckets within 90% of peak; each bucket is 4h.
  const nearPeakBuckets = vals.filter((v) => v >= 0.9 * peak).length;
  const hours = nearPeakBuckets * 4;
  // Clamp to production-friendly durations.
  if (hours >= 4) return 4;
  if (hours >= 3) return 3;
  return 2;
}

function inferRecommendedRanges(args: {
  peakKw: number | null;
  baseloadKw: number | null;
  dailyProfileBuckets: Array<{ avgKw: number }>;
}): { powerRange: [number | null, number | null]; energyRange: [number | null, number | null]; durationHours: number } {
  const peak = Number(args.peakKw);
  const base = Number(args.baseloadKw);
  if (!Number.isFinite(peak) || !Number.isFinite(base) || !(peak >= 0) || !(base >= 0)) {
    return { powerRange: [null, null], energyRange: [null, null], durationHours: 2 };
  }
  const headroom = Math.max(0, peak - base);
  if (!(headroom > 0)) return { powerRange: [0, 0], energyRange: [0, 0], durationHours: 2 };

  const durationHours = inferDurationHoursFromBuckets(args.dailyProfileBuckets || []);

  // Deterministic heuristic (v1):
  // - recommended power targets ~20–50% of peak headroom (above baseload)
  // - recommended energy targets duration-based
  const minP = headroom * 0.2;
  const maxP = headroom * 0.5;
  const minE = minP * Math.max(2, durationHours - 1);
  const maxE = maxP * Math.min(4, durationHours + 1);

  return {
    powerRange: [roundTo(minP, 3), roundTo(maxP, 3)],
    energyRange: [roundTo(minE, 3), roundTo(maxE, 3)],
    durationHours,
  };
}

function buildTop3BatteryConfigs(args: {
  powerRange: [number | null, number | null];
  energyRange: [number | null, number | null];
  durationHours: number;
  rte: number;
  maxCyclesPerDay: number;
}): BatteryConfigV1[] {
  const [pMin, pMax] = args.powerRange;
  const [eMin, eMax] = args.energyRange;
  const p0 = Number(pMin);
  const p1 = Number(pMax);
  const e0 = Number(eMin);
  const e1 = Number(eMax);

  if (![p0, p1, e0, e1].every((n) => Number.isFinite(n) && n >= 0)) return [];

  const pMid = (p0 + p1) / 2;
  const eMid = (e0 + e1) / 2;
  const dur = Math.max(1, Math.min(6, Math.round(Number(args.durationHours) || 2)));
  const rte = clamp01(Number(args.rte) || 0.9);
  const cycles = Math.max(0, Math.floor(Number(args.maxCyclesPerDay) || 1));

  // Deterministic ranking: (midpoint fit) -> (lower cost proxy) -> (higher impact)
  const candidates: BatteryConfigV1[] = [
    { powerKw: roundTo(pMid, 3), energyKwh: roundTo(pMid * dur, 3), durationHours: dur, rte, maxCyclesPerDay: cycles },
    { powerKw: roundTo(p0, 3), energyKwh: roundTo(Math.min(e1, p0 * dur), 3), durationHours: dur, rte, maxCyclesPerDay: cycles },
    { powerKw: roundTo(p1, 3), energyKwh: roundTo(Math.max(e0, p1 * dur), 3), durationHours: dur, rte, maxCyclesPerDay: cycles },
  ];

  // Dedup by (P,E)
  const out: BatteryConfigV1[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const key = `${c.powerKw}|${c.energyKwh}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out.slice(0, 3);
}

function valueDriversFrom(args: {
  hasTariffPrices: boolean;
  hasDemandSignals: boolean;
  hasRatchetSignal: boolean;
  hasIntervals: boolean;
}): BatteryValueDriverIdV1[] {
  const out: BatteryValueDriverIdV1[] = [];
  if (args.hasTariffPrices) out.push('TOU_ARBITRAGE');
  if (args.hasDemandSignals) out.push('DEMAND_PEAK_SHAVE');
  if (args.hasRatchetSignal) out.push('RATCHET_REDUCTION');
  if (args.hasIntervals) out.push('LOAD_SHIFT');
  return out;
}

export function evaluateStorageOpportunityPackV1(args: EvaluateStorageOpportunityPackV1Args): StorageOpportunityPackV1 {
  const cfg: BatteryEngineConfigV1 = { ...defaultBatteryEngineConfigV1, ...(args.config || {}) } as any;

  const warnings: string[] = [];
  const missingInfo: string[] = [];

  const intervalInsights = args.intervalInsightsV1;
  const hasIntervalInsights = Boolean(intervalInsights && typeof intervalInsights === 'object' && (intervalInsights as any).schemaVersion === 'intervalIntelligenceV1');
  const hasIntervalPoints = Boolean(Array.isArray(args.intervalPointsV1) && args.intervalPointsV1.length);

  if (!hasIntervalInsights) missingInfo.push(BatteryOpportunityReasonCodesV1.BATTERY_V1_INTERVAL_INSIGHTS_MISSING);
  if (!hasIntervalPoints) missingInfo.push(BatteryOpportunityReasonCodesV1.BATTERY_V1_MISSING_INTERVALS);

  const tariff = args.tariffPriceSignalsV1 || null;
  const hasTariffPrices = Boolean(
    (Array.isArray((tariff as any)?.generationAllInTouEnergyPrices) && (tariff as any).generationAllInTouEnergyPrices.length) ||
      (Array.isArray((tariff as any)?.generationTouEnergyPrices) && (tariff as any).generationTouEnergyPrices.length) ||
      (Array.isArray((tariff as any)?.touEnergyPrices) && (tariff as any).touEnergyPrices.length),
  );
  if (!hasTariffPrices) missingInfo.push(BatteryOpportunityReasonCodesV1.BATTERY_V1_MISSING_TARIFF_PRICES);

  const det = args.determinantsV1 || null;
  const hasDemandSignals = Number.isFinite(Number((tariff as any)?.demandChargePerKw)) && Number.isFinite(Number((det as any)?.billingDemandKw));
  if (!hasDemandSignals) missingInfo.push(BatteryOpportunityReasonCodesV1.BATTERY_V1_MISSING_DEMAND_DETERMINANTS);

  const hasRatchetSignal = Number.isFinite(Number((det as any)?.ratchetDemandKw)) && Number((det as any)?.ratchetDemandKw) > 0;

  const peakKw = Number.isFinite(Number((intervalInsights as any)?.peakKw)) ? Number((intervalInsights as any)?.peakKw) : null;
  const baseloadKw = Number.isFinite(Number((intervalInsights as any)?.baseloadKw)) ? Number((intervalInsights as any)?.baseloadKw) : null;
  const dailyProfileBuckets = (intervalInsights as any)?.dailyProfileBuckets || [];

  const inferred = inferRecommendedRanges({ peakKw, baseloadKw, dailyProfileBuckets });
  if (inferred.powerRange[0] === null || inferred.powerRange[1] === null) warnings.push(BatteryOpportunityReasonCodesV1.BATTERY_V1_INSUFFICIENT_LOAD_SHAPE);

  const rte = clamp01(Number(cfg.rte) || 0.9);
  const cycles = Math.max(0, Math.floor(Number(cfg.maxCyclesPerDay) || 1));
  const recommendedBatteryConfigs = buildTop3BatteryConfigs({
    powerRange: inferred.powerRange,
    energyRange: inferred.energyRange,
    durationHours: inferred.durationHours,
    rte,
    maxCyclesPerDay: cycles,
  });

  // Reference battery for dispatch simulation: midpoint config if available; else a minimal placeholder.
  const refBattery: BatteryConfigV1 = recommendedBatteryConfigs[0] || {
    powerKw: 0,
    energyKwh: 0,
    durationHours: inferred.durationHours || 2,
    rte,
    maxCyclesPerDay: cycles,
  };

  const dispatchSimulationV1 = simulateDispatchV1({
    intervalInsightsV1: intervalInsights,
    intervalPointsV1: args.intervalPointsV1 || null,
    tariffPriceSignalsV1: tariff,
    determinantsV1: det,
    battery: refBattery,
    config: cfg,
  });

  const dr = drReadinessV1({
    intervalInsightsV1: intervalInsights,
    intervalPointsV1: args.intervalPointsV1 || null,
    tariffPriceSignalsV1: tariff,
    config: cfg,
  });

  const hybrid = dispatchSimulationV1.strategyResults.find((s) => s.strategyId === 'HYBRID_V1') || dispatchSimulationV1.strategyResults[0];
  const energy = hybrid?.estimatedEnergySavingsAnnual || mkRange(null, 'battery_savings_unavailable_v1');
  const demand = hybrid?.estimatedDemandSavingsAnnual || mkRange(null, 'battery_savings_unavailable_v1');
  const total = rangeAdd(energy, demand, 'battery_total_savings_hybrid_v1');

  const coverageDays = Number((intervalInsights as any)?.coverageDays);
  const conf = confidenceTierFrom({
    intervalInsightsPresent: hasIntervalInsights,
    coverageDays: Number.isFinite(coverageDays) ? coverageDays : null,
    hasTariffPrices,
  });

  const batteryOpportunityV1: BatteryOpportunityV1 = {
    recommendedPowerKwRange: inferred.powerRange,
    recommendedEnergyKwhRange: inferred.energyRange,
    recommendedBatteryConfigs,
    savingsEstimateAnnual: {
      energy: { ...energy, method: 'battery_energy_savings_from_dispatch_hybrid_v1' } as RangeEstimateV1,
      demand: { ...demand, method: 'battery_demand_savings_from_dispatch_hybrid_v1' } as RangeEstimateV1,
      total,
    },
    valueDrivers: valueDriversFrom({ hasTariffPrices, hasDemandSignals, hasRatchetSignal, hasIntervals: hasIntervalPoints }),
    confidenceTier: conf,
    warnings: uniqSortedReasonCodes(warnings),
    missingInfo: uniqSortedReasonCodes(missingInfo),
    engineVersion: batteryEngineVersionTagV1,
  };

  const storageEconomicsV1Out = storageEconomicsV1({
    batteryOpportunityV1,
    dispatchSimulationV1,
    tariffPriceSignalsV1: tariff,
    determinantsV1: det,
    overrides: args.storageEconomicsOverridesV1 || null,
    intervalInsightsV1: intervalInsights as any,
  });

  const batteryEconomicsV1Summary = {
    confidenceTier: storageEconomicsV1Out.confidenceTier,
    capexTotalUsd: Array.isArray((storageEconomicsV1Out as any)?.capexEstimate?.totalCapexUsdRange) ? (storageEconomicsV1Out as any).capexEstimate.totalCapexUsdRange[0] ?? null : null,
    savingsAnnualTotalUsd: Array.isArray((storageEconomicsV1Out as any)?.cashflow?.annualGrossSavingsUsdRange) ? (storageEconomicsV1Out as any).cashflow.annualGrossSavingsUsdRange[0] ?? null : null,
    simplePaybackYears: Array.isArray((storageEconomicsV1Out as any)?.payback?.simplePaybackYearsRange) ? (storageEconomicsV1Out as any).payback.simplePaybackYearsRange[0] ?? null : null,
    npvUsd: Array.isArray((storageEconomicsV1Out as any)?.npvLite?.npvUsdRange) ? (storageEconomicsV1Out as any).npvLite.npvUsdRange[0] ?? null : null,
    warnings: Array.isArray((storageEconomicsV1Out as any)?.warnings) ? (storageEconomicsV1Out as any).warnings : [],
  } as const;

  const incentivesStubV1Out = incentivesStubV1({
    recommendedBatteryConfig: recommendedBatteryConfigs[0] || null,
    customerType: args.customerType || null,
  });

  return {
    batteryOpportunityV1,
    dispatchSimulationV1,
    drReadinessV1: dr,
    storageEconomicsV1: storageEconomicsV1Out,
    batteryEconomicsV1Summary,
    incentivesStubV1: incentivesStubV1Out,
  };
}

