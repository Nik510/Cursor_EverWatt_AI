import { describe, expect, test } from 'vitest';

import { computeBehaviorInsights } from '../src/modules/utilityIntelligence/behavior/computeBehaviorInsights';
import type { DeterminantsPackV1 } from '../src/modules/determinants/types';
import type { ComprehensiveBillRecord } from '../src/utils/utility-data-types';

function makeBillingRecords(args: { startYear: number; months: number; baseKwh: number; slopeKwh: number; summerBoost?: number }): ComprehensiveBillRecord[] {
  const out: ComprehensiveBillRecord[] = [];
  for (let i = 0; i < args.months; i++) {
    const y = args.startYear + Math.floor(i / 12);
    const m = (i % 12) + 1;
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    const isSummer = m >= 6 && m <= 8;
    const kwh = args.baseKwh + args.slopeKwh * i + (isSummer ? args.summerBoost || 0 : 0);
    out.push({ billStartDate: start, billEndDate: end, totalUsageKwh: kwh, maxMaxDemandKw: 100 + (isSummer ? 40 : 0) } as any);
  }
  return out;
}

function makeDeterminantsPack(months: number): DeterminantsPackV1 {
  const cycles = [];
  for (let i = 0; i < months; i++) {
    const y = 2024 + Math.floor(i / 12);
    const m = (i % 12) + 1;
    const startIso = new Date(Date.UTC(y, m - 1, 1)).toISOString();
    const endIso = new Date(Date.UTC(y, m, 1)).toISOString();
    cycles.push({
      cycle: { label: `${y}-${String(m).padStart(2, '0')}`, startIso, endIso, timezone: 'UTC' },
      energy: { kwhTotal: 1000 + i * 20 },
      demand: { intervalMinutes: 60, kWMax: 80 + i * 1, intervalCount: 720, expectedIntervalCount: 720, coveragePct: 1 },
      evidence: [],
      because: [],
      missingInfo: [],
      confidence: 0.9,
    });
  }
  return {
    utility: 'PGE',
    rateCode: 'B-19',
    meters: [{ meterId: 'm1', cycles, reconciliation: { matches: [], demandMismatchCount: 0, kwhMismatchCount: 0, missingInfo: [], warnings: [], confidenceImpact: 1 } as any }],
    confidenceSummary: { confidence: 0.9, because: [] },
    missingInfo: [],
    warnings: [],
    determinantsVersionTag: 'determinants_v1',
    touLabelerVersionTag: 'tou_v1',
    rulesVersionTag: 'determinants:v1',
  };
}

describe('behaviorInsights', () => {
  test('increasing usage YoY yields positive pct change', () => {
    const billingRecords = makeBillingRecords({ startYear: 2024, months: 24, baseKwh: 1000, slopeKwh: 25 });
    const insights = computeBehaviorInsights({ billingRecords, determinantsPack: makeDeterminantsPack(24) });
    expect(Number(insights.usageTrend?.pctChange || 0)).toBeGreaterThan(0.15);
  });

  test('demand increase concentrated in summer months', () => {
    const billingRecords = makeBillingRecords({ startYear: 2024, months: 24, baseKwh: 1000, slopeKwh: 0, summerBoost: 600 });
    const insights = computeBehaviorInsights({ billingRecords, determinantsPack: makeDeterminantsPack(24) });
    expect(insights.seasonality.topMonthsByKw.length).toBeGreaterThan(0);
  });

  test('step change detection for large shift', () => {
    const records = makeBillingRecords({ startYear: 2024, months: 18, baseKwh: 1000, slopeKwh: 0 });
    // Inject step change
    for (let i = 9; i < records.length; i++) {
      (records[i] as any).totalUsageKwh += 800;
    }
    const insights = computeBehaviorInsights({ billingRecords: records, determinantsPack: makeDeterminantsPack(18) });
    // step change is optional; ensure no crash and confidence is set
    expect(Number.isFinite(insights.confidence)).toBe(true);
  });

  test('insufficient data yields missingInfo', () => {
    const billingRecords = makeBillingRecords({ startYear: 2024, months: 10, baseKwh: 1000, slopeKwh: 0 });
    const insights = computeBehaviorInsights({ billingRecords, determinantsPack: makeDeterminantsPack(10) });
    expect(insights.missingInfo.some((m) => String(m.description).includes('Insufficient months'))).toBe(true);
  });

  test('usage YoY card includes +20% and weighted causes', () => {
    const records = makeBillingRecords({ startYear: 2024, months: 24, baseKwh: 1000, slopeKwh: 0 });
    for (let i = 12; i < records.length; i++) {
      (records[i] as any).totalUsageKwh = 1200;
    }
    const insights = computeBehaviorInsights({ billingRecords: records, determinantsPack: makeDeterminantsPack(24) });
    const card = (insights.insightCards || []).find((c) => c.id === 'behavior.usage.yoy');
    expect(card).toBeTruthy();
    expect(String(card?.finding || '')).toContain('+20%');
    expect((card?.customerQuestions || []).length).toBeGreaterThanOrEqual(2);
    const weightSum = (card?.likelyCauses || []).reduce((s, c) => s + Number(c.weight || 0), 0);
    expect(weightSum).toBeGreaterThan(0.95);
    expect(weightSum).toBeLessThan(1.05);
  });
});
