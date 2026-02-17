import { pvaf, roundTo } from './helpers';
import { BatteryEconomicsReasonCodesV1 } from './reasons';
import type { BatteryEconomicsAuditLineItemV1, BatteryEconomicsAssumptionV1, BatteryEconomicsFinanceV1 } from './types';
import { defaultFinanceV1 } from './defaults';

export type FinanceModelResultV1 = {
  cashflow: {
    year0Usd: number | null;
    years1toNUsd: number[];
    npvUsd: number | null;
    irrApprox: null;
    simplePaybackYears: number | null;
    discountedPaybackYears: number | null;
  };
  assumptions: BatteryEconomicsAssumptionV1[];
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

export function runFinanceModelV1(args: {
  capexTotalUsd: number | null;
  annualSavingsTotalUsd: number | null;
  annualOpexTotalUsd: number | null;
  finance: BatteryEconomicsFinanceV1 | null;
}): FinanceModelResultV1 {
  const warnings: string[] = [];
  const assumptions: BatteryEconomicsAssumptionV1[] = [];
  const audit: BatteryEconomicsAuditLineItemV1[] = [];

  const financeIn = args.finance || null;
  const f = { ...defaultFinanceV1, ...(financeIn || {}) } as Required<BatteryEconomicsFinanceV1>;

  if (financeIn?.debtApr != null || financeIn?.debtTermMonths != null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_FINANCE_DEBT_PLACEHOLDER);
  if (financeIn?.itcPct != null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_ITC_FLAG_ONLY);
  if (financeIn?.depreciationMethod) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_FINANCE_DEPRECIATION_FLAG_ONLY);

  if (financeIn?.discountRate == null) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_FINANCE_MISSING_DISCOUNT_RATE);

  const termYears = Number.isFinite(Number(f.termYears)) ? Math.max(1, Math.floor(Number(f.termYears))) : 10;
  const discountRate = Number.isFinite(Number(f.discountRate)) ? Math.max(0, Number(f.discountRate)) : defaultFinanceV1.discountRate;

  assumptions.push(mkAssumption({ id: 'finance.termYears', value: String(termYears), sourcePath: financeIn?.termYears != null ? 'inputs.finance.termYears' : 'defaults.termYears' }));
  assumptions.push(mkAssumption({ id: 'finance.discountRate', value: String(discountRate), sourcePath: financeIn?.discountRate != null ? 'inputs.finance.discountRate' : 'defaults.discountRate' }));

  const netAnnual = (() => {
    const s = Number(args.annualSavingsTotalUsd);
    const o = Number(args.annualOpexTotalUsd);
    if (!Number.isFinite(s) || !Number.isFinite(o)) return null;
    return s - o;
  })();

  const year0Raw = args.capexTotalUsd === null ? null : -Number(args.capexTotalUsd);
  const years: number[] = [];
  if (netAnnual !== null) {
    for (let i = 0; i < termYears; i++) years.push(roundTo(netAnnual, 2));
  }

  const npvRaw = (() => {
    if (year0Raw === null || netAnnual === null) return null;
    const a = pvaf(discountRate, termYears);
    if (a === null) return null;
    return year0Raw + netAnnual * a;
  })();

  const simplePayback = (() => {
    const capex = Number(args.capexTotalUsd);
    if (!Number.isFinite(capex) || capex <= 0) return null;
    if (netAnnual === null || !(netAnnual > 0)) return null;
    return capex / netAnnual;
  })();
  if (netAnnual !== null && !(netAnnual > 0)) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_NET_SAVINGS_NON_POSITIVE);

  const discountedPayback = (() => {
    const capex = Number(args.capexTotalUsd);
    if (!Number.isFinite(capex) || capex <= 0) return null;
    if (netAnnual === null || !(netAnnual > 0)) return null;
    let cum = 0;
    for (let y = 1; y <= termYears; y++) {
      const df = (1 + discountRate) ** y;
      cum += netAnnual / df;
      if (cum >= capex) return y;
    }
    return null;
  })();

  audit.push(mkLineItem({ id: 'finance.year0', label: 'Year 0 cashflow (CAPEX)', amountUsdRaw: year0Raw, basis: `-capexTotal`, sourcePath: 'financeModelV1.year0' }));
  audit.push(mkLineItem({ id: 'finance.netAnnual', label: 'Net annual cashflow (savings - opex)', amountUsdRaw: netAnnual, basis: `annualSavingsTotal - annualOpexTotal`, sourcePath: 'financeModelV1.netAnnual' }));
  audit.push(mkLineItem({ id: 'finance.npv', label: 'NPV (lite)', amountUsdRaw: npvRaw, basis: `year0 + netAnnual * PVAF(discountRate,termYears)`, sourcePath: 'financeModelV1.npv' }));

  return {
    cashflow: {
      year0Usd: year0Raw === null ? null : roundTo(year0Raw, 2),
      years1toNUsd: years,
      npvUsd: npvRaw === null ? null : roundTo(npvRaw, 2),
      irrApprox: null,
      simplePaybackYears: simplePayback === null ? null : roundTo(simplePayback, 6),
      discountedPaybackYears: discountedPayback === null ? null : roundTo(discountedPayback, 6),
    },
    assumptions,
    auditLineItems: audit,
    warnings,
  };
}

