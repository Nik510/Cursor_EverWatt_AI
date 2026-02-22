import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { evaluateBatteryEconomicsV1 } from '../src/modules/batteryEconomicsV1/evaluateBatteryEconomicsV1';
import { resolveFixturePath } from './helpers/fixturePath';

type Expectation = {
  fixtureFile: string;
  expected: {
    warningMustInclude: string[];
    sgipAwardUsd?: number | null;
    itcUsd?: number | null;
    macrsTotalBenefitUsd?: number | null;
    augmentationCapexTotalUsd?: number | null;
    replacementYear?: number | null;
  };
};

function uniqSorted(arr: string[]): string[] {
  return Array.from(new Set((arr || []).map((s) => String(s || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function numOrNull(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function sum(nums: Array<number | null | undefined>): number | null {
  let s = 0;
  let any = false;
  for (const x of nums) {
    const n = numOrNull(x);
    if (n === null) continue;
    any = true;
    s += n;
  }
  return any ? s : null;
}

function getLineItem(out: any, id: string): any {
  const items = Array.isArray(out?.audit?.lineItems) ? (out.audit.lineItems as any[]) : [];
  return items.find((li) => String(li?.id || '') === id) || null;
}

describe('Battery Economics v1.3 fixture pack contract (SGIP + Tax + Degradation, deterministic)', () => {
  it('matches all v1.3 fixture expectations (fast)', () => {
    const t0 = Date.now();

    const expectationsPath = resolveFixturePath('tests/fixtures/batteryEconomics/v1_3/expectations.batteryEconomics.v1_3.json');
    const expectations = JSON.parse(readFileSync(expectationsPath, 'utf-8')) as Expectation[];
    expect(Array.isArray(expectations)).toBe(true);
    expect(expectations.length).toBe(12);

    for (const ex of expectations) {
      try {
        const fixturePath = resolveFixturePath(ex.fixtureFile);
        const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as any;
        const out = evaluateBatteryEconomicsV1(fixture.inputs || null) as any;

        expect(String(out.methodTag)).toBe('battery_econ_v1');

        const w = uniqSorted(out.warnings || []);
        for (const must of ex.expected.warningMustInclude || []) expect(w).toContain(String(must));

        if (Object.prototype.hasOwnProperty.call(ex.expected, 'sgipAwardUsd')) {
          const award = numOrNull(out?.sgipV0?.awardUsd);
          if (ex.expected.sgipAwardUsd === null) expect(award).toBeNull();
          else expect(Number(award)).toBeCloseTo(Number(ex.expected.sgipAwardUsd), 2);
        }

        if (Object.prototype.hasOwnProperty.call(ex.expected, 'itcUsd')) {
          const itc = numOrNull(out?.taxV0?.itcV0?.itcUsd);
          if (ex.expected.itcUsd === null) expect(itc).toBeNull();
          else expect(Number(itc)).toBeCloseTo(Number(ex.expected.itcUsd), 2);
        }

        if (Object.prototype.hasOwnProperty.call(ex.expected, 'macrsTotalBenefitUsd')) {
          const byYear = Array.isArray(out?.taxV0?.macrsV0?.deprUsdByYear) ? (out.taxV0.macrsV0.deprUsdByYear as any[]) : [];
          const total = sum(byYear.map((x) => numOrNull(x)));
          if (ex.expected.macrsTotalBenefitUsd === null) expect(total).toBeNull();
          else expect(Number(total)).toBeCloseTo(Number(ex.expected.macrsTotalBenefitUsd), 2);
        }

        if (Object.prototype.hasOwnProperty.call(ex.expected, 'augmentationCapexTotalUsd')) {
          const li = getLineItem(out, 'battery.degradation.v0.augmentation_capex');
          const amt = numOrNull(li?.amountUsdRaw);
          // audit line item is negative (capex outflow)
          if (ex.expected.augmentationCapexTotalUsd === null) expect(amt).toBeNull();
          else expect(Math.abs(Number(amt))).toBeCloseTo(Number(ex.expected.augmentationCapexTotalUsd), 2);
        }

        if (Object.prototype.hasOwnProperty.call(ex.expected, 'replacementYear')) {
          const year = numOrNull(out?.degradationV0?.replacementEvent?.year);
          if (ex.expected.replacementYear === null) expect(year).toBeNull();
          else expect(Number(year)).toBe(Number(ex.expected.replacementYear));
        }

        // Audit reconciliation: key line items match top-level outputs (<= $0.01).
        const capexTotal = numOrNull(out?.capex?.totalUsd);
        const capexLi = getLineItem(out, 'capex.total');
        if (capexTotal !== null) expect(Math.abs((numOrNull(capexLi?.amountUsdRaw) ?? 0) - capexTotal)).toBeLessThanOrEqual(0.01);

        const savingsTotal = numOrNull(out?.savingsAnnual?.totalUsd);
        const savingsLi = getLineItem(out, 'savings.totalAnnual');
        if (savingsTotal !== null) expect(Math.abs((numOrNull(savingsLi?.amountUsdRaw) ?? 0) - savingsTotal)).toBeLessThanOrEqual(0.01);

        const year0 = numOrNull(out?.cashflow?.year0Usd);
        const year0Li = getLineItem(out, 'finance.year0');
        if (year0 !== null) expect(Math.abs((numOrNull(year0Li?.amountUsdRaw) ?? 0) - year0)).toBeLessThanOrEqual(0.01);

        const npv = numOrNull(out?.cashflow?.npvUsd);
        const npvLi = getLineItem(out, 'finance.npv');
        if (npv !== null) expect(Math.abs((numOrNull(npvLi?.amountUsdRaw) ?? 0) - npv)).toBeLessThanOrEqual(0.01);

        // Stable ordering: audit line items should be sorted by id.
        const ids = Array.isArray(out?.audit?.lineItems) ? (out.audit.lineItems as any[]).map((li) => String(li?.id || '')).filter(Boolean) : [];
        const idsSorted = ids.slice().sort((a, b) => a.localeCompare(b));
        expect(ids).toEqual(idsSorted);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Fixture failed: ${ex.fixtureFile}\n${msg}`);
      }
    }

    const elapsedMs = Date.now() - t0;
    expect(elapsedMs).toBeLessThan(5_000);
  });
});

