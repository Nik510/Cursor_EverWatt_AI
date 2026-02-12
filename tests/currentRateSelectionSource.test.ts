import { describe, expect, it, vi } from 'vitest';
import path from 'node:path';

vi.mock('../src/modules/utilityIntelligence/billPdf/extractBillPdfTariffHintsV1', () => {
  return {
    extractBillPdfTariffHintsV1: vi.fn(),
  };
});
vi.mock('../src/modules/tariffLibrary/storage', () => {
  return {
    loadLatestSnapshot: vi.fn(),
  };
});
vi.mock('../src/modules/tariffLibrary/matching/matchBillTariffToLibraryV1', () => {
  return {
    matchBillTariffToLibraryV1: vi.fn(),
  };
});

describe('currentRate resolution + selectionSource', () => {
  it('prioritizes tariffOverrideV1 over all else', async () => {
    const { resolveCurrentRateSelectionV1 } = await import('../src/modules/utilityIntelligence/currentRate/resolveCurrentRateSelectionV1');

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
      },
    });

    expect(out.currentRateSelectionSource).toBe('USER_OVERRIDE');
    expect(out.currentRate).toEqual({ utility: 'PGE', rateCode: 'B-19', effectiveDate: undefined });
  });

  it('uses BILL_MATCH (EXACT/NORMALIZED resolved) over DEFAULT', async () => {
    const { extractBillPdfTariffHintsV1 } = await import('../src/modules/utilityIntelligence/billPdf/extractBillPdfTariffHintsV1');
    const { loadLatestSnapshot } = await import('../src/modules/tariffLibrary/storage');
    const { matchBillTariffToLibraryV1 } = await import('../src/modules/tariffLibrary/matching/matchBillTariffToLibraryV1');

    vi.mocked(extractBillPdfTariffHintsV1).mockReturnValue({
      utilityHint: 'PG&E',
      rateScheduleText: 'B-19',
      evidence: { source: 'bill_pdf', matchedText: [] },
      warnings: [],
    });
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
        evidence: { source: 'bill_pdf', rateScheduleText: 'B-19', normalizedWanted: 'B-19', normalizedMatched: 'B-19' },
        sourceUrl: 'u',
        sourceTitle: 't',
      },
    } as any);

    const { resolveCurrentRateSelectionV1 } = await import('../src/modules/utilityIntelligence/currentRate/resolveCurrentRateSelectionV1');
    const out = await resolveCurrentRateSelectionV1({
      demo: false,
      territory: 'PGE',
      customerRateCode: 'A-1',
      billPdfText: 'whatever',
      tariffOverrideV1: null,
    });

    expect(out.currentRateSelectionSource).toBe('BILL_MATCH');
    expect(out.currentRate?.utility).toBe('PGE');
    expect(out.currentRate?.rateCode).toBe('B-19');
  });

  it('falls back to DEFAULT when bill match cannot resolve', async () => {
    const { extractBillPdfTariffHintsV1 } = await import('../src/modules/utilityIntelligence/billPdf/extractBillPdfTariffHintsV1');
    const { loadLatestSnapshot } = await import('../src/modules/tariffLibrary/storage');
    const { matchBillTariffToLibraryV1 } = await import('../src/modules/tariffLibrary/matching/matchBillTariffToLibraryV1');

    vi.mocked(extractBillPdfTariffHintsV1).mockReturnValue({
      utilityHint: 'PG&E',
      rateScheduleText: 'B-19',
      evidence: { source: 'bill_pdf', matchedText: [] },
      warnings: [],
    });
    vi.mocked(loadLatestSnapshot).mockResolvedValue(null);
    vi.mocked(matchBillTariffToLibraryV1).mockReturnValue({ warnings: ['BILL_TARIFF_MATCH_NEEDS_SNAPSHOT_SELECTION'] } as any);

    const { resolveCurrentRateSelectionV1 } = await import('../src/modules/utilityIntelligence/currentRate/resolveCurrentRateSelectionV1');
    const out = await resolveCurrentRateSelectionV1({
      demo: false,
      territory: 'PGE',
      customerRateCode: 'A-1',
      billPdfText: 'whatever',
      tariffOverrideV1: null,
    });

    expect(out.currentRateSelectionSource).toBe('DEFAULT');
    expect(out.currentRate).toEqual({ utility: 'PGE', rateCode: 'A-1', effectiveDate: undefined });
  });

  it('echoes currentRateSelectionSource in workflow.utility.inputs', async () => {
    const { loadBatteryLibraryV1 } = await import('../src/modules/batteryLibrary/loadLibrary');
    const { runUtilityWorkflow } = await import('../src/modules/workflows/runUtilityWorkflow');
    const libPath = path.join(process.cwd(), 'samples', 'battery_library_fixture.json');
    const lib = await loadBatteryLibraryV1(libPath);

    const workflow = await runUtilityWorkflow({
      inputs: {
        orgId: 'user:test',
        projectId: 'proj:test',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        currentRate: { utility: 'PGE', rateCode: 'PGE_SIM_B19_LIKE' },
        currentRateSelectionSource: 'DEFAULT',
      },
      intervalKwSeries: [{ timestampIso: '2026-01-05T00:00:00.000Z', kw: 10 }],
      batteryLibrary: lib.library.items,
      nowIso: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      idFactory: () => 'id1',
    });

    expect((workflow as any)?.utility?.inputs?.currentRateSelectionSource).toBe('DEFAULT');
    expect((workflow as any)?.utility?.inputs?.currentRate?.rateCode).toBe('PGE_SIM_B19_LIKE');
  });
});

