import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';

import { analyzeIntervalIntelligenceV1 } from '../src/modules/utilityIntelligence/intervalIntelligenceV1/analyzeIntervalIntelligenceV1';
import { buildBatteryDecisionPackV1_1 } from '../src/modules/batteryDecisionPackV1_1/buildBatteryDecisionPackV1_1';

function loadJson(fp: string): any {
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

function sortStrings(xs: string[]): string[] {
  return (xs || []).slice().map(String).sort((a, b) => a.localeCompare(b));
}

describe('Battery Decision Pack v1.1 fixture-pack (deterministic)', () => {
  const base = path.join(process.cwd(), 'tests', 'fixtures', 'batteryDecisionPack', 'v1_1');
  const exp = loadJson(path.join(base, 'expectations.batteryDecisionPack.v1_1.json'));
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

        const pack = buildBatteryDecisionPackV1_1({
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
        });

        expect(pack.method).toBe('battery_decision_pack_v1_1');

        expect(pack.inputsSummary.providerType).toBe(String(e.expectedProviderType));
        expect(pack.inputsSummary.hasIntervals).toBe(Boolean(e.expectedHasIntervals));
        expect(pack.confidenceTier).toBe(String(e.expectedConfidenceTier));

        const top = Array.isArray(pack.topCandidates) ? pack.topCandidates : [];
        expect(top.length).toBe(Number(e.expectedTopCandidatesCount));

        // selected candidate should always be one of topCandidates when present.
        if (top.length) {
          const selId = String(pack.selected?.candidateId || '').trim();
          expect(selId).toBeTruthy();
          const ids = top.map((x) => String(x.id));
          expect(ids).toContain(selId);
          const sel = top.find((x) => String(x.id) === selId) || top[0];
          expect(String(sel?.economicsSummary?.rateSourceKind || 'DELIVERY')).toBe(String(e.expectedRateSourceKind));
        }

        // missingInfo must be sorted and include expected codes (subset).
        const mi = Array.isArray(pack.missingInfo) ? pack.missingInfo.map(String) : [];
        expect(mi).toEqual(sortStrings(mi));
        for (const code of e.expectedMissingInfoIncludes || []) {
          expect(mi).toContain(String(code));
        }

        // Audit reconcile invariants (when computable).
        const delta = pack.audit?.reconcile?.delta ?? null;
        if (delta !== null) expect(Number(delta)).toBeLessThanOrEqual(0.01);
      },
      10_000,
    );
  }
});

