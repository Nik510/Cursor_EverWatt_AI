import { roundTo, safeNum, sumFixedOrder } from './helpers';
import { BatteryEconomicsReasonCodesV1 } from './reasons';
import { CcaTariffLibraryReasonCodesV0 } from '../ccaTariffLibraryV0/reasons';
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

function mkLineItem(args: {
  id: string;
  label: string;
  amountUsdRaw: number | null;
  basis: string;
  sourcePath: string;
  sourceEngine?: BatteryEconomicsAuditLineItemV1['sourceEngine'];
  snapshotId?: string | null;
  rateSource?: BatteryEconomicsAuditLineItemV1['rateSource'];
  quantities?: BatteryEconomicsAuditLineItemV1['quantities'];
  notes?: string | null;
}): BatteryEconomicsAuditLineItemV1 {
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
    rateSource: (args as any)?.rateSource ?? null,
    quantities: Array.isArray((args as any)?.quantities) ? ((args as any).quantities as any) : null,
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
  const rateCode = String((tariff as any)?.rateCode || '').trim() || null;
  const rateSource = { snapshotId, rateCode, kind: 'DELIVERY' as const } as const;
  const supplyProviderType =
    (tariff as any)?.supplyProviderType === 'CCA' || (tariff as any)?.supplyProviderType === 'DA'
      ? ((tariff as any).supplyProviderType as 'CCA' | 'DA')
      : null;

  const demandRate = safeNum(tariff?.demandChargePerKwMonthUsd);
  const priceOn = safeNum(tariff?.energyPriceOnPeakUsdPerKwh);
  const priceOff = safeNum(tariff?.energyPriceOffPeakUsdPerKwh);
  const rte = safeNum(args.roundTripEff);

  const peakReduction = safeNum(dispatch?.peakReductionKwAssumed);
  const shiftedKwhAnnual = safeNum(dispatch?.shiftedKwhAnnual);
  const powerKw = safeNum(args.batteryPowerKw);
  const billingDemandKw = safeNum(det?.billingDemandKw);
  const ratchetDemandKw = safeNum(det?.ratchetDemandKw);

  const touPricesDelivery = Array.isArray((tariff as any)?.touEnergyPrices) ? (((tariff as any).touEnergyPrices as any[]) || []) : [];
  const touPricesGeneration = Array.isArray((tariff as any)?.generationTouEnergyPrices)
    ? (((tariff as any).generationTouEnergyPrices as any[]) || [])
    : [];
  const touPricesUsedForEnergy = touPricesGeneration.length ? touPricesGeneration : touPricesDelivery;
  const energyRateSource = (() => {
    if (touPricesGeneration.length) {
      const genSnapshotId = String((tariff as any)?.generationSnapshotId || '').trim() || null;
      const genRateCode = String((tariff as any)?.generationRateCode || '').trim() || null;
      return { snapshotId: genSnapshotId, rateCode: genRateCode, kind: 'CCA_GENERATION_V0' as const } as const;
    }
    return rateSource;
  })();

  if (touPricesGeneration.length) {
    warnings.push(CcaTariffLibraryReasonCodesV0.CCA_V0_ENERGY_ONLY_NO_EXIT_FEES);
  }

  if (supplyProviderType === 'CCA' && !touPricesGeneration.length) {
    warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_SUPPLY_CCA_GENERATION_RATES_MISSING_FALLBACK);
  }

  const touPriceVals = touPricesUsedForEnergy.map((w) => Number((w as any)?.pricePerKwh)).filter((n) => Number.isFinite(n) && n >= 0);
  const touPeak = touPriceVals.length ? Math.max(...touPriceVals) : null;
  const touOff = touPriceVals.length ? Math.min(...touPriceVals) : null;

  function qty(id: string, unit: string, value: number | null): { id: string; unit: string; value: number | null } {
    return { id: String(id), unit: String(unit), value: safeNum(value) };
  }

  // Cycle-by-cycle savings (v1.1): when per-cycle dispatch is provided, compute per cycle and sum.
  const cycleModel = (() => {
    const dispatchCycles = Array.isArray((dispatch as any)?.cycles) ? (((dispatch as any).cycles as any[]) || []) : [];
    if (!dispatchCycles.length) return { used: false as const };

    const detCycles = Array.isArray((det as any)?.cycles) ? (((det as any).cycles as any[]) || []) : [];

    // Price map by periodId (deterministic; must be consistent).
    const priceByTou: Record<string, number> = {};
    const priceConflicts: string[] = [];
    for (const w of touPricesUsedForEnergy) {
      const pid = String((w as any)?.periodId || '').trim();
      const p = Number((w as any)?.pricePerKwh);
      if (!pid || !Number.isFinite(p) || p < 0) continue;
      if (Object.prototype.hasOwnProperty.call(priceByTou, pid) && Math.abs(priceByTou[pid] - p) > 1e-9) priceConflicts.push(pid);
      priceByTou[pid] = p;
    }
    const pricesOk = Object.keys(priceByTou).length > 0 && priceConflicts.length === 0;

    const byLabel = new Map<string, any>();
    for (const c of detCycles) byLabel.set(String((c as any)?.cycleLabel || '').trim(), c);

    const cyclesSorted = dispatchCycles
      .map((c) => ({
        cycleLabel: String((c as any)?.cycleLabel || '').trim() || 'unknown',
        cycleStartIso: String((c as any)?.cycleStartIso || '').trim(),
        cycleEndIso: String((c as any)?.cycleEndIso || '').trim(),
        raw: c,
      }))
      .sort((a, b) => String(a.cycleStartIso).localeCompare(String(b.cycleStartIso)) || String(a.cycleLabel).localeCompare(String(b.cycleLabel)));

    const anyBadDispatch = cyclesSorted.some((c) => !(c.raw && String((c.raw as any)?.dispatchMethod) === 'dispatch_v1_1' && (c.raw as any)?.ok === true));
    const anyBadPrices = !pricesOk;

    const auditItems: BatteryEconomicsAuditLineItemV1[] = [];
    const cycleEnergyUsd: Array<number | null> = [];
    const cycleDemandUsd: Array<number | null> = [];
    const cycleWarnings: string[] = [];

    if (anyBadDispatch) cycleWarnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_SAVINGS_UNAVAILABLE_NO_DISPATCH);
    if (anyBadPrices) cycleWarnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_SAVINGS_UNAVAILABLE_NO_TARIFFENGINE);

    // If inputs are insufficient, do not emit partial dollars; keep quantity-only line items with null amounts.
    const dollarsAllowed = !anyBadDispatch && !anyBadPrices;

    for (const c of cyclesSorted) {
      const cycleLabel = c.cycleLabel;
      const detC = byLabel.get(cycleLabel) || null;

      const dischargeByTou = (c.raw as any)?.kwhDischargedByTou && typeof (c.raw as any).kwhDischargedByTou === 'object' ? ((c.raw as any).kwhDischargedByTou as Record<string, number>) : {};
      const chargeByTou = (c.raw as any)?.kwhChargedByTou && typeof (c.raw as any).kwhChargedByTou === 'object' ? ((c.raw as any).kwhChargedByTou as Record<string, number>) : {};
      const keys = Array.from(new Set([...Object.keys(dischargeByTou), ...Object.keys(chargeByTou)])).sort((a, b) => a.localeCompare(b));

      // Energy shift by TOU (per cycle)
      let energyCycleRaw: number | null = 0;
      for (const pid of keys) {
        const d = safeNum(dischargeByTou[pid]) ?? 0;
        const ch = safeNum(chargeByTou[pid]) ?? 0;
        const net = d - ch;
        const price = safeNum(priceByTou[pid]);
        const amount = dollarsAllowed && price !== null ? net * price : null;
        if (energyCycleRaw !== null) {
          if (amount === null) energyCycleRaw = null;
          else energyCycleRaw += amount;
        }
        auditItems.push(
          mkLineItem({
            id: `savings.energyShift.cycle.${cycleLabel}.tou.${pid}`,
            label: `Energy shift savings (${cycleLabel} • ${pid})`,
            amountUsdRaw: amount,
            basis: amount === null ? 'unavailable' : `(dischargeKwh - chargeKwh) * pricePerKwh`,
            sourceEngine: dollarsAllowed ? 'tariffEngine' : 'assumption',
            sourcePath: touPricesGeneration.length ? 'inputs.tariffs.generationTouEnergyPrices' : 'inputs.tariffs.touEnergyPrices',
            snapshotId,
            rateSource: energyRateSource,
            quantities: [
              qty('dischargeKwh', 'kWh', d),
              qty('chargeKwh', 'kWh', ch),
              qty('netKwh', 'kWh', net),
              qty('pricePerKwh', '$/kWh', price),
            ],
            notes: c.cycleStartIso && c.cycleEndIso ? `cycleStart=${c.cycleStartIso}, cycleEnd=${c.cycleEndIso}` : null,
          }),
        );
      }
      cycleEnergyUsd.push(energyCycleRaw);
      auditItems.push(
        mkLineItem({
          id: `savings.energyShift.cycle.${cycleLabel}.total`,
          label: `Energy shift savings (${cycleLabel} total)`,
          amountUsdRaw: energyCycleRaw,
          basis: energyCycleRaw === null ? 'unavailable' : `sum over TOU buckets (fixed order by periodId)`,
          sourceEngine: dollarsAllowed ? 'tariffEngine' : 'assumption',
          sourcePath: 'savingsModelV1_1.energyShift.cycleTotal',
          snapshotId,
          rateSource: energyRateSource,
          quantities: [],
        }),
      );

      // Demand savings (per cycle)
      const kWMaxBefore = safeNum((detC as any)?.kWMax) ?? safeNum((c.raw as any)?.demandPeakBeforeKw);
      const billedBefore = safeNum((detC as any)?.billingDemandKw) ?? kWMaxBefore;
      const kWMaxAfter = safeNum((c.raw as any)?.demandPeakAfterKw);
      const method = String((detC as any)?.billingDemandMethod || (det as any)?.billingDemandMethod || '').trim() || null;
      const histMax = safeNum((detC as any)?.ratchetHistoryMaxKw) ?? safeNum((det as any)?.ratchetHistoryMaxKw);
      const floorPct = safeNum((detC as any)?.ratchetFloorPct) ?? safeNum((det as any)?.ratchetFloorPct);
      const ratchetFloorKw = histMax !== null && floorPct !== null ? Math.max(0, floorPct) * Math.max(0, histMax) : null;

      const ratchetNeedsHistory = Boolean(method && method.toLowerCase().includes('ratchet') && histMax === null && floorPct !== null);
      if (ratchetNeedsHistory) cycleWarnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_RATCHET_UNAVAILABLE);

      const demandCycleRaw = (() => {
        if (demandRate === null) return null;
        if (kWMaxAfter === null) return null;
        if (billedBefore === null) return null;
        if (ratchetNeedsHistory) return 0; // conservative: no demand savings when ratchet history is unknown
        const post = ratchetFloorKw === null ? Math.max(0, kWMaxAfter) : Math.max(Math.max(0, kWMaxAfter), ratchetFloorKw);
        const delta = Math.max(0, billedBefore - post);
        return delta * demandRate;
      })();
      cycleDemandUsd.push(demandCycleRaw);

      auditItems.push(
        mkLineItem({
          id: `savings.demand.cycle.${cycleLabel}`,
          label: `Demand charge savings (${cycleLabel})`,
          amountUsdRaw: dollarsAllowed ? demandCycleRaw : null,
          basis:
            demandCycleRaw === null
              ? 'unavailable'
              : ratchetNeedsHistory
                ? 'ratchet history missing → conservative 0'
                : `baseline=billingDemandKw||kWMax, post=max(kWMaxAfter, ratchetFloorKw if available)`,
          sourceEngine: demandRate !== null ? 'tariffEngine' : 'assumption',
          sourcePath: demandRate !== null ? 'inputs.tariffs.demandChargePerKwMonthUsd' : 'inputs.tariffs',
          snapshotId,
          rateSource,
          quantities: [
            qty('baselineDemandKw', 'kW', billedBefore),
            qty('postDemandKw', 'kW', kWMaxAfter === null ? null : ratchetFloorKw === null ? Math.max(0, kWMaxAfter) : Math.max(Math.max(0, kWMaxAfter), ratchetFloorKw)),
            qty('demandRate', '$/kW-month', demandRate),
          ],
          notes: String((c.raw as any)?.peakTimestampIso || '').trim() ? `peakTimestampIso=${String((c.raw as any)?.peakTimestampIso).trim()}` : null,
        }),
      );

      if (ratchetFloorKw !== null || ratchetNeedsHistory) {
        auditItems.push(
          mkLineItem({
            id: `savings.demand.ratchetFloor.cycle.${cycleLabel}`,
            label: `Ratchet floor applied (${cycleLabel})`,
            amountUsdRaw: 0,
            basis: ratchetFloorKw === null ? 'history missing' : 'ratchetFloorKw = ratchetFloorPct * ratchetHistoryMaxKw',
            sourceEngine: detC ? 'determinants' : 'assumption',
            sourcePath: detC ? 'inputs.determinants.cycles[].ratchetFloorPct' : 'inputs.determinants',
            snapshotId,
            rateSource,
            quantities: [
              qty('ratchetFloorKw', 'kW', ratchetFloorKw),
              qty('ratchetFloorPct', 'fraction', floorPct),
              qty('ratchetHistoryMaxKw', 'kW', histMax),
            ],
            notes: ratchetNeedsHistory ? 'ratchet indicated but history missing' : null,
          }),
        );
      }
    }

    const demandAnnualRaw = dollarsAllowed ? sumFixedOrder(cycleDemandUsd) : null;
    const energyAnnualRaw = dollarsAllowed ? sumFixedOrder(cycleEnergyUsd) : null;

    // Annual line items: keep canonical ids.
    auditItems.push(
      mkLineItem({
        id: 'savings.demandAnnual',
        label: 'Demand charge savings (annual)',
        amountUsdRaw: demandAnnualRaw,
        basis: demandAnnualRaw === null ? 'unavailable' : 'sum over cycles (fixed order by cycleStartIso)',
        sourceEngine: demandRate !== null ? 'tariffEngine' : 'assumption',
        sourcePath: 'savingsModelV1_1.demandAnnual',
        snapshotId,
        rateSource,
        quantities: [],
      }),
    );
    auditItems.push(
      mkLineItem({
        id: 'savings.energyAnnual',
        label: 'Energy TOU arbitrage savings (annual)',
        amountUsdRaw: energyAnnualRaw,
        basis: energyAnnualRaw === null ? 'unavailable' : 'sum over cycles (fixed order by cycleStartIso)',
        sourceEngine: pricesOk ? 'tariffEngine' : 'assumption',
        sourcePath: 'savingsModelV1_1.energyAnnual',
        snapshotId,
        rateSource: energyRateSource,
        quantities: [],
      }),
    );

    return {
      used: true as const,
      demandUsdRaw: demandAnnualRaw,
      energyUsdRaw: energyAnnualRaw,
      auditLineItems: auditItems,
      warnings: Array.from(new Set(cycleWarnings)).sort((a, b) => a.localeCompare(b)),
    };
  })();

  const demandUsdRaw = cycleModel.used
    ? (cycleModel as any).demandUsdRaw
    : (() => {
        // Demand savings (warnings-first): reduce billed demand (kW) with cap from dispatch peak reduction and battery power.
        if (demandRate === null) return null;
        if (billingDemandKw === null) return null;
        if (peakReduction === null || powerKw === null) return null;
        const reducKw = Math.max(0, Math.min(powerKw, peakReduction, billingDemandKw));
        const postUnfloored = Math.max(0, billingDemandKw - reducKw);
        const post = ratchetDemandKw === null ? postUnfloored : Math.max(ratchetDemandKw, postUnfloored);
        const actualReduc = Math.max(0, billingDemandKw - post);
        return actualReduc * demandRate * 12;
      })();

  const energyUsdRaw = cycleModel.used
    ? (cycleModel as any).energyUsdRaw
    : (() => {
        // Energy arbitrage savings (warnings-first): use TOU windows when present; otherwise fall back to on/off proxy.
        const peak = touPeak !== null ? touPeak : priceOn;
        const off = touOff !== null ? touOff : priceOff;
        if (shiftedKwhAnnual === null) return null;
        if (peak === null || off === null) return null;
        if (rte === null || !(rte > 0 && rte <= 1)) return null;
        const netPerKwh = peak - off * (1 / rte);
        return Math.max(0, shiftedKwhAnnual * netPerKwh);
      })();

  if (cycleModel.used) {
    warnings.push(...((cycleModel as any).warnings || []));
    audit.push(...((cycleModel as any).auditLineItems || []));
  } else {
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
        rateSource,
        quantities: [
          qty('baselineDemandKw', 'kW', billingDemandKw),
          qty('postDemandKw', 'kW', billingDemandKw === null ? null : Math.max(0, billingDemandKw - Math.max(0, Math.min(powerKw ?? 0, peakReduction ?? 0, billingDemandKw)))),
          qty('demandRate', '$/kW-month', demandRate),
        ],
      }),
    );

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
            ? touPricesGeneration.length
              ? 'inputs.tariffs.generationTouEnergyPrices'
              : 'inputs.tariffs.touEnergyPrices'
            : priceOn !== null && priceOff !== null
              ? 'inputs.tariffs.energyPrices'
              : 'inputs.tariffs',
        snapshotId,
        rateSource: energyRateSource,
        quantities: [
          qty('shiftedKwhAnnual', 'kWh', shiftedKwhAnnual),
          qty('peakPricePerKwh', '$/kWh', touPeak ?? priceOn),
          qty('offPricePerKwh', '$/kWh', touOff ?? priceOff),
          qty('rte', 'fraction', rte),
        ],
      }),
    );
  }

  // Ratchet (lite): only when determinants provides ratchet method + history (warnings-first).
  // Note: when cycle model is used, demand savings already applies a ratchet floor (when known); avoid double-counting.
  const ratchetUsdRaw = cycleModel.used
    ? null
    : (() => {
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
      rateSource,
      quantities: [
        qty('demandRate', '$/kW-month', demandRate),
        qty('ratchetHistoryMaxKw', 'kW', safeNum((det as any)?.ratchetHistoryMaxKw)),
        qty('ratchetFloorPct', 'fraction', safeNum((det as any)?.ratchetFloorPct)),
      ],
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

