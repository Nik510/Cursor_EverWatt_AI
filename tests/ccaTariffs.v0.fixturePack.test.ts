import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

import { buildGenerationTouEnergySignalsV0, getCcaGenerationSnapshotV0 } from '../src/modules/ccaTariffLibraryV0/getCcaGenerationSnapshotV0';
import { CcaTariffLibraryReasonCodesV0 } from '../src/modules/ccaTariffLibraryV0/reasons';

type CaseFx = { caseId: string; iouUtility: string; ccaId: string; billPeriodStartYmd?: string | null };

type ExpectationsFx = {
  version: string;
  cases: Array<{
    caseId: string;
    expectOk: boolean;
    expectSnapshotId: string | null;
    expectRateCode: string | null;
    expectTouPeriodCount: number;
  }>;
};

describe('ccaTariffLibraryV0 fixture pack (deterministic)', () => {
  it('matches all v0 snapshot expectations (fast)', () => {
    const base = path.join(process.cwd(), 'tests', 'fixtures', 'ccaTariffs', 'v0');
    const exp = JSON.parse(readFileSync(path.join(base, 'expectations.ccaTariffs.v0.json'), 'utf-8')) as ExpectationsFx;
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

      const out = getCcaGenerationSnapshotV0({
        iouUtility: fx.iouUtility,
        ccaId: fx.ccaId,
        billPeriodStartYmd: fx.billPeriodStartYmd ?? null,
      });

      expect(out.ok).toBe(e.expectOk);

      if (!e.expectOk) {
        expect(out.snapshot).toBeNull();
        continue;
      }

      expect(out.snapshot).toBeTruthy();
      expect(out.snapshot!.acquisitionMethodUsed).toBe('MANUAL_SEED_V0');
      expect(out.snapshot!.snapshotId).toBe(e.expectSnapshotId);

      const sig = buildGenerationTouEnergySignalsV0({ snapshot: out.snapshot!, upstreamWarnings: out.warnings });
      expect(sig.generationSnapshotId).toBe(e.expectSnapshotId);
      expect(sig.generationRateCode).toBe(e.expectRateCode);
      expect(sig.generationTouEnergyPrices.length).toBe(e.expectTouPeriodCount);
      expect(sig.warnings).toContain(CcaTariffLibraryReasonCodesV0.CCA_V0_MANUAL_SEED_PROVISIONAL);
    }
  });
});

