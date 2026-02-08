import { describe, expect, test } from 'vitest';

import { computeTariffMetadataCompletenessV0 } from '../src/modules/tariffLibrary/completeness';

describe('tariffLibrary completeness', () => {
  test('computes completeness percentages deterministically', () => {
    const rates: any[] = [
      { rateCode: 'A-1', customerClass: 'residential', voltage: 'secondary', eligibilityNotes: 'x', effectiveStart: '2025-01-01' },
      { rateCode: 'B-19', customerClass: 'unknown', voltage: 'unknown', eligibilityNotes: '', effectiveStart: null },
    ];
    const c = computeTariffMetadataCompletenessV0(rates as any);
    expect(c.customerClassPct).toBeCloseTo(0.5, 6);
    expect(c.voltagePct).toBeCloseTo(0.5, 6);
    expect(c.effectiveDatePct).toBeCloseTo(0.5, 6);
    expect(c.eligibilityNotesPct).toBeCloseTo(0.5, 6);
  });

  test('gives partial credit for inferred fields when configured', () => {
    const rates: any[] = [
      { rateCode: 'X-1', customerClass: 'commercial', customerClassSource: 'inferred', voltage: 'unknown', voltageSource: 'unknown', eligibilityNotes: '', eligibilitySource: 'unknown', effectiveStart: null, effectiveEnd: null, effectiveSource: 'unknown' },
      { rateCode: 'X-2', customerClass: 'commercial', customerClassSource: 'explicit', voltage: 'secondary', voltageSource: 'explicit', eligibilityNotes: 'foo', eligibilitySource: 'explicit', effectiveStart: '2026-01-01', effectiveEnd: null, effectiveSource: 'explicit' },
    ];
    const c = computeTariffMetadataCompletenessV0(rates as any, { inferredCredit: 0.5 });
    expect(c.customerClassPct).toBeCloseTo((0.5 + 1) / 2, 6);
  });
});

