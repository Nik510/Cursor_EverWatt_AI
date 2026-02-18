import { roundTo, safeNum, sumFixedOrder } from '../helpers';
import type { BatteryEconomicsAuditLineItemV1, BatteryEconomicsMacrsOutputsV0, BatteryEconomicsTaxInputsV0 } from '../types';

export const TaxMacrsReasonCodesV0 = {
  TAX_MACRS_V0_TAX_RATE_MISSING: 'tax.macrs.v0.tax_rate_missing',
} as const;

const MACRS_PCTS_5YR = [0.2, 0.32, 0.192, 0.1152, 0.1152, 0.0576] as const;
const MACRS_PCTS_7YR = [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446] as const;

function numOrNull(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function qty(id: string, unit: string, value: number | null): { id: string; unit: string; value: number | null } {
  return { id: String(id), unit: String(unit), value: safeNum(value) };
}

function mkLineItem(args: {
  id: string;
  label: string;
  amountUsdRaw: number | null;
  basis: string;
  sourcePath: string;
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
    sourceEngine: 'assumption',
    sourcePath: String(args.sourcePath || ''),
    snapshotId: null,
    rateSource: null,
    quantities: Array.isArray(args.quantities) ? args.quantities : null,
    notes: args.notes ?? null,
  };
}

export function calcMacrsV0(args: {
  taxInputsV0: BatteryEconomicsTaxInputsV0 | null | undefined;
  capexTotalUsd: number | null;
  itcPctUsed: number | null;
  itcBasisReductionPctUsed: number | null;
}): {
  macrsV0: BatteryEconomicsMacrsOutputsV0 | null;
  cashflowBenefitByYearUsd: number[] | null;
  auditLineItems: BatteryEconomicsAuditLineItemV1[];
} {
  const in0 = args.taxInputsV0;
  if (!in0 || !in0.applyMacrs) return { macrsV0: null, cashflowBenefitByYearUsd: null, auditLineItems: [] };

  const warnings: string[] = [];
  const schedule = (in0.macrsSchedule || '5yr') === '7yr' ? ('7yr' as const) : ('5yr' as const);
  const pcts = schedule === '7yr' ? MACRS_PCTS_7YR : MACRS_PCTS_5YR;
  const deprScheduleYears = pcts.map((_, i) => i + 1);

  const capex = numOrNull(args.capexTotalUsd);
  const itcPct = numOrNull(args.itcPctUsed);
  const basisReduction = numOrNull(args.itcBasisReductionPctUsed);
  const taxRate = numOrNull(in0.taxRateCombined);

  const deprBasisUsd = (() => {
    if (capex === null) return null;
    if (itcPct === null || basisReduction === null) return Math.max(0, capex);
    return Math.max(0, capex) * (1 - Math.max(0, Math.min(1, itcPct)) * Math.max(0, Math.min(1, basisReduction)));
  })();

  if (taxRate === null) warnings.push(TaxMacrsReasonCodesV0.TAX_MACRS_V0_TAX_RATE_MISSING);

  const benefitByYear = (() => {
    if (taxRate === null) return null;
    if (deprBasisUsd === null) return null;
    return pcts.map((pct) => Math.max(0, deprBasisUsd) * pct * Math.max(0, Math.min(1, taxRate)));
  })();

  const out: BatteryEconomicsMacrsOutputsV0 = {
    deprScheduleYears,
    deprUsdByYear: benefitByYear ? benefitByYear.map((x) => roundTo(x, 2)) : null,
    warnings: warnings.sort((a, b) => a.localeCompare(b)),
  };

  const audit: BatteryEconomicsAuditLineItemV1[] = [];
  if (benefitByYear) {
    for (const [i, b] of benefitByYear.entries()) {
      const year = i + 1;
      audit.push(
        mkLineItem({
          id: `tax.macrs.v0.depr_benefit.year${year}`,
          label: `MACRS depreciation tax benefit (year ${year})`,
          amountUsdRaw: b,
          basis: `benefit = deprBasisUsd * pct[${year}] * taxRateCombined`,
          sourcePath: 'tax.macrs.v0',
          quantities: [
            qty('deprBasisUsd', '$', deprBasisUsd),
            qty('pct', 'fraction', pcts[i] ?? null),
            qty('taxRateCombined', 'fraction', taxRate),
          ],
          notes: `schedule=${schedule}`,
        }),
      );
    }
    audit.push(
      mkLineItem({
        id: 'tax.macrs.v0.depr_benefit',
        label: 'MACRS depreciation tax benefit (total)',
        amountUsdRaw: sumFixedOrder(benefitByYear) ?? 0,
        basis: 'sum of yearly benefits (fixed order)',
        sourcePath: 'tax.macrs.v0',
        quantities: [],
        notes: `schedule=${schedule}`,
      }),
    );
  }

  return { macrsV0: out, cashflowBenefitByYearUsd: benefitByYear, auditLineItems: audit };
}

