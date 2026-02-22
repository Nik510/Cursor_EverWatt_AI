import { describe, expect, it } from 'vitest';

import { normalizeIntervalInputsV1 } from '../src/modules/utilityIntelligence/intervalNormalizationV1/normalizeIntervalInputsV1';
import { stableSnapshotStringifyV1 } from '../src/modules/testing/goldenSnapshotsV1/stableSnapshotJsonV1';
import { runTruthEngineV1 } from '../src/modules/truthEngineV1/runTruthEngineV1';

type IntervalPointV1 = { timestampIso: string; intervalMinutes: number; kW?: number; kWh?: number; temperatureF?: number };

function stableNorm(x: unknown): any {
  return JSON.parse(stableSnapshotStringifyV1(x, 0));
}

function makeIntervalPoints(args: {
  startIso: string;
  days: number;
  intervalMinutes: number;
  withTemperature: boolean;
  scheduleShiftDay?: number | null;
  baseloadDriftKwPerDay?: number;
  spike?: { day: number; hour: number; addKw: number } | null;
}): IntervalPointV1[] {
  const startMs = Date.parse(args.startIso);
  if (!Number.isFinite(startMs)) throw new Error('bad startIso');
  const intervalMinutes = Math.max(5, Math.trunc(args.intervalMinutes));
  const stepMs = intervalMinutes * 60_000;
  const totalSteps = Math.max(0, Math.trunc((args.days * 24 * 60) / intervalMinutes));
  const out: IntervalPointV1[] = [];

  for (let i = 0; i < totalSteps; i++) {
    const ms = startMs + i * stepMs;
    const d = new Date(ms);
    const dayIndex = Math.floor((ms - startMs) / 86_400_000);
    const dow = d.getUTCDay(); // deterministic for fixtures
    const hour = d.getUTCHours();

    const isWeekend = dow === 0 || dow === 6;
    const businessHour = hour >= 8 && hour < 18;

    const base0 = 25;
    const drift = Number(args.baseloadDriftKwPerDay || 0) * dayIndex;
    let kw = base0 + drift;

    const shiftDay = args.scheduleShiftDay ?? null;
    const scheduleShifted = shiftDay !== null && dayIndex >= shiftDay;

    if (businessHour && (!isWeekend || scheduleShifted)) kw += 45; // occupied bump
    if (hour >= 0 && hour < 5) kw -= 8; // night setback

    if (args.spike && args.spike.day === dayIndex && args.spike.hour === hour) kw += args.spike.addKw;

    kw = Math.max(0, kw);

    const temperatureF = args.withTemperature ? 60 + 12 * Math.sin((2 * Math.PI * dayIndex) / 14) : undefined;
    out.push({
      timestampIso: d.toISOString(),
      intervalMinutes,
      kW: kw,
      ...(args.withTemperature ? { temperatureF } : {}),
    });
  }

  return out;
}

describe('truthEngineV1 fixtures (deterministic, bounded)', () => {
  it('stable schedule with weather produces regression baseline + non-empty residual peaks', () => {
    const pts = makeIntervalPoints({
      startIso: '2026-01-01T00:00:00.000Z',
      days: 35,
      intervalMinutes: 15,
      withTemperature: true,
    });
    const normalized = normalizeIntervalInputsV1({ intervalPointsV1: pts as any });
    const snap = runTruthEngineV1({
      generatedAtIso: '2026-03-01T00:00:00.000Z',
      normalizedIntervalV1: normalized,
      intervalPointsV1: pts as any,
      hasBillText: true,
    });

    expect(snap.baselineModelV1.modelKind).toBe('INTERVAL_WEATHER_HOURLY_REGRESSION_V1');
    expect(Array.isArray(snap.residualMapsV1.peakResidualHours)).toBe(true);
    expect(snap.residualMapsV1.hourlyResidualByDow).toHaveLength(7);
    expect(snap.residualMapsV1.hourlyResidualByDow[0]).toHaveLength(24);
    expect(stableNorm(snap)).toMatchSnapshot();
  });

  it('schedule shift yields a SCHEDULE_SHIFT changepoint', () => {
    const pts = makeIntervalPoints({
      startIso: '2026-01-01T00:00:00.000Z',
      days: 42,
      intervalMinutes: 15,
      withTemperature: true,
      scheduleShiftDay: 21,
    });
    const normalized = normalizeIntervalInputsV1({ intervalPointsV1: pts as any });
    const snap = runTruthEngineV1({
      generatedAtIso: '2026-03-01T00:00:00.000Z',
      normalizedIntervalV1: normalized,
      intervalPointsV1: pts as any,
      hasBillText: false,
    });
    expect(snap.changepointsV1.some((c) => c.type === 'SCHEDULE_SHIFT')).toBe(true);
    expect(stableNorm(snap)).toMatchSnapshot();
  });

  it('baseload drift yields a DRIFT anomaly (when long enough)', () => {
    const pts = makeIntervalPoints({
      startIso: '2026-01-01T00:00:00.000Z',
      days: 56,
      intervalMinutes: 60,
      withTemperature: true,
      baseloadDriftKwPerDay: 0.35,
    });
    const normalized = normalizeIntervalInputsV1({ intervalPointsV1: pts as any });
    const snap = runTruthEngineV1({
      generatedAtIso: '2026-03-01T00:00:00.000Z',
      normalizedIntervalV1: normalized,
      intervalPointsV1: pts as any,
      hasBillText: false,
    });
    expect(snap.anomalyLedgerV1.some((a) => a.class === 'DRIFT')).toBe(true);
    expect(stableNorm(snap)).toMatchSnapshot();
  });

  it('missing weather falls back to interval-only seasonal profile baseline', () => {
    const pts = makeIntervalPoints({
      startIso: '2026-01-01T00:00:00.000Z',
      days: 30,
      intervalMinutes: 60,
      withTemperature: false,
    });
    const normalized = normalizeIntervalInputsV1({ intervalPointsV1: pts as any });
    const snap = runTruthEngineV1({
      generatedAtIso: '2026-03-01T00:00:00.000Z',
      normalizedIntervalV1: normalized,
      intervalPointsV1: pts as any,
      hasBillText: true,
    });
    expect(snap.baselineModelV1.modelKind).toBe('INTERVAL_PROFILE_SEASONAL_V1');
    expect(snap.truthWarnings.includes('truth.baseline.missing_weather_daily')).toBe(true);
    expect(stableNorm(snap)).toMatchSnapshot();
  });

  it('short interval coverage gates to lower confidence', () => {
    const pts = makeIntervalPoints({
      startIso: '2026-01-01T00:00:00.000Z',
      days: 5,
      intervalMinutes: 15,
      withTemperature: false,
    });
    const normalized = normalizeIntervalInputsV1({ intervalPointsV1: pts as any });
    const snap = runTruthEngineV1({
      generatedAtIso: '2026-03-01T00:00:00.000Z',
      normalizedIntervalV1: normalized,
      intervalPointsV1: pts as any,
      hasBillText: false,
    });
    expect(['B', 'C']).toContain(snap.truthConfidence.tier);
    expect(stableNorm(snap)).toMatchSnapshot();
  });
});

