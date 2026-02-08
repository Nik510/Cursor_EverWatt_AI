import { describe, it, expect } from 'vitest';

import { applyTariffSegmentV1 } from '../src/modules/tariffLibrary/segmentV1';
import { applyTariffReadinessVNext } from '../src/modules/tariffLibrary/readinessVNext';

describe('tariffLibrary: segmentV1 + readinessVNext', () => {
  it('classifies customerSegment deterministically from rateCode families (with evidence)', () => {
    const a10 = applyTariffSegmentV1({ utility: 'PGE', rateCode: 'A-10', sourceUrl: 'https://example.com/a10', lastVerifiedAt: '2026-02-08T00:00:00.000Z' } as any);
    const b19 = applyTariffSegmentV1({ utility: 'PGE', rateCode: 'B-19', sourceUrl: 'https://example.com/b19', lastVerifiedAt: '2026-02-08T00:00:00.000Z' } as any);
    const ag = applyTariffSegmentV1({ utility: 'PGE', rateCode: 'AG-5', sourceUrl: 'https://example.com/ag5', lastVerifiedAt: '2026-02-08T00:00:00.000Z' } as any);

    expect(a10.customerSegment).toBe('residential');
    expect(a10.customerSegmentSource).toBe('inferred');
    expect(a10.sectorGroup).toBe('residential');
    expect(a10.isResidential).toBe(true);
    expect(a10.isNonResidential).toBe(false);
    expect(Array.isArray(a10.evidence)).toBe(true);
    expect((a10.evidence || []).some((e: any) => e.fieldName === 'customerSegment' && String(e.inferenceRuleId || '').includes('rateCodePrefix.A'))).toBe(true);

    expect(b19.customerSegment).toBe('commercial');
    expect(b19.isBusinessRelevant).toBe(true);
    expect(b19.sectorGroup).toBe('non_residential');
    expect(b19.isNonResidential).toBe(true);
    expect(ag.customerSegment).toBe('agricultural');
    expect(ag.isBusinessRelevant).toBe(true);
    expect(ag.sectorGroup).toBe('non_residential');
  });

  it('adds readiness flags for common business families (with evidence)', () => {
    const b19 = applyTariffReadinessVNext(
      applyTariffSegmentV1({ utility: 'PGE', rateCode: 'B-19', sourceUrl: 'https://example.com/b19', lastVerifiedAt: '2026-02-08T00:00:00.000Z' } as any),
    );
    expect(b19.chargeDeterminantsVNext?.determinantsSource).toBe('inferred');
    expect(b19.chargeDeterminantsVNext?.hasDemandCharges).toBe(true);
    expect(b19.chargeDeterminantsVNext?.hasTouEnergy).toBe(true);
    expect(Array.isArray(b19.evidence)).toBe(true);
    expect((b19.evidence || []).some((e: any) => String(e.fieldName || '').includes('chargeDeterminantsVNext') && e.inferenceRuleId)).toBe(true);
  });
});

