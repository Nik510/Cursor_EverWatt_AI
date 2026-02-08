import { describe, expect, test } from 'vitest';

import type { DeterminantsPackV1 } from '../src/modules/determinants/types';
import { computeBehaviorInsightsV2 } from '../src/modules/utilityIntelligence/behaviorV2/computeBehaviorInsightsV2';

function makePack(args: { months: number; last12Kwh: number; prior12Kwh: number; reconcilableMonths?: number }): DeterminantsPackV1 {
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
    const isRecon = args.reconcilableMonths === undefined ? true : i >= args.months - args.reconcilableMonths;
    matches.push({ cycleLabel: label, startIso, endIso, computedKwh: kwh, isReconcilable: isRecon, notes: [], evidence: [] });
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

describe('behaviorInsightsV2', () => {
  test('produces YoY usage card with +20% delta when present', () => {
    const pack = makePack({ months: 24, prior12Kwh: 1000, last12Kwh: 1200 });
    const out = computeBehaviorInsightsV2({ determinantsPack: pack, nowIso: '2026-02-07T00:00:00.000Z' });
    expect(out.usageTrend?.deltaPct).not.toBeNull();
    expect(Number(out.usageTrend?.deltaPct)).toBeGreaterThan(0.19);
    expect(out.conversationCards.some((c) => c.finding.includes('20%'))).toBe(true);
  });

  test('overlap gating: insufficient reconcilable months emits missingInfo', () => {
    const pack = makePack({ months: 24, prior12Kwh: 1000, last12Kwh: 1200, reconcilableMonths: 10 });
    const out = computeBehaviorInsightsV2({ determinantsPack: pack, nowIso: '2026-02-07T00:00:00.000Z' });
    expect(out.dataWindow.cycleCount).toBe(10);
    expect(out.missingInfo.some((m) => String(m.id).includes('insufficientCycles'))).toBe(true);
  });
});

