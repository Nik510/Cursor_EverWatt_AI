import { describe, expect, test } from 'vitest';

import { zonedLocalToUtcDate } from '../src/modules/billingEngineV1/time/zonedTime';
import { assignIntervalsToBillingCycles, computeCycleDemandDeterminants, computeIntervalKw } from '../src/modules/determinants/intervalToDemand';
import type { BillingCycleV1 } from '../src/modules/determinants/types';

describe('determinants: intervalToDemand', () => {
  test('computeIntervalKw converts 15-min kWh to kW deterministically', () => {
    const out = computeIntervalKw({ point: { timestampIso: '2026-01-01T00:00:00.000Z', kwh: 10, intervalMinutes: 15 } });
    expect(out.kw).toBeCloseTo(40, 6);
    expect(out.confidence).toBeGreaterThan(0.8);
  });

  test('computeIntervalKw converts 30-min kWh to kW deterministically', () => {
    const out = computeIntervalKw({ point: { timestampIso: '2026-01-01T00:00:00.000Z', kwh: 10, intervalMinutes: 30 } });
    expect(out.kw).toBeCloseTo(20, 6);
  });

  test('assignIntervalsToBillingCycles uses strict inclusion boundaries', () => {
    const tz = 'UTC';
    const cycles: BillingCycleV1[] = [
      { label: 'c1', timezone: tz, startIso: '2026-01-01T00:00:00.000Z', endIso: '2026-01-02T00:00:00.000Z' },
    ];
    const intervals = [
      { timestampIso: '2026-01-01T00:00:00.000Z', kw: 1 }, // included
      { timestampIso: '2026-01-01T23:59:59.000Z', kw: 2 }, // included
      { timestampIso: '2026-01-02T00:00:00.000Z', kw: 3 }, // excluded (end)
    ];

    const out = assignIntervalsToBillingCycles({ intervals, cycles });
    expect(out.assigned[0].intervals.length).toBe(2);
  });

  test('computeCycleDemandDeterminants is DST-safe via cycle boundaries', () => {
    const tz = 'America/Los_Angeles';
    // March 2026 includes DST spring-forward (one hour missing).
    const startUtc = zonedLocalToUtcDate({ local: { year: 2026, month: 3, day: 1, hour: 0, minute: 0, second: 0 }, timeZone: tz });
    const endUtc = zonedLocalToUtcDate({ local: { year: 2026, month: 4, day: 1, hour: 0, minute: 0, second: 0 }, timeZone: tz });
    const cycle: BillingCycleV1 = { label: '2026-03', timezone: tz, startIso: startUtc.toISOString(), endIso: endUtc.toISOString() };

    // Provide a tiny synthetic interval set; expected interval count should reflect UTC duration.
    const intervals = [
      { timestampIso: startUtc.toISOString(), kw: 10 },
      { timestampIso: new Date(startUtc.getTime() + 15 * 60_000).toISOString(), kw: 20 },
    ];

    const det = computeCycleDemandDeterminants({ cycle, intervals, seriesIntervalMinutes: 15 });
    expect(det.intervalMinutes).toBe(15);
    expect(det.kWMax).toBeCloseTo(20, 6);
    expect(det.expectedIntervalCount).toBeGreaterThan(2900); // 15-min for a ~31-day month minus DST hour ≈ 2972
  });
});

