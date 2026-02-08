import { describe, expect, test } from 'vitest';

import { buildDeterminantsFromPgeExportsV1 } from '../src/modules/determinants/adapters/pge/buildDeterminantsFromPgeExports';

describe('pgeAdapters: buildDeterminantsFromPgeExportsV1', () => {
  test('builds DeterminantsPackV1 with cycles aligned to usage rows and reconciles cleanly when matched', () => {
    const usageCsv = [
      'SA ID,Service Provider,Rate,Bill End Date,Days,Total Usage (kWh),Max. Max Demand (kW)',
      '12345,PG&E,B-19,1/1/2026,1,10,12',
      '12345,PG&E,B-19,1/2/2026,1,8,10',
    ].join('\n');

    const intervalCsv = [
      'Service Agreement,Start Date Time,End Date Time,Usage,Usage Unit,Peak Demand,Demand Unit',
      // Cycle 1: 1/1 local day, total 10kWh, max 12kW
      '12345,1/1/2026 0:00,1/1/2026 0:15,2.5,KWH,10,KW',
      '12345,1/1/2026 0:15,1/1/2026 0:30,2.5,KWH,12,KW',
      '12345,1/1/2026 0:30,1/1/2026 0:45,2.5,KWH,9,KW',
      '12345,1/1/2026 0:45,1/1/2026 1:00,2.5,KWH,8,KW',
      // Cycle 2: 1/2 local day, total 8kWh, max 10kW
      '12345,1/2/2026 0:00,1/2/2026 0:15,2.0,KWH,7,KW',
      '12345,1/2/2026 0:15,1/2/2026 0:30,2.0,KWH,8,KW',
      '12345,1/2/2026 0:30,1/2/2026 0:45,2.0,KWH,10,KW',
      '12345,1/2/2026 0:45,1/2/2026 1:00,2.0,KWH,6,KW',
    ].join('\n');

    const out = buildDeterminantsFromPgeExportsV1({
      usageCsvText: usageCsv,
      intervalCsvText: intervalCsv,
      timezoneHint: 'America/Los_Angeles',
      utility: 'PGE',
      rateCodeFallback: 'B-19',
    });

    expect(out.pack.utility).toBe('PGE');
    expect(out.pack.rateCode).toBe('B-19');
    expect(out.pack.meters.length).toBe(1);
    expect(out.pack.meters[0].meterId).toBe('12345');

    const cycles = out.pack.meters[0].cycles;
    expect(cycles.length).toBe(2);
    expect(cycles[0].cycle.label).toBe('2026-01-01');
    expect(cycles[1].cycle.label).toBe('2026-01-02');

    // EndExclusive should be next-day local midnight.
    expect(cycles[0].cycle.startIso).toBe('2026-01-01T08:00:00.000Z');
    expect(cycles[0].cycle.endIso).toBe('2026-01-02T08:00:00.000Z');
    expect(cycles[1].cycle.startIso).toBe('2026-01-02T08:00:00.000Z');
    expect(cycles[1].cycle.endIso).toBe('2026-01-03T08:00:00.000Z');

    expect(out.pack.meters[0].reconciliation.demandMismatchCount).toBe(0);
    expect(out.pack.meters[0].reconciliation.kwhMismatchCount).toBe(0);

    // Required evidence: join + cycle derivation provenance should be present in cycle evidence.
    const ev = cycles[0].evidence.map((e) => `${e.pointer.source}:${e.pointer.key || ''}`);
    expect(ev.some((x) => x.includes('pgeExports:joinedMeterKey'))).toBe(true);
    expect(ev.some((x) => x.includes('pgeExports:cycleDerivation'))).toBe(true);
  });

  test('skips reconciliation mismatch when coverage is low', () => {
    const usageCsv = [
      'SA ID,Service Provider,Rate,Bill End Date,Days,Total Usage (kWh),Max. Max Demand (kW)',
      '12345,PG&E,B-19,1/1/2026,1,999,12',
      '12345,PG&E,B-19,1/2/2026,1,8,10',
    ].join('\n');

    const intervalCsv = [
      'Service Agreement,Start Date Time,End Date Time,Usage,Usage Unit,Peak Demand,Demand Unit',
      '12345,1/1/2026 0:00,1/1/2026 0:15,2.5,KWH,10,KW',
      '12345,1/1/2026 0:15,1/1/2026 0:30,2.5,KWH,12,KW',
      '12345,1/1/2026 0:30,1/1/2026 0:45,2.5,KWH,9,KW',
      '12345,1/1/2026 0:45,1/1/2026 1:00,2.5,KWH,8,KW',
      '12345,1/2/2026 0:00,1/2/2026 0:15,2.0,KWH,7,KW',
      '12345,1/2/2026 0:15,1/2/2026 0:30,2.0,KWH,8,KW',
      '12345,1/2/2026 0:30,1/2/2026 0:45,2.0,KWH,10,KW',
      '12345,1/2/2026 0:45,1/2/2026 1:00,2.0,KWH,6,KW',
    ].join('\n');

    const out = buildDeterminantsFromPgeExportsV1({
      usageCsvText: usageCsv,
      intervalCsvText: intervalCsv,
      timezoneHint: 'America/Los_Angeles',
      utility: 'PGE',
      rateCodeFallback: 'B-19',
    });

    expect(out.pack.meters[0].reconciliation.kwhMismatchCount).toBe(0);
    expect(
      out.pack.meters[0].reconciliation.missingInfo.some((m) => String(m.description).includes('Insufficient interval coverage')),
    ).toBe(true);
  });
});

