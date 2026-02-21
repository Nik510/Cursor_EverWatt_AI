import { describe, expect, it } from 'vitest';
import path from 'node:path';

import { loadBatteryLibraryV1 } from '../src/modules/batteryLibrary/loadLibrary';
import { runUtilityWorkflow } from '../src/modules/workflows/runUtilityWorkflow';
import type { ComprehensiveBillRecord } from '../src/utils/utility-data-types';

function makeBill(overrides: Partial<ComprehensiveBillRecord>): ComprehensiveBillRecord {
  return {
    billingName: 'Test',
    siteAddress: '123 Main',
    siteCity: 'Oakland',
    zipCode: '94612',
    saStatus: 'Active',
    activity: 'Office',
    descriptor: 'Test',
    accountNumber: 'ACC',
    meterNumber: 'MTR',
    nem: false,
    saId: 'SA1',
    spId: 'SP1',
    prsnId: 'P1',
    naicsCode: '541330',
    yearOfBillEndDate: 2026,
    billStartDate: new Date('2026-01-01'),
    billEndDate: new Date('2026-01-31'),
    billingDays: 30,
    rateCode: 'B-19',
    serviceProvider: 'CCA (Comm Choice Aggregation)',
    totalBillAmountPge: 650,
    chargesPerKwh: 0.2,
    pgeRevenueAmount: 650,
    espTotalRevenueAmount: 350,
    taxAmount: 0,
    totalBillAmount: 1000,
    onPeakKwh: 100,
    partialPeakKwh: 0,
    offPeakKwh: 400,
    superOffPeakKwh: 0,
    totalUsageKwh: 500,
    totalUsageTherms: 0,
    hours: 720,
    maxMaxDemandKw: 120,
    onPeakDemandKw: 80,
    partialPeakDemandKw: 0,
    offPeakDemandKw: 40,
    superOffPeakDemandKw: 0,
    rawRow: {},
    ...overrides,
  };
}

describe('analysis-results-v1 payload includes supplyStructure', () => {
  it('includes utility.insights.supplyStructure when billingRecords are provided', async () => {
    const libPath = path.join(process.cwd(), 'samples', 'battery_library_fixture.json');
    const lib = await loadBatteryLibraryV1(libPath);

    // Ensure this is detected as CCA (no ESP revenue required).
    const billingRecords: ComprehensiveBillRecord[] = [makeBill({ serviceProvider: 'Peninsula Clean Energy', espTotalRevenueAmount: 0 })];

    const workflow = await runUtilityWorkflow({
      inputs: {
        orgId: 'user:test',
        projectId: 'proj:test',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        currentRate: { utility: 'PGE', rateCode: 'PGE_SIM_B19_LIKE' },
        billingRecords,
      },
      intervalKwSeries: [{ timestampIso: '2026-01-05T00:00:00.000Z', kw: 10 }],
      batteryLibrary: lib.library.items,
      nowIso: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      idFactory: () => 'id1',
    });

    const supply = (workflow as any)?.utility?.insights?.supplyStructure;
    expect(supply).toBeTruthy();
    expect(supply.supplyType).toBe('CCA');
    expect(Array.isArray(supply.because)).toBe(true);

    // This is the same object the API returns under `workflow`, so it will be surfaced to the UI.
    const apiPayload = { success: true as const, project: { id: 'proj:test' }, workflow, summary: { json: {}, markdown: '' } };
    expect((apiPayload as any).workflow.utility.insights.supplyStructure.supplyType).toBe('CCA');

    // Additive: analysisTraceV1 is present and deterministically ordered.
    const trace = (workflow as any)?.analysisTraceV1;
    expect(trace).toBeTruthy();
    expect(trace.generatedAtIso).toBe(new Date('2026-01-01T00:00:00.000Z').toISOString());
    expect(Array.isArray(trace.ranModules)).toBe(true);
    expect(trace.ranModules.slice().sort()).toEqual(trace.ranModules);
    expect(Array.isArray(trace.skippedModules)).toBe(true);
    const skippedSorted = trace.skippedModules
      .slice()
      .sort((a: any, b: any) => String(a?.module || '').localeCompare(String(b?.module || '')) || String(a?.reasonCode || '').localeCompare(String(b?.reasonCode || '')));
    expect(skippedSorted).toEqual(trace.skippedModules);

    expect((trace as any)?.coverage?.supplyProviderType).toBe('CCA');
    expect((trace as any)?.warningsSummary?.topEngineWarningCodes?.length || 0).toBeLessThanOrEqual(10);
    expect((trace as any)?.warningsSummary?.topMissingInfoCodes?.length || 0).toBeLessThanOrEqual(10);
  });
});

