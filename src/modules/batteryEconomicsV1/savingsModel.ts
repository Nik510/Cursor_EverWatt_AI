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
  roundTripEff: number | null;
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

  // Demand savings (conservative): min(batteryPowerKw, peakReductionKwAssumed) * demandRate($/kW-month) * 12
  const demandUsdRaw = (() => {
    if (demandRate === null || peakReduction === null || powerKw === null) return null;
    const kw = Math.max(0, Math.min(powerKw, peakReduction));
    return kw * demandRate * 12;
  })();
  if (demandUsdRaw === null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_MISSING_TARIFF_INPUTS);
  audit.push(
    mkLineItem({
      id: 'savings.demandAnnual',
      label: 'Demand charge savings (annual)',
      amountUsdRaw: demandUsdRaw,
      basis: demandUsdRaw === null ? 'unavailable' : `min(${powerKw},${peakReduction})kW*${demandRate}$/kW-mo*12`,
      sourceEngine: demandRate !== null ? 'tariffEngine' : 'assumption',
      sourcePath: demandRate !== null ? 'inputs.tariffs.demandChargePerKwMonthUsd' : 'inputs.tariffs',
      snapshotId,
    }),
  );

  // Energy savings (conservative): shiftedKwhAnnual * (on - off*(1/rte))
  const energyUsdRaw = (() => {
    if (shiftedKwhAnnual === null || priceOn === null || priceOff === null || rte === null || !(rte > 0 && rte <= 1)) return null;
    const netPerKwh = priceOn - priceOff * (1 / rte);
    return Math.max(0, shiftedKwhAnnual * netPerKwh);
  })();
  if (energyUsdRaw === null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_SAVINGS_UNAVAILABLE_NO_TARIFFENGINE);
  assumptions.push(mkAssumption({ id: 'energySavings.netPerKwhFormula', value: 'priceOn - priceOff*(1/rte), floored at 0', sourcePath: 'savingsModelV1.energy' }));
  audit.push(
    mkLineItem({
      id: 'savings.energyAnnual',
      label: 'Energy TOU arbitrage savings (annual)',
      amountUsdRaw: energyUsdRaw,
      basis: energyUsdRaw === null ? 'unavailable' : `${shiftedKwhAnnual}kWh*(on=${priceOn} - off=${priceOff}*(1/${rte}))`,
      sourceEngine: priceOn !== null && priceOff !== null ? 'tariffEngine' : 'assumption',
      sourcePath: priceOn !== null && priceOff !== null ? 'inputs.tariffs.energyPrices' : 'inputs.tariffs',
      snapshotId,
    }),
  );

  // Ratchet avoided (conservative placeholder): if ratchetDemandKw present, allow ratchet avoidance only when billingDemandKw > ratchetDemandKw.
  const ratchetUsdRaw = (() => {
    if (demandRate === null || peakReduction === null) return null;
    const ratchetKw = safeNum(det?.ratchetDemandKw);
    const billingKw = safeNum(det?.billingDemandKw);
    if (ratchetKw === null || billingKw === null) return null;
    const headroom = Math.max(0, billingKw - ratchetKw);
    const avoidableKw = Math.max(0, Math.min(headroom, peakReduction));
    return avoidableKw * demandRate * 12;
  })();
  if (ratchetUsdRaw === null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_MISSING_TARIFF_INPUTS);
  audit.push(
    mkLineItem({
      id: 'savings.ratchetAvoidedAnnual',
      label: 'Ratchet avoided savings (annual, conservative)',
      amountUsdRaw: ratchetUsdRaw,
      basis: ratchetUsdRaw === null ? 'unavailable' : `min(max(billing-ratchet,0),peakReduction) * demandRate * 12`,
      sourceEngine: det ? 'determinants' : 'assumption',
      sourcePath: det ? 'inputs.determinants.ratchetDemandKw' : 'inputs.determinants',
      snapshotId,
    }),
  );

  const drUsdRaw = (() => {
    const v = safeNum(dr?.annualValueUsd);
    return v === null ? null : Math.max(0, v);
  })();
  if (drUsdRaw === null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_DR_VALUE_UNKNOWN);
  audit.push(
    mkLineItem({
      id: 'savings.drAnnual',
      label: 'Demand response value (annual)',
      amountUsdRaw: drUsdRaw,
      basis: drUsdRaw === null ? 'unavailable' : `provided`,
      sourceEngine: drUsdRaw === null ? 'assumption' : 'assumption',
      sourcePath: 'inputs.dr.annualValueUsd',
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

