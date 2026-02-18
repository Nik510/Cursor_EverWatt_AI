import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

import { buildCalculationAuditDrawerV1 } from '../src/modules/auditDrawerV1/buildAuditDrawerV1';
import { AUDIT_DRAWER_V1_LIMITS, auditDrawerV1VersionTag } from '../src/modules/auditDrawerV1/constants';

type Expectation = {
  fixtureFile: string;
  expected: {
    expectedEnergyRateSourceKind: string | null;
    expectedGenerationExplainerId: string;
    expectedTariffBrowserUrlPresent: boolean;
    expectedWarningsIncludes: string[];
  };
};

function loadJson(fp: string): any {
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

function isSortedStrings(xs: string[]): boolean {
  for (let i = 1; i < xs.length; i++) if (String(xs[i - 1]).localeCompare(String(xs[i])) > 0) return false;
  return true;
}

function assertBoundedPayload(payload: any): void {
  expect(payload).toBeTruthy();
  expect(payload.version).toBe(auditDrawerV1VersionTag);
  expect(typeof payload.projectId).toBe('string');
  expect(typeof payload.generatedAtIso).toBe('string');

  const explainers = payload.moneyExplainers || {};
  expect(explainers && typeof explainers === 'object').toBe(true);
  expect(Object.keys(explainers).length).toBeGreaterThanOrEqual(5);
  expect(Object.keys(explainers).length).toBeLessThanOrEqual(10);

  expect(Array.isArray(payload.warnings)).toBe(true);
  expect(payload.warnings.length).toBeLessThanOrEqual(AUDIT_DRAWER_V1_LIMITS.warningsMax);
  expect(isSortedStrings(payload.warnings)).toBe(true);

  for (const ex of Object.values(explainers)) {
    expect(ex && typeof ex === 'object').toBe(true);
    expect(Array.isArray((ex as any).summaryLines)).toBe(true);
    expect((ex as any).summaryLines.length).toBeLessThanOrEqual(AUDIT_DRAWER_V1_LIMITS.summaryLinesMax);
    expect(Array.isArray((ex as any).lineItems)).toBe(true);
    expect((ex as any).lineItems.length).toBeLessThanOrEqual(AUDIT_DRAWER_V1_LIMITS.lineItemsMax);
    expect(Array.isArray((ex as any).sources)).toBe(true);
    expect((ex as any).sources.length).toBeLessThanOrEqual(AUDIT_DRAWER_V1_LIMITS.sourcesMax);
    expect(Array.isArray((ex as any).missingInfo)).toBe(true);
    expect((ex as any).missingInfo.length).toBeLessThanOrEqual(AUDIT_DRAWER_V1_LIMITS.missingInfoMax);
    expect(isSortedStrings((ex as any).missingInfo)).toBe(true);
  }
}

describe('Calculation Audit Drawer Payload v1 fixture pack contract (deterministic)', () => {
  it('matches key contract invariants across cases', () => {
    const expectationsPath = path.join(process.cwd(), 'tests', 'fixtures', 'auditDrawer', 'v1', 'expectations.auditDrawer.v1.json');
    const expectations = loadJson(expectationsPath) as Expectation[];
    expect(Array.isArray(expectations)).toBe(true);
    expect(expectations.length).toBeGreaterThanOrEqual(5);

    for (const ex of expectations) {
      try {
        const fixturePath = path.join(process.cwd(), ex.fixtureFile);
        const fixture = loadJson(fixturePath);
        const reportJson = fixture?.reportJson ?? null;

        const payload = buildCalculationAuditDrawerV1(reportJson);
        assertBoundedPayload(payload);

        // Standard explainers always present (generation explainer is case-dependent).
        expect(payload.moneyExplainers['battery_economics_total']).toBeTruthy();
        expect(payload.moneyExplainers['energy_arbitrage_savings']).toBeTruthy();
        expect(payload.moneyExplainers['demand_savings']).toBeTruthy();
        expect(payload.moneyExplainers['tariff_match_and_rate_fit']).toBeTruthy();
        expect(payload.moneyExplainers['interval_data_quality']).toBeTruthy();
        expect(payload.moneyExplainers[ex.expected.expectedGenerationExplainerId]).toBeTruthy();

        // "click any $" contract: energy line item carries rateSource.kind when available
        const energyExplainer = payload.moneyExplainers['energy_arbitrage_savings'];
        const energyLi = Array.isArray(energyExplainer?.lineItems) ? energyExplainer.lineItems.find((li: any) => String(li?.id || '') === 'savings.energyAnnual') : null;
        const kind = energyLi?.rateSource?.kind ?? null;
        expect(kind).toBe(ex.expected.expectedEnergyRateSourceKind);

        // Link hint presence when tariff match exists.
        const tariffExplainer = payload.moneyExplainers['tariff_match_and_rate_fit'];
        const sources = Array.isArray(tariffExplainer?.sources) ? tariffExplainer.sources : [];
        const anyTariffBrowser = sources.some((s: any) => Boolean(s?.linkHints?.tariffBrowserUrl));
        expect(anyTariffBrowser).toBe(Boolean(ex.expected.expectedTariffBrowserUrlPresent));

        for (const w of ex.expected.expectedWarningsIncludes || []) {
          expect(payload.warnings, `warnings includes ${w}`).toContain(String(w));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Fixture failed: ${ex.fixtureFile}\n${msg}`);
      }
    }
  });
});

