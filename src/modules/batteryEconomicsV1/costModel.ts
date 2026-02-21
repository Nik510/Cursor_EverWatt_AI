import { roundTo, safeNum, sumFixedOrder } from './helpers';
import { BatteryEconomicsReasonCodesV1 } from './reasons';
import type { BatteryEconomicsAssumptionV1, BatteryEconomicsAuditLineItemV1, BatteryEconomicsBatteryV1, BatteryEconomicsCostsV1 } from './types';
import { defaultBatteryCostsV1 } from './defaults';

export type CostModelResultV1 = {
  capex: {
    totalUsd: number | null;
    batteryEquipmentUsd: number | null;
    installUsd: number | null;
    interconnectUsd: number | null;
    softCostsUsd: number | null;
    contingencyUsd: number | null;
    assumptions: BatteryEconomicsAssumptionV1[];
  };
  opexAnnual: {
    omUsd: number | null;
    warrantyReserveUsd: number | null;
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

export function runCostModelV1(args: {
  battery: BatteryEconomicsBatteryV1 | null;
  costs: BatteryEconomicsCostsV1 | null;
}): CostModelResultV1 {
  const warnings: string[] = [];
  const assumptions: BatteryEconomicsAssumptionV1[] = [];
  const audit: BatteryEconomicsAuditLineItemV1[] = [];

  const battery = args.battery || null;
  const powerKw = safeNum(battery?.powerKw);
  const energyKwh = safeNum(battery?.energyKwh);
  const hasSizing = powerKw !== null && powerKw > 0 && energyKwh !== null && energyKwh > 0;

  const costsIn = args.costs || null;
  const usingDefaults = !costsIn;
  if (usingDefaults) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_MISSING_CAPEX_INPUTS, BatteryEconomicsReasonCodesV1.BATTERY_ECON_CAPEX_DEFAULTS_USED);

  const c = { ...defaultBatteryCostsV1, ...(costsIn || {}) } as Required<BatteryEconomicsCostsV1>;

  assumptions.push(mkAssumption({ id: 'costs.batteryCostPerKwhUsd', value: String(c.batteryCostPerKwhUsd), sourcePath: usingDefaults ? 'defaults.batteryCostPerKwhUsd' : 'inputs.costs.batteryCostPerKwhUsd' }));
  assumptions.push(mkAssumption({ id: 'costs.batteryCostPerKwUsd', value: String(c.batteryCostPerKwUsd), sourcePath: usingDefaults ? 'defaults.batteryCostPerKwUsd' : 'inputs.costs.batteryCostPerKwUsd' }));
  assumptions.push(mkAssumption({ id: 'costs.installAdderPct', value: String(c.installAdderPct), sourcePath: usingDefaults ? 'defaults.installAdderPct' : 'inputs.costs.installAdderPct' }));
  assumptions.push(mkAssumption({ id: 'costs.interconnectFlatUsd', value: String(c.interconnectFlatUsd), sourcePath: usingDefaults ? 'defaults.interconnectFlatUsd' : 'inputs.costs.interconnectFlatUsd' }));
  assumptions.push(mkAssumption({ id: 'costs.softCostsFlatUsd', value: String(c.softCostsFlatUsd), sourcePath: usingDefaults ? 'defaults.softCostsFlatUsd' : 'inputs.costs.softCostsFlatUsd' }));
  assumptions.push(mkAssumption({ id: 'costs.contingencyPct', value: String(c.contingencyPct), sourcePath: usingDefaults ? 'defaults.contingencyPct' : 'inputs.costs.contingencyPct' }));
  assumptions.push(mkAssumption({ id: 'costs.omPerKwYrUsd', value: String(c.omPerKwYrUsd), sourcePath: usingDefaults ? 'defaults.omPerKwYrUsd' : 'inputs.costs.omPerKwYrUsd' }));
  assumptions.push(
    mkAssumption({
      id: 'costs.warrantyReservePctOfCapexPerYear',
      value: String(c.warrantyReservePctOfCapexPerYear),
      sourcePath: usingDefaults ? 'defaults.warrantyReservePctOfCapexPerYear' : 'inputs.costs.warrantyReservePctOfCapexPerYear',
    }),
  );

  const batteryEquipmentUsdRaw = hasSizing ? powerKw! * c.batteryCostPerKwUsd + energyKwh! * c.batteryCostPerKwhUsd : null;
  if (hasSizing) {
    audit.push(
      mkLineItem({
        id: 'capex.batteryEquipment',
        label: 'Battery equipment (power + energy components)',
        amountUsdRaw: batteryEquipmentUsdRaw,
        basis: `${powerKw}kW*${c.batteryCostPerKwUsd} + ${energyKwh}kWh*${c.batteryCostPerKwhUsd}`,
        sourcePath: usingDefaults ? 'defaults.costs' : 'inputs.costs',
      }),
    );
  }

  const installUsdRaw = batteryEquipmentUsdRaw === null ? null : batteryEquipmentUsdRaw * c.installAdderPct;
  audit.push(mkLineItem({ id: 'capex.install', label: 'Install adder', amountUsdRaw: installUsdRaw, basis: `${c.installAdderPct} * batteryEquipment`, sourcePath: usingDefaults ? 'defaults.installAdderPct' : 'inputs.costs.installAdderPct' }));

  const interconnectUsdRaw = hasSizing ? c.interconnectFlatUsd : null;
  audit.push(mkLineItem({ id: 'capex.interconnect', label: 'Interconnection / electrical', amountUsdRaw: interconnectUsdRaw, basis: `flat`, sourcePath: usingDefaults ? 'defaults.interconnectFlatUsd' : 'inputs.costs.interconnectFlatUsd' }));

  const softCostsUsdRaw = hasSizing ? c.softCostsFlatUsd : null;
  audit.push(mkLineItem({ id: 'capex.softCosts', label: 'Soft costs (engineering, PM, permitting)', amountUsdRaw: softCostsUsdRaw, basis: `flat`, sourcePath: usingDefaults ? 'defaults.softCostsFlatUsd' : 'inputs.costs.softCostsFlatUsd' }));

  const subTotal = sumFixedOrder([batteryEquipmentUsdRaw, installUsdRaw, interconnectUsdRaw, softCostsUsdRaw]);
  const contingencyUsdRaw = subTotal === null ? null : subTotal * c.contingencyPct;
  audit.push(mkLineItem({ id: 'capex.contingency', label: 'Contingency', amountUsdRaw: contingencyUsdRaw, basis: `${c.contingencyPct} * subtotal`, sourcePath: usingDefaults ? 'defaults.contingencyPct' : 'inputs.costs.contingencyPct' }));

  const totalUsdRaw = sumFixedOrder([subTotal, contingencyUsdRaw]);
  audit.push(mkLineItem({ id: 'capex.total', label: 'Total CAPEX', amountUsdRaw: totalUsdRaw, basis: `sum`, sourcePath: 'costModelV1' }));

  const omUsdRaw = hasSizing ? powerKw! * c.omPerKwYrUsd : null;
  audit.push(mkLineItem({ id: 'opex.omAnnual', label: 'O&M (annual)', amountUsdRaw: omUsdRaw, basis: `${powerKw ?? '—'}kW*${c.omPerKwYrUsd}/kW-yr`, sourcePath: usingDefaults ? 'defaults.omPerKwYrUsd' : 'inputs.costs.omPerKwYrUsd' }));

  const warrantyReserveUsdRaw = totalUsdRaw === null ? null : totalUsdRaw * c.warrantyReservePctOfCapexPerYear;
  audit.push(
    mkLineItem({
      id: 'opex.warrantyReserveAnnual',
      label: 'Warranty reserve (annual)',
      amountUsdRaw: warrantyReserveUsdRaw,
      basis: `${c.warrantyReservePctOfCapexPerYear} * capexTotal`,
      sourcePath: usingDefaults ? 'defaults.warrantyReservePctOfCapexPerYear' : 'inputs.costs.warrantyReservePctOfCapexPerYear',
    }),
  );

  const opexTotalRaw = sumFixedOrder([omUsdRaw, warrantyReserveUsdRaw]);
  audit.push(mkLineItem({ id: 'opex.totalAnnual', label: 'Total OPEX (annual)', amountUsdRaw: opexTotalRaw, basis: `sum`, sourcePath: 'costModelV1' }));

  return {
    capex: {
      totalUsd: totalUsdRaw === null ? null : roundTo(totalUsdRaw, 2),
      batteryEquipmentUsd: batteryEquipmentUsdRaw === null ? null : roundTo(batteryEquipmentUsdRaw, 2),
      installUsd: installUsdRaw === null ? null : roundTo(installUsdRaw, 2),
      interconnectUsd: interconnectUsdRaw === null ? null : roundTo(interconnectUsdRaw, 2),
      softCostsUsd: softCostsUsdRaw === null ? null : roundTo(softCostsUsdRaw, 2),
      contingencyUsd: contingencyUsdRaw === null ? null : roundTo(contingencyUsdRaw, 2),
      assumptions,
    },
    opexAnnual: {
      omUsd: omUsdRaw === null ? null : roundTo(omUsdRaw, 2),
      warrantyReserveUsd: warrantyReserveUsdRaw === null ? null : roundTo(warrantyReserveUsdRaw, 2),
      totalUsd: opexTotalRaw === null ? null : roundTo(opexTotalRaw, 2),
      assumptions: [],
    },
    auditLineItems: audit,
    warnings,
  };
}

