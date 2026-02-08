import { describe, expect, test } from 'vitest';

import { parsePgeIntervalCsvV1 } from '../src/modules/determinants/adapters/pge/parsePgeIntervalCsv';

describe('pgeAdapters: parsePgeIntervalCsvV1', () => {
  test('parses intervals, computes intervalMinutes, and converts local timestamps using America/Los_Angeles', () => {
    const csv = [
      'Service Agreement,Start Date Time,End Date Time,Usage,Usage Unit,Avg. Temperature,Temperature Unit,Peak Demand,Demand Unit,Event Flags',
      '12345,1/1/2026 0:00,1/1/2026 0:15,2.5,KWH,55,FAHRENHEIT,10,KW,',
      '', // blank row ignored
      '12345,1/1/2026 0:15,1/1/2026 0:30,3.0,KWH,56,FAHRENHEIT,12,KW,',
    ].join('\n');

    const out = parsePgeIntervalCsvV1({ csvTextOrBuffer: csv });
    expect(out.meters.length).toBe(1);
    const m = out.meters[0];
    expect(m.meterKey).toBe('12345');
    expect(m.sourceMeta.inferredIntervalMinutes).toBe(15);
    expect(m.sourceMeta.hasTemp).toBe(true);
    expect(m.sourceMeta.hasKwColumn).toBe(true);

    expect(m.intervals.length).toBe(2);
    expect(m.intervals[0].intervalMinutes).toBe(15);
    // 1/1/2026 00:00 in America/Los_Angeles is 2026-01-01T08:00:00.000Z
    expect(m.intervals[0].timestampIso).toBe('2026-01-01T08:00:00.000Z');
    expect(m.intervals[0].kWh).toBeCloseTo(2.5, 6);
    expect(m.intervals[0].kW).toBeCloseTo(10, 6);
    expect(m.intervals[0].temperatureF).toBeCloseTo(55, 6);
  });

  test('adds MissingInfo when usage unit is not KWH', () => {
    const csv = [
      'Service Agreement,Start Date Time,End Date Time,Usage,Usage Unit,Peak Demand,Demand Unit',
      '12345,1/1/2026 0:00,1/1/2026 0:15,2.5,MWH,10,KW',
    ].join('\n');

    const out = parsePgeIntervalCsvV1({ csvTextOrBuffer: csv });
    expect(out.meters.length).toBe(1);
    const m = out.meters[0];
    expect(m.missingInfo.some((x) => String(x.id).includes('usageUnit'))).toBe(true);
    // kWh should be omitted as untrusted
    expect(m.intervals[0].kWh).toBeUndefined();
  });
});

