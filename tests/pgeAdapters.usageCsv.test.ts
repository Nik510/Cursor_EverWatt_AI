import { describe, expect, test } from 'vitest';

import { parsePgeUsageCsvV1 } from '../src/modules/determinants/adapters/pge/parsePgeUsageCsv';

describe('pgeAdapters: parsePgeUsageCsvV1', () => {
  test('parses monthly usage, TOU buckets, and money/commas robustly', () => {
    const csv = [
      'SA ID,Meter #,Account #,Service Provider,Rate,Bill End Date,Days,Total Usage (kWh),Max. Max Demand (kW),On Peak (kWh),Partial Peak (kWh),Off Peak Usage (kWh),Super Off Peak (kWh),On Peak (kW),Partial Peak (kW),Off Peak (kW),Super Off Peak (kW),PG&E Revenue Amount ($),ESP Total Revenue Amount ($),Tax Amount ($),Total Bill Amount ($)',
      '999,m1,acct1,PG&E,B-19,1/31/2026,31,"26,176",500,1000,2000,21000,2176,450,475,300,250,"$9,971.66",$0.00,$123.45,"$10,095.11"',
    ].join('\n');

    const out = parsePgeUsageCsvV1({ csvTextOrBuffer: csv });
    expect(out.meters.length).toBe(1);
    const m = out.meters[0];
    expect(m.meterKey).toBe('999');
    expect(m.monthlySummaries.length).toBe(1);

    const s = m.monthlySummaries[0];
    // Local midnight 1/31/2026 in America/Los_Angeles => 2026-01-31T08:00:00.000Z
    expect(s.billEndDateIso).toBe('2026-01-31T08:00:00.000Z');
    expect(s.days).toBe(31);
    expect(s.totalKWh).toBeCloseTo(26176, 6);
    expect(s.maxKw).toBeCloseTo(500, 6);
    expect(s.rateCode).toBe('B-19');
    expect(s.serviceProvider).toBe('PG&E');

    expect(s.kWhByTou?.onPeak).toBeCloseTo(1000, 6);
    expect(s.kWhByTou?.partialPeak).toBeCloseTo(2000, 6);
    expect(s.kWhByTou?.offPeak).toBeCloseTo(21000, 6);
    expect(s.kWhByTou?.superOffPeak).toBeCloseTo(2176, 6);

    expect(s.kWByTou?.onPeak).toBeCloseTo(450, 6);
    expect(s.kWByTou?.partialPeak).toBeCloseTo(475, 6);
    expect(s.kWByTou?.offPeak).toBeCloseTo(300, 6);
    expect(s.kWByTou?.superOffPeak).toBeCloseTo(250, 6);

    expect(s.dollars?.pgeRevenueAmount).toBeCloseTo(9971.66, 6);
    expect(s.dollars?.espTotalRevenueAmount).toBeCloseTo(0, 6);
    expect(s.dollars?.taxAmount).toBeCloseTo(123.45, 6);
    expect(s.dollars?.totalBillAmount).toBeCloseTo(10095.11, 6);
  });

  test('ignores rows missing SA ID or Bill End Date', () => {
    const csv = [
      'SA ID,Bill End Date,Days,Total Usage (kWh),Max. Max Demand (kW)',
      ',1/31/2026,31,100,10',
      '999,,31,100,10',
      '999,1/31/2026,31,100,10',
    ].join('\n');

    const out = parsePgeUsageCsvV1({ csvTextOrBuffer: csv });
    expect(out.meters.length).toBe(1);
    expect(out.meters[0].monthlySummaries.length).toBe(1);
  });
});

