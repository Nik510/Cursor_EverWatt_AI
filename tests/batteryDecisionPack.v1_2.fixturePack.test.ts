import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';

import { analyzeIntervalIntelligenceV1 } from '../src/modules/utilityIntelligence/intervalIntelligenceV1/analyzeIntervalIntelligenceV1';
import { buildBatteryDecisionPackV1_2 } from '../src/modules/batteryDecisionPackV1_2/buildBatteryDecisionPackV1_2';

function loadJson(fp: string): any {
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

function sortStrings(xs: string[]): string[] {
  return (xs || []).slice().map(String).sort((a, b) => a.localeCompare(b));
}

describe('Battery Decision Pack v1.2 fixture-pack (deterministic, decision-quality)', () => {
  const base = path.join(process.cwd(), 'tests', 'fixtures', 'batteryDecisionPack', 'v1_2');
  const exp = loadJson(path.join(base, 'expectations.batteryDecisionPack.v1_2.json'));
  const expectations: Record<string, any> = exp?.cases || {};

  const casesDir = path.join(base, 'cases');
  const caseFiles = readdirSync(casesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(casesDir, f))
    .sort((a, b) => a.localeCompare(b));

  for (const fp of caseFiles) {
    const c = loadJson(fp);
    const caseId = String(c?.caseId || path.basename(fp, '.json'));
    it(
      caseId,
      async () => {
        const e = expectations[caseId];
        expect(e, `missing expectations for ${caseId}`).toBeTruthy();

        const intervalRef = c?.intervalPointsFixture ? String(c.intervalPointsFixture) : '';
        const intervalPointsV1 = intervalRef ? loadJson(path.join(process.cwd(), intervalRef)) : null;
        const points = Array.isArray(intervalPointsV1) ? intervalPointsV1 : [];

        const tz = String(c?.tariffPriceSignalsV1?.timezone || 'America/Los_Angeles');
        const intervalInsightsV1 =
          points.length > 0
            ? analyzeIntervalIntelligenceV1({
                points: points as any,
                timezoneHint: tz,
                topPeakEventsCount: 7,
              }).intervalIntelligenceV1
            : null;

        const pack = buildBatteryDecisionPackV1_2({
          utility: c?.utility ? String(c.utility) : null,
          rate: c?.rate ? String(c.rate) : null,
          intervalPointsV1: points.length ? (points as any) : null,
          intervalInsightsV1: intervalInsightsV1 as any,
          tariffPriceSignalsV1: (c?.tariffPriceSignalsV1 as any) ?? null,
          tariffSnapshotId: c?.tariffSnapshotId ? String(c.tariffSnapshotId) : null,
          determinantsV1: (c?.determinantsV1 as any) ?? null,
          determinantsCycles: (c?.determinantsCycles as any) ?? null,
          drReadinessV1: null,
          drAnnualValueUsd: null,
          batteryDecisionConstraintsV1: (c?.batteryDecisionConstraintsV1 as any) ?? null,
        });

        expect(pack.method).toBe('battery_decision_pack_v1.2');

        // Determinism invariants: warnings + missingInfo sorted.
        expect(pack.warnings).toEqual(sortStrings(pack.warnings));
        expect(pack.missingInfo).toEqual(sortStrings(pack.missingInfo));

        // Sensitivity scenarios: always present and stable order.
        const sens = pack.batteryDecisionSensitivityV1;
        const scenarios = Array.isArray(sens?.scenarios) ? sens.scenarios : [];
        expect(scenarios.length).toBe(5);
        expect(scenarios.map((s) => String(s.scenarioId))).toEqual([
          'base',
          'capex_plus_15pct',
          'capex_minus_15pct',
          'tou_spread_minus_20pct',
          'demand_value_minus_20pct',
        ]);
        for (const s of scenarios) {
          const w = Array.isArray(s.warnings) ? s.warnings : [];
          expect(w).toEqual(sortStrings(w));
        }

        // Top candidates are bounded (<=3) and selected id is consistent.
        const top = Array.isArray(pack.topCandidates) ? pack.topCandidates : [];
        expect(top.length).toBeLessThanOrEqual(3);
        const selId = String(pack.selected?.candidateId || '').trim() || null;
        if (selId) {
          expect(top.map((x) => String(x.id))).toContain(selId);
        }

        // Expectation asserts: selected id + recommendation tier + codes presence.
        expect(pack.selected?.candidateId ?? null).toBe(e.expectedSelectedCandidateId ?? null);
        expect(String(pack.recommendationV1?.recommendationTier || '')).toBe(String(e.expectedRecommendationTier));

        const expectedMissingInfoIncludes = Array.isArray(e.expectedMissingInfoIncludes) ? e.expectedMissingInfoIncludes.map(String) : [];
        for (const code of expectedMissingInfoIncludes) expect(pack.missingInfo).toContain(String(code));

        const expectedWarningsIncludes = Array.isArray(e.expectedWarningsIncludes) ? e.expectedWarningsIncludes.map(String) : [];
        for (const code of expectedWarningsIncludes) expect(pack.warnings).toContain(String(code));

        // Constraints eliminate-all contract.
        if (e.expectNoCandidates === true) {
          expect(pack.ok).toBe(false);
          expect(pack.topCandidates.length).toBe(0);
          expect(pack.selected.candidateId).toBeNull();
          expect(pack.missingInfo).toContain('battery.decision.constraints.no_candidates');
        }
      },
      10_000,
    );
  }
});

