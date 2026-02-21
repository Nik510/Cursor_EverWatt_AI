import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

import { getCcaAddersSnapshotV0 } from '../src/modules/ccaAddersLibraryV0/getCcaAddersSnapshotV0';

type CaseFx = { caseId: string; iouUtility: string; ccaId: string; billPeriodStartYmd?: string | null };

type ExpectationsFx = {
  version: string;
  cases: Array<{
    caseId: string;
    expectOk: boolean;
    expectSnapshotId: string | null;
    expectAddersPerKwhTotal: number | null;
    warningsMustContain?: string[];
  }>;
};

describe('ccaAddersLibraryV0 fixture pack (deterministic)', () => {
  it('matches all v0 snapshot expectations (fast)', () => {
    const base = path.join(process.cwd(), 'tests', 'fixtures', 'ccaAdders', 'v0');
    const exp = JSON.parse(readFileSync(path.join(base, 'expectations.ccaAdders.v0.json'), 'utf-8')) as ExpectationsFx;
    const casesDir = path.join(base, 'cases');

    const byId = new Map(exp.cases.map((c) => [c.caseId, c]));
    expect(byId.size).toBe(exp.cases.length);

    const files = exp.cases
      .map((c) => `${c.caseId}.json`)
      .slice()
      .sort((a, b) => a.localeCompare(b));

    for (const f of files) {
      const fx = JSON.parse(readFileSync(path.join(casesDir, f), 'utf-8')) as CaseFx;
      const e = byId.get(fx.caseId);
      expect(e).toBeTruthy();
      if (!e) continue;

      const out = getCcaAddersSnapshotV0({
        iouUtility: fx.iouUtility,
        ccaId: fx.ccaId,
        billPeriodStartYmd: fx.billPeriodStartYmd ?? null,
      });

      expect(out.ok).toBe(e.expectOk);

      if (!e.expectOk) {
        expect(out.snapshot).toBeNull();
      } else {
        expect(out.snapshot).toBeTruthy();
        expect(out.snapshot!.acquisitionMethodUsed).toBe('MANUAL_SEED_V0');
        expect(out.snapshot!.snapshotId).toBe(e.expectSnapshotId);
        expect(out.snapshot!.addersPerKwhTotal).toBeCloseTo(Number(e.expectAddersPerKwhTotal), 9);
      }

      for (const w of e.warningsMustContain || []) expect(out.warnings).toContain(String(w));
    }
  });
});

