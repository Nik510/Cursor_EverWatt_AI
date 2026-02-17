import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { parseIntervalElectricCsvV1 } from '../src/modules/utilityIntelligence/intake/intervalElectricV1/parseIntervalElectricCsvV1';
import { analyzeIntervalIntelligenceV1 } from '../src/modules/utilityIntelligence/intervalIntelligenceV1/analyzeIntervalIntelligenceV1';
import { evaluateStorageOpportunityPackV1 } from '../src/modules/batteryEngineV1/evaluateBatteryOpportunityV1';

function uniqSorted(arr: string[]): string[] {
  return Array.from(new Set((arr || []).map((s) => String(s || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function expectSortedLex(arr: string[]) {
  expect(arr).toEqual([...arr].sort((a, b) => String(a).localeCompare(String(b))));
}

describe('economics unification guard (canonical vs legacy-derived)', () => {
  it('keeps batteryEconomicsV1Summary consistent with storageEconomicsV1 totals (within tolerance)', () => {
    const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'batteryPack', 'v1', 'cases', 'office_tou_with_demand.json');
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as any;

    const intervalCsvPath = path.join(process.cwd(), String(fixture.intervalCsv || ''));
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

    const out = evaluateStorageOpportunityPackV1({
      intervalInsightsV1,
      intervalPointsV1: parsed.points as any,
      tariffPriceSignalsV1: fixture.tariffPriceSignalsV1 ?? null,
      determinantsV1: fixture.determinantsV1 ?? null,
    });

    // Determinism / hygiene: warning & missingInfo arrays should already be sorted by the engines.
    expectSortedLex(out.batteryOpportunityV1.warnings);
    expectSortedLex(out.batteryOpportunityV1.missingInfo);
    expectSortedLex(out.storageEconomicsV1.warnings);
    expectSortedLex(out.storageEconomicsV1.missingInfo);
    expectSortedLex(out.dispatchSimulationV1.warnings);
    expectSortedLex(out.incentivesStubV1.warnings);
    expectSortedLex(out.incentivesStubV1.missingInfo);
    expectSortedLex(out.drReadinessV1.warnings);
    expectSortedLex(out.drReadinessV1.missingInfo);

    expect(out.batteryEconomicsV1Summary).toBeTruthy();

    const summary = out.batteryEconomicsV1Summary!;
    const tolUsd = 0.01;
    const tolYears = 1e-6;

    const capexMin = Number(out.storageEconomicsV1.capexEstimate.totalCapexUsdRange?.[0] ?? NaN);
    const capexMax = Number(out.storageEconomicsV1.capexEstimate.totalCapexUsdRange?.[1] ?? NaN);
    const grossMin = Number(out.storageEconomicsV1.cashflow.annualGrossSavingsUsdRange?.[0] ?? NaN);
    const grossMax = Number(out.storageEconomicsV1.cashflow.annualGrossSavingsUsdRange?.[1] ?? NaN);
    const payMin = Number(out.storageEconomicsV1.payback.simplePaybackYearsRange?.[0] ?? NaN);
    const payMax = Number(out.storageEconomicsV1.payback.simplePaybackYearsRange?.[1] ?? NaN);
    const npvMin = Number(out.storageEconomicsV1.npvLite.npvUsdRange?.[0] ?? NaN);
    const npvMax = Number(out.storageEconomicsV1.npvLite.npvUsdRange?.[1] ?? NaN);

    expect(Math.abs(summary.capexTotalUsd - capexMin)).toBeLessThanOrEqual(tolUsd);
    expect(Math.abs(summary.capexTotalUsd - capexMax)).toBeLessThanOrEqual(tolUsd);

    expect(Math.abs(summary.savingsAnnualTotalUsd - grossMin)).toBeLessThanOrEqual(tolUsd);
    expect(Math.abs(summary.savingsAnnualTotalUsd - grossMax)).toBeLessThanOrEqual(tolUsd);

    expect(Math.abs(summary.simplePaybackYears - payMin)).toBeLessThanOrEqual(tolYears);
    expect(Math.abs(summary.simplePaybackYears - payMax)).toBeLessThanOrEqual(tolYears);

    expect(Math.abs(summary.npvUsd - npvMin)).toBeLessThanOrEqual(tolUsd);
    expect(Math.abs(summary.npvUsd - npvMax)).toBeLessThanOrEqual(tolUsd);

    // Ensure the legacy engine output stays explicitly marked as derived/deprecated.
    expect(uniqSorted(out.storageEconomicsV1.warnings)).toContain('storage.econ.deprecated_use_batteryEconomicsV1');
    expect(uniqSorted(summary.warnings)).toContain('storage.econ.deprecated_use_batteryEconomicsV1');
  });
});

