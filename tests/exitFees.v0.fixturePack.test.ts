import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

import { getExitFeesSnapshotV0 } from '../src/modules/exitFeesLibraryV0/getExitFeesSnapshotV0';

type CaseFx = { caseId: string; iou: string; providerType: string; effectiveYmd?: string | null };

type ExpectationsFx = {
  version: string;
  cases: Array<{
    caseId: string;
    expectOk: boolean;
    expectSnapshotId: string | null;
    expectExitFeesPerKwhTotal: number | null;
    warningsMustContain?: string[];
  }>;
};

describe('exitFeesLibraryV0 fixture pack (deterministic)', () => {
  it('matches all v0 snapshot expectations (fast)', () => {
    const base = path.join(process.cwd(), 'tests', 'fixtures', 'exitFees', 'v0');
    const exp = JSON.parse(readFileSync(path.join(base, 'expectations.exitFees.v0.json'), 'utf-8')) as ExpectationsFx;
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

      const out = getExitFeesSnapshotV0({
        iou: fx.iou,
        providerType: fx.providerType,
        effectiveYmd: fx.effectiveYmd ?? null,
      });

      expect(out.ok).toBe(e.expectOk);

      if (!e.expectOk) {
        expect(out.snapshot).toBeNull();
      } else {
        expect(out.snapshot).toBeTruthy();
        expect(out.snapshot!.acquisitionMethodUsed).toBe('MANUAL_SEED_V0');
        expect(out.snapshot!.snapshotId).toBe(e.expectSnapshotId);
        if (e.expectExitFeesPerKwhTotal === null) {
          expect(out.selectedCharges.exitFeesPerKwhTotal).toBeNull();
        } else {
          expect(out.selectedCharges.exitFeesPerKwhTotal).not.toBeNull();
          expect(Number(out.selectedCharges.exitFeesPerKwhTotal)).toBeCloseTo(Number(e.expectExitFeesPerKwhTotal), 9);
        }
      }

      for (const w of e.warningsMustContain || []) expect(out.warnings).toContain(String(w));
    }
  });
});

