import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { parseIntervalElectricCsvV1 } from '../src/modules/utilityIntelligence/intake/intervalElectricV1/parseIntervalElectricCsvV1';
import { analyzeIntervalIntelligenceV1 } from '../src/modules/utilityIntelligence/intervalIntelligenceV1/analyzeIntervalIntelligenceV1';
import { evaluateStorageOpportunityPackV1 } from '../src/modules/batteryEngineV1/evaluateBatteryOpportunityV1';
import { storageEconomicsV1 } from '../src/modules/batteryEngineV1/storageEconomicsV1';
import { resolveFixturePath } from './helpers/fixturePath';

type Expectation = {
  fixtureFile: string;
  expected: any;
};

function uniqSorted(arr: string[]): string[] {
  return Array.from(new Set((arr || []).map((s) => String(s || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

describe('Storage Economics v1 fixture pack contract (deterministic)', () => {
  it('matches all fixture expectations (fast)', () => {
    const t0 = Date.now();

    const expectationsPath = resolveFixturePath('tests/fixtures/storageEconomics/v1/expectations.storageEconomics.v1.json');
    const expectations = JSON.parse(readFileSync(expectationsPath, 'utf-8')) as Expectation[];
    expect(Array.isArray(expectations)).toBe(true);
    expect(expectations.length).toBeGreaterThanOrEqual(8);

    for (const ex of expectations) {
      try {
        const fixturePath = resolveFixturePath(ex.fixtureFile);
        const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as any;
        expect(String(fixture.caseId || '')).toBeTruthy();

        const intervalCsvPath = resolveFixturePath(String(fixture.intervalCsv || ''));
        const csvText = readFileSync(intervalCsvPath, 'utf-8');
        const tz = String(fixture.timezoneHint || 'America/Los_Angeles');

        const parsed = parseIntervalElectricCsvV1({ csvText, filename: path.basename(intervalCsvPath), timezoneHint: tz });
        expect(parsed.ok).toBe(true);

        const intervalInsightsV1 = analyzeIntervalIntelligenceV1({
          points: parsed.points,
          meta: parsed.meta,
          timezoneHint: tz,
          topPeakEventsCount: 7,
        }).intervalIntelligenceV1;

        const pack = evaluateStorageOpportunityPackV1({
          intervalInsightsV1,
          intervalPointsV1: parsed.points as any,
          tariffPriceSignalsV1: fixture.tariffPriceSignalsV1 ?? null,
          determinantsV1: fixture.determinantsV1 ?? null,
          storageEconomicsOverridesV1: fixture.storageEconomicsOverridesV1 ?? null,
        });

        const econ =
          fixture.economicsMode === 'omit_dispatch'
            ? storageEconomicsV1({
                batteryOpportunityV1: pack.batteryOpportunityV1,
                dispatchSimulationV1: null,
                tariffPriceSignalsV1: fixture.tariffPriceSignalsV1 ?? null,
                determinantsV1: fixture.determinantsV1 ?? null,
                overrides: fixture.storageEconomicsOverridesV1 ?? null,
                intervalInsightsV1,
              })
            : pack.storageEconomicsV1;

        const trimmed = {
          confidenceTier: econ.confidenceTier,
          engineVersion: econ.engineVersion,
          capexTotal: econ.capexEstimate.totalCapexUsdRange,
          annualGrossSavings: econ.cashflow.annualGrossSavingsUsdRange,
          annualNetSavings: econ.cashflow.annualNetSavingsUsdRange,
          paybackYears: econ.payback.simplePaybackYearsRange,
          npvUsd: econ.npvLite.npvUsdRange,
          normalized: econ.normalizedMetrics,
          warnings: uniqSorted(econ.warnings),
          missingInfo: uniqSorted(econ.missingInfo),
        };

        expect(trimmed).toEqual(ex.expected);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Fixture failed: ${ex.fixtureFile}\n${msg}`);
      }
    }

    const elapsedMs = Date.now() - t0;
    expect(elapsedMs).toBeLessThan(5_000);
  });
});

