import { describe, expect, test } from 'vitest';

import { analyzeLoadAttributionV1 } from '../src/modules/loadAttribution/analyzeLoadAttribution';

describe('loadAttribution: change-point regression', () => {
  test('A) synthetic cooling-driven dataset recovers Tb and slopes deterministically', () => {
    const Tb = 70;
    const base = 50;
    const coolSlope = 2.0;
    const heatSlope = 0.0;

    const points: Array<{ kw: number; temperatureF: number }> = [];
    for (let i = 0; i < 1500; i++) {
      const t = 50 + (40 * i) / 1499; // 50..90
      const noise = 0.25 * Math.sin(i * 0.17); // deterministic pseudo-noise
      const kw = base + coolSlope * Math.max(0, t - Tb) + heatSlope * Math.max(0, Tb - t) + noise;
      points.push({ temperatureF: t, kw });
    }

    const out = analyzeLoadAttributionV1({ points, tbSearch: { minF: 40, maxF: 85, stepF: 1 }, minPoints: 1000, minTempStddevF: 3 });
    expect(out.status).toBe('ok');
    expect(out.hasWeather).toBe(true);
    expect(out.modelType).toBe('change_point_v0');
    expect(out.classification).toBe('cooling_driven');
    expect(out.balanceTempF).toBeGreaterThanOrEqual(68);
    expect(out.balanceTempF).toBeLessThanOrEqual(72);
    expect(Number(out.coolingSlopeKwPerF)).toBeGreaterThan(0.5);
    expect(Number(out.heatingSlopeKwPerF)).toBeLessThan(0.2);
    expect(Number(out.r2)).toBeGreaterThan(0.4);
  });

  test('B) missing weather returns no_weather + MissingInfo', () => {
    const points = Array.from({ length: 1200 }, (_, i) => ({ kw: 10 + i * 0.001 }));
    const out = analyzeLoadAttributionV1({ points: points as any });
    expect(out.status).toBe('no_weather');
    expect(out.missingInfo.length).toBeGreaterThan(0);
  });

  test('C) insufficient data returns insufficient_data', () => {
    const points: Array<{ kw: number; temperatureF: number }> = [];
    for (let i = 0; i < 100; i++) points.push({ temperatureF: 70 + (i % 2) * 0.1, kw: 50 }); // tiny temp variance
    const out = analyzeLoadAttributionV1({ points, minPoints: 1000, minTempStddevF: 3 });
    expect(out.status).toBe('insufficient_data');
    expect(out.missingInfo.length).toBeGreaterThan(0);
  });
});

