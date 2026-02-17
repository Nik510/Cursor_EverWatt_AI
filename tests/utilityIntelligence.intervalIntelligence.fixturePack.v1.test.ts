import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { parseIntervalElectricCsvV1 } from '../src/modules/utilityIntelligence/intake/intervalElectricV1/parseIntervalElectricCsvV1';
import { analyzeIntervalIntelligenceV1 } from '../src/modules/utilityIntelligence/intervalIntelligenceV1/analyzeIntervalIntelligenceV1';

type Expectation = {
  fixtureFile: string;
  expected: {
    coverageDays: number;
    granularityMinutes: number | null;
    pointsReturnedCount: number;
    avgDailyKwh: number | null;
    avgKw: number | null;
    baseloadKw: number | null;
    baseloadMethod: string;
    peakKw: number | null;
    peakTimestampIso: string | null;
    weekdayAvgKw: number | null;
    weekendAvgKw: number | null;
    weekdayWeekendDeltaPct: number | null;
    dailyProfileBuckets: Array<{ bucketStartHourLocal: number; bucketEndHourLocalExclusive: number; avgKw: number }>;
    topPeakEvents: Array<{ timestampIso: string; kw: number }>;
    warnings: string[];
  };
};

function uniqSorted(arr: string[]): string[] {
  return Array.from(new Set(arr.map((s) => String(s || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

describe('Interval Intelligence v1 fixture pack contract (deterministic)', () => {
  it('matches all fixture expectations (fast)', () => {
    const t0 = Date.now();

    const expectationsPath = path.join(
      process.cwd(),
      'tests',
      'fixtures',
      'intervals',
      'v1',
      'expectations.intervalIntelligence.v1.json',
    );
    const expectations = JSON.parse(readFileSync(expectationsPath, 'utf-8')) as Expectation[];
    expect(Array.isArray(expectations)).toBe(true);
    expect(expectations.length).toBeGreaterThanOrEqual(6);

    for (const ex of expectations) {
      try {
        const fp = path.join(process.cwd(), ex.fixtureFile);
        const csvText = readFileSync(fp, 'utf-8');
        const parsed = parseIntervalElectricCsvV1({
          csvText,
          filename: path.basename(fp),
          timezoneHint: 'America/Los_Angeles',
        });
        expect(parsed.ok).toBe(true);

        const res = analyzeIntervalIntelligenceV1({
          points: parsed.points,
          meta: parsed.meta,
          timezoneHint: 'America/Los_Angeles',
          topPeakEventsCount: 7,
        }).intervalIntelligenceV1;

        // Core counts
        expect(res.coverageDays).toBe(ex.expected.coverageDays);
        expect(res.granularityMinutes).toBe(ex.expected.granularityMinutes);
        expect(res.pointsReturnedCount).toBe(ex.expected.pointsReturnedCount);

        // Averages / magnitudes
        expect(res.avgDailyKwh).toBe(ex.expected.avgDailyKwh);
        expect(res.avgKw).toBe(ex.expected.avgKw);
        expect(res.baseloadKw).toBe(ex.expected.baseloadKw);
        expect(res.baseloadMethod).toBe(ex.expected.baseloadMethod);
        expect(res.peakKw).toBe(ex.expected.peakKw);
        expect(res.peakTimestampIso).toBe(ex.expected.peakTimestampIso);

        // Weekday/weekend
        expect(res.weekdayAvgKw).toBe(ex.expected.weekdayAvgKw);
        expect(res.weekendAvgKw).toBe(ex.expected.weekendAvgKw);
        expect(res.weekdayWeekendDeltaPct).toBe(ex.expected.weekdayWeekendDeltaPct);

        // Shape + peaks
        expect(res.dailyProfileBuckets).toEqual(ex.expected.dailyProfileBuckets);
        expect(res.topPeakEvents).toEqual(ex.expected.topPeakEvents);

        // Warnings (sorted, stable codes)
        expect(uniqSorted(res.warnings)).toEqual(uniqSorted(ex.expected.warnings));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Fixture failed: ${ex.fixtureFile}\n${msg}`);
      }
    }

    // Guardrail: keep fixture-pack test fast.
    const elapsedMs = Date.now() - t0;
    expect(elapsedMs).toBeLessThan(5_000);
  });
});

