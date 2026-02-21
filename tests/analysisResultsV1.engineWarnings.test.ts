import { describe, expect, it } from 'vitest';

import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';

function makeIntervals(args: { startIso: string; count: number; minutes: number; kw: number }): Array<{ timestampIso: string; kw: number }> {
  const startMs = new Date(args.startIso).getTime();
  const stepMs = args.minutes * 60_000;
  const out: Array<{ timestampIso: string; kw: number }> = [];
  for (let i = 0; i < args.count; i++) {
    out.push({ timestampIso: new Date(startMs + i * stepMs).toISOString(), kw: args.kw });
  }
  return out;
}

describe('engineWarnings surface (best-effort, no silent failures)', () => {
  it('emits engineWarnings on controlled internal failure and still returns a valid shape', async () => {
    const nowIso = '2026-02-10T00:00:00.000Z';
    const intervalKwSeries = makeIntervals({ startIso: '2026-02-01T00:00:00.000Z', count: 120, minutes: 15, kw: 10 });

    const res = await analyzeUtility(
      {
        orgId: 'user:test',
        projectId: 'proj:test',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        currentRate: { utility: 'PGE', rateCode: 'E-19' },
      },
      {
        nowIso,
        intervalKwSeries,
        weatherProvider: {
          async getWeatherSeries() {
            throw new Error('boom');
          },
        },
      }
    );

    expect(res.insights).toBeTruthy();
    expect(Array.isArray(res.insights.engineWarnings)).toBe(true);
    expect(res.insights.engineWarnings?.some((w) => w.code === 'UIE_WEATHER_REGRESSION_FAILED')).toBe(true);
    const w = res.insights.engineWarnings?.find((x) => x.code === 'UIE_WEATHER_REGRESSION_FAILED');
    expect(w?.exceptionName).toBe('Error');
    expect(typeof w?.module).toBe('string');
    expect(typeof w?.operation).toBe('string');
    expect(typeof w?.contextKey).toBe('string');
  });
});

