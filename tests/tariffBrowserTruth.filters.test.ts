import { describe, it, expect } from 'vitest';

import { filterTariffRatesForDisplayVNext } from '../src/pages/tariffBrowserTruth';

describe('Tariff Browser truth helpers: non-residential-first filters', () => {
  it('defaults to business-only + featured tier', () => {
    const rates = [
      { rateCode: 'A-10', customerSegment: 'residential', popularityTier: 'all', curationHidden: true, isEverWattCanonicalBusiness: false },
      { rateCode: 'B-19', customerSegment: 'commercial', popularityTier: 'featured', curationHidden: false, isEverWattCanonicalBusiness: true },
      { rateCode: 'E-19', customerSegment: 'commercial', popularityTier: 'common', curationHidden: false, isEverWattCanonicalBusiness: true },
      { rateCode: 'X-1', customerSegment: 'unknown', popularityTier: 'featured', curationHidden: false, isEverWattCanonicalBusiness: false },
    ];
    const out = filterTariffRatesForDisplayVNext({
      rates,
      businessOnly: true,
      includeResidential: false,
      includeUnknownSegment: false,
      sectors: ['commercial', 'industrial', 'agricultural', 'institutional', 'government'],
      tier: 'featured',
      includeHidden: false,
    });
    expect(out.map((r) => r.rateCode)).toEqual(['B-19']);
  });

  it('allows includeResidential + includeHidden to surface hidden residential', () => {
    const rates = [
      { rateCode: 'A-10', customerSegment: 'residential', popularityTier: 'all', curationHidden: true, isEverWattCanonicalBusiness: false },
      { rateCode: 'B-19', customerSegment: 'commercial', popularityTier: 'featured', curationHidden: false, isEverWattCanonicalBusiness: true },
    ];
    const out = filterTariffRatesForDisplayVNext({
      rates,
      businessOnly: false,
      includeResidential: true,
      includeUnknownSegment: false,
      sectors: ['commercial', 'industrial', 'agricultural', 'institutional', 'government', 'residential'],
      tier: 'all',
      includeHidden: true,
      canonOnly: false,
    });
    expect(out.map((r) => r.rateCode).sort()).toEqual(['A-10', 'B-19']);
  });

  it('supports sector allowlist within non-residential', () => {
    const rates = [
      { rateCode: 'B-19', customerSegment: 'commercial', popularityTier: 'featured', curationHidden: false, isEverWattCanonicalBusiness: true },
      { rateCode: 'I-1', customerSegment: 'industrial', popularityTier: 'featured', curationHidden: false, isEverWattCanonicalBusiness: true },
    ];
    const out = filterTariffRatesForDisplayVNext({
      rates,
      businessOnly: true,
      includeResidential: false,
      includeUnknownSegment: false,
      sectors: ['industrial'],
      tier: 'featured',
      includeHidden: false,
    });
    expect(out.map((r) => r.rateCode)).toEqual(['I-1']);
  });
});

