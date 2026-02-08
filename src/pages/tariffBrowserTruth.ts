import type { UtilityRegistryItemV1 } from '../shared/api/utilities';

import { getPgeRulebookHintsV1 } from '../modules/tariffLibrary/enrichment/pgeRulebookV1';

export type WhyMissingReasonCodeV1 =
  | 'RULEBOOK_MISS'
  | 'NO_PDF_LINK'
  | 'PDF_NO_HINTS'
  | 'PARSE_NO_MATCH'
  | 'NOT_SUPPORTED_FOR_UTILITY'
  | 'UNKNOWN';

export function getTariffAcquisitionMethodForCommodityV1(
  u: UtilityRegistryItemV1 | null | undefined,
  commodity?: 'electric' | 'gas' | null
): string {
  const c = commodity === 'gas' ? 'GAS' : commodity === 'electric' ? 'ELECTRIC' : null;
  const by = (u as any)?.tariffAcquisitionByCommodity;
  if (c && by && typeof by === 'object') {
    const v = String((by as any)?.[c] || '').trim();
    if (v) return v;
  }
  return String((u as any)?.tariffAcquisitionMethod || '').trim();
}

export function shouldShowManualIngestBannerV1(u: UtilityRegistryItemV1 | null | undefined, commodity?: 'electric' | 'gas' | null): boolean {
  const m = String(getTariffAcquisitionMethodForCommodityV1(u, commodity) || '').toUpperCase();
  return m.startsWith('MANUAL') || m === 'UNKNOWN';
}

export function deriveWhyMissingReasonCodesV1(args: {
  rate: any;
  utility?: UtilityRegistryItemV1 | null;
  commodity?: 'electric' | 'gas' | null;
}): Array<{ field: 'customerClass' | 'voltage' | 'eligibilityNotes' | 'effective'; codes: WhyMissingReasonCodeV1[] }> {
  const rate = args.rate || {};
  const u = args.utility || null;
  const method = String(getTariffAcquisitionMethodForCommodityV1(u as any, args.commodity) || '').toUpperCase();
  const utilityKey = String(rate?.utility || u?.utilityKey || '').toUpperCase();
  const rateCode = String(rate?.rateCode || '').trim().toUpperCase();
  const url = String(rate?.sourceUrl || '').trim();
  const isPdf = url.toLowerCase().endsWith('.pdf');
  const ev = Array.isArray(rate?.evidence) ? rate.evidence : [];

  function hasPdfEvidence(fieldName: string): boolean {
    return ev.some((e: any) => String(e?.kind) === 'pdf' && String(e?.fieldName) === String(fieldName) && String(e?.snippetHash || '').trim());
  }

  function isMissingValue(v: any): boolean {
    const s = String(v ?? '').trim().toLowerCase();
    return !s || s === 'unknown';
  }

  function codesFor(field: 'customerClass' | 'voltage' | 'eligibilityNotes' | 'effective'): WhyMissingReasonCodeV1[] {
    const codes: WhyMissingReasonCodeV1[] = [];
    if (method.startsWith('MANUAL') || method === 'UNKNOWN') codes.push('NOT_SUPPORTED_FOR_UTILITY');

    if (!isPdf) codes.push('NO_PDF_LINK');
    else if (!hasPdfEvidence(field)) codes.push('PDF_NO_HINTS');

    if (utilityKey === 'PGE') {
      const hints = getPgeRulebookHintsV1(rateCode);
      if (!hints) codes.push('RULEBOOK_MISS');
    }

    if (!codes.length) codes.push('UNKNOWN');
    return Array.from(new Set(codes));
  }

  const out: Array<{ field: any; codes: WhyMissingReasonCodeV1[] }> = [];
  if (isMissingValue(rate?.customerClass)) out.push({ field: 'customerClass', codes: codesFor('customerClass') });
  if (isMissingValue(rate?.voltage)) out.push({ field: 'voltage', codes: codesFor('voltage') });
  if (isMissingValue(rate?.eligibilityNotes)) out.push({ field: 'eligibilityNotes', codes: codesFor('eligibilityNotes') });
  const hasEff = String(rate?.effectiveStart || '').trim() || String(rate?.effectiveEnd || '').trim();
  if (!hasEff) out.push({ field: 'effective', codes: codesFor('effective') });
  return out;
}

export function formatUtilityCardAsOfV1(capturedAt: unknown): string {
  const s = String(capturedAt || '').trim();
  return s || '—';
}

export function formatUtilityCardLastChangeV1(args: { previousVersionTag?: unknown; lastChangeDetected?: unknown }): string {
  const mode = String(args.lastChangeDetected || '').trim();
  const prev = String(args.previousVersionTag || '').trim();
  if (mode === 'NO_CHANGES_VS_PREVIOUS' && prev) return `No changes vs previous (${prev})`;
  if (mode === 'CHANGED_VS_PREVIOUS' && prev) return `Changed vs previous (${prev})`;
  if (mode === 'UNKNOWN') return 'Last change: unknown';
  return prev ? `Last change: ${prev}` : 'Last change: —';
}

export function filterTariffRatesForDisplayVNext(args: {
  rates: any[];
  businessOnly: boolean;
  includeResidential: boolean;
  includeUnknownSegment: boolean;
  /**
   * Optional customerSegment allowlist (lowercase internal values).
   * Applies after sectorGroup filtering.
   */
  sectors?: string[];
  tier: 'featured' | 'common' | 'all';
  includeHidden: boolean;
  canonOnly?: boolean;
}): any[] {
  // Non-residential-first defaults:
  // - when businessOnly=true (UI label: “Non-residential only”), show only sectorGroup=non_residential
  // - when businessOnly=false, always include non_residential, and allow widening to residential/unknown via toggles
  const allowedSectorGroups = new Set<string>(['non_residential']);
  const incRes = args.businessOnly ? false : args.includeResidential;
  // "Non-residential only" should still be able to include UNKNOWN when explicitly selected.
  const incUnknown = args.includeUnknownSegment;
  if (incRes) allowedSectorGroups.add('residential');
  if (incUnknown) allowedSectorGroups.add('unknown');
  const canonOnly = args.canonOnly !== false;

  return (args.rates || [])
    .filter((r) => (args.includeHidden ? true : !Boolean((r as any).curationHidden)))
    .filter((r) => (canonOnly ? Boolean((r as any).isEverWattCanonicalBusiness) : true))
    .filter((r) => {
      const t = String((r as any).popularityTier || 'all');
      if (args.tier === 'all') return true;
      if (args.tier === 'common') return t === 'featured' || t === 'common';
      return t === 'featured';
    })
    .filter((r) => {
      const sg = String((r as any).sectorGroup || '').trim();
      if (sg) return allowedSectorGroups.has(sg);
      const seg = String((r as any).customerSegment || 'unknown');
      const derived = seg === 'residential' ? 'residential' : seg === 'unknown' ? 'unknown' : 'non_residential';
      return allowedSectorGroups.has(derived);
    })
    .filter((r) => {
      if (!Array.isArray(args.sectors) || args.sectors.length === 0) return true;
      const seg = String((r as any).customerSegment || 'unknown').trim().toLowerCase() || 'unknown';
      return args.sectors.includes(seg);
    });
}

