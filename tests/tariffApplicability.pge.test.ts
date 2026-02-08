import { describe, expect, test } from 'vitest';

import { evaluateTariffApplicabilityV1 } from '../src/modules/tariffApplicability/evaluateTariffApplicability';

describe('tariffApplicability: evaluateTariffApplicabilityV1 (PG&E v1)', () => {
  test('returns unknown + missingInfo when required determinants are absent', () => {
    const out = evaluateTariffApplicabilityV1({
      utility: 'PGE',
      rateCode: 'B-19',
      billingRecords: null,
      intervalKwSeries: [],
    });

    expect(out.status).toBe('unknown');
    expect(out.missingInfo.length).toBeGreaterThan(0);
    expect(out.missingInfo.some((m) => String(m.id).includes('demand'))).toBe(true);
  });

  test('happy path: B-19 applicable when max demand meets threshold', () => {
    const out = evaluateTariffApplicabilityV1({
      utility: 'PGE',
      rateCode: 'B-19',
      billingRecords: [{ maxMaxDemandKw: 650 } as any],
      intervalKwSeries: [],
      supplyType: 'bundled',
    });

    expect(out.status).toBe('applicable');
    expect(out.determinants.maxDemandKwObserved).toBeCloseTo(650, 6);
    expect(out.because.join(' ')).toMatch(/meets threshold/i);
  });

  test('B-19 not_applicable when demand below threshold', () => {
    const out = evaluateTariffApplicabilityV1({
      utility: 'PGE',
      rateCode: 'B-19',
      billingRecords: [{ maxMaxDemandKw: 120 } as any],
      intervalKwSeries: [],
      supplyType: 'bundled',
    });

    expect(out.status).toBe('not_applicable');
    expect(out.because.join(' ')).toMatch(/below threshold/i);
  });

  test('storage/variant rate codes degrade safely to unknown with blocking missingInfo', () => {
    const out = evaluateTariffApplicabilityV1({
      utility: 'PGE',
      rateCode: 'HB19S',
      billingRecords: [{ maxMaxDemandKw: 650 } as any],
      intervalKwSeries: [],
    });

    expect(out.status).toBe('unknown');
    expect(out.missingInfo.some((m) => m.severity === 'blocking')).toBe(true);
    expect(out.because.join(' ')).toMatch(/storage/i);
  });
});

