import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { regressUsageVsWeatherV1 } from '../src/modules/utilityIntelligence/weatherRegressionV1/regressUsageVsWeatherV1';
import { resolveFixturePath } from './helpers/fixturePath';

type Expectation = {
  fixtureFile: string;
  timezoneHint: string;
  expected: {
    coverageDays: number;
    overlapDays: number;
    hddBaseF: number;
    cddBaseF: number;
    intercept: number | null;
    slopeHdd: number | null;
    slopeCdd: number | null;
    r2: number | null;
    confidenceTier: string;
    warnings: string[];
    annualization: { method: string; annualKwhEstimate: number | null; confidenceTier: string };
  };
};

function uniqSorted(arr: string[]): string[] {
  return Array.from(new Set(arr.map((s) => String(s || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function isLikelyIanaTimezone(tz: string): boolean {
  const s = String(tz || '').trim();
  return Boolean(s && s.includes('/') && !s.includes(' '));
}

describe('Weather Regression v1 fixture pack contract (deterministic)', () => {
  it('matches all fixture expectations (fast)', () => {
    const t0 = Date.now();

    const expectationsPath = resolveFixturePath('tests/fixtures/weather/v1/expectations.weatherRegression.v1.json');
    const expectations = JSON.parse(readFileSync(expectationsPath, 'utf-8')) as Expectation[];
    expect(Array.isArray(expectations)).toBe(true);
    expect(expectations.length).toBeGreaterThanOrEqual(6);

    for (const ex of expectations) {
      try {
        const fp = resolveFixturePath(ex.fixtureFile);
        const fixture = JSON.parse(readFileSync(fp, 'utf-8')) as any;
        expect(Array.isArray(fixture?.usageByDay)).toBe(true);
        expect(Array.isArray(fixture?.weatherByDay)).toBe(true);

        const res = regressUsageVsWeatherV1({
          usageByDay: fixture.usageByDay,
          weatherByDay: fixture.weatherByDay,
          hddBaseF: 65,
          cddBaseF: 65,
          minOverlapDays: 8,
          timezoneHint: ex.timezoneHint,
        }).weatherRegressionV1;

        expect(res.coverageDays).toBe(ex.expected.coverageDays);
        expect(res.overlapDays).toBe(ex.expected.overlapDays);
        expect(res.hddBaseF).toBe(ex.expected.hddBaseF);
        expect(res.cddBaseF).toBe(ex.expected.cddBaseF);

        expect(res.intercept).toBe(ex.expected.intercept);
        expect(res.slopeHdd).toBe(ex.expected.slopeHdd);
        expect(res.slopeCdd).toBe(ex.expected.slopeCdd);
        expect(res.r2).toBe(ex.expected.r2);
        expect(res.confidenceTier).toBe(ex.expected.confidenceTier);

        expect(res.annualization).toEqual(ex.expected.annualization);

        const gotWarnings = uniqSorted(res.warnings);
        const wantWarnings = uniqSorted(ex.expected.warnings);
        if (gotWarnings.join('|') !== wantWarnings.join('|')) {
          throw new Error(
            [
              `warnings mismatch`,
              `expectedWarnings=${JSON.stringify(wantWarnings)}`,
              `receivedWarnings=${JSON.stringify(gotWarnings)}`,
            ].join('\n'),
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Fixture failed: ${ex.fixtureFile}\n${msg}`);
      }
    }

    const elapsedMs = Date.now() - t0;
    expect(elapsedMs).toBeLessThan(5_000);
  });
});

