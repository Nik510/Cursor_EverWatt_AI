import { describe, it, expect } from 'vitest';

import { applyTariffCurationV1 } from '../src/modules/policy/curation/loadTariffCurationV1';

describe('tariff curation overlay (v1)', () => {
  it('matches exact rateCode first, then prefix* patterns', () => {
    const items = [
      { utilityKey: 'PGE', rateCode: 'B-19*', tier: 'featured', hidden: false, preferredForEverWatt: true, tags: ['business'] },
      { utilityKey: 'PGE', rateCode: 'B-19', tier: 'common', hidden: true, notes: 'exact beats pattern' },
    ] as any[];

    const rates = [
      { utility: 'PGE', rateCode: 'B-19', sourceUrl: 'https://example.com', lastVerifiedAt: '2026-02-08T00:00:00.000Z' },
      { utility: 'PGE', rateCode: 'B-19A', sourceUrl: 'https://example.com', lastVerifiedAt: '2026-02-08T00:00:00.000Z' },
    ] as any[];

    const out = applyTariffCurationV1({ rates, items });
    const exact = out.find((r: any) => r.rateCode === 'B-19');
    const patterned = out.find((r: any) => r.rateCode === 'B-19A');

    expect(exact.popularityTier).toBe('common');
    expect(exact.curationHidden).toBe(true);
    expect(String(exact.curationNotes || '')).toContain('exact');
    expect(exact.popularitySource).toBe('OPERATOR_CURATED');

    expect(patterned.popularityTier).toBe('featured');
    expect(patterned.curationHidden).toBe(false);
    expect(patterned.preferredForEverWatt).toBe(true);
  });
});

