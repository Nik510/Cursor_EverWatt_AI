import { roundTo, safeNum, sumFixedOrder } from './helpers';
import { BatteryEconomicsReasonCodesV1 } from './reasons';
import type {
  BatteryEconomicsAssumptionV1,
  BatteryEconomicsAuditLineItemV1,
  BatteryEconomicsDispatchSignalsV1,
  BatteryEconomicsDrSignalsV1,
  BatteryEconomicsTariffSignalsV1,
  BatteryEconomicsDeterminantsSignalsV1,
} from './types';

export type SavingsModelResultV1 = {
  savingsAnnual: {
    demandUsd: number | null;
    energyUsd: number | null;
    ratchetAvoidedUsd: number | null;
    drUsd: number | null;
    otherUsd: number | null;
    totalUsd: number | null;
    assumptions: BatteryEconomicsAssumptionV1[];
  };
  auditLineItems: BatteryEconomicsAuditLineItemV1[];
  warnings: string[];
};

function mkAssumption(args: Omit<BatteryEconomicsAssumptionV1, 'sourceEngine'> & { sourceEngine?: BatteryEconomicsAssumptionV1['sourceEngine'] }): BatteryEconomicsAssumptionV1 {
  return { sourceEngine: args.sourceEngine || 'assumption', id: String(args.id), value: String(args.value), sourcePath: String(args.sourcePath), notes: args.notes ?? null };
}

function mkLineItem(args: Omit<BatteryEconomicsAuditLineItemV1, 'sourceEngine'> & { sourceEngine?: BatteryEconomicsAuditLineItemV1['sourceEngine'] }): BatteryEconomicsAuditLineItemV1 {
  const raw = args.amountUsdRaw === null ? null : Number(args.amountUsdRaw);
  const rounded = raw === null || !Number.isFinite(raw) ? null : roundTo(raw, 2);
  return {
    id: String(args.id),
    label: String(args.label),
    amountUsd: rounded,
    amountUsdRaw: raw !== null && Number.isFinite(raw) ? raw : null,
    basis: String(args.basis || ''),
    sourceEngine: args.sourceEngine || 'assumption',
    sourcePath: String(args.sourcePath || ''),
    snapshotId: args.snapshotId ?? null,
    notes: args.notes ?? null,
  };
}

export function runSavingsModelV1(args: {
  tariff: BatteryEconomicsTariffSignalsV1 | null;
  determinants: BatteryEconomicsDeterminantsSignalsV1 | null;
  dispatch: BatteryEconomicsDispatchSignalsV1 | null;
  dr: BatteryEconomicsDrSignalsV1 | null;
  batteryPowerKw: number | null;
  /**
   * Optional battery energy size (kWh). Used only for audit and future dispatch modeling;
   * v1 savings uses dispatch signals when provided (warnings-first, no guessing).
   */
  batteryEnergyKwh?: number | null;
  roundTripEff: number | null;
  /**
   * Optional eligibility signal (e.g., from drReadinessV1). If explicitly false, DR value is forced to 0 with a reason.
   */
  drEligible?: boolean | null;
}): SavingsModelResultV1 {
  const warnings: string[] = [];
  const assumptions: BatteryEconomicsAssumptionV1[] = [];
  const audit: BatteryEconomicsAuditLineItemV1[] = [];

  const tariff = args.tariff || null;
  const det = args.determinants || null;
  const dispatch = args.dispatch || null;
  const dr = args.dr || null;
  const snapshotId = String(tariff?.snapshotId || '').trim() || null;

  const demandRate = safeNum(tariff?.demandChargePerKwMonthUsd);
  const priceOn = safeNum(tariff?.energyPriceOnPeakUsdPerKwh);
  const priceOff = safeNum(tariff?.energyPriceOffPeakUsdPerKwh);
  const rte = safeNum(args.roundTripEff);

  const peakReduction = safeNum(dispatch?.peakReductionKwAssumed);
  const shiftedKwhAnnual = safeNum(dispatch?.shiftedKwhAnnual);
  const powerKw = safeNum(args.batteryPowerKw);
  const billingDemandKw = safeNum(det?.billingDemandKw);
  const ratchetDemandKw = safeNum(det?.ratchetDemandKw);

  const touPrices = Array.isArray((tariff as any)?.touEnergyPrices) ? (((tariff as any).touEnergyPrices as any[]) || []) : [];
  const touPriceVals = touPrices.map((w) => Number((w as any)?.pricePerKwh)).filter((n) => Number.isFinite(n) && n >= 0);
  const touPeak = touPriceVals.length ? Math.max(...touPriceVals) : null;
  const touOff = touPriceVals.length ? Math.min(...touPriceVals) : null;

  // Demand savings (warnings-first): reduce billed demand (kW) with cap from dispatch peak reduction and battery power.
  const demandUsdRaw = (() => {
    if (demandRate === null) return null;
    if (billingDemandKw === null) return null;
    if (peakReduction === null || powerKw === null) return null;
    const reducKw = Math.max(0, Math.min(powerKw, peakReduction, billingDemandKw));
    const postUnfloored = Math.max(0, billingDemandKw - reducKw);
    const post = ratchetDemandKw === null ? postUnfloored : Math.max(ratchetDemandKw, postUnfloored);
    const actualReduc = Math.max(0, billingDemandKw - post);
    return actualReduc * demandRate * 12;
  })();
  if (demandRate === null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_MISSING_TARIFF_INPUTS);
  else if (billingDemandKw === null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_DEMAND_SAVINGS_UNAVAILABLE_MISSING_DETERMINANTS);
  else if (peakReduction === null || powerKw === null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_SAVINGS_UNAVAILABLE_NO_DISPATCH);
  audit.push(
    mkLineItem({
      id: 'savings.demandAnnual',
      label: 'Demand charge savings (annual)',
      amountUsdRaw: demandUsdRaw,
      basis:
        demandUsdRaw === null
          ? 'unavailable'
          : `baseline=${billingDemandKw}kW, post=max(ratchet=${ratchetDemandKw ?? '—'}, baseline-min(P=${powerKw},reduc=${peakReduction})), rate=${demandRate}$/kW-mo*12`,
      sourceEngine: demandRate !== null ? 'tariffEngine' : 'assumption',
      sourcePath: demandRate !== null ? 'inputs.tariffs.demandChargePerKwMonthUsd' : 'inputs.tariffs',
      snapshotId,
    }),
  );

  // Energy arbitrage savings (warnings-first): use TOU windows when present; otherwise fall back to on/off proxy.
  const energyUsdRaw = (() => {
    const peak = touPeak !== null ? touPeak : priceOn;
    const off = touOff !== null ? touOff : priceOff;
    if (shiftedKwhAnnual === null) return null;
    if (peak === null || off === null) return null;
    if (rte === null || !(rte > 0 && rte <= 1)) return null;
    const netPerKwh = peak - off * (1 / rte);
    return Math.max(0, shiftedKwhAnnual * netPerKwh);
  })();
  if (shiftedKwhAnnual === null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_SAVINGS_UNAVAILABLE_NO_DISPATCH);
  if ((touPeak === null || touOff === null) && (priceOn === null || priceOff === null)) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_SAVINGS_UNAVAILABLE_NO_TARIFFENGINE);
  assumptions.push(mkAssumption({ id: 'energySavings.netPerKwhFormula', value: 'peakPrice - offPrice*(1/rte), floored at 0', sourcePath: 'savingsModelV1.energy' }));
  audit.push(
    mkLineItem({
      id: 'savings.energyAnnual',
      label: 'Energy TOU arbitrage savings (annual)',
      amountUsdRaw: energyUsdRaw,
      basis:
        energyUsdRaw === null
          ? 'unavailable'
          : `${shiftedKwhAnnual}kWh*(peak=${touPeak ?? priceOn} - off=${touOff ?? priceOff}*(1/${rte}))`,
      sourceEngine: (touPeak !== null && touOff !== null) || (priceOn !== null && priceOff !== null) ? 'tariffEngine' : 'assumption',
      sourcePath:
        touPeak !== null && touOff !== null
          ? 'inputs.tariffs.touEnergyPrices'
          : priceOn !== null && priceOff !== null
            ? 'inputs.tariffs.energyPrices'
            : 'inputs.tariffs',
      snapshotId,
    }),
  );

  // Ratchet (lite): only when determinants provides ratchet method + history (warnings-first).
  const ratchetUsdRaw = (() => {
    if (demandRate === null) return null;
    if (powerKw === null || peakReduction === null) return null;
    const histMax = safeNum((det as any)?.ratchetHistoryMaxKw);
    const floorPct = safeNum((det as any)?.ratchetFloorPct);
    if (histMax === null || floorPct === null) return null;
    const reducKw = Math.max(0, Math.min(powerKw, peakReduction));
    const baseFloor = Math.max(0, floorPct) * Math.max(0, histMax);
    const postFloor = Math.max(0, floorPct) * Math.max(0, histMax - reducKw);
    const deltaFloorKw = Math.max(0, baseFloor - postFloor);
    // If current cycle appears ratchet-bound, treat as binding for 12 months (lite, deterministic).
    const bindingMonths =
      ratchetDemandKw !== null && billingDemandKw !== null && Math.abs(billingDemandKw - ratchetDemandKw) <= 0.25 ? 12 : 0;
    return deltaFloorKw * demandRate * bindingMonths;
  })();
  if (ratchetUsdRaw === null) {
    const hasRatchetSignal = det?.ratchetDemandKw != null || (det as any)?.ratchetHistoryMaxKw != null || (det as any)?.ratchetFloorPct != null;
    if (hasRatchetSignal) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_RATCHET_UNAVAILABLE);
  }
  audit.push(
    mkLineItem({
      id: 'savings.ratchetAvoidedAnnual',
      label: 'Ratchet savings (annual, lite)',
      amountUsdRaw: ratchetUsdRaw,
      basis:
        ratchetUsdRaw === null
          ? 'unavailable'
          : `deltaRatchetFloorKw * demandRate * bindingMonths (bindingMonths=12 only when billingDemand≈ratchetDemand)`,
      sourceEngine: det ? 'determinants' : 'assumption',
      sourcePath: det ? 'inputs.determinants.ratchetHistoryMaxKw' : 'inputs.determinants',
      snapshotId,
    }),
  );

  const drUsdRaw = (() => {
    const v = safeNum(dr?.annualValueUsd);
    const eligible = args.drEligible;
    if (v === null) return null;
    if (eligible === false) return 0;
    return Math.max(0, v);
  })();
  if (drUsdRaw === null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_DR_VALUE_UNKNOWN);
  if (safeNum(dr?.annualValueUsd) !== null && args.drEligible === false) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_DR_INELIGIBLE);
  audit.push(
    mkLineItem({
      id: 'savings.drAnnual',
      label: 'Demand response value (annual)',
      amountUsdRaw: drUsdRaw,
      basis: drUsdRaw === null ? 'unavailable' : args.drEligible === false ? 'ineligible (forced 0)' : `provided`,
      sourceEngine: 'assumption',
      sourcePath: args.drEligible === false ? 'drReadinessV1.eligible' : 'inputs.dr.annualValueUsd',
      snapshotId,
    }),
  );

  const otherUsdRaw = 0;
  audit.push(mkLineItem({ id: 'savings.otherAnnual', label: 'Other savings (annual)', amountUsdRaw: otherUsdRaw, basis: 'v1 placeholder (0)', sourcePath: 'savingsModelV1.other' }));

  const totalUsdRaw = sumFixedOrder([demandUsdRaw, energyUsdRaw, ratchetUsdRaw, drUsdRaw, otherUsdRaw]);
  audit.push(mkLineItem({ id: 'savings.totalAnnual', label: 'Total savings (annual)', amountUsdRaw: totalUsdRaw, basis: 'sum in fixed order', sourcePath: 'savingsModelV1.total' }));

  return {
    savingsAnnual: {
      demandUsd: demandUsdRaw === null ? null : roundTo(demandUsdRaw, 2),
      energyUsd: energyUsdRaw === null ? null : roundTo(energyUsdRaw, 2),
      ratchetAvoidedUsd: ratchetUsdRaw === null ? null : roundTo(ratchetUsdRaw, 2),
      drUsd: drUsdRaw === null ? null : roundTo(drUsdRaw, 2),
      otherUsd: roundTo(otherUsdRaw, 2),
      totalUsd: totalUsdRaw === null ? null : roundTo(totalUsdRaw, 2),
      assumptions,
    },
    auditLineItems: audit,
    warnings,
  };
}

