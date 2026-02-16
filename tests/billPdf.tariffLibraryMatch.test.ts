import { describe, expect, it } from 'vitest';
import { matchBillTariffToLibraryV1 } from '../src/modules/tariffLibrary/matching/matchBillTariffToLibraryV1';

function makeSnapshot(rates: Array<{ rateCode: string }>) {
  return {
    versionTag: '2026-02-05T1200Z',
    capturedAt: '2026-02-05T12:00:00.000Z',
    rates: rates.map((r) => ({
      rateCode: r.rateCode,
      sourceUrl: `https://example.com/${encodeURIComponent(r.rateCode)}`,
      sourceTitle: `Rate ${r.rateCode}`,
    })),
  };
}

describe('matchBillTariffToLibraryV1', () => {
  it('resolves exact match for B-19', () => {
    const out = matchBillTariffToLibraryV1({
      utilityId: 'PGE',
      commodity: 'electric',
      rateScheduleText: 'B-19',
      snapshot: makeSnapshot([{ rateCode: 'B-19' }, { rateCode: 'B-20' }]),
    });
    expect(out.resolved).toBeTruthy();
    expect(out.resolved?.rateCode).toBe('B-19');
    expect(out.resolved?.matchType).toBe('EXACT');
    expect(out.candidates?.length || 0).toBe(0);
  });

  it('returns candidates + BILL_TARIFF_AMBIGUOUS when ambiguous', () => {
    const out = matchBillTariffToLibraryV1({
      utilityId: 'SCE',
      commodity: 'electric',
      rateScheduleText: 'TOU-GS',
      snapshot: makeSnapshot([{ rateCode: 'TOU-GS-2' }, { rateCode: 'TOU-GS-3' }, { rateCode: 'TOU-GS-1' }, { rateCode: 'B-19' }]),
    });
    expect(out.resolved).toBeUndefined();
    expect(out.warnings).toContain('BILL_TARIFF_AMBIGUOUS');
    expect(Array.isArray(out.candidates)).toBe(true);
    expect((out.candidates || []).length).toBeGreaterThanOrEqual(2);
    expect((out.candidates || []).length).toBeLessThanOrEqual(3);
  });

  it('returns BILL_TARIFF_NOT_FOUND_IN_LIBRARY when none found', () => {
    const out = matchBillTariffToLibraryV1({
      utilityId: 'PGE',
      commodity: 'electric',
      rateScheduleText: 'Z-999',
      snapshot: makeSnapshot([{ rateCode: 'B-19' }, { rateCode: 'B-20' }]),
    });
    expect(out.resolved).toBeUndefined();
    expect(out.warnings).toContain('BILL_TARIFF_NOT_FOUND_IN_LIBRARY');
    expect((out.candidates || []).length).toBe(0);
  });
});

