/**
 * Legacy adapter (derived):
 * - This function remains for backward compatibility ONLY.
 * - All economics math is delegated to `batteryEconomicsV1` (single source-of-truth).
 * - Version tag remains `storage_econ_v1.0` (no bump); output is explicitly deprecated via warnings.
 */
import { storageEconomicsVersionTagV1 } from './economicsConstants';
import { StorageEconomicsReasonCodesV1, uniqSorted } from './economicsReasons';
import { evaluateBatteryEconomicsV1 } from '../batteryEconomicsV1/evaluateBatteryEconomicsV1';
import type { BatteryEconomicsCostsV1, BatteryEconomicsFinanceV1, BatteryEconomicsInputsV1, BatteryEconomicsOutputsV1 } from '../batteryEconomicsV1/types';
import type { BatteryOpportunityV1, DispatchSimulationV1, TariffPriceSignalsV1 } from './types';
import type { StorageEconomicsCapexOverridesV1, StorageEconomicsV1 } from './storageEconomicsTypes';

function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return NaN;
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

function safeNum(x: unknown): number | null {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return n;
}

function midpoint(range: [number, number] | undefined | null): number | null {
  if (!Array.isArray(range) || range.length < 2) return null;
  const a = safeNum(range[0]);
  const b = safeNum(range[1]);
  if (a === null || b === null) return null;
  return (a + b) / 2;
}

function sumNums(vals: Array<number | null>): number | null {
  let sum = 0;
  let any = false;
  for (const v of vals) {
    if (v === null) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    any = true;
    sum += n;
  }
  return any ? sum : null;
}

function inferAnnualFacilityKwh(args: { intervalInsights: any }): number | null {
  const avgDaily = safeNum(args.intervalInsights?.avgDailyKwh);
  if (avgDaily === null || avgDaily < 0) return null;
  return roundTo(avgDaily * 365, 6);
}

function pickHybridDispatch(dispatch: DispatchSimulationV1 | null): any | null {
  if (!dispatch || !Array.isArray((dispatch as any)?.strategyResults) || !(dispatch as any).strategyResults.length) return null;
  return (dispatch as any).strategyResults.find((r: any) => String(r?.strategyId || '') === 'HYBRID_V1') || (dispatch as any).strategyResults[0] || null;
}

function deriveTariffSignals(tariff: TariffPriceSignalsV1 | null): { demandChargePerKwMonthUsd: number | null; energyPriceOnPeakUsdPerKwh: number | null; energyPriceOffPeakUsdPerKwh: number | null } {
  const demand = safeNum((tariff as any)?.demandChargePerKw);
  const prices = Array.isArray((tariff as any)?.touEnergyPrices) ? ((tariff as any).touEnergyPrices as any[]) : [];
  const pVals = prices.map((p) => safeNum(p?.pricePerKwh)).filter((n): n is number => n !== null);
  if (!pVals.length) return { demandChargePerKwMonthUsd: demand, energyPriceOnPeakUsdPerKwh: null, energyPriceOffPeakUsdPerKwh: null };
  const onPeak = Math.max(...pVals);
  const offPeak = Math.min(...pVals);
  return { demandChargePerKwMonthUsd: demand, energyPriceOnPeakUsdPerKwh: onPeak, energyPriceOffPeakUsdPerKwh: offPeak };
}

function buildBatteryEconInputs(args: {
  batteryOpportunityV1: BatteryOpportunityV1;
  dispatchSimulationV1: DispatchSimulationV1 | null;
  tariffPriceSignalsV1: TariffPriceSignalsV1 | null;
  determinantsV1: any | null;
  overrides: StorageEconomicsCapexOverridesV1 | null;
}): BatteryEconomicsInputsV1 {
  const bo = args.batteryOpportunityV1;
  const recommended = Array.isArray((bo as any)?.recommendedBatteryConfigs) && (bo as any).recommendedBatteryConfigs.length ? (bo as any).recommendedBatteryConfigs[0] : null;

  const powerKw = safeNum(recommended?.powerKw);
  const energyKwh = safeNum(recommended?.energyKwh);
  const rte = safeNum(recommended?.rte);

  const hy = pickHybridDispatch(args.dispatchSimulationV1);
  const shiftedKwhAnnual = safeNum(hy?.estimatedShiftedKwhAnnual?.value);
  // Conservative mapping: use min kW reduction when present.
  const peakReductionKwAssumed = safeNum(hy?.estimatedPeakKwReduction?.min);

  const t = deriveTariffSignals(args.tariffPriceSignalsV1 || null);

  const det0 = args.determinantsV1 || null;
  const determinants = det0
    ? {
        ratchetDemandKw: safeNum(det0?.ratchetDemandKw),
        billingDemandKw: safeNum(det0?.billingDemandKw),
        billingDemandMethod: String(det0?.billingDemandMethod || '').trim() || null,
      }
    : null;

  const ov = args.overrides || null;

  const finance: BatteryEconomicsFinanceV1 | null = ov
    ? {
        termYears: Number.isFinite(Number(ov.projectLifeYears)) ? Math.max(1, Math.floor(Number(ov.projectLifeYears))) : null,
        discountRate: midpoint(ov.discountRateRange as any),
      }
    : null;

  const costsFromOverrides: BatteryEconomicsCostsV1 | null = (() => {
    if (!ov) return null;
    const kw = midpoint(ov.powerCostPerKwUsdRange as any);
    const kwh = midpoint(ov.energyCostPerKwhUsdRange as any);
    const out: BatteryEconomicsCostsV1 = {};
    if (kw !== null) out.batteryCostPerKwUsd = kw;
    if (kwh !== null) out.batteryCostPerKwhUsd = kwh;
    // Note: other override fields (softCostsPctRange, etc.) do not map 1:1 to batteryEconomicsV1 cost model; they are intentionally ignored here.
    return Object.keys(out).length ? out : null;
  })();

  return {
    battery: recommended
      ? {
          powerKw,
          energyKwh,
          roundTripEff: rte,
          usableFraction: null,
          degradationPctYr: null,
        }
      : null,
    costs: costsFromOverrides,
    tariffs: t.demandChargePerKwMonthUsd !== null || t.energyPriceOnPeakUsdPerKwh !== null || t.energyPriceOffPeakUsdPerKwh !== null ? { ...t } : null,
    determinants,
    dispatch: shiftedKwhAnnual !== null || peakReductionKwAssumed !== null ? { shiftedKwhAnnual, peakReductionKwAssumed } : null,
    dr: null,
    finance,
  };
}

function maybeRecomputeWithOmPct(args: {
  baseInputs: BatteryEconomicsInputsV1;
  overrides: StorageEconomicsCapexOverridesV1 | null;
  out0: BatteryEconomicsOutputsV1;
}): { inputs: BatteryEconomicsInputsV1; out: BatteryEconomicsOutputsV1 } {
  const ov = args.overrides || null;
  const pct = midpoint((ov as any)?.omPctOfCapexPerYearRange);
  const capex = safeNum(args.out0?.capex?.totalUsd);
  const powerKw = safeNum(args.baseInputs?.battery?.powerKw);

  if (pct === null || capex === null || powerKw === null || !(powerKw > 0) || !(pct >= 0)) return { inputs: args.baseInputs, out: args.out0 };

  const targetOmTotal = capex * pct;
  const omPerKwYrUsd = targetOmTotal / powerKw;

  const costs0 = (args.baseInputs.costs || {}) as BatteryEconomicsCostsV1;
  const costs1: BatteryEconomicsCostsV1 = { ...costs0, omPerKwYrUsd };

  const inputs1: BatteryEconomicsInputsV1 = { ...args.baseInputs, costs: costs1 };
  const out1 = evaluateBatteryEconomicsV1(inputs1);
  return { inputs: inputs1, out: out1 };
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

  // Preserve legacy "missing input" warnings (no economics math here).
  if (!dispatch) warnings.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_MISSING_DISPATCH);
  const hasTariffPrices = Boolean(Array.isArray((tariff as any)?.touEnergyPrices) && (tariff as any).touEnergyPrices.length);
  if (!hasTariffPrices) warnings.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_MISSING_TARIFF_PRICES);
  const hasDemandInputs = Boolean(det && safeNum((det as any)?.billingDemandKw) !== null);
  if (!hasDemandInputs) warnings.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_MISSING_DEMAND_DETERMINANTS);

  // Canonical economics evaluation (single source-of-truth).
  const baseInputs = buildBatteryEconInputs({
    batteryOpportunityV1: bo,
    dispatchSimulationV1: dispatch,
    tariffPriceSignalsV1: tariff,
    determinantsV1: det as any,
    overrides,
  });

  const out0 = evaluateBatteryEconomicsV1(baseInputs);
  const { out } = maybeRecomputeWithOmPct({ baseInputs, overrides, out0 });

  const capexTotalUsd = safeNum(out?.capex?.totalUsd);
  const opexAnnualUsd = safeNum(out?.opexAnnual?.totalUsd);
  const savingsAnnualUsdTotal = safeNum(out?.savingsAnnual?.totalUsd);
  const netAnnual = (() => {
    // Prefer canonical net annual cashflow (years1toN[0]) when present.
    const y0 = Array.isArray(out?.cashflow?.years1toNUsd) && out.cashflow.years1toNUsd.length ? safeNum(out.cashflow.years1toNUsd[0]) : null;
    if (y0 !== null) return y0;
    if (savingsAnnualUsdTotal === null || opexAnnualUsd === null) return null;
    return roundTo(savingsAnnualUsdTotal - opexAnnualUsd, 2);
  })();

  if (netAnnual !== null && !(netAnnual > 0)) warnings.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_NET_SAVINGS_NON_POSITIVE);
  if (savingsAnnualUsdTotal === null) warnings.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_INSUFFICIENT_INPUTS);

  // Legacy missingInfo semantics (best-effort; does not alter canonical math).
  const capexOverridesPresent = Boolean(overrides && ((overrides as any).powerCostPerKwUsdRange || (overrides as any).energyCostPerKwhUsdRange));
  if (!capexOverridesPresent) missingInfo.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_CAPEX_DEFAULTS_USED);
  if (!overrides?.discountRateRange) missingInfo.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_DISCOUNT_RATE_DEFAULT_USED);

  // Legacy-required deprecation marker.
  warnings.push(StorageEconomicsReasonCodesV1.STORAGE_ECON_V1_DEPRECATED_USE_BATTERY_ECONOMICS_V1);

  const capexOtherUsd = sumNums([safeNum(out?.capex?.installUsd), safeNum(out?.capex?.interconnectUsd), safeNum(out?.capex?.softCostsUsd), safeNum(out?.capex?.contingencyUsd)]);

  const powerKw = safeNum((bo as any)?.recommendedBatteryConfigs?.[0]?.powerKw);
  const energyKwh = safeNum((bo as any)?.recommendedBatteryConfigs?.[0]?.energyKwh);
  const hasSizing = powerKw !== null && powerKw > 0 && energyKwh !== null && energyKwh > 0;

  const capexPerKw = hasSizing && capexTotalUsd !== null ? roundTo(capexTotalUsd / powerKw!, 6) : null;
  const capexPerKwh = hasSizing && capexTotalUsd !== null ? roundTo(capexTotalUsd / energyKwh!, 6) : null;
  const netPerKw = hasSizing && netAnnual !== null ? roundTo(netAnnual / powerKw!, 6) : null;
  const netPerKwh = hasSizing && netAnnual !== null ? roundTo(netAnnual / energyKwh!, 6) : null;

  const annualFacilityKwh = inferAnnualFacilityKwh({ intervalInsights: args.intervalInsightsV1 || null });
  const netPerAnnualKwh = annualFacilityKwh && annualFacilityKwh > 0 && netAnnual !== null ? roundTo(netAnnual / annualFacilityKwh, 6) : null;

  const termYears = overrides?.projectLifeYears != null && Number.isFinite(Number(overrides.projectLifeYears)) ? Math.max(1, Math.floor(Number(overrides.projectLifeYears))) : 10;
  const discountRate = overrides?.discountRateRange ? midpoint(overrides.discountRateRange as any) : 0.09;

  const powerCostPerKwUsd = midpoint((overrides as any)?.powerCostPerKwUsdRange);
  const energyCostPerKwhUsd = midpoint((overrides as any)?.energyCostPerKwhUsdRange);
  const omPctOfCapexPerYear = midpoint((overrides as any)?.omPctOfCapexPerYearRange);
  const softCostsPct = midpoint((overrides as any)?.softCostsPctRange);

  return {
    totalCapexUsd: capexTotalUsd,
    opexAnnualUsd,
    savingsAnnualUsdTotal,
    savingsAnnualUsdComponents: {
      demandUsd: safeNum((out as any)?.savingsAnnual?.demandUsd),
      energyUsd: safeNum((out as any)?.savingsAnnual?.energyUsd),
      ratchetAvoidedUsd: safeNum((out as any)?.savingsAnnual?.ratchetAvoidedUsd),
      drUsd: safeNum((out as any)?.savingsAnnual?.drUsd),
      otherUsd: safeNum((out as any)?.savingsAnnual?.otherUsd),
    },
    simplePaybackYears: safeNum((out as any)?.cashflow?.simplePaybackYears),
    npvUsd: safeNum((out as any)?.cashflow?.npvUsd),
    assumptions: {
      projectLifeYears: { value: termYears, method: overrides?.projectLifeYears != null ? 'project_life_years_override_derived_v1' : 'project_life_years_default_derived_v1' },
      discountRateRange: { min: discountRate, max: discountRate, method: overrides?.discountRateRange ? 'discount_rate_override_derived_v1' : 'discount_rate_default_derived_v1' },
      capexModel: {
        powerCostPerKwUsdRange: { min: powerCostPerKwUsd, max: powerCostPerKwUsd, method: powerCostPerKwUsd !== null ? 'capex_power_cost_override_midpoint_derived_v1' : 'capex_power_cost_unavailable_derived_v1' },
        energyCostPerKwhUsdRange: { min: energyCostPerKwhUsd, max: energyCostPerKwhUsd, method: energyCostPerKwhUsd !== null ? 'capex_energy_cost_override_midpoint_derived_v1' : 'capex_energy_cost_unavailable_derived_v1' },
        softCostsPctRange: { min: softCostsPct, max: softCostsPct, method: softCostsPct !== null ? 'capex_soft_costs_pct_midpoint_note_only_v1' : 'capex_soft_costs_unavailable_v1' },
        omPctOfCapexPerYearRange: { min: omPctOfCapexPerYear, max: omPctOfCapexPerYear, method: omPctOfCapexPerYear !== null ? 'opex_om_pct_midpoint_note_only_v1' : 'opex_om_pct_unavailable_v1' },
      },
    },
    capexEstimate: {
      totalCapexUsdRange: [capexTotalUsd, capexTotalUsd],
      breakdown: {
        powerComponentRange: [null, null],
        energyComponentRange: [null, null],
        softCostsRange: [capexOtherUsd, capexOtherUsd],
      },
      capexMethodTag: 'derived_from_battery_econ_v1',
    },
    opexEstimate: {
      annualOmUsdRange: [opexAnnualUsd, opexAnnualUsd],
      opexMethodTag: 'derived_from_battery_econ_v1',
    },
    cashflow: {
      annualGrossSavingsUsdRange: [savingsAnnualUsdTotal, savingsAnnualUsdTotal],
      annualNetSavingsUsdRange: [netAnnual, netAnnual],
      savingsMethodTag: 'derived_from_battery_econ_v1',
    },
    payback: {
      simplePaybackYearsRange: [safeNum(out?.cashflow?.simplePaybackYears), safeNum(out?.cashflow?.simplePaybackYears)],
      paybackMethodTag: 'derived_from_battery_econ_v1',
    },
    npvLite: {
      npvUsdRange: [safeNum(out?.cashflow?.npvUsd), safeNum(out?.cashflow?.npvUsd)],
      npvMethodTag: 'derived_from_battery_econ_v1',
    },
    normalizedMetrics: {
      capexPerKwRange: [capexPerKw, capexPerKw],
      capexPerKwhRange: [capexPerKwh, capexPerKwh],
      annualNetSavingsPerKwRange: [netPerKw, netPerKw],
      annualNetSavingsPerKwhRange: [netPerKwh, netPerKwh],
      annualNetSavingsPerAnnualKwhRange: [netPerAnnualKwh, netPerAnnualKwh],
    },
    confidenceTier: out.confidenceTier as any,
    warnings: uniqSorted([...warnings, ...(Array.isArray(out.warnings) ? out.warnings : [])]),
    missingInfo: uniqSorted(missingInfo),
    engineVersion: storageEconomicsVersionTagV1,
  };
}

