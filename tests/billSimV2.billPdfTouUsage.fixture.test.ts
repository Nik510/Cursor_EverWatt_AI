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
    meterNumber: 'MTR1',
    nem: false,
    saId: 'MTR1',
    spId: 'SP1',
    prsnId: 'P1',
    naicsCode: '541330',
    yearOfBillEndDate: 2026,
    billStartDate: new Date('2026-01-01T00:00:00.000Z'),
    billEndDate: new Date('2026-01-31T00:00:00.000Z'),
    billingDays: 30,
    rateCode: 'B-19',
    serviceProvider: 'PG&E',
    totalBillAmountPge: 650,
    chargesPerKwh: 0.2,
    pgeRevenueAmount: 650,
    espTotalRevenueAmount: 0,
    taxAmount: 0,
    totalBillAmount: 650,
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

function latestCycleMissingCount(workflow: any): number {
  const sim = workflow?.utility?.insights?.billSimV2;
  const m0 = Array.isArray(sim?.meters) && sim.meters.length ? sim.meters[0] : null;
  const cycles = m0 && Array.isArray(m0.cycles) ? m0.cycles : [];
  const latest = cycles.slice().sort((a: any, b: any) => String(b.cycleEndIso || '').localeCompare(String(a.cycleEndIso || '')))[0] || null;
  return Array.isArray(latest?.missingInfo) ? latest.missingInfo.length : 0;
}

function latestCycleHasMissingId(workflow: any, idPrefix: string): boolean {
  const sim = workflow?.utility?.insights?.billSimV2;
  const m0 = Array.isArray(sim?.meters) && sim.meters.length ? sim.meters[0] : null;
  const cycles = m0 && Array.isArray(m0.cycles) ? m0.cycles : [];
  const latest = cycles.slice().sort((a: any, b: any) => String(b.cycleEndIso || '').localeCompare(String(a.cycleEndIso || '')))[0] || null;
  const mi = Array.isArray(latest?.missingInfo) ? latest.missingInfo : [];
  return mi.some((x: any) => String(x?.id || '').startsWith(idPrefix));
}

function latestEnergyDollars(workflow: any): number | null {
  const sim = workflow?.utility?.insights?.billSimV2;
  const m0 = Array.isArray(sim?.meters) && sim.meters.length ? sim.meters[0] : null;
  const cycles = m0 && Array.isArray(m0.cycles) ? m0.cycles : [];
  const latest = cycles.slice().sort((a: any, b: any) => String(b.cycleEndIso || '').localeCompare(String(a.cycleEndIso || '')))[0] || null;
  const v = latest?.totals?.energyDollars;
  if (v === null || v === undefined) return null;
  return Number.isFinite(Number(v)) ? Number(v) : null;
}

describe('billSimV2 billPdf TOU extraction (fixture)', () => {
  it('explicit TOU kWh in billPdfText reduces billSimV2 missingInfo vs baseline', async () => {
    const libPath = path.join(process.cwd(), 'samples', 'battery_library_fixture.json');
    const lib = await loadBatteryLibraryV1(libPath);

    const billingRecords: ComprehensiveBillRecord[] = [makeBill({})];

    const baseline = await runUtilityWorkflow({
      inputs: {
        orgId: 'user:test',
        projectId: 'proj:test',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        currentRate: { utility: 'PGE', rateCode: 'B-19' },
        currentRateSelectionSource: 'DEFAULT',
        billingRecords,
        billPdfText: 'Bill End Date: 01/31/2026\nRate Schedule: B-19\nTotal kWh: 500',
      },
      batteryLibrary: lib.library.items,
      nowIso: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      idFactory: () => 'id1',
    });

    const improved = await runUtilityWorkflow({
      inputs: {
        orgId: 'user:test',
        projectId: 'proj:test',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        currentRate: { utility: 'PGE', rateCode: 'B-19' },
        currentRateSelectionSource: 'USER_OVERRIDE',
        tariffOverrideV1: {
          schemaVersion: 1,
          commodity: 'electric',
          utilityId: 'PGE',
          snapshotId: 'v1',
          tariffIdOrRateCode: 'B-19',
          selectedBy: 'user',
          selectedAt: '2026-01-01T00:00:00.000Z',
          selectionSource: 'bill_pdf_match',
          matchType: 'EXACT',
        },
        billingRecords,
        billPdfText: 'Bill End Date: 01/31/2026\nRate Schedule: B-19\nOn Peak kWh: 100\nOff Peak kWh: 400\nTotal kWh: 500',
      },
      batteryLibrary: lib.library.items,
      nowIso: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      idFactory: () => 'id1',
    });

    expect((baseline as any)?.utility?.insights?.billSimV2?.version).toBe('billSimV2.v1');
    expect((improved as any)?.utility?.insights?.billSimV2?.version).toBe('billSimV2.v1');

    expect(latestCycleHasMissingId(baseline as any, 'billSimV2.energy.kwhByTouPeriod.missing.')).toBe(true);
    expect(latestCycleHasMissingId(improved as any, 'billSimV2.energy.kwhByTouPeriod.missing.')).toBe(false);

    expect(latestCycleMissingCount(improved as any)).toBeLessThan(latestCycleMissingCount(baseline as any));

    // Baseline cannot compute TOU energy dollars deterministically; improved should.
    expect(latestEnergyDollars(baseline as any)).toBeNull();
    expect(latestEnergyDollars(improved as any)).not.toBeNull();
  });
});

