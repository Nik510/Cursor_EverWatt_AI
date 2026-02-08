import type { TariffEvidenceV0, TariffRateMetadata } from './types';

function clean(s: unknown): string {
  return String(s ?? '').trim();
}

export function applyTariffEffectiveStatusV1(rate: TariffRateMetadata): TariffRateMetadata {
  const r: TariffRateMetadata = { ...(rate as any) };
  const evidence: TariffEvidenceV0[] = Array.isArray(r.evidence) ? r.evidence.slice() : [];

  const hasStart = Boolean(clean(r.effectiveStart));
  const hasEnd = Boolean(clean(r.effectiveEnd));
  const src = String((r as any).effectiveSource || 'unknown').toLowerCase();

  if (!hasStart && !hasEnd) r.effectiveStatus = 'UNKNOWN';
  else if (src === 'explicit' && hasStart && hasEnd) r.effectiveStatus = 'EXPLICIT_RANGE';
  else r.effectiveStatus = 'HAS_HINTS';

  // Derived-from-existing-fields evidence (no additional claims).
  evidence.push({
    kind: 'meta',
    sourceUrl: r.sourceUrl,
    fieldName: 'effectiveStatus',
    inferenceRuleId: 'derive.effectiveStatus.v1',
    matchedText: `effectiveSource:${src}`,
    value: r.effectiveStatus,
  });
  r.evidence = evidence;
  return r;
}

