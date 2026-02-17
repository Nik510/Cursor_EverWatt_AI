import { batteryEconomicsVersionTagV1 } from './defaults';
import { clamp01, safeNum, stableSortById } from './helpers';
import { BatteryEconomicsReasonCodesV1, uniqSorted } from './reasons';
import { runCostModelV1 } from './costModel';
import { runSavingsModelV1 } from './savingsModel';
import { runFinanceModelV1 } from './financeModel';
import type { BatteryEconomicsInputsV1, BatteryEconomicsOutputsV1 } from './types';

function sizingSanity(args: { powerKw: number | null; energyKwh: number | null }): { cRate: number | null; hoursAtPower: number | null; violations: string[] } {
  const p = safeNum(args.powerKw);
  const e = safeNum(args.energyKwh);
  if (p === null || e === null || !(p > 0) || !(e > 0)) return { cRate: null, hoursAtPower: null, violations: ['battery.econ.sizing.missing'] };
  const cRate = p / e;
  const hours = e / p;
  const violations: string[] = [];
  if (cRate > 2.0) violations.push('battery.econ.sizing.c_rate_high');
  if (hours < 0.5) violations.push('battery.econ.sizing.hours_too_low');
  if (hours > 8) violations.push('battery.econ.sizing.hours_too_high');
  return { cRate, hoursAtPower: hours, violations: violations.sort((a, b) => a.localeCompare(b)) };
}

export function evaluateBatteryEconomicsV1(inputs: BatteryEconomicsInputsV1 | null | undefined): BatteryEconomicsOutputsV1 {
  const warnings: string[] = [];
  const in0 = (inputs && typeof inputs === 'object' ? inputs : {}) as BatteryEconomicsInputsV1;

  const battery = in0.battery || null;
  const costs = in0.costs || null;
  const tariffs = in0.tariffs || null;
  const determinants = in0.determinants || null;
  const dispatch = in0.dispatch || null;
  const dr = in0.dr || null;
  const finance = in0.finance || null;

  const powerKw = safeNum(battery?.powerKw);
  const energyKwh = safeNum(battery?.energyKwh);

  const rte = (() => {
    const x = safeNum(battery?.roundTripEff);
    if (x === null) return 0.9;
    return clamp01(x) || 0.9;
  })();
  if (battery?.roundTripEff == null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_RTE_ASSUMED_DEFAULT);

  const degrade = safeNum(battery?.degradationPctYr);
  if (degrade === null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_DEGRADATION_ASSUMED_DEFAULT);

  const outOfBounds = (() => {
    const bad: boolean[] = [];
    if (powerKw !== null && powerKw < 0) bad.push(true);
    if (energyKwh !== null && energyKwh < 0) bad.push(true);
    if (battery?.usableFraction != null) {
      const uf = Number(battery.usableFraction);
      if (!Number.isFinite(uf) || uf <= 0 || uf > 1) bad.push(true);
    }
    if (battery?.roundTripEff != null) {
      const rr = Number(battery.roundTripEff);
      if (!Number.isFinite(rr) || rr <= 0 || rr > 1) bad.push(true);
    }
    return bad.some(Boolean);
  })();
  if (outOfBounds) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_OUT_OF_BOUNDS_INPUTS);

  const costRes = runCostModelV1({ battery, costs });
  const savingsRes = runSavingsModelV1({
    tariff: tariffs,
    determinants,
    dispatch,
    dr,
    batteryPowerKw: powerKw,
    roundTripEff: rte,
  });

  const financeRes = runFinanceModelV1({
    capexTotalUsd: costRes.capex.totalUsd,
    annualSavingsTotalUsd: savingsRes.savingsAnnual.totalUsd,
    annualOpexTotalUsd: costRes.opexAnnual.totalUsd,
    finance,
  });

  warnings.push(...costRes.warnings, ...savingsRes.warnings, ...financeRes.warnings);

  // Export not supported in v1 (no export tariff modeling yet). If caller specifies export prices later, warn.
  if ((tariffs as any)?.exportPriceUsdPerKwh != null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_EXPORT_NOT_SUPPORTED);

  // Confidence: deterministic, conservative.
  const confidenceTier = (() => {
    const hasSizing = powerKw !== null && powerKw > 0 && energyKwh !== null && energyKwh > 0;
    const hasCapex = costRes.capex.totalUsd !== null;
    const hasSavings = savingsRes.savingsAnnual.totalUsd !== null;
    if (!hasSizing || !hasCapex) return 'NONE' as const;
    if (!hasSavings) return 'LOW' as const;
    // If savings exist but tariff inputs are partial, keep MEDIUM at best.
    const hasTariff = tariffs && (tariffs.demandChargePerKwMonthUsd != null || (tariffs.energyPriceOnPeakUsdPerKwh != null && tariffs.energyPriceOffPeakUsdPerKwh != null));
    if (hasTariff) return 'MEDIUM' as const;
    return 'LOW' as const;
  })();

  const auditLineItems = stableSortById([...costRes.auditLineItems, ...savingsRes.auditLineItems, ...financeRes.auditLineItems]);

  return {
    confidenceTier,
    methodTag: 'battery_econ_v1',
    engineVersion: batteryEconomicsVersionTagV1,
    capex: {
      ...costRes.capex,
      assumptions: stableSortById(costRes.capex.assumptions),
    },
    opexAnnual: {
      ...costRes.opexAnnual,
      assumptions: [],
    },
    savingsAnnual: {
      ...savingsRes.savingsAnnual,
      assumptions: stableSortById(savingsRes.savingsAnnual.assumptions),
    },
    cashflow: financeRes.cashflow,
    sizingSanity: sizingSanity({ powerKw, energyKwh }),
    audit: { lineItems: auditLineItems },
    warnings: uniqSorted(warnings),
  };
}

