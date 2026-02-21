import { batteryEconomicsVersionTagV1 } from './defaults';
import { clamp01, safeNum, stableSortById, sumFixedOrder } from './helpers';
import { BatteryEconomicsReasonCodesV1, uniqSorted } from './reasons';
import { runCostModelV1 } from './costModel';
import { runSavingsModelV1 } from './savingsModel';
import { runFinanceModelV1 } from './financeModel';
import type { BatteryEconomicsInputsV1, BatteryEconomicsOutputsV1 } from './types';
import { calcSgipAwardV0 } from './incentives/sgipV0';
import { calcItcV0 } from './tax/itcV0';
import { calcMacrsV0 } from './tax/macrsV0';
import { calcDegradationV0 } from './degradation/degradationV0';
import { defaultFinanceV1 } from './defaults';

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
  const sgipInputsV0 = in0.sgipInputsV0 || null;
  const taxInputsV0 = in0.taxInputsV0 || null;
  const degradationInputsV0 = in0.degradationInputsV0 || null;

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

  warnings.push(...costRes.warnings, ...savingsRes.warnings);

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

  // v1.3+ optional modules (deterministic, auditable, warnings-first).
  const sgipRes = calcSgipAwardV0({ sgipInputsV0, battery });

  const itcRes = calcItcV0({ taxInputsV0, capexTotalUsd: costRes.capex.totalUsd });
  const macrsRes = calcMacrsV0({
    taxInputsV0,
    capexTotalUsd: costRes.capex.totalUsd,
    itcPctUsed: itcRes.itcV0 ? itcRes.itcV0.itcPctUsed : null,
    itcBasisReductionPctUsed: itcRes.itcV0 ? itcRes.itcV0.itcBasisReductionPctUsed : null,
  });

  const termYears = Math.max(1, Math.floor(safeNum(finance?.termYears) ?? defaultFinanceV1.termYears));
  const degrRes = calcDegradationV0({
    degradationInputsV0,
    battery,
    analysisHorizonYears: termYears,
    initialCapexTotalUsd: costRes.capex.totalUsd,
  });

  const multipliers = degrRes.degradationV0?.effectiveSavingsMultiplierByYear || null;
  const annualSavingsByYearUsd = (() => {
    if (!multipliers) return null;
    if (multipliers.length < termYears) return null;
    const demand = safeNum(savingsRes.savingsAnnual.demandUsd);
    const energy = safeNum(savingsRes.savingsAnnual.energyUsd);
    const ratchet = safeNum(savingsRes.savingsAnnual.ratchetAvoidedUsd);
    const drUsd = safeNum(savingsRes.savingsAnnual.drUsd);
    const other = safeNum(savingsRes.savingsAnnual.otherUsd);
    const out: number[] = [];
    for (let y = 1; y <= termYears; y++) {
      const m = safeNum(multipliers[y - 1]);
      const d = demand === null || m === null ? null : demand * m;
      const e = energy === null || m === null ? null : energy * m;
      const total = sumFixedOrder([d, e, ratchet, drUsd, other]);
      out.push(total === null ? NaN : total);
    }
    // If any year is NaN, fail closed to preserve existing behavior.
    return out.every((x) => Number.isFinite(x)) ? out : null;
  })();

  const extraCashflowYears1toNUsd = (() => {
    const out: number[] = Array.from({ length: termYears }, () => 0);
    const macrs = macrsRes.cashflowBenefitByYearUsd;
    if (Array.isArray(macrs)) {
      for (let i = 0; i < Math.min(termYears, macrs.length); i++) {
        const v = safeNum(macrs[i]);
        if (v !== null) out[i] += v;
      }
    }
    const degExtra = degrRes.extraCashflowYears1toNUsd;
    if (Array.isArray(degExtra)) {
      for (let i = 0; i < Math.min(termYears, degExtra.length); i++) {
        const v = safeNum(degExtra[i]);
        if (v !== null) out[i] += v;
      }
    }
    return out;
  })();

  const year0ExtraUsd = (() => {
    const sg = safeNum(sgipRes.sgipV0?.awardUsd);
    const itc = safeNum(itcRes.itcV0?.itcUsd);
    return (sg ?? 0) + (itc ?? 0);
  })();

  const financeRes = runFinanceModelV1({
    capexTotalUsd: costRes.capex.totalUsd,
    annualSavingsTotalUsd: savingsRes.savingsAnnual.totalUsd,
    annualOpexTotalUsd: costRes.opexAnnual.totalUsd,
    annualSavingsByYearUsd,
    extraCashflowYears1toNUsd,
    year0ExtraUsd,
    finance: (() => {
      const dr = safeNum((taxInputsV0 as any)?.discountRate);
      if (dr === null) return finance;
      return { ...(finance || {}), discountRate: dr };
    })(),
  });

  warnings.push(...financeRes.warnings);
  warnings.push(...(sgipRes.sgipV0?.warnings || []));
  warnings.push(...(itcRes.itcV0?.warnings || []));
  warnings.push(...(macrsRes.macrsV0?.warnings || []));
  warnings.push(...(degrRes.degradationV0?.warnings || []));

  const auditLineItems = stableSortById([
    ...costRes.auditLineItems,
    ...savingsRes.auditLineItems,
    ...financeRes.auditLineItems,
    ...sgipRes.auditLineItems,
    ...itcRes.auditLineItems,
    ...macrsRes.auditLineItems,
    ...degrRes.auditLineItems,
  ]);

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
    sgipV0: sgipRes.sgipV0,
    taxV0: taxInputsV0
      ? {
          itcV0:
            itcRes.itcV0 ||
            ({
              itcUsd: null,
              itcPctUsed: null,
              itcBasisReductionPctUsed: null,
              warnings: [],
            } as const),
          macrsV0:
            macrsRes.macrsV0 ||
            ({
              deprScheduleYears: [],
              deprUsdByYear: null,
              warnings: [],
            } as const),
        }
      : null,
    degradationV0: degrRes.degradationV0,
    sizingSanity: sizingSanity({ powerKw, energyKwh }),
    audit: { lineItems: auditLineItems },
    warnings: uniqSorted(warnings),
  };
}

