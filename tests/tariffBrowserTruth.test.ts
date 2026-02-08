import { describe, expect, test } from 'vitest';

import {
  deriveWhyMissingReasonCodesV1,
  formatUtilityCardLastChangeV1,
  getTariffAcquisitionMethodForCommodityV1,
  shouldShowManualIngestBannerV1,
} from '../src/pages/tariffBrowserTruth';

describe('tariffBrowserTruth', () => {
  test('manual ingest banner shown for MANUAL_* and UNKNOWN', () => {
    expect(shouldShowManualIngestBannerV1({ tariffAcquisitionMethod: 'MANUAL_PDF' } as any)).toBe(true);
    expect(shouldShowManualIngestBannerV1({ tariffAcquisitionMethod: 'UNKNOWN' } as any)).toBe(true);
    expect(shouldShowManualIngestBannerV1({ tariffAcquisitionMethod: 'AUTOMATED_HTML' } as any)).toBe(false);
  });

  test('manual ingest banner can be commodity-specific', () => {
    const u = { tariffAcquisitionMethod: 'AUTOMATED_HTML', tariffAcquisitionByCommodity: { GAS: 'MANUAL_GAS_V0', ELECTRIC: 'AUTOMATED_HTML' } } as any;
    expect(getTariffAcquisitionMethodForCommodityV1(u, 'electric')).toBe('AUTOMATED_HTML');
    expect(getTariffAcquisitionMethodForCommodityV1(u, 'gas')).toBe('MANUAL_GAS_V0');
    expect(shouldShowManualIngestBannerV1(u, 'electric')).toBe(false);
    expect(shouldShowManualIngestBannerV1(u, 'gas')).toBe(true);
  });

  test('why-missing returns deterministic reason codes', () => {
    const utility = { utilityKey: 'PGE', tariffAcquisitionMethod: 'AUTOMATED_HTML' } as any;
    const rate = { utility: 'PGE', rateCode: 'ZZ-1', sourceUrl: 'https://example.com/x.html', customerClass: 'unknown', voltage: 'unknown', eligibilityNotes: '', effectiveStart: null, effectiveEnd: null, evidence: [] };
    const out = deriveWhyMissingReasonCodesV1({ rate, utility });
    const cc = out.find((x) => x.field === 'customerClass');
    expect(cc?.codes.includes('NO_PDF_LINK')).toBe(true);
    expect(cc?.codes.includes('RULEBOOK_MISS')).toBe(true);
  });

  test('last-change formatter shows no-changes with previous tag', () => {
    const s = formatUtilityCardLastChangeV1({ previousVersionTag: '2026-02-01T0000Z', lastChangeDetected: 'NO_CHANGES_VS_PREVIOUS' });
    expect(s.toLowerCase()).toContain('no changes');
    expect(s).toContain('2026-02-01T0000Z');
  });
});

