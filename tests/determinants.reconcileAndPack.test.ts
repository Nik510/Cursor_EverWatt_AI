import { describe, expect, test } from 'vitest';

import type { ComprehensiveBillRecord } from '../src/utils/utility-data-types';
import { reconcileBillingRecordsV1 } from '../src/modules/determinants/reconcile';
import { buildDeterminantsPackV1 } from '../src/modules/determinants/buildDeterminantsPack';
import type { BillingCycleDeterminantsV1 } from '../src/modules/determinants/types';

describe('determinants: reconciliation + pack', () => {
  test('reconcileBillingRecords flags demand mismatch above threshold', () => {
    const computed: BillingCycleDeterminantsV1[] = [
      {
        cycle: { label: '2026-01', timezone: 'UTC', startIso: '2026-01-01T00:00:00.000Z', endIso: '2026-02-01T00:00:00.000Z' },
        energy: { kwhTotal: 1000 },
        demand: { intervalMinutes: 15, kWMax: 80, intervalCount: 10, expectedIntervalCount: 10, coveragePct: 1 },
        evidence: [],
        because: [],
        missingInfo: [],
        confidence: 0.9,
      },
    ];
    const billingRecords: ComprehensiveBillRecord[] = [
      {
        billStartDate: new Date('2026-01-01T00:00:00.000Z'),
        billEndDate: new Date('2026-02-01T00:00:00.000Z'),
        maxMaxDemandKw: 100,
        totalUsageKwh: 1000,
      } as any,
    ];

    const out = reconcileBillingRecordsV1({ billingRecords, computedCycles: computed, mismatchThresholdPct: 0.15 });
    expect(out.demandMismatchCount).toBe(1);
    expect(out.missingInfo.some((m) => String(m.description).toLowerCase().includes('demand mismatch'))).toBe(true);
  });

  test('reconcileBillingRecords skips newest usage month when intervals end earlier', () => {
    const computed: BillingCycleDeterminantsV1[] = [
      {
        cycle: { label: '2026-01', timezone: 'UTC', startIso: '2026-01-01T00:00:00.000Z', endIso: '2026-02-01T00:00:00.000Z' },
        energy: { kwhTotal: 1000 },
        demand: { intervalMinutes: 60, kWMax: 50, intervalCount: 720, expectedIntervalCount: 720, coveragePct: 1 },
        evidence: [],
        because: [],
        missingInfo: [],
        confidence: 0.9,
      },
      {
        cycle: { label: '2026-02', timezone: 'UTC', startIso: '2026-02-01T00:00:00.000Z', endIso: '2026-03-01T00:00:00.000Z' },
        energy: { kwhTotal: 900 },
        demand: { intervalMinutes: 60, kWMax: 48, intervalCount: 672, expectedIntervalCount: 672, coveragePct: 1 },
        evidence: [],
        because: [],
        missingInfo: [],
        confidence: 0.9,
      },
      {
        cycle: { label: '2026-03', timezone: 'UTC', startIso: '2026-03-01T00:00:00.000Z', endIso: '2026-04-01T00:00:00.000Z' },
        energy: { kwhTotal: 5000 },
        demand: { intervalMinutes: 60, kWMax: 200, intervalCount: 744, expectedIntervalCount: 744, coveragePct: 1 },
        evidence: [],
        because: [],
        missingInfo: [],
        confidence: 0.9,
      },
    ];
    const billingRecords: ComprehensiveBillRecord[] = [
      { billStartDate: new Date('2026-01-01T00:00:00.000Z'), billEndDate: new Date('2026-02-01T00:00:00.000Z'), maxMaxDemandKw: 50, totalUsageKwh: 1000 } as any,
      { billStartDate: new Date('2026-02-01T00:00:00.000Z'), billEndDate: new Date('2026-03-01T00:00:00.000Z'), maxMaxDemandKw: 48, totalUsageKwh: 900 } as any,
      { billStartDate: new Date('2026-03-01T00:00:00.000Z'), billEndDate: new Date('2026-04-01T00:00:00.000Z'), maxMaxDemandKw: 200, totalUsageKwh: 9999 } as any,
    ];

    const out = reconcileBillingRecordsV1({
      billingRecords,
      computedCycles: computed,
      intervalWindow: { intervalStartIso: '2026-01-01T00:00:00.000Z', intervalEndIso: '2026-03-01T00:00:00.000Z' },
      mismatchThresholdPct: 0.1,
    });

    expect(out.kwhMismatchCount).toBe(0);
    expect(out.skippedCycleCountByReason?.out_of_overlap_window).toBe(1);
    const march = out.matches.find((m) => m.cycleLabel === '2026-03');
    expect(march?.reconcileSkipReason).toBe('out_of_overlap_window');
  });

  test('reconcileBillingRecords skips when usage missing for interval-derived cycle', () => {
    const computed: BillingCycleDeterminantsV1[] = [
      {
        cycle: { label: '2026-01', timezone: 'UTC', startIso: '2026-01-01T00:00:00.000Z', endIso: '2026-02-01T00:00:00.000Z' },
        energy: { kwhTotal: 1000 },
        demand: { intervalMinutes: 60, kWMax: 50, intervalCount: 720, expectedIntervalCount: 720, coveragePct: 1 },
        evidence: [],
        because: [],
        missingInfo: [],
        confidence: 0.9,
      },
      {
        cycle: { label: '2026-02', timezone: 'UTC', startIso: '2026-02-01T00:00:00.000Z', endIso: '2026-03-01T00:00:00.000Z' },
        energy: { kwhTotal: 900 },
        demand: { intervalMinutes: 60, kWMax: 48, intervalCount: 672, expectedIntervalCount: 672, coveragePct: 1 },
        evidence: [],
        because: [],
        missingInfo: [],
        confidence: 0.9,
      },
    ];
    const billingRecords: ComprehensiveBillRecord[] = [
      { billStartDate: new Date('2026-01-01T00:00:00.000Z'), billEndDate: new Date('2026-02-01T00:00:00.000Z'), maxMaxDemandKw: 50, totalUsageKwh: 1000 } as any,
    ];

    const out = reconcileBillingRecordsV1({
      billingRecords,
      computedCycles: computed,
      intervalWindow: { intervalStartIso: '2026-01-01T00:00:00.000Z', intervalEndIso: '2026-03-01T00:00:00.000Z' },
    });

    expect(out.skippedCycleCountByReason?.no_usage).toBe(1);
    const feb = out.matches.find((m) => m.cycleLabel === '2026-02');
    expect(feb?.reconcileSkipReason).toBe('no_usage');
    expect(out.missingInfo.some((m) => String(m.description).includes('Billing records missing for reconciliation'))).toBe(true);
  });

  test('reconcileBillingRecords skips when coverage is below 90%', () => {
    const computed: BillingCycleDeterminantsV1[] = [
      {
        cycle: { label: '2026-02-15', timezone: 'UTC', startIso: '2026-02-01T00:00:00.000Z', endIso: '2026-03-01T00:00:00.000Z' },
        energy: { kwhTotal: 5000 },
        demand: {
          intervalMinutes: 15,
          kWMax: 200,
          intervalCount: 100,
          expectedIntervalCount: 200,
          coveragePct: 0.5,
          firstIntervalTs: '2026-02-10T00:00:00.000Z',
          lastIntervalTs: '2026-02-12T23:45:00.000Z',
        },
        evidence: [],
        because: [],
        missingInfo: [],
        confidence: 0.9,
      },
    ];
    const billingRecords: ComprehensiveBillRecord[] = [
      {
        billStartDate: new Date('2026-02-01T00:00:00.000Z'),
        billEndDate: new Date('2026-03-01T00:00:00.000Z'),
        maxMaxDemandKw: 300,
        totalUsageKwh: 8000,
      } as any,
    ];

    const out = reconcileBillingRecordsV1({ billingRecords, computedCycles: computed, mismatchThresholdPct: 0.1 });
    expect(out.demandMismatchCount).toBe(0);
    expect(out.kwhMismatchCount).toBe(0);
    expect(out.missingInfo.some((m) => String(m.description).includes('Insufficient interval coverage'))).toBe(true);
    expect(out.missingInfo.some((m) => String(m.description).toLowerCase().includes('mismatch'))).toBe(false);
    expect(out.matches[0].notes.join(' ').toLowerCase()).toContain('reconciliation skipped');
  });

  test('buildDeterminantsPackV1 returns stable multi-meter shape', () => {
    const tz = 'UTC';
    const billingRecords: ComprehensiveBillRecord[] = [
      {
        saId: 'm1',
        meterNumber: 'm1',
        billStartDate: new Date('2026-01-01T00:00:00.000Z'),
        billEndDate: new Date('2026-02-01T00:00:00.000Z'),
        billingDays: 31,
        maxMaxDemandKw: 50,
        totalUsageKwh: 500,
      } as any,
      {
        saId: 'm2',
        meterNumber: 'm2',
        billStartDate: new Date('2026-01-01T00:00:00.000Z'),
        billEndDate: new Date('2026-02-01T00:00:00.000Z'),
        billingDays: 31,
        maxMaxDemandKw: 70,
        totalUsageKwh: 700,
      } as any,
    ];

    const pack = buildDeterminantsPackV1({
      utility: 'PGE',
      rateCode: 'B-19',
      supplyType: 'bundled',
      timezone: tz,
      billingRecords,
      intervalSeries: [
        {
          meterId: 'm1',
          intervalMinutes: 60,
          timezone: tz,
          source: 'test',
          points: [
            { timestampIso: '2026-01-01T00:00:00.000Z', kw: 10 },
            { timestampIso: '2026-01-01T01:00:00.000Z', kw: 20 },
          ],
        },
        {
          meterId: 'm2',
          intervalMinutes: 60,
          timezone: tz,
          source: 'test',
          points: [
            { timestampIso: '2026-01-01T00:00:00.000Z', kw: 11 },
            { timestampIso: '2026-01-01T01:00:00.000Z', kw: 33 },
          ],
        },
      ],
    });

    expect(pack.utility).toBe('PGE');
    expect(pack.rateCode).toBe('B-19');
    expect(pack.rulesVersionTag).toMatch(/determinants:v1/);
    expect(pack.meters.length).toBe(2);
    expect(pack.meters.map((m) => m.meterId).sort()).toEqual(['m1', 'm2']);
  });

  test('pack emits missingInfo when intervalMinutes is unknown and only kW is provided', () => {
    const tz = 'UTC';
    const pack = buildDeterminantsPackV1({
      utility: 'PGE',
      rateCode: 'B-19',
      supplyType: 'bundled',
      timezone: tz,
      billingRecords: [],
      intervalSeries: [
        {
          meterId: 'site',
          timezone: tz,
          source: 'test',
          points: [{ timestampIso: '2026-01-01T00:00:00.000Z', kw: 10 }],
        },
      ],
    });

    // kWhTotal cannot be derived without intervalMinutes; should be surfaced as MissingInfo.
    expect(pack.missingInfo.some((m) => String(m.id).includes('intervalMinutes'))).toBe(true);
  });
});

