import { pvaf, roundTo, safeNum } from './helpers';
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

export function runFinanceModelV1(args: {
  capexTotalUsd: number | null;
  annualSavingsTotalUsd: number | null;
  annualOpexTotalUsd: number | null;
  finance: BatteryEconomicsFinanceV1 | null;
  /** Optional per-year total savings (length >= termYears) for v1.3+ degradation modeling. */
  annualSavingsByYearUsd?: number[] | null;
  /** Optional per-year extra cashflows (length >= termYears): depreciation benefits, augmentation capex, replacements, etc. */
  extraCashflowYears1toNUsd?: number[] | null;
  /** Optional year-0 extra cashflow: incentives, ITC, etc (positive benefit). */
  year0ExtraUsd?: number | null;
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

  const year0Extra = safeNum((args as any)?.year0ExtraUsd) ?? 0;
  const annualByYear = Array.isArray((args as any)?.annualSavingsByYearUsd) ? (((args as any).annualSavingsByYearUsd as any[]) || []) : [];
  const extraByYear = Array.isArray((args as any)?.extraCashflowYears1toNUsd) ? (((args as any).extraCashflowYears1toNUsd as any[]) || []) : [];
  const anyExtraNonZero = extraByYear.some((x) => {
    const n = safeNum(x);
    return n !== null && Math.abs(n) > 1e-9;
  });

  const usePerYear = Boolean(annualByYear.length || anyExtraNonZero || Math.abs(year0Extra) > 1e-9);

  const netAnnualBase = (() => {
    const s = safeNum(args.annualSavingsTotalUsd);
    const o = safeNum(args.annualOpexTotalUsd);
    if (s === null || o === null) return null;
    return s - o;
  })();

  if (!usePerYear) {
    const capex = safeNum(args.capexTotalUsd);
    const year0Raw = capex === null ? null : -Number(capex);
    const years: number[] = [];
    if (netAnnualBase !== null) {
      for (let i = 0; i < termYears; i++) years.push(roundTo(netAnnualBase, 2));
    }

    const npvRaw = (() => {
      if (year0Raw === null || netAnnualBase === null) return null;
      const a = pvaf(discountRate, termYears);
      if (a === null) return null;
      return year0Raw + netAnnualBase * a;
    })();

    const simplePayback = (() => {
      const c = Number(args.capexTotalUsd);
      if (!Number.isFinite(c) || c <= 0) return null;
      if (netAnnualBase === null || !(netAnnualBase > 0)) return null;
      return c / netAnnualBase;
    })();
    if (netAnnualBase !== null && !(netAnnualBase > 0)) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_NET_SAVINGS_NON_POSITIVE);

    const discountedPayback = (() => {
      const c = Number(args.capexTotalUsd);
      if (!Number.isFinite(c) || c <= 0) return null;
      if (netAnnualBase === null || !(netAnnualBase > 0)) return null;
      let cum = 0;
      for (let y = 1; y <= termYears; y++) {
        const df = (1 + discountRate) ** y;
        cum += netAnnualBase / df;
        if (cum >= c) return y;
      }
      return null;
    })();

    audit.push(mkLineItem({ id: 'finance.year0', label: 'Year 0 cashflow (CAPEX)', amountUsdRaw: year0Raw, basis: `-capexTotal`, sourcePath: 'financeModelV1.year0' }));
    audit.push(mkLineItem({ id: 'finance.netAnnual', label: 'Net annual cashflow (savings - opex)', amountUsdRaw: netAnnualBase, basis: `annualSavingsTotal - annualOpexTotal`, sourcePath: 'financeModelV1.netAnnual' }));
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

  // Per-year mode (v1.3+): incentives/tax + degradation schedule + capex events.
  const capex = safeNum(args.capexTotalUsd);
  const year0Raw = capex === null ? null : -Math.max(0, capex) + year0Extra;

  const years = (() => {
    const o = safeNum(args.annualOpexTotalUsd);
    const base = safeNum(args.annualSavingsTotalUsd);
    if (o === null) return [] as number[];
    if (base === null) return [] as number[];

    const out: number[] = [];
    for (let i = 0; i < termYears; i++) {
      const sYear = annualByYear.length ? safeNum(annualByYear[i]) : base;
      const xYear = extraByYear.length ? safeNum(extraByYear[i]) ?? 0 : 0;
      if (sYear === null) return [] as number[];
      const net = sYear - o + xYear;
      if (!Number.isFinite(net)) return [] as number[];
      out.push(roundTo(net, 2));
    }
    return out;
  })();

  const netAnnualYear1 = years.length ? safeNum(years[0]) : netAnnualBase;

  const npvRaw = (() => {
    if (year0Raw === null) return null;
    if (!years.length) return null;
    let npv = year0Raw;
    for (let y = 1; y <= termYears; y++) {
      const cf = safeNum(years[y - 1]);
      if (cf === null) return null;
      npv += cf / (1 + discountRate) ** y;
    }
    return npv;
  })();

  const simplePayback = (() => {
    if (year0Raw === null) return null;
    if (!years.length) return null;
    // Payback is time until cumulative cashflow crosses >= 0 (fractional year supported).
    let cum = year0Raw;
    if (cum >= 0) return 0;
    for (let y = 1; y <= termYears; y++) {
      const cf = safeNum(years[y - 1]);
      if (cf === null) return null;
      const prev = cum;
      cum += cf;
      if (cum >= 0 && cf > 0) {
        const frac = (0 - prev) / cf;
        return roundTo((y - 1) + Math.max(0, Math.min(1, frac)), 6);
      }
    }
    return null;
  })();

  if (netAnnualYear1 !== null && !(netAnnualYear1 > 0)) warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_ECON_NET_SAVINGS_NON_POSITIVE);

  const discountedPayback = (() => {
    if (year0Raw === null) return null;
    if (!years.length) return null;
    let cum = year0Raw;
    if (cum >= 0) return 0;
    for (let y = 1; y <= termYears; y++) {
      const cf = safeNum(years[y - 1]);
      if (cf === null) return null;
      const disc = cf / (1 + discountRate) ** y;
      const prev = cum;
      cum += disc;
      if (cum >= 0 && disc > 0) {
        const frac = (0 - prev) / disc;
        return roundTo((y - 1) + Math.max(0, Math.min(1, frac)), 6);
      }
    }
    return null;
  })();

  audit.push(
    mkLineItem({
      id: 'finance.year0',
      label: 'Year 0 cashflow (CAPEX + incentives/tax)',
      amountUsdRaw: year0Raw,
      basis: year0Raw === null ? 'unavailable' : `-capexTotal + year0ExtraUsd`,
      sourcePath: 'financeModelV1.year0',
      quantities: [
        { id: 'capexTotalUsd', unit: '$', value: capex },
        { id: 'year0ExtraUsd', unit: '$', value: safeNum(year0Extra) },
      ],
    }),
  );
  audit.push(
    mkLineItem({
      id: 'finance.netAnnual',
      label: 'Net annual cashflow (year 1)',
      amountUsdRaw: netAnnualYear1,
      basis: `year1Savings - annualOpex + year1Extras`,
      sourcePath: 'financeModelV1.netAnnualYear1',
    }),
  );
  audit.push(
    mkLineItem({
      id: 'finance.npv',
      label: 'NPV (lite)',
      amountUsdRaw: npvRaw,
      basis: `year0 + Σ(yearCashflow/(1+r)^year)`,
      sourcePath: 'financeModelV1.npv',
    }),
  );

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

