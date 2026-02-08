import { describe, it, expect } from 'vitest';

import { applyTariffBusinessCanonV1 } from '../src/modules/tariffLibrary/businessCanonV1';
import { applyTariffEffectiveStatusV1 } from '../src/modules/tariffLibrary/effectiveStatusV1';

describe('tariffLibrary: business canon + effectiveStatus', () => {
  it('classifies PG&E business families deterministically with evidence', () => {
    const b19 = applyTariffBusinessCanonV1({ utility: 'PGE', rateCode: 'B-19A', sourceUrl: 'https://example.com/b19', lastVerifiedAt: '2026-02-08T00:00:00.000Z' } as any);
    const a10 = applyTariffBusinessCanonV1({ utility: 'PGE', rateCode: 'A-10', sourceUrl: 'https://example.com/a10', lastVerifiedAt: '2026-02-08T00:00:00.000Z' } as any);

    expect(b19.isEverWattCanonicalBusiness).toBe(true);
    expect(b19.businessFamilyKey).toBe('PGE_B19_FAMILY');
    expect((b19.evidence || []).some((e: any) => e.fieldName === 'businessFamilyKey' && e.inferenceRuleId)).toBe(true);

    expect(a10.isEverWattCanonicalBusiness).toBe(false);
    expect(a10.businessFamilyKey).toBeNull();
  });

  it('derives effectiveStatus truthfully without guessing', () => {
    const unknown = applyTariffEffectiveStatusV1({ utility: 'PGE', rateCode: 'B-19', sourceUrl: 'x', lastVerifiedAt: '2026-02-08T00:00:00.000Z' } as any);
    expect(unknown.effectiveStatus).toBe('UNKNOWN');

    const hints = applyTariffEffectiveStatusV1({
      utility: 'PGE',
      rateCode: 'B-19',
      sourceUrl: 'x',
      lastVerifiedAt: '2026-02-08T00:00:00.000Z',
      effectiveStart: '2025-01-01',
      effectiveSource: 'pdf',
    } as any);
    expect(hints.effectiveStatus).toBe('HAS_HINTS');

    const explicit = applyTariffEffectiveStatusV1({
      utility: 'PGE',
      rateCode: 'B-19',
      sourceUrl: 'x',
      lastVerifiedAt: '2026-02-08T00:00:00.000Z',
      effectiveStart: '2025-01-01',
      effectiveEnd: '2026-01-01',
      effectiveSource: 'explicit',
    } as any);
    expect(explicit.effectiveStatus).toBe('EXPLICIT_RANGE');
  });
});

