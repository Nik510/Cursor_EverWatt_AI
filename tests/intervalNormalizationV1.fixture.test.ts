import { describe, expect, it } from 'vitest';

import { normalizeIntervalInputsV1 } from '../src/modules/utilityIntelligence/intervalNormalizationV1/normalizeIntervalInputsV1';

describe('intervalNormalizationV1.normalizeIntervalInputsV1 (fixtures)', () => {
  it('returns null when inputs are missing', () => {
    expect(normalizeIntervalInputsV1({} as any)).toBeNull();
    expect(normalizeIntervalInputsV1({ intervalKwSeries: null, intervalPointsV1: null } as any)).toBeNull();
  });

  it('normalizes intervalKwSeries only (deterministic sort + coverage)', () => {
    const res = normalizeIntervalInputsV1({
      intervalKwSeries: [
        { timestampIso: '2026-01-02T00:00:00.000Z', kw: 2 },
        { timestampIso: '2026-01-01T00:00:00.000Z', kw: 1 },
      ],
    });

    expect(res).toBeTruthy();
    expect(res!.seriesKw).toEqual([
      { tsIso: '2026-01-01T00:00:00.000Z', kw: 1 },
      { tsIso: '2026-01-02T00:00:00.000Z', kw: 2 },
    ]);
    expect(res!.coverage.startIso).toBe('2026-01-01T00:00:00.000Z');
    expect(res!.coverage.endIso).toBe('2026-01-02T00:00:00.000Z');
    expect(res!.coverage.points).toBe(2);
    expect(res!.coverage.days).toBe(1);
    expect(res!.granularityMinutes).toBeNull();
  });

  it('normalizes intervalPointsV1 only (kWh -> kW conversion, prefers explicit kW)', () => {
    const res = normalizeIntervalInputsV1({
      intervalPointsV1: [
        { timestampIso: '2026-01-01T00:15:00.000Z', intervalMinutes: 15, kWh: 0.25 }, // derived => 1.0 kW
        { timestampIso: '2026-01-01T00:30:00.000Z', intervalMinutes: 15, kWh: 999, kW: 4 }, // explicit kW wins
      ],
    });

    expect(res).toBeTruthy();
    expect(res!.seriesKw).toEqual([
      { tsIso: '2026-01-01T00:15:00.000Z', kw: 1 },
      { tsIso: '2026-01-01T00:30:00.000Z', kw: 4 },
    ]);
    expect(res!.granularityMinutes).toBe(15);
    expect(res!.coverage.points).toBe(2);
  });

  it('sorts out-of-order timestamps and keeps stable ordering for duplicates', () => {
    const res = normalizeIntervalInputsV1({
      intervalKwSeries: [
        { timestampIso: '2026-01-01T00:00:00.000Z', kw: 10 },
        { timestampIso: '2026-01-02T00:00:00.000Z', kw: 20 },
        { timestampIso: '2026-01-01T00:00:00.000Z', kw: 11 }, // duplicate timestamp; must remain after first duplicate
        { timestampIso: '2026-01-01T00:00:00.000Z', kw: 12 }, // duplicate timestamp; must remain after second duplicate
      ],
    });

    expect(res).toBeTruthy();
    expect(res!.seriesKw).toEqual([
      { tsIso: '2026-01-01T00:00:00.000Z', kw: 10 },
      { tsIso: '2026-01-01T00:00:00.000Z', kw: 11 },
      { tsIso: '2026-01-01T00:00:00.000Z', kw: 12 },
      { tsIso: '2026-01-02T00:00:00.000Z', kw: 20 },
    ]);
  });
});

