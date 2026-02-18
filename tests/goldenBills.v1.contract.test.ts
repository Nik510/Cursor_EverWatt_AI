import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';

import { runGoldenBillCaseV1 } from './helpers/goldenBillRunnerV1';

type ExpectationsV1 = {
  expectedUtility: string;
  expectedSupplyProviderType: 'NONE' | 'CCA' | 'DA';
  expectedLseName: string | null;
  expectedRateSourceKind: 'DELIVERY' | 'CCA_GENERATION_V0_ENERGY_ONLY' | 'CCA_GENERATION_V0_ALL_IN';
  expectedMissingInfoIds: string[];
  expectedAuditReconcile: boolean;
  expectedTopLineNumbers: Record<
    string,
    | null
    | {
        value: number | null;
        tolAbs: number;
      }
  >;
};

function loadJson(fp: string): any {
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

function sortStrings(xs: string[]): string[] {
  return (xs || []).slice().map(String).sort((a, b) => a.localeCompare(b));
}

function approxEqual(actual: number | null, exp: { value: number | null; tolAbs: number }, label: string): void {
  if (exp.value === null) {
    expect(actual, label).toBeNull();
    return;
  }
  expect(actual, label).not.toBeNull();
  const a = Number(actual);
  expect(Number.isFinite(a), label).toBe(true);
  expect(Math.abs(a - exp.value), label).toBeLessThanOrEqual(exp.tolAbs);
}

describe(
  'Golden Bills v1 + Calculation Audit Contract v1 (deterministic)',
  () => {
    const base = path.join(process.cwd(), 'tests', 'fixtures', 'goldenBills', 'v1');
    const caseDirs = readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .filter((d) => d.name !== 'shared')
      .map((d) => path.join(base, d.name))
      .sort((a, b) => a.localeCompare(b));

    for (const caseDir of caseDirs) {
      const caseId = path.basename(caseDir);
      it(
        caseId,
        async () => {
          const exp = loadJson(path.join(caseDir, 'expectations.json')) as ExpectationsV1;

          const out = await runGoldenBillCaseV1({ caseDir });

          expect(out.utilityDetection.utilityId).toBe(String(exp.expectedUtility));

          const supply = out.effectiveRateContextV1?.generation?.providerType ?? 'NONE';
          expect(supply).toBe(exp.expectedSupplyProviderType);
          expect(out.effectiveRateContextV1?.generation?.lseName ?? null).toBe(exp.expectedLseName);

          expect(out.batteryEconomics?.rateSourceKind ?? 'DELIVERY').toBe(exp.expectedRateSourceKind);

          expect(sortStrings(out.insights.missingInfoIds)).toEqual(sortStrings(exp.expectedMissingInfoIds));

          if (exp.expectedAuditReconcile) {
            expect(out.batteryEconomics?.auditSavings).toBeTruthy();
            const audit = out.batteryEconomics!.auditSavings!;
            const total = audit.totalRounded;
            const sum = audit.lineItems.reduce((s, li) => s + Number(li.amountRounded ?? NaN), 0);
            expect(Number.isFinite(sum)).toBe(true);
            expect(total).not.toBeNull();
            expect(Math.abs(sum - Number(total))).toBeLessThanOrEqual(0.01);
            expect(out.auditReconcile.ok).toBe(true);
          }

          expect(out.report.html).not.toContain(':projectId');
          expect(out.report.engineVersionsLine).toBeTruthy();
          expect(out.report.engineVersionsLine!).toContain('Engine Versions:');

          for (const [k, v] of Object.entries(exp.expectedTopLineNumbers || {})) {
            const actual = (out.topLineNumbers as any)[k] ?? null;
            if (v === null) {
              expect(actual, `topLineNumbers.${k}`).toBeNull();
            } else {
              approxEqual(actual, v, `topLineNumbers.${k}`);
            }
          }
        },
        60_000,
      );
    }
  },
  60_000,
);

