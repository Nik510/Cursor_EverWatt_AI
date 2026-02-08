import { describe, expect, test } from 'vitest';

import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';
import { buildDeterminantsFromPgeExportsV1 } from '../src/modules/determinants/adapters/pge/buildDeterminantsFromPgeExports';
import { computeCycleDemandDeterminants } from '../src/modules/determinants/intervalToDemand';
import type { BillingCycleV1 } from '../src/modules/determinants/types';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function makePgeIntervalCsvWithTemp(args: { rows: number; sa: string; intervalMinutes: number }): string {
  const header = [
    'Service Agreement',
    'Start Date Time',
    'End Date Time',
    'Usage',
    'Usage Unit',
    'Avg. Temperature',
    'Temperature Unit',
    'Peak Demand',
    'Demand Unit',
  ].join(',');

  let year = 2026;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;
  const daysInMonth = 31;

  const lines: string[] = [header];
  for (let i = 0; i < args.rows; i++) {
    const start = `${month}/${day}/${year} ${hour}:${pad2(minute)}`;

    // advance end by intervalMinutes (safe within January)
    let endHour = hour;
    let endMinute = minute + args.intervalMinutes;
    let endDay = day;
    let endMonth = month;
    let endYear = year;
    while (endMinute >= 60) {
      endMinute -= 60;
      endHour += 1;
    }
    while (endHour >= 24) {
      endHour -= 24;
      endDay += 1;
      if (endDay > daysInMonth) {
        endDay = 1;
        endMonth += 1;
      }
      if (endMonth > 12) {
        endMonth = 1;
        endYear += 1;
      }
    }
    const end = `${endMonth}/${endDay}/${endYear} ${endHour}:${pad2(endMinute)}`;

    const tempF = 50 + (i % 41); // 50..90
    const kW = 50 + 2 * Math.max(0, tempF - 70);
    const kWh = kW * (args.intervalMinutes / 60);

    lines.push([args.sa, start, end, kWh.toFixed(4), 'KWH', String(tempF), 'FAHRENHEIT', kW.toFixed(4), 'KW'].join(','));

    // advance start
    year = endYear;
    month = endMonth;
    day = endDay;
    hour = endHour;
    minute = endMinute;
  }

  return lines.join('\n');
}

describe('Turnkey reliability slice', () => {
  test('temperature plumbing: PG&E export -> canonical intervalPointsV1 -> analyzeUtility loadAttribution ok', async () => {
    const csv = makePgeIntervalCsvWithTemp({ rows: 1200, sa: '12345', intervalMinutes: 15 });
    const built = buildDeterminantsFromPgeExportsV1({
      intervalCsvText: csv,
      timezoneHint: 'America/Los_Angeles',
      utility: 'PGE',
      rateCodeFallback: 'PGE_SIM_B19_LIKE',
    });

    const intervalPointsV1 = built.intervalPointsV1ByMeter['12345'];
    expect(Array.isArray(intervalPointsV1)).toBe(true);
    expect(intervalPointsV1.length).toBeGreaterThanOrEqual(1200);
    expect(intervalPointsV1.some((p) => typeof p.temperatureF === 'number')).toBe(true);

    const out = await analyzeUtility(
      {
        orgId: 'o_test',
        projectId: 'p_test',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        currentRate: { utility: 'PGE', rateCode: 'PGE_SIM_B19_LIKE' },
      },
      { intervalPointsV1 },
    );

    expect(out.insights.loadAttribution).toBeTruthy();
    expect(out.insights.loadAttribution?.hasWeather).toBe(true);
    expect(out.insights.loadAttribution?.status).toBe('ok');
    expect(out.insights.loadAttribution?.loadAttributionVersionTag).toBe('cp_v0');
  }, 15000);

  test('demand-window cross-check: mismatched kWh vs provided kW emits MissingInfo and reduces confidence', () => {
    const cycle: BillingCycleV1 = {
      label: '2026-01',
      startIso: '2026-01-01T00:00:00.000Z',
      endIso: '2026-02-01T00:00:00.000Z',
    };

    const out = computeCycleDemandDeterminants({
      cycle,
      intervals: [
        {
          timestampIso: '2026-01-01T00:00:00.000Z',
          intervalMinutes: 15,
          kWh: 1, // expected kW = 4
          kW: 100, // wildly inconsistent
        } as any,
      ],
      seriesIntervalMinutes: 15,
      touContext: null,
    });

    expect(out.missingInfo.some((m) => String(m.description || '').toLowerCase().includes('interval demand mismatch'))).toBe(true);
    expect(out.confidence).toBeLessThan(0.75);
  });

  test('version tags present in insights', async () => {
    const csv = makePgeIntervalCsvWithTemp({ rows: 1200, sa: '12345', intervalMinutes: 15 });
    const built = buildDeterminantsFromPgeExportsV1({
      intervalCsvText: csv,
      timezoneHint: 'America/Los_Angeles',
      utility: 'PGE',
      rateCodeFallback: 'PGE_SIM_B19_LIKE',
    });
    const intervalPointsV1 = built.intervalPointsV1ByMeter['12345'];

    const out = await analyzeUtility(
      {
        orgId: 'o_test',
        projectId: 'p_test',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        currentRate: { utility: 'PGE', rateCode: 'PGE_SIM_B19_LIKE' },
      },
      { intervalPointsV1 },
    );

    expect(out.insights.versionTags?.determinantsVersionTag).toBe('determinants_v1');
    expect(out.insights.versionTags?.touLabelerVersionTag).toBe('tou_v1');
    expect(out.insights.versionTags?.loadAttributionVersionTag).toBe('cp_v0');
  }, 15000);
});

