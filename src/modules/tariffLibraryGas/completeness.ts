import type { GasTariffRateMetadata } from './types';

export type GasTariffMetadataCompletenessV0 = {
  customerClassPct: number; // 0..1
  voltagePct: number; // 0..1
  effectiveDatePct: number; // 0..1
  eligibilityNotesPct: number; // 0..1
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function computeGasTariffMetadataCompletenessV0(
  rates: GasTariffRateMetadata[],
  opts?: { inferredCredit?: number; parsedCredit?: number; pdfCredit?: number; unknownCredit?: number },
): GasTariffMetadataCompletenessV0 {
  const items = Array.isArray(rates) ? rates : [];
  const n = items.length;
  if (!n) return { customerClassPct: 0, voltagePct: 0, effectiveDatePct: 0, eligibilityNotesPct: 0 };

  const inferredCredit = Number.isFinite(opts?.inferredCredit as any) ? Number(opts?.inferredCredit) : 0.5;
  const parsedCredit = Number.isFinite(opts?.parsedCredit as any) ? Number(opts?.parsedCredit) : 0.9;
  const pdfCredit = Number.isFinite(opts?.pdfCredit as any) ? Number(opts?.pdfCredit) : 0.7;
  const unknownCredit = Number.isFinite(opts?.unknownCredit as any) ? Number(opts?.unknownCredit) : 0;

  function creditForSource(src: unknown): number {
    const s = String(src || '').toLowerCase().trim();
    if (!s) return 1; // backwards-compat
    if (s === 'explicit') return 1;
    if (s === 'parsed') return parsedCredit;
    if (s === 'pdf') return pdfCredit;
    if (s === 'inferred') return inferredCredit;
    return unknownCredit;
  }

  const customerClassScore = items.reduce((s, r) => {
    const v = String((r as any).customerClass || '').trim();
    if (!v || v === 'unknown') return s + unknownCredit;
    return s + creditForSource((r as any).customerClassSource);
  }, 0);

  const voltageScore = items.reduce((s, r) => {
    const v = String((r as any).voltage || '').trim();
    if (!v || v === 'unknown') return s + unknownCredit;
    return s + creditForSource((r as any).voltageSource);
  }, 0);

  const effectiveScore = items.reduce((s, r) => {
    const has = String((r as any).effectiveStart || '').trim() || String((r as any).effectiveEnd || '').trim();
    if (!has) return s + unknownCredit;
    return s + creditForSource((r as any).effectiveSource);
  }, 0);

  const eligibilityScore = items.reduce((s, r) => {
    const v = String((r as any).eligibilityNotes || '').trim();
    if (!v) return s + unknownCredit;
    return s + creditForSource((r as any).eligibilitySource);
  }, 0);

  return {
    customerClassPct: clamp01(customerClassScore / n),
    voltagePct: clamp01(voltageScore / n),
    effectiveDatePct: clamp01(effectiveScore / n),
    eligibilityNotesPct: clamp01(eligibilityScore / n),
  };
}

