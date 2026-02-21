import { roundTo, safeNum } from '../helpers';
import type { BatteryEconomicsAuditLineItemV1, BatteryEconomicsItcOutputsV0, BatteryEconomicsTaxInputsV0 } from '../types';

export const TaxItcReasonCodesV0 = {
  TAX_ITC_V0_DEFAULT_PCT_USED: 'tax.itc.v0.default_pct_used',
} as const;

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

export function calcItcV0(args: {
  taxInputsV0: BatteryEconomicsTaxInputsV0 | null | undefined;
  capexTotalUsd: number | null;
}): { itcV0: BatteryEconomicsItcOutputsV0 | null; year0CashflowUsd: number; auditLineItems: BatteryEconomicsAuditLineItemV1[] } {
  const in0 = args.taxInputsV0;
  if (!in0 || !in0.applyItc) return { itcV0: null, year0CashflowUsd: 0, auditLineItems: [] };

  const warnings: string[] = [];

  const itcPctUsed = (() => {
    const x = numOrNull(in0.itcPct);
    if (x === null) {
      warnings.push(TaxItcReasonCodesV0.TAX_ITC_V0_DEFAULT_PCT_USED);
      return 0.3;
    }
    return Math.max(0, Math.min(1, x));
  })();

  const itcBasisReductionPctUsed = (() => {
    const x = numOrNull(in0.itcBasisReductionPct);
    if (x === null) return 0.5;
    return Math.max(0, Math.min(1, x));
  })();

  const itcUsdRaw = (() => {
    const capex = numOrNull(args.capexTotalUsd);
    if (capex === null) return null;
    return Math.max(0, capex) * itcPctUsed;
  })();

  const out: BatteryEconomicsItcOutputsV0 = {
    itcUsd: itcUsdRaw === null ? null : roundTo(itcUsdRaw, 2),
    itcPctUsed: roundTo(itcPctUsed, 6),
    itcBasisReductionPctUsed: roundTo(itcBasisReductionPctUsed, 6),
    warnings: warnings.sort((a, b) => a.localeCompare(b)),
  };

  const li = mkLineItem({
    id: 'tax.itc.v0',
    label: 'Federal ITC (v0)',
    amountUsdRaw: itcUsdRaw,
    basis: itcUsdRaw === null ? 'unavailable' : `itcUsd = capexTotalUsd * itcPctUsed`,
    sourcePath: in0.itcPct != null ? 'inputs.taxInputsV0.itcPct' : 'defaults.itcPct',
    quantities: [qty('capexTotalUsd', '$', safeNum(args.capexTotalUsd)), qty('itcPctUsed', 'fraction', itcPctUsed)],
  });

  return { itcV0: out, year0CashflowUsd: itcUsdRaw === null ? 0 : itcUsdRaw, auditLineItems: [li] };
}

