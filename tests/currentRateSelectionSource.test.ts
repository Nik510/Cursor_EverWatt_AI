import { afterEach, describe, expect, it, vi } from 'vitest';

describe('currentRate resolution + selectionSource', () => {
  afterEach(() => {
    vi.unmock('../src/modules/utilityIntelligence/billPdf/extractBillPdfTariffHintsV1');
    vi.unmock('../src/modules/tariffLibrary/storage');
    vi.unmock('../src/modules/tariffLibrary/matching/matchBillTariffToLibraryV1');
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('prioritizes tariffOverrideV1 over all else', async () => {
    vi.resetModules();

    const { resolveCurrentRateSelectionV1 } = await import(
      '../src/modules/utilityIntelligence/currentRate/resolveCurrentRateSelectionV1'
    );

    const out = await resolveCurrentRateSelectionV1({
      demo: false,
      territory: 'PGE',
      customerRateCode: 'A-1',
      billPdfText: 'Rate Schedule: B-19',
      tariffOverrideV1: {
        schemaVersion: 1,
        commodity: 'electric',
        utilityId: 'PGE',
        snapshotId: 'snap1',
        tariffIdOrRateCode: 'B-19',
        selectedBy: 'user',
        selectedAt: '2026-01-01T00:00:00.000Z',
        selectionSource: 'bill_pdf_match',
        matchType: 'EXACT',
      } as any,
    });

    expect(out.currentRateSelectionSource).toBe('USER_OVERRIDE');
    expect(out.currentRate).toEqual({ utility: 'PGE', rateCode: 'B-19', effectiveDate: undefined });
  });

  it('uses BILL_MATCH when bill match resolves a rate code', async () => {
    vi.resetModules();
    vi.doMock('../src/modules/utilityIntelligence/billPdf/extractBillPdfTariffHintsV1', () => ({
      extractBillPdfTariffHintsV1: vi.fn(),
    }));
    vi.doMock('../src/modules/tariffLibrary/storage', () => ({ loadLatestSnapshot: vi.fn() }));
    vi.doMock('../src/modules/tariffLibrary/matching/matchBillTariffToLibraryV1', () => ({
      matchBillTariffToLibraryV1: vi.fn(),
    }));

    const { extractBillPdfTariffHintsV1 } = await import('../src/modules/utilityIntelligence/billPdf/extractBillPdfTariffHintsV1');
    const { loadLatestSnapshot } = await import('../src/modules/tariffLibrary/storage');
    const { matchBillTariffToLibraryV1 } = await import('../src/modules/tariffLibrary/matching/matchBillTariffToLibraryV1');

    vi.mocked(extractBillPdfTariffHintsV1).mockReturnValue({
      utilityHint: 'PG&E',
      rateScheduleText: 'B-19',
      evidence: { source: 'bill_pdf', matchedText: [] },
      warnings: [],
    } as any);
    vi.mocked(loadLatestSnapshot).mockResolvedValue({
      utility: 'PGE',
      capturedAt: '2026-01-01T00:00:00.000Z',
      versionTag: 'v1',
      rates: [{ utility: 'PGE', rateCode: 'B-19', sourceUrl: 'u', lastVerifiedAt: '2026-01-01T00:00:00.000Z' }],
      sourceFingerprints: [],
    } as any);
    vi.mocked(matchBillTariffToLibraryV1).mockReturnValue({
      snapshotId: 'v1',
      snapshotCapturedAt: '2026-01-01T00:00:00.000Z',
      resolved: {
        rateCode: 'B-19',
        matchType: 'EXACT',
        evidence: {
          source: 'bill_pdf',
          rateScheduleText: 'B-19',
          normalizedWanted: 'B-19',
          normalizedMatched: 'B-19',
        },
        sourceUrl: 'u',
        sourceTitle: 't',
      },
    } as any);

    const { resolveCurrentRateSelectionV1 } = await import(
      '../src/modules/utilityIntelligence/currentRate/resolveCurrentRateSelectionV1'
    );
    const out = await resolveCurrentRateSelectionV1({
      demo: false,
      territory: 'PGE',
      customerRateCode: 'A-1',
      billPdfText: 'whatever',
      tariffOverrideV1: null as any,
    });

    expect(out.currentRateSelectionSource).toBe('BILL_MATCH');
    expect(out.currentRate?.utility).toBe('PGE');
    expect(out.currentRate?.rateCode).toBe('B-19');
  });

  it('falls back to DEFAULT when bill match cannot resolve', async () => {
    vi.resetModules();
    vi.doMock('../src/modules/utilityIntelligence/billPdf/extractBillPdfTariffHintsV1', () => ({
      extractBillPdfTariffHintsV1: vi.fn(),
    }));
    vi.doMock('../src/modules/tariffLibrary/storage', () => ({ loadLatestSnapshot: vi.fn() }));
    vi.doMock('../src/modules/tariffLibrary/matching/matchBillTariffToLibraryV1', () => ({
      matchBillTariffToLibraryV1: vi.fn(),
    }));

    const { extractBillPdfTariffHintsV1 } = await import('../src/modules/utilityIntelligence/billPdf/extractBillPdfTariffHintsV1');
    const { loadLatestSnapshot } = await import('../src/modules/tariffLibrary/storage');
    const { matchBillTariffToLibraryV1 } = await import('../src/modules/tariffLibrary/matching/matchBillTariffToLibraryV1');

    vi.mocked(extractBillPdfTariffHintsV1).mockReturnValue({
      utilityHint: 'PG&E',
      rateScheduleText: 'B-19',
      evidence: { source: 'bill_pdf', matchedText: [] },
      warnings: [],
    } as any);
    vi.mocked(loadLatestSnapshot).mockResolvedValue(null);
    vi.mocked(matchBillTariffToLibraryV1).mockReturnValue({
      warnings: ['BILL_TARIFF_MATCH_NEEDS_SNAPSHOT_SELECTION'],
    } as any);

    const { resolveCurrentRateSelectionV1 } = await import(
      '../src/modules/utilityIntelligence/currentRate/resolveCurrentRateSelectionV1'
    );
    const out = await resolveCurrentRateSelectionV1({
      demo: false,
      territory: 'PGE',
      customerRateCode: 'A-1',
      billPdfText: 'whatever',
      tariffOverrideV1: null as any,
    });

    expect(out.currentRateSelectionSource).toBe('DEFAULT');
    expect(out.currentRate).toEqual({ utility: 'PGE', rateCode: 'A-1', effectiveDate: undefined });
  });
});

