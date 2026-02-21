import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { evaluateBatteryEconomicsV1 } from '../src/modules/batteryEconomicsV1/evaluateBatteryEconomicsV1';

type Expectation = {
  fixtureFile: string;
  expected: {
    expectedConfidenceTier: string;
    expectedWarnings: string[];
    expectedCapexTotalUsd: number | null;
    expectedSavingsTotalUsd: number | null;
    expectedPaybackYears: number | null;
    expectedNpvUsd: number | null;
    expectedAuditMustContainIds: string[];
  };
};

function uniqSorted(arr: string[]): string[] {
  return Array.from(new Set((arr || []).map((s) => String(s || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function resolveRepoPath(rel: string): string {
  const raw = String(rel || '').trim();
  if (!raw) return '';
  const normalized = raw.replace(/\\/g, '/');
  return path.join(process.cwd(), ...normalized.split('/'));
}

describe('Battery Economics v1 fixture pack contract (deterministic)', () => {
  it('matches all fixture expectations (fast)', () => {
    const t0 = Date.now();

    const expectationsPath = path.join(process.cwd(), 'tests', 'fixtures', 'batteryEconomics', 'v1', 'expectations.batteryEconomics.v1.json');
    const expectations = JSON.parse(readFileSync(expectationsPath, 'utf-8')) as Expectation[];
    expect(Array.isArray(expectations)).toBe(true);
    expect(expectations.length).toBeGreaterThanOrEqual(10);

    for (const ex of expectations) {
      try {
        const fixturePath = resolveRepoPath(ex.fixtureFile);
        const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as any;
        const out = evaluateBatteryEconomicsV1(fixture.inputs || null);

        expect(String(out.methodTag)).toBe('battery_econ_v1');

        expect(out.confidenceTier).toBe(ex.expected.expectedConfidenceTier);
        expect(uniqSorted(out.warnings)).toEqual(uniqSorted(ex.expected.expectedWarnings));

        const capex = out.capex.totalUsd;
        const savings = out.savingsAnnual.totalUsd;
        const payback = out.cashflow.simplePaybackYears;
        const npv = out.cashflow.npvUsd;

        if (ex.expected.expectedCapexTotalUsd === null) expect(capex).toBeNull();
        else expect(capex).not.toBeNull();
        if (ex.expected.expectedCapexTotalUsd !== null) expect(Number(capex)).toBeCloseTo(ex.expected.expectedCapexTotalUsd, 2);

        if (ex.expected.expectedSavingsTotalUsd === null) expect(savings).toBeNull();
        else expect(savings).not.toBeNull();
        if (ex.expected.expectedSavingsTotalUsd !== null) expect(Number(savings)).toBeCloseTo(ex.expected.expectedSavingsTotalUsd, 2);

        if (ex.expected.expectedPaybackYears === null) expect(payback).toBeNull();
        else expect(payback).not.toBeNull();
        if (ex.expected.expectedPaybackYears !== null) expect(Number(payback)).toBeCloseTo(ex.expected.expectedPaybackYears, 6);

        if (ex.expected.expectedNpvUsd === null) expect(npv).toBeNull();
        else expect(npv).not.toBeNull();
        if (ex.expected.expectedNpvUsd !== null) expect(Number(npv)).toBeCloseTo(ex.expected.expectedNpvUsd, 2);

        const ids = Array.isArray(out.audit?.lineItems) ? out.audit.lineItems.map((li) => String(li?.id || '').trim()).filter(Boolean) : [];
        for (const must of ex.expected.expectedAuditMustContainIds || []) {
          expect(ids).toContain(String(must));
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

