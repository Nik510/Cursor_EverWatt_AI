import { describe, expect, test } from 'vitest';

import { extractMaxDemandKw } from '../src/modules/tariffApplicability/demand';
import type { ComprehensiveBillRecord } from '../src/utils/utility-data-types';

describe('tariffApplicability: extractMaxDemandKw', () => {
  test('prefers billing record measured demand when available', () => {
    const billingRecords: ComprehensiveBillRecord[] = [
      {
        // only fields we use in this test
        maxMaxDemandKw: 123.4,
      } as any,
      {
        maxMaxDemandKw: 88.1,
      } as any,
    ];

    const out = extractMaxDemandKw(billingRecords, {
      intervalKw: [
        { timestampIso: '2026-01-01T00:00:00.000Z', kw: 999 },
        { timestampIso: '2026-01-01T01:00:00.000Z', kw: 1000 },
      ],
    });

    expect(out.source).toBe('billingRecords');
    expect(out.valueKw).toBeCloseTo(123.4, 6);
    expect(out.because.join(' ')).toMatch(/billing records/i);
  });

  test('computes demand from 15-min interval kWh when needed (kW = kWh * 4)', () => {
    const out = extractMaxDemandKw([], {
      intervalKwh: [
        { timestampIso: '2026-01-01T00:00:00.000Z', kwh: 2, resolutionMinutes: 15 }, // 8kW
        { timestampIso: '2026-01-01T00:15:00.000Z', kwh: 10, resolutionMinutes: 15 }, // 40kW
        { timestampIso: '2026-01-01T00:30:00.000Z', kwh: 1, resolutionMinutes: 15 }, // 4kW
      ],
    });

    expect(out.source).toBe('intervals');
    expect(out.valueKw).toBeCloseTo(40, 6);
    expect(out.because.join(' ')).toMatch(/kW\s*=\s*kWh/i);
  });

  test('computes demand from 30-min interval kWh when needed (kW = kWh * 2)', () => {
    const out = extractMaxDemandKw([], {
      intervalKwh: [
        { timestampIso: '2026-01-01T00:00:00.000Z', kwh: 10, resolutionMinutes: 30 }, // 20kW
        { timestampIso: '2026-01-01T00:30:00.000Z', kwh: 3, resolutionMinutes: 30 }, // 6kW
      ],
    });

    expect(out.source).toBe('intervals');
    expect(out.valueKw).toBeCloseTo(20, 6);
    expect(out.because.join(' ')).toMatch(/resolution=30min/i);
  });

  test('returns missingInfo when interval kWh resolution is unknown', () => {
    const out = extractMaxDemandKw([], {
      intervalKwh: [{ timestampIso: '2026-01-01T00:00:00.000Z', kwh: 10 }],
    });

    expect(out.valueKw).toBeNull();
    expect(out.source).toBe('unknown');
    expect(out.missingInfo.some((m) => String(m.id).includes('intervalResolution'))).toBe(true);
  });
});

