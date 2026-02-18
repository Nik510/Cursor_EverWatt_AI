import type { CcaAddersSnapshotV0 } from './types';
import { CcaAddersLibraryReasonCodesV0, uniqSorted } from './reasons';

function safeNum(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function safeNonNegNum(x: unknown): number | null {
  const n = safeNum(x);
  if (n === null) return null;
  return n < 0 ? null : n;
}

function normalizeNumRecord(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== 'object') return null;
  const entries = Object.entries(raw as any).flatMap(([k, v]) => {
    const key = String(k || '').trim();
    const n = safeNonNegNum(v);
    return key && n !== null ? [[key, n] as const] : [];
  });
  return entries.length ? Object.fromEntries(entries) : null;
}

export function computeAddersPerKwhTotal(args: {
  snapshot: Pick<CcaAddersSnapshotV0, 'charges'> | null | undefined;
  pciaVintageKey?: string | null;
}): {
  addersPerKwhTotal: number;
  components: {
    pciaPerKwhApplied: number;
    nbcPerKwhTotal: number;
    indifferenceAdjustmentPerKwh: number;
    otherPerKwhTotal: number;
  };
  warnings: string[];
} {
  const warnings: string[] = [];
  const charges = (args.snapshot as any)?.charges && typeof (args.snapshot as any).charges === 'object' ? ((args.snapshot as any).charges as any) : null;
  const vintageKey = String(args.pciaVintageKey || '').trim() || null;

  if (!charges) {
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_COMPONENTS_MISSING);
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_PARTIAL);
    return {
      addersPerKwhTotal: 0,
      components: { pciaPerKwhApplied: 0, nbcPerKwhTotal: 0, indifferenceAdjustmentPerKwh: 0, otherPerKwhTotal: 0 },
      warnings: uniqSorted(warnings),
    };
  }

  const byVintage = normalizeNumRecord(charges.pciaPerKwhByVintageKey);
  const pciaDefault = safeNonNegNum(charges.pciaPerKwhDefault);

  const pciaPerKwhApplied = (() => {
    if (byVintage && Object.keys(byVintage).length) {
      if (vintageKey && Object.prototype.hasOwnProperty.call(byVintage, vintageKey)) return byVintage[vintageKey]!;
      warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_VINTAGE_UNKNOWN_DEFAULT_USED);
      if (pciaDefault !== null) return pciaDefault;
      warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_COMPONENTS_MISSING);
      warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_PARTIAL);
      return 0;
    }
    if (pciaDefault !== null) return pciaDefault;
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_COMPONENTS_MISSING);
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_PARTIAL);
    return 0;
  })();

  const nbcPerKwhTotal = (() => {
    const n = safeNonNegNum(charges.nbcPerKwhTotal);
    if (n !== null) return n;
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_COMPONENTS_MISSING);
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_PARTIAL);
    return 0;
  })();

  // Indifference adjustment can be positive or negative; treat missing as 0 with warnings.
  const indifferenceAdjustmentPerKwh = (() => {
    const n = safeNum(charges.indifferenceAdjustmentPerKwh);
    if (n !== null) return n;
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_COMPONENTS_MISSING);
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_PARTIAL);
    return 0;
  })();

  const otherPerKwhTotal = (() => {
    const n = safeNonNegNum(charges.otherPerKwhTotal);
    if (n !== null) return n;
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_COMPONENTS_MISSING);
    warnings.push(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_PARTIAL);
    return 0;
  })();

  const addersPerKwhTotal =
    Math.round((pciaPerKwhApplied + nbcPerKwhTotal + indifferenceAdjustmentPerKwh + otherPerKwhTotal) * 1e9) / 1e9;

  return {
    addersPerKwhTotal,
    components: { pciaPerKwhApplied, nbcPerKwhTotal, indifferenceAdjustmentPerKwh, otherPerKwhTotal },
    warnings: uniqSorted(warnings),
  };
}

