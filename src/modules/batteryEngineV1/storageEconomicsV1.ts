import { defaultCapexModelV1, storageEconomicsVersionTagV1 } from './economicsConstants';
import { StorageEconomicsReasonCodesV1, uniqSorted } from './economicsReasons';
import type { BatteryOpportunityV1, DispatchSimulationV1, RangeEstimateV1, TariffPriceSignalsV1 } from './types';
import type { StorageEconomicsCapexOverridesV1, StorageEconomicsV1 } from './storageEconomicsTypes';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return NaN;
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

function asFiniteRange(x: unknown): [number | null, number | null] {
  if (!Array.isArray(x) || x.length < 2) return [null, null];
  const a = Number(x[0]);
  const b = Number(x[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return [null, null];
  return [a, b];
}

function mkRangeEstimate(min: number | null, max: number | null, method: string): RangeEstimateV1 {
  const a = Number(min);
  const b = Number(max);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { min: null, max: null, method };
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return { min: roundTo(lo, 6), max: roundTo(hi, 6), method };
}

function rangeMinus(a: [number | null, number | null], b: [number | null, number | null]): [number | null, number | null] {
  if (a[0] === null || a[1] === null || b[0] === null || b[1] === null) return [null, null];
  return [roundTo(a[0] - b[1], 6), roundTo(a[1] - b[0], 6)];
}

function rangeAdd(a: [number | null, number | null], b: [number | null, number | null]): [number | null, number | null] {
  if (a[0] === null || a[1] === null || b[0] === null || b[1] === null) return [null, null];
  return [roundTo(a[0] + b[0], 6), roundTo(a[1] + b[1], 6)];
}

function rangeMul(a: [number | null, number | null], scalarRange: [number | null, number | null]): [number | null, number | null] {
  if (a[0] === null || a[1] === null || scalarRange[0] === null || scalarRange[1] === null) return [null, null];
  const vals = [a[0] * scalarRange[0], a[0] * scalarRange[1], a[1] * scalarRange[0], a[1] * scalarRange[1]].filter((n) => Number.isFinite(n));
  if (!vals.length) return [null, null];
  return [roundTo(Math.min(...vals), 6), roundTo(Math.max(...vals), 6)];
}

function rangeDiv(a: [number | null, number | null], b: [number | null, number | null]): [number | null, number | null] {
  if (a[0] === null || a[1] === null || b[0] === null || b[1] === null) return [null, null];
  const vals = [a[0] / b[0], a[0] / b[1], a[1] / b[0], a[1] / b[1]].filter((n) => Number.isFinite(n));
  if (!vals.length) return [null, null];
  return [roundTo(Math.min(...vals), 6), roundTo(Math.max(...vals), 6)];
}

function pvaf(r: number, n: number): number {
  if (!Number.isFinite(r) || !Number.isFinite(n) || n <= 0) return 0;
  if (Math.abs(r) < 1e-12) return n;
  return (1 - (1 + r) ** -n) / r;
}

function discountPvafRange(discountRateRange: [number, number], n: number): [number | null, number | null] {
  const r0 = Number(discountRateRange[0]);
  const r1 = Number(discountRateRange[1]);
  if (!Number.isFinite(r0) || !Number.isFinite(r1) || n <= 0) return [null, null];
  const lo = Math.min(r0, r1);
  const hi = Math.max(r0, r1);
  // PVAF decreases as r increases; so PVAF range is [pvaf(hi), pvaf(lo)]
  return [roundTo(pvaf(hi, n), 6), roundTo(pvaf(lo, n), 6)];
}

function inferAnnualFacilityKwh(args: { intervalInsights: any }): number | null {
  const avgDaily = Number(args.intervalInsights?.avgDailyKwh);
  if (!Number.isFinite(avgDaily) || avgDaily < 0) return null;
  return roundTo(avgDaily * 365, 6);
}

export function storageEconomicsV1(args: {
  batteryOpportunityV1: BatteryOpportunityV1;
  dispatchSimulationV1?: DispatchSimulationV1 | null;
  tariffPriceSignalsV1?: TariffPriceSignalsV1 | null;
  /** Optional determinants signals (passed through from caller). */
  determinantsV1?: { billingDemandKw?: number | null; ratchetDemandKw?: number | null } | null;
  /** Optional overrides for capex/opex/econ assumptions. */
  overrides?: StorageEconomicsCapexOverridesV1 | null;
  /** Optional interval insights for annual kWh normalization. */
  intervalInsightsV1?: any | null;
}): StorageEconomicsV1 {
  const warnings: string[] = [];
  const missingInfo: string[] = [];

  const bo = args.batteryOpportunityV1;
  const dispatch = args.dispatchSimulationV1 || null;
  const tariff = args.tariffPriceSignalsV1 || null;
  const det = args.determinantsV1 || null;
  const overrides = args.overrides || null;

  const recommended = Array.isArray(bo?.recommendedBatteryConfigs) && bo.recommendedBatteryConfigs.length ? bo.recommendedBatteryConfigs[0] : null;
  const powerKw = recommended ? Number(recommended.powerKw) : NaN;
  const energyKwh = recommended ? Number(recommended.energyKwh) : NaN;
  const hasSizing = Number.isFinite(powerKw) && powerKw > 0 && Number.isFinite(energyKwh) && energyKwh > 0;

  if (!dispatch) warnings.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_MISSING_DISPATCH);

  const hasTariffPrices = Boolean(Array.isArray((tariff as any)?.touEnergyPrices) && (tariff as any).touEnergyPrices.length);
  if (!hasTariffPrices) warnings.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_MISSING_TARIFF_PRICES);

  const hasDemandInputs = Boolean(det && Number.isFinite(Number((det as any)?.billingDemandKw)));
  if (!hasDemandInputs) warnings.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_MISSING_DEMAND_DETERMINANTS);

  // Savings inputs: prefer dispatch HYBRID annual savings; fallback to batteryOpportunity total.
  const grossSavingsRange: [number | null, number | null] = (() => {
    if (dispatch && Array.isArray(dispatch.strategyResults) && dispatch.strategyResults.length) {
      const hy = dispatch.strategyResults.find((r) => r.strategyId === 'HYBRID_V1') || dispatch.strategyResults[0];
      const e = hy?.estimatedEnergySavingsAnnual;
      const d = hy?.estimatedDemandSavingsAnnual;
      const eR: [number | null, number | null] = e && e.min !== null && e.max !== null ? [Number(e.min), Number(e.max)] : [null, null];
      const dR: [number | null, number | null] = d && d.min !== null && d.max !== null ? [Number(d.min), Number(d.max)] : [null, null];
      if (eR[0] !== null || dR[0] !== null) {
        const sum = rangeAdd(eR, dR);
        return sum;
      }
    }
    // fallback: batteryOpportunityV1.savingsEstimateAnnual.total (if available)
    const t = bo?.savingsEstimateAnnual?.total;
    if (t && typeof t === 'object' && (t as any).min !== null && (t as any).max !== null) {
      return [Number((t as any).min), Number((t as any).max)];
    }
    return [null, null];
  })();

  const savingsMethodTag =
    dispatch && grossSavingsRange[0] !== null
      ? 'storage_econ_gross_savings_from_dispatch_v1'
      : grossSavingsRange[0] !== null
        ? 'storage_econ_gross_savings_from_battery_opportunity_v1'
        : 'storage_econ_gross_savings_unavailable_v1';

  if (grossSavingsRange[0] === null || grossSavingsRange[1] === null) warnings.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_INSUFFICIENT_INPUTS);

  // Capex model: defaults unless overridden.
  const capexDefaultsUsed = !overrides;
  if (capexDefaultsUsed) missingInfo.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_CAPEX_DEFAULTS_USED);

  const powerCostPerKwUsdRange = (overrides?.powerCostPerKwUsdRange || defaultCapexModelV1.powerCostPerKwUsdRange) as [number, number];
  const energyCostPerKwhUsdRange = (overrides?.energyCostPerKwhUsdRange || defaultCapexModelV1.energyCostPerKwhUsdRange) as [number, number];
  const softCostsPctRange = (overrides?.softCostsPctRange || defaultCapexModelV1.softCostsPctRange) as [number, number];
  const omPctOfCapexPerYearRange = (overrides?.omPctOfCapexPerYearRange || defaultCapexModelV1.omPctOfCapexPerYearRange) as [number, number];
  const projectLifeYears = Number.isFinite(Number(overrides?.projectLifeYears)) ? Math.max(1, Math.round(Number(overrides!.projectLifeYears))) : defaultCapexModelV1.projectLifeYears;
  const discountRateRange = (overrides?.discountRateRange || defaultCapexModelV1.discountRateRange) as [number, number];

  if (!overrides?.discountRateRange) missingInfo.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_DISCOUNT_RATE_DEFAULT_USED);

  const powerComponent = hasSizing ? rangeMul([powerKw, powerKw], powerCostPerKwUsdRange as any) : [null, null];
  const energyComponent = hasSizing ? rangeMul([energyKwh, energyKwh], energyCostPerKwhUsdRange as any) : [null, null];
  const hardCost = rangeAdd(powerComponent, energyComponent);
  const softCost = rangeMul(hardCost, softCostsPctRange as any);
  const totalCapex = rangeAdd(hardCost, softCost);

  const capexMethodTag = overrides ? 'capex_override_ranges_v1' : 'capex_default_range_v1';

  const annualOm = rangeMul(totalCapex, omPctOfCapexPerYearRange as any);
  const opexMethodTag = 'opex_om_pct_of_capex_v1';

  const annualNet = rangeMinus(grossSavingsRange, annualOm);

  const paybackRange = (() => {
    if (annualNet[0] === null || annualNet[1] === null || totalCapex[0] === null || totalCapex[1] === null) return [null, null] as [number | null, number | null];
    // If net savings <= 0 in any direction, payback unavailable (warnings-first).
    if (annualNet[0] <= 0 || annualNet[1] <= 0) return [null, null];
    // Payback best-case = min capex / max net; worst-case = max capex / min net.
    return [roundTo(totalCapex[0] / annualNet[1], 6), roundTo(totalCapex[1] / annualNet[0], 6)];
  })();

  if (annualNet[0] !== null && annualNet[1] !== null && (annualNet[0] <= 0 || annualNet[1] <= 0)) {
    warnings.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_NET_SAVINGS_NON_POSITIVE);
  }

  const pvafRange = discountPvafRange(discountRateRange, projectLifeYears);
  const npvRange = (() => {
    if (annualNet[0] === null || annualNet[1] === null || totalCapex[0] === null || totalCapex[1] === null || pvafRange[0] === null || pvafRange[1] === null) {
      return [null, null] as [number | null, number | null];
    }
    // Worst NPV: -max capex + min net * min PVAF; Best NPV: -min capex + max net * max PVAF.
    const worst = -totalCapex[1] + annualNet[0] * pvafRange[0];
    const best = -totalCapex[0] + annualNet[1] * pvafRange[1];
    return [roundTo(worst, 6), roundTo(best, 6)];
  })();

  // Normalized metrics
  const capexPerKw = hasSizing ? rangeDiv(totalCapex, [powerKw, powerKw]) : [null, null];
  const capexPerKwh = hasSizing ? rangeDiv(totalCapex, [energyKwh, energyKwh]) : [null, null];
  const netPerKw = hasSizing ? rangeDiv(annualNet, [powerKw, powerKw]) : [null, null];
  const netPerKwh = hasSizing ? rangeDiv(annualNet, [energyKwh, energyKwh]) : [null, null];

  const annualFacilityKwh = inferAnnualFacilityKwh({ intervalInsights: args.intervalInsightsV1 || null });
  const netPerAnnualKwh =
    annualFacilityKwh && annualFacilityKwh > 0 ? rangeDiv(annualNet, [annualFacilityKwh, annualFacilityKwh]) : ([null, null] as [number | null, number | null]);

  const confidenceTier = (() => {
    if (!hasSizing || grossSavingsRange[0] === null || grossSavingsRange[1] === null) return 'NONE' as const;
    if (overrides) return 'MEDIUM' as const;
    return 'LOW' as const;
  })();

  return {
    assumptions: {
      projectLifeYears: { value: projectLifeYears, method: overrides?.projectLifeYears ? 'project_life_years_override_v1' : 'project_life_years_default_v1' },
      discountRateRange: mkRangeEstimate(discountRateRange[0], discountRateRange[1], overrides?.discountRateRange ? 'discount_rate_override_v1' : 'discount_rate_default_v1'),
      capexModel: {
        powerCostPerKwUsdRange: mkRangeEstimate(powerCostPerKwUsdRange[0], powerCostPerKwUsdRange[1], overrides?.powerCostPerKwUsdRange ? 'capex_power_cost_override_v1' : 'capex_default_range_v1'),
        energyCostPerKwhUsdRange: mkRangeEstimate(energyCostPerKwhUsdRange[0], energyCostPerKwhUsdRange[1], overrides?.energyCostPerKwhUsdRange ? 'capex_energy_cost_override_v1' : 'capex_default_range_v1'),
        softCostsPctRange: mkRangeEstimate(softCostsPctRange[0], softCostsPctRange[1], overrides?.softCostsPctRange ? 'capex_soft_costs_override_v1' : 'capex_default_range_v1'),
        omPctOfCapexPerYearRange: mkRangeEstimate(omPctOfCapexPerYearRange[0], omPctOfCapexPerYearRange[1], overrides?.omPctOfCapexPerYearRange ? 'opex_om_override_v1' : 'opex_om_default_v1'),
      },
    },
    capexEstimate: {
      totalCapexUsdRange: [totalCapex[0], totalCapex[1]],
      breakdown: {
        powerComponentRange: [powerComponent[0], powerComponent[1]],
        energyComponentRange: [energyComponent[0], energyComponent[1]],
        softCostsRange: [softCost[0], softCost[1]],
      },
      capexMethodTag,
    },
    opexEstimate: {
      annualOmUsdRange: [annualOm[0], annualOm[1]],
      opexMethodTag,
    },
    cashflow: {
      annualGrossSavingsUsdRange: [grossSavingsRange[0], grossSavingsRange[1]],
      annualNetSavingsUsdRange: [annualNet[0], annualNet[1]],
      savingsMethodTag,
    },
    payback: {
      simplePaybackYearsRange: paybackRange,
      paybackMethodTag: 'simple_payback_v1',
    },
    npvLite: {
      npvUsdRange: npvRange,
      npvMethodTag: 'npv_lite_annuity_v1',
    },
    normalizedMetrics: {
      capexPerKwRange: capexPerKw,
      capexPerKwhRange: capexPerKwh,
      annualNetSavingsPerKwRange: netPerKw,
      annualNetSavingsPerKwhRange: netPerKwh,
      annualNetSavingsPerAnnualKwhRange: netPerAnnualKwh,
    },
    confidenceTier,
    warnings: uniqSorted(warnings),
    missingInfo: uniqSorted(missingInfo),
    engineVersion: storageEconomicsVersionTagV1,
  };
}

