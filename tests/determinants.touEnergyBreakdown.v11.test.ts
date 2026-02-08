import { describe, it, expect } from 'vitest';

import { buildDeterminantsPackV1 } from '../src/modules/determinants/buildDeterminantsPack';
import { simulateBillSimV2 } from '../src/modules/billingEngineV2/simulateBillV2';

function iv(args: { ts: string; intervalMinutes: number; kW?: number; kWh?: number }) {
  return { timestampIso: args.ts, intervalMinutes: args.intervalMinutes, ...(Number.isFinite(args.kW as any) ? { kW: args.kW } : {}), ...(Number.isFinite(args.kWh as any) ? { kWh: args.kWh } : {}) };
}

describe('Determinants v1.1: derive kWhByTouPeriod from interval TOU labeling', () => {
  it('computes kwhByTouPeriod from interval kW only (15-min) with deterministic TOU labels', () => {
    const tz = 'America/Los_Angeles';
    const cycle = { startIso: '2026-01-05T08:00:00.000Z', endIso: '2026-01-06T08:00:00.000Z', label: '2026-01-05', timezone: tz };
    // Off-peak local 10:00 => 18:00Z; Peak local 17:00 => 01:00Z (next day)
    const points = [
      iv({ ts: '2026-01-05T18:00:00.000Z', intervalMinutes: 15, kW: 100 }),
      iv({ ts: '2026-01-05T18:15:00.000Z', intervalMinutes: 15, kW: 100 }),
      iv({ ts: '2026-01-05T18:30:00.000Z', intervalMinutes: 15, kW: 100 }),
      iv({ ts: '2026-01-05T18:45:00.000Z', intervalMinutes: 15, kW: 100 }),
      iv({ ts: '2026-01-06T01:00:00.000Z', intervalMinutes: 15, kW: 200 }),
      iv({ ts: '2026-01-06T01:15:00.000Z', intervalMinutes: 15, kW: 200 }),
      iv({ ts: '2026-01-06T01:30:00.000Z', intervalMinutes: 15, kW: 200 }),
      iv({ ts: '2026-01-06T01:45:00.000Z', intervalMinutes: 15, kW: 200 }),
    ];

    const pack = buildDeterminantsPackV1({
      utility: 'PGE',
      rateCode: 'B-19',
      timezone: tz,
      billingCyclesByMeter: { m1: [cycle as any] },
      intervalSeries: [{ meterId: 'm1', points, timezone: tz, source: 'test' } as any],
    });

    const c0 = pack.meters[0].cycles[0];
    expect(c0.energy.kwhByTouPeriodSource).toBe('computed');
    expect(Number(c0.energy.kwhByTouPeriod?.offPeak)).toBeCloseTo(100, 6);
    expect(Number(c0.energy.kwhByTouPeriod?.onPeak)).toBeCloseTo(200, 6);
    expect(Array.isArray(c0.energy.touLabelsObserved)).toBe(true);
    expect(c0.energy.touLabelsObserved?.includes('OFF_PEAK')).toBe(true);
    expect(c0.energy.touLabelsObserved?.includes('PEAK')).toBe(true);
    expect(c0.energy.unusedTouBuckets?.includes('partialPeak')).toBe(true);
    expect(c0.energy.unusedTouBuckets?.includes('superOffPeak')).toBe(true);
  });

  it('computes kwhByTouPeriod from interval kWh only (15-min)', () => {
    const tz = 'America/Los_Angeles';
    const cycle = { startIso: '2026-01-05T08:00:00.000Z', endIso: '2026-01-06T08:00:00.000Z', label: '2026-01-05', timezone: tz };
    const points = [
      iv({ ts: '2026-01-05T18:00:00.000Z', intervalMinutes: 15, kWh: 25 }),
      iv({ ts: '2026-01-05T18:15:00.000Z', intervalMinutes: 15, kWh: 25 }),
      iv({ ts: '2026-01-06T01:00:00.000Z', intervalMinutes: 15, kWh: 50 }),
      iv({ ts: '2026-01-06T01:15:00.000Z', intervalMinutes: 15, kWh: 50 }),
    ];

    const pack = buildDeterminantsPackV1({
      utility: 'PGE',
      rateCode: 'B-20',
      timezone: tz,
      billingCyclesByMeter: { m1: [cycle as any] },
      intervalSeries: [{ meterId: 'm1', points, timezone: tz, source: 'test' } as any],
    });

    const c0 = pack.meters[0].cycles[0];
    expect(c0.energy.kwhByTouPeriodSource).toBe('computed');
    expect(Number(c0.energy.kwhByTouPeriod?.offPeak)).toBeCloseTo(50, 6);
    expect(Number(c0.energy.kwhByTouPeriod?.onPeak)).toBeCloseTo(100, 6);
  });

  it('mismatch cross-check emits MissingInfo but keeps computed primary', () => {
    const tz = 'America/Los_Angeles';
    const cycle = { startIso: '2026-01-05T08:00:00.000Z', endIso: '2026-01-06T08:00:00.000Z', label: '2026-01-05', timezone: tz };
    const points = [iv({ ts: '2026-01-05T18:00:00.000Z', intervalMinutes: 15, kW: 100 }), iv({ ts: '2026-01-06T01:00:00.000Z', intervalMinutes: 15, kW: 200 })];

    const pack = buildDeterminantsPackV1({
      utility: 'PGE',
      rateCode: 'E-19',
      timezone: tz,
      billingCyclesByMeter: { m1: [cycle as any] },
      intervalSeries: [{ meterId: 'm1', points, timezone: tz, source: 'test' } as any],
      observedTouEnergyByMeterAndCycle: {
        m1: {
          '2026-01-05': { values: { offPeak: 10, onPeak: 10 } }, // force large mismatch
        },
      } as any,
    });

    const c0 = pack.meters[0].cycles[0];
    expect(c0.energy.kwhByTouPeriodSource).toBe('computed');
    expect(c0.missingInfo.some((mi: any) => String(mi.id).includes('determinants.tou.energy.mismatch'))).toBe(true);
  });

  it('low coverage (<90%) emits MissingInfo and billSimV2 remains partial', () => {
    const tz = 'America/Los_Angeles';
    const cycle = { startIso: '2026-01-01T00:00:00.000Z', endIso: '2026-01-31T00:00:00.000Z', label: '2026-01-31', timezone: tz };
    const points = [iv({ ts: '2026-01-05T18:00:00.000Z', intervalMinutes: 15, kW: 100 }), iv({ ts: '2026-01-06T01:00:00.000Z', intervalMinutes: 15, kW: 200 })];

    const pack = buildDeterminantsPackV1({
      utility: 'PGE',
      rateCode: 'B-19',
      timezone: tz,
      billingCyclesByMeter: { m1: [cycle as any] },
      intervalSeries: [{ meterId: 'm1', points, timezone: tz, source: 'test' } as any],
    });

    const c0 = pack.meters[0].cycles[0];
    expect(c0.missingInfo.some((mi: any) => String(mi.id).includes('determinants.tou.energy.coverage.low'))).toBe(true);

    const sim = simulateBillSimV2({ determinantsPack: pack as any, tariffMetadata: { utility: 'PGE', rateCode: 'B-19', sourceUrl: 'x', lastVerifiedAt: 'x', isEverWattCanonicalBusiness: true, isBusinessRelevant: true } as any });
    const s0 = sim!.meters[0].cycles[0];
    expect(Number.isFinite(Number(s0.totals.energyDollars))).toBe(true);
    expect(s0.totals.isPartial).toBe(true);
  });

  it('end-to-end: kwhByTouPeriod enables non-zero TOU energy dollars in billSimV2', () => {
    const tz = 'America/Los_Angeles';
    // Tight cycle window to ensure interval coverage >= 90% for this fixture.
    const cycle = { startIso: '2026-01-05T18:00:00.000Z', endIso: '2026-01-05T19:00:00.000Z', label: '2026-01-05', timezone: tz };
    const points = [
      iv({ ts: '2026-01-05T18:00:00.000Z', intervalMinutes: 15, kW: 100 }),
      iv({ ts: '2026-01-05T18:15:00.000Z', intervalMinutes: 15, kW: 100 }),
      iv({ ts: '2026-01-05T18:30:00.000Z', intervalMinutes: 15, kW: 200 }),
      iv({ ts: '2026-01-05T18:45:00.000Z', intervalMinutes: 15, kW: 200 }),
    ];

    const pack = buildDeterminantsPackV1({
      utility: 'PGE',
      rateCode: 'B-19',
      timezone: tz,
      billingCyclesByMeter: { m1: [cycle as any] },
      intervalSeries: [{ meterId: 'm1', points, timezone: tz, source: 'test' } as any],
    });

    const sim = simulateBillSimV2({ determinantsPack: pack as any, tariffMetadata: { utility: 'PGE', rateCode: 'B-19', sourceUrl: 'x', lastVerifiedAt: 'x', isEverWattCanonicalBusiness: true, isBusinessRelevant: true } as any });
    const s0 = sim!.meters[0].cycles[0];
    expect(s0.totals.energyDollars).not.toBeNull();
    expect(Number(s0.totals.energyDollars)).toBeGreaterThan(0);
    expect(s0.totals.isPartial).toBe(false);
  });
});

