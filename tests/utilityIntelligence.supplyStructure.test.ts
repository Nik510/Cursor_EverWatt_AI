import { describe, expect, it } from 'vitest';
import { analyzeSupplyStructure } from '../src/modules/utilityIntelligence/supply/analyzeSupplyStructure';
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
    serviceProvider: 'PG&E',
    totalBillAmountPge: 1000,
    chargesPerKwh: 0.2,
    pgeRevenueAmount: 900,
    espTotalRevenueAmount: 0,
    taxAmount: 100,
    totalBillAmount: 1000,
    onPeakKwh: 100,
    partialPeakKwh: 100,
    offPeakKwh: 300,
    superOffPeakKwh: 0,
    totalUsageKwh: 500,
    totalUsageTherms: 0,
    hours: 720,
    maxMaxDemandKw: 120,
    onPeakDemandKw: 80,
    partialPeakDemandKw: 60,
    offPeakDemandKw: 40,
    superOffPeakDemandKw: 0,
    rawRow: {},
    ...overrides,
  };
}

describe('utilityIntelligence supply structure', () => {
  it('detects CCA when provider is a known CCA name even if ESP revenue is 0', () => {
    const bill = makeBill({ serviceProvider: 'Peninsula Clean Energy', espTotalRevenueAmount: 0, pgeRevenueAmount: 1000 });
    const out = analyzeSupplyStructure({
      inputs: { orgId: 'o', projectId: 'p', serviceType: 'electric', utilityTerritory: 'PGE' },
      billingRecords: [bill],
    });
    expect(out?.supplyType).toBe('CCA');
    expect(out?.because.join(' ')).toMatch(/cca/i);
  });

  it('detects DA when espTotalRevenueAmount > 0 even if provider is PG&E', () => {
    const bill = makeBill({ serviceProvider: 'PG&E', espTotalRevenueAmount: 123.45, pgeRevenueAmount: 876.55 });
    const out = analyzeSupplyStructure({
      inputs: { orgId: 'o', projectId: 'p', serviceType: 'electric', utilityTerritory: 'PGE' },
      billingRecords: [bill],
    });
    expect(out?.supplyType).toBe('DA');
    expect(out?.because.join(' ')).toMatch(/esp.*> 0/i);
  });

  it('detects bundled PG&E when no ESP revenue and provider is PG&E', () => {
    const bill = makeBill({ serviceProvider: 'PG&E', espTotalRevenueAmount: 0 });
    const out = analyzeSupplyStructure({
      inputs: { orgId: 'o', projectId: 'p', serviceType: 'electric', utilityTerritory: 'PGE' },
      billingRecords: [bill],
    });
    expect(out?.supplyType).toBe('bundled');
    expect(out?.because.join(' ')).toMatch(/bundled/i);
  });

  it('returns unknown when no provider, no keywords, and revenues are missing/zero', () => {
    const bill = makeBill({ serviceProvider: '', espTotalRevenueAmount: 0, pgeRevenueAmount: 0, totalBillAmount: 0, totalBillAmountPge: 0 });
    const out = analyzeSupplyStructure({
      inputs: { orgId: 'o', projectId: 'p', serviceType: 'electric', utilityTerritory: 'PGE' },
      billingRecords: [bill],
      billPdfText: '',
    });
    expect(out?.supplyType).toBe('unknown');
    expect(out?.because.join(' ')).toMatch(/insufficient evidence/i);
  });
});

