import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { normalizeIntervals } from '../src/modules/billingEngineV1/interval/normalizeIntervals';
import { compareRates } from '../src/modules/billingEngineV1/evaluate/compareRates';
import { PGE_SIM_B19_LIKE, PGE_SIM_DEMAND_LIGHT, PGE_SIM_TOU_COMMERCIAL } from '../src/modules/billingEngineV1/rates/pge_catalog_v1';

describe('billingEngineV1 compareRates', () => {
  it('ranks candidates deterministically and computes deltas vs baseline', async () => {
    const tz = 'America/Los_Angeles';
    const raw = JSON.parse(
      await readFile(path.join(process.cwd(), 'tests', 'fixtures', 'interval_tiny_hourly_kw.local.json'), 'utf-8')
    ) as any[];

    const norm = normalizeIntervals({ intervals: raw, inputUnit: 'kW', timezone: tz });
    const res = compareRates({
      intervals: norm.intervals,
      baseline: PGE_SIM_B19_LIKE,
      candidates: [PGE_SIM_TOU_COMMERCIAL, PGE_SIM_DEMAND_LIGHT],
      timezoneOverride: tz,
    });

    expect(res.baselineRateId).toBe('PGE_SIM_B19_LIKE');
    expect(res.ranked.map((r) => r.rateId)).toEqual(['PGE_SIM_DEMAND_LIGHT', 'PGE_SIM_TOU_COMMERCIAL']);

    const best = res.ranked[0]!;
    const second = res.ranked[1]!;
    expect(best.totalDollars).toBeLessThan(second.totalDollars);
    expect(best.deltaDollarsVsBaseline).toBeLessThan(0);
    expect(Number.isFinite(best.estimatedDeltaDollars)).toBe(true);
  });

  it('returns non-null estimatedDeltaDollars on peaky_office fixture', async () => {
    const tz = 'America/Los_Angeles';
    const raw = JSON.parse(await readFile(path.join(process.cwd(), 'samples', 'interval_peaky_office.json'), 'utf-8')) as any[];
    const norm = normalizeIntervals({ intervals: raw, inputUnit: 'kW', timezone: tz });
    const res = compareRates({
      intervals: norm.intervals,
      baseline: PGE_SIM_B19_LIKE,
      candidates: [PGE_SIM_TOU_COMMERCIAL, PGE_SIM_DEMAND_LIGHT],
      timezoneOverride: tz,
    });
    expect(res.ranked.some((r) => Number.isFinite(r.estimatedDeltaDollars))).toBe(true);
  });
});

