import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { analyzeIntervalIntelligenceV1 } from '../src/modules/utilityIntelligence/intervalIntelligenceV1/analyzeIntervalIntelligenceV1';
import { drReadinessV1 } from '../src/modules/batteryEngineV1/drReadinessV1';
import { buildBatteryDecisionPackV1 } from '../src/modules/batteryEconomicsV1/decisionPackV1';
import { resolveFixturePath } from './helpers/fixturePath';

type Expectation = {
  fixtureFile: string;
  expected: {
    confidenceTier: string;
    optionsCount: number;
    missingInfoMustContain?: string[];
    checks?: {
      energyGt0?: boolean;
      demandGt0?: boolean;
      ratchetGt0?: boolean;
      drEq0?: boolean;
      drReasonsMustContain?: string[];
      firstOptionPowerKwEq?: number;
    };
  };
};

function uniqSorted(arr: string[]): string[] {
  return Array.from(new Set((arr || []).map((s) => String(s || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function safeNum(x: unknown): number | null {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return n;
}

function assertSortedByNpvThenPayback(options: any[]): void {
  const xs = Array.isArray(options) ? options : [];
  for (let i = 1; i < xs.length; i++) {
    const a = xs[i - 1];
    const b = xs[i];
    const an = safeNum(a?.economics?.npvLiteUsd);
    const bn = safeNum(b?.economics?.npvLiteUsd);

    // Nulls sort last.
    if (an === null && bn !== null) throw new Error('Option ordering violated: null npv should not precede non-null npv');
    if (an !== null && bn === null) continue;

    if (an !== null && bn !== null) {
      if (an < bn - 1e-9) throw new Error('Option ordering violated: npvLiteUsd should be descending');
      if (Math.abs(an - bn) > 1e-9) continue;
    }

    const ap = safeNum(a?.economics?.simplePaybackYears);
    const bp = safeNum(b?.economics?.simplePaybackYears);
    if (ap === null && bp !== null) throw new Error('Option ordering violated: null payback should not precede non-null payback');
    if (ap !== null && bp === null) continue;
    if (ap !== null && bp !== null) {
      if (ap > bp + 1e-9) throw new Error('Option ordering violated: simplePaybackYears should be ascending when NPV ties');
    }
  }
}

describe('Battery Decision Pack v1 fixture pack contract (deterministic)', () => {
  it('matches all fixture expectations (fast)', () => {
    const t0 = Date.now();

    const expectationsPath = resolveFixturePath('tests/fixtures/batteryDecisionPack/v1/expectations.batteryDecisionPack.v1.json');
    const expectations = JSON.parse(readFileSync(expectationsPath, 'utf-8')) as Expectation[];
    expect(Array.isArray(expectations)).toBe(true);
    expect(expectations.length).toBeGreaterThanOrEqual(8);

    for (const ex of expectations) {
      try {
        const fixturePath = resolveFixturePath(ex.fixtureFile);
        const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as any;

        const points = (() => {
          const fp = fixture.intervalPointsFile ? resolveFixturePath(String(fixture.intervalPointsFile)) : null;
          if (!fp) return null;
          return JSON.parse(readFileSync(fp, 'utf-8')) as any[];
        })();

        const tz = String(fixture?.tariffPriceSignalsV1?.timezone || 'America/Los_Angeles');
        const intervalInsightsV1 = (() => {
          try {
            if (!Array.isArray(points) || !points.length) return null;
            return analyzeIntervalIntelligenceV1({ points, timezoneHint: tz, topPeakEventsCount: 7 }).intervalIntelligenceV1;
          } catch {
            return null;
          }
        })();

        const dr = (() => {
          try {
            return drReadinessV1({
              intervalInsightsV1,
              intervalPointsV1: points,
              tariffPriceSignalsV1: fixture.tariffPriceSignalsV1 || null,
              config: { drTopEventDays: 10, drWindowDurationHours: 2 },
            });
          } catch {
            return null;
          }
        })();

        const out = buildBatteryDecisionPackV1({
          intervalPointsV1: points,
          intervalInsightsV1,
          tariffPriceSignalsV1: fixture.tariffPriceSignalsV1 || null,
          tariffSnapshotId: fixture.tariffSnapshotId ?? null,
          determinantsV1: fixture.determinantsV1 || null,
          drReadinessV1: dr,
          drAnnualValueUsd: fixture.drAnnualValueUsd ?? null,
          sizingSearchConstraintsV1: fixture.sizingSearchConstraintsV1 || null,
          versionTags: { determinantsVersionTag: 'determinants_pack_v1.0', touLabelerVersionTag: 'tou_v1' },
        });

        expect(String(out.schemaVersion)).toBe('batteryDecisionPackV1');
        expect(out.engineVersions?.batteryDecisionPackV1).toBe('battery_decision_pack_v1.0');
        expect(out.confidenceTier).toBe(ex.expected.confidenceTier);
        expect(out.options.length).toBe(ex.expected.optionsCount);

        if (Array.isArray(ex.expected.missingInfoMustContain) && ex.expected.missingInfoMustContain.length) {
          const got = uniqSorted(out.missingInfo || []);
          for (const must of ex.expected.missingInfoMustContain) expect(got).toContain(String(must));
        }

        // Options contract: stable ids, stable ordering, audited line items exist.
        for (let i = 0; i < out.options.length; i++) {
          const opt: any = out.options[i];
          expect(String(opt.optionId)).toBe(`OPT_${String(i + 1).padStart(2, '0')}`);
          const ids = Array.isArray(opt?.audit?.lineItems) ? opt.audit.lineItems.map((li: any) => String(li?.id || '').trim()).filter(Boolean) : [];
          expect(ids).toContain('capex.total');
          expect(ids).toContain('savings.totalAnnual');
          expect(ids).toContain('finance.npv');
        }
        assertSortedByNpvThenPayback(out.options as any);

        const c = ex.expected.checks || {};
        if (out.options.length) {
          const o0: any = out.options[0];
          const energy = safeNum(o0?.savingsAnnual?.energyArbitrageUsd) ?? 0;
          const demand = safeNum(o0?.savingsAnnual?.demandUsd) ?? 0;
          const ratchet = safeNum(o0?.savingsAnnual?.ratchetUsd) ?? 0;
          const drUsd = safeNum(o0?.savingsAnnual?.drUsd) ?? 0;

          if (c.energyGt0 === true) expect(energy).toBeGreaterThan(0);
          if (c.energyGt0 === false) expect(energy).toBeCloseTo(0, 6);
          if (c.demandGt0 === true) expect(demand).toBeGreaterThan(0);
          if (c.demandGt0 === false) expect(demand).toBeCloseTo(0, 6);
          if (c.ratchetGt0 === true) expect(ratchet).toBeGreaterThan(0);
          if (c.ratchetGt0 === false) expect(ratchet).toBeCloseTo(0, 6);
          if (c.drEq0 === true) expect(drUsd).toBeCloseTo(0, 6);

          if (Array.isArray(c.drReasonsMustContain) && c.drReasonsMustContain.length) {
            const reasons = uniqSorted(o0?.savingsAnnual?.reasonsByComponent?.drUsd || []);
            for (const must of c.drReasonsMustContain) expect(reasons).toContain(String(must));
          }

          if (Number.isFinite(Number(c.firstOptionPowerKwEq))) {
            expect(safeNum(o0?.battery?.powerKw)).toBe(Number(c.firstOptionPowerKwEq));
          }
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

