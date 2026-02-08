import { describe, expect, test } from 'vitest';

import type { DeterminantsPackV1 } from '../src/modules/determinants/types';
import { computeBehaviorInsightsV3 } from '../src/modules/utilityIntelligence/behaviorV3/computeBehaviorInsightsV3';

function makePack(args: { months: number; last12Kwh: number; prior12Kwh: number }): DeterminantsPackV1 {
  const cycles: any[] = [];
  const matches: any[] = [];
  for (let i = 0; i < args.months; i++) {
    const y = 2024 + Math.floor(i / 12);
    const m = (i % 12) + 1;
    const startIso = new Date(Date.UTC(y, m - 1, 1)).toISOString();
    const endIso = new Date(Date.UTC(y, m, 1)).toISOString();
    const label = `${y}-${String(m).padStart(2, '0')}`;
    const kwh = i < 12 ? args.prior12Kwh : args.last12Kwh;
    cycles.push({
      cycle: { label, startIso, endIso, timezone: 'UTC' },
      energy: { kwhTotal: kwh },
      maxTimestampIso: endIso,
      demand: { intervalMinutes: 60, kWMax: 100, coveragePct: 1 },
      evidence: [],
      because: [],
      missingInfo: [],
      confidence: 0.9,
    });
    matches.push({ cycleLabel: label, startIso, endIso, computedKwh: kwh, isReconcilable: true, notes: [], evidence: [] });
  }
  return {
    utility: 'PGE',
    rateCode: 'B-19',
    meters: [
      {
        meterId: 'm1',
        cycles,
        reconciliation: { matches, demandMismatchCount: 0, kwhMismatchCount: 0, missingInfo: [], warnings: [], confidenceImpact: 1 } as any,
      },
    ],
    confidenceSummary: { confidence: 0.9, because: [] },
    missingInfo: [],
    warnings: [],
    determinantsVersionTag: 'determinants_v1',
    touLabelerVersionTag: 'tou_v1',
    rulesVersionTag: 'determinants:v1',
  };
}

describe('behaviorInsightsV3', () => {
  test('electric: produces YoY card with +20% delta when present', () => {
    const pack = makePack({ months: 24, prior12Kwh: 1000, last12Kwh: 1200 });
    const out = computeBehaviorInsightsV3({ determinantsPack: pack, nowIso: '2026-02-07T00:00:00.000Z' });
    expect(out.electric?.usage?.yoyDeltaPct).not.toBeNull();
    expect(Number(out.electric?.usage?.yoyDeltaPct)).toBeGreaterThan(0.19);
    expect((out.electric?.conversationCards || []).some((c) => String(c.finding).includes('20%'))).toBe(true);
  });

  test('gas: produces YoY card with +20% delta from billingSummary therms', () => {
    const monthly: any[] = [];
    for (let i = 0; i < 24; i++) {
      const y = 2024 + Math.floor(i / 12);
      const m = (i % 12) + 1;
      const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
      const end = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
      monthly.push({ start, end, therms: i < 12 ? 100 : 120 });
    }
    const out = computeBehaviorInsightsV3({ inputsBillingMonthly: monthly, determinantsPack: null, nowIso: '2026-02-07T00:00:00.000Z' });
    expect(out.gas?.usage?.yoyDeltaPct).not.toBeNull();
    expect(Number(out.gas?.usage?.yoyDeltaPct)).toBeGreaterThan(0.19);
    expect((out.gas?.conversationCards || []).some((c) => String(c.finding).includes('20%'))).toBe(true);
  });
});

