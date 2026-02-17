import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { parseIntervalElectricCsvV1 } from '../src/modules/utilityIntelligence/intake/intervalElectricV1/parseIntervalElectricCsvV1';
import { analyzeIntervalIntelligenceV1 } from '../src/modules/utilityIntelligence/intervalIntelligenceV1/analyzeIntervalIntelligenceV1';
import { evaluateStorageOpportunityPackV1 } from '../src/modules/batteryEngineV1/evaluateBatteryOpportunityV1';

type Expectation = {
  fixtureFile: string;
  expected: any;
};

function uniqSorted(arr: string[]): string[] {
  return Array.from(new Set((arr || []).map((s) => String(s || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

describe('Storage Opportunity Pack v1 fixture pack contract (deterministic)', () => {
  it('matches all fixture expectations (fast)', () => {
    const t0 = Date.now();

    const expectationsPath = path.join(process.cwd(), 'tests', 'fixtures', 'batteryPack', 'v1', 'expectations.storageOpportunityPack.v1.json');
    const expectations = JSON.parse(readFileSync(expectationsPath, 'utf-8')) as Expectation[];
    expect(Array.isArray(expectations)).toBe(true);
    expect(expectations.length).toBeGreaterThanOrEqual(8);

    for (const ex of expectations) {
      try {
        const fixturePath = path.join(process.cwd(), ex.fixtureFile);
        const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as any;
        expect(String(fixture.caseId || '')).toBeTruthy();

        const intervalCsvPath = path.join(process.cwd(), String(fixture.intervalCsv || ''));
        const csvText = readFileSync(intervalCsvPath, 'utf-8');

        const parsed = parseIntervalElectricCsvV1({
          csvText,
          filename: path.basename(intervalCsvPath),
          timezoneHint: String(fixture.timezoneHint || 'America/Los_Angeles'),
        });
        expect(parsed.ok).toBe(true);

        const intervalInsightsV1 = analyzeIntervalIntelligenceV1({
          points: parsed.points,
          meta: parsed.meta,
          timezoneHint: String(fixture.timezoneHint || 'America/Los_Angeles'),
          topPeakEventsCount: 7,
        }).intervalIntelligenceV1;

        const out = evaluateStorageOpportunityPackV1({
          intervalInsightsV1,
          intervalPointsV1: parsed.points as any,
          tariffPriceSignalsV1: fixture.tariffPriceSignalsV1 ?? null,
          determinantsV1: fixture.determinantsV1 ?? null,
        });

        const trimmed = {
          batteryOpportunityV1: {
            recommendedPowerKwRange: out.batteryOpportunityV1.recommendedPowerKwRange,
            recommendedEnergyKwhRange: out.batteryOpportunityV1.recommendedEnergyKwhRange,
            valueDrivers: out.batteryOpportunityV1.valueDrivers,
            confidenceTier: out.batteryOpportunityV1.confidenceTier,
            warnings: uniqSorted(out.batteryOpportunityV1.warnings),
            missingInfo: uniqSorted(out.batteryOpportunityV1.missingInfo),
            savingsTotal: out.batteryOpportunityV1.savingsEstimateAnnual.total,
          },
          dispatchSimulationV1: {
            strategyOrder: out.dispatchSimulationV1.strategyResults.map((r) => r.strategyId),
            strategyMethods: out.dispatchSimulationV1.strategyResults.map((r) => ({
              strategyId: r.strategyId,
              peakMethod: r.estimatedPeakKwReduction.method,
              kwhMethod: r.estimatedShiftedKwhAnnual.method,
              energyMethod: r.estimatedEnergySavingsAnnual.method,
              demandMethod: r.estimatedDemandSavingsAnnual.method,
            })),
            warnings: uniqSorted(out.dispatchSimulationV1.warnings),
          },
          drReadinessV1: {
            topEventWindowsCount: out.drReadinessV1.topEventWindows.length,
            topEventWindowsTop3: out.drReadinessV1.topEventWindows.slice(0, 3).map((w) => ({ dateIso: w.dateIso, startHourLocal: w.startHourLocal, durationHours: w.durationHours })),
            typicalShedPotentialKwRange: out.drReadinessV1.typicalShedPotentialKwRange,
            variabilityScore: out.drReadinessV1.variabilityScore,
            confidenceTier: out.drReadinessV1.confidenceTier,
            warnings: uniqSorted(out.drReadinessV1.warnings),
            missingInfo: uniqSorted(out.drReadinessV1.missingInfo),
          },
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

