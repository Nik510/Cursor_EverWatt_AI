import type { TariffEvidenceV0, TariffRateMetadata } from './types';

function clean(s: unknown): string {
  return String(s ?? '').trim();
}

function normRateCode(raw: string): string {
  const s = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  const m = /^([A-Z]{1,3})-?(\d{1,3})([A-Z]?)$/.exec(s);
  if (m) return `${m[1]}-${m[2]}${m[3] || ''}`;
  return s;
}

function segmentFromCustomerClass(ccRaw: string): TariffRateMetadata['customerSegment'] {
  const cc = String(ccRaw || '').toLowerCase().trim();
  if (!cc || cc === 'unknown') return 'unknown';
  if (cc === 'residential') return 'residential';
  if (cc === 'commercial') return 'commercial';
  if (cc === 'industrial') return 'industrial';
  if (cc === 'agricultural') return 'agricultural';
  if (cc === 'institutional') return 'institutional';
  if (cc === 'government') return 'government';
  // Historical v0 label from enrichment heuristics.
  if (cc === 'public_sector') return 'government';
  return 'other';
}

function inferSegmentFromRateCode(rateCodeRaw: string): { segment: TariffRateMetadata['customerSegment']; ruleId: string } | null {
  const rc = normRateCode(rateCodeRaw);
  const prefix = rc.split('-')[0] || '';
  if (prefix === 'A') return { segment: 'residential', ruleId: 'infer.segment.rateCodePrefix.A-*' };
  if (prefix === 'B') return { segment: 'commercial', ruleId: 'infer.segment.rateCodePrefix.B-*' };
  if (prefix === 'E') return { segment: 'commercial', ruleId: 'infer.segment.rateCodePrefix.E-*' };
  if (prefix === 'AG') return { segment: 'agricultural', ruleId: 'infer.segment.rateCodePrefix.AG-*' };
  if (prefix === 'I') return { segment: 'industrial', ruleId: 'infer.segment.rateCodePrefix.I-*' };
  return null;
}

export function applyTariffSegmentV1(rate: TariffRateMetadata): TariffRateMetadata {
  const r: TariffRateMetadata = { ...(rate as any) };
  const evidence: TariffEvidenceV0[] = Array.isArray(r.evidence) ? r.evidence.slice() : [];

  const cc = clean(r.customerClass);
  const segFromCc = segmentFromCustomerClass(cc);
  if (segFromCc !== 'unknown') {
    r.customerSegment = segFromCc;
    // If customerClass was a non-canonical legacy token (e.g., public_sector), record a rule-id mapping evidence.
    if (String(cc || '').toLowerCase().trim() === 'public_sector') {
      evidence.push({
        kind: 'meta',
        fieldName: 'customerSegment',
        inferenceRuleId: 'normalize.customerClass.public_sector->government',
        matchedText: 'public_sector',
        value: `segment:${segFromCc}`,
        sourceUrl: r.sourceUrl,
      });
      r.customerSegmentSource = 'inferred';
      r.segmentSource = 'inferred';
    } else {
      r.customerSegmentSource = (r.customerClassSource as any) || 'unknown';
      r.segmentSource = (r.customerClassSource as any) || 'unknown';
    }
  } else {
    const inf = inferSegmentFromRateCode(r.rateCode);
    if (inf) {
      r.customerSegment = inf.segment;
      r.customerSegmentSource = 'inferred';
      r.segmentSource = 'inferred';
      evidence.push({
        kind: 'meta',
        fieldName: 'customerSegment',
        inferenceRuleId: inf.ruleId,
        matchedText: normRateCode(r.rateCode),
        value: `segment:${inf.segment}`,
        sourceUrl: r.sourceUrl,
      });
    } else {
      r.customerSegment = 'unknown';
      r.customerSegmentSource = 'unknown';
      r.segmentSource = 'unknown';
    }
  }

  // Sector-group derivation (non-residential-first UX).
  const seg = r.customerSegment || 'unknown';
  r.sectorGroup = seg === 'residential' ? 'residential' : seg === 'unknown' ? 'unknown' : 'non_residential';
  r.isResidential = r.sectorGroup === 'residential';
  r.isNonResidential = r.sectorGroup === 'non_residential';
  // Keep existing “business relevant” behavior for canon business workflows.
  r.isBusinessRelevant = seg === 'commercial' || seg === 'industrial' || seg === 'agricultural';

  r.evidence = evidence;
  return r;
}

