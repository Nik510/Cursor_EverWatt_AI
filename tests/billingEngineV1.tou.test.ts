import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { normalizeIntervals } from '../src/modules/billingEngineV1/interval/normalizeIntervals';
import { mapTou } from '../src/modules/billingEngineV1/tou/mapTou';
import { PGE_SIM_B19_LIKE } from '../src/modules/billingEngineV1/rates/pge_catalog_v1';

describe('billingEngineV1 TOU mapping', () => {
  it('maps known local timestamps into expected TOU labels (weekday)', async () => {
    const tz = 'America/Los_Angeles';
    const raw = JSON.parse(
      await readFile(path.join(process.cwd(), 'tests', 'fixtures', 'interval_tiny_hourly_kw.local.json'), 'utf-8')
    ) as any[];

    const norm = normalizeIntervals({ intervals: raw, inputUnit: 'kW', timezone: tz });
    const res = mapTou({ intervals: norm.intervals, rate: PGE_SIM_B19_LIKE, timezoneOverride: tz });

    const valid = res.intervals.filter((x) => x.isValid);
    expect(valid).toHaveLength(4);

    // Based on PGE_SIM_B19_LIKE definition:
    // - OFF_PEAK: 0-16, 21-24 (weekday)
    // - PEAK: 16-21 (weekday)
    const labels = valid.map((x) => x.touLabel);
    expect(labels).toEqual(['OFF_PEAK', 'PEAK', 'PEAK', 'OFF_PEAK']);
  });
});

