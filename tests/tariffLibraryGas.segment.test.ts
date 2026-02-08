import { describe, it, expect } from 'vitest';

import { applyGasTariffSegmentV0 } from '../src/modules/tariffLibraryGas/segmentV0';

describe('tariffLibraryGas: segmentV0', () => {
  it('derives sectorGroup + flags from customerClass deterministically', () => {
    const res = applyGasTariffSegmentV0({
      utility: 'SOCALGAS',
      rateCode: 'GR',
      customerClass: 'residential',
      customerClassSource: 'parsed',
      sourceUrl: 'https://example.com/gr',
      lastVerifiedAt: '2026-02-08T00:00:00.000Z',
    } as any);

    expect(res.customerSegment).toBe('residential');
    expect(res.sectorGroup).toBe('residential');
    expect(res.isResidential).toBe(true);
    expect(res.isNonResidential).toBe(false);
    expect(res.segmentSource).toBe('parsed');
  });
});

