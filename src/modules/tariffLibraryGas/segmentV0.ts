import type { GasTariffRateMetadata } from './types';

export function applyGasTariffSegmentV0(rate: GasTariffRateMetadata): GasTariffRateMetadata {
  const out: GasTariffRateMetadata = { ...(rate as any) };
  const evidence = Array.isArray(out.evidence) ? out.evidence.slice() : [];

  const cc = String(out.customerClass || '').trim().toLowerCase();
  const fromCustomerClass = (() => {
    if (!cc || cc === 'unknown') return null;
    if (cc === 'residential') return { seg: 'residential', src: out.customerClassSource || 'unknown' };
    if (cc === 'commercial') return { seg: 'commercial', src: out.customerClassSource || 'unknown' };
    if (cc === 'industrial') return { seg: 'industrial', src: out.customerClassSource || 'unknown' };
    if (cc === 'agricultural') return { seg: 'agricultural', src: out.customerClassSource || 'unknown' };
    if (cc === 'institutional') return { seg: 'institutional', src: out.customerClassSource || 'unknown' };
    if (cc === 'government') return { seg: 'government', src: out.customerClassSource || 'unknown' };
    if (cc === 'public_sector') {
      evidence.push({
        kind: 'meta',
        fieldName: 'customerSegment',
        inferenceRuleId: 'normalize.customerClass.public_sector->government',
        matchedText: 'public_sector',
        value: 'segment:government',
        sourceUrl: out.sourceUrl,
      });
      return { seg: 'government', src: 'inferred' as const };
    }
    return { seg: 'other', src: out.customerClassSource || 'unknown' };
  })();

  if (fromCustomerClass) {
    out.customerSegment = fromCustomerClass.seg as any;
    out.customerSegmentSource = fromCustomerClass.src as any;
    out.segmentSource = fromCustomerClass.src as any;
  } else {
    // Gas rate codes vary widely; avoid aggressive inference.
    out.customerSegment = 'unknown';
    out.customerSegmentSource = 'unknown';
    out.segmentSource = 'unknown';
  }

  const seg = out.customerSegment || 'unknown';
  out.sectorGroup = seg === 'residential' ? 'residential' : seg === 'unknown' ? 'unknown' : 'non_residential';
  out.isResidential = out.sectorGroup === 'residential';
  out.isNonResidential = out.sectorGroup === 'non_residential';

  out.evidence = evidence;
  return out;
}

