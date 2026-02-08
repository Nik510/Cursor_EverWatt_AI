import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { normalizeIntervals } from '../src/modules/billingEngineV1/interval/normalizeIntervals';
import { calcBillForMonths } from '../src/modules/billingEngineV1/calc/calcBillForMonths';
import { PGE_SIM_DEMAND_LIGHT } from '../src/modules/billingEngineV1/rates/pge_catalog_v1';

describe('billingEngineV1 multi-month grouping', () => {
  it('groups intervals deterministically by local month in America/Los_Angeles', async () => {
    const tz = 'America/Los_Angeles';
    const raw = JSON.parse(
      await readFile(path.join(process.cwd(), 'tests', 'fixtures', 'interval_two_months_hourly_kw.local.json'), 'utf-8')
    ) as any[];

    const norm = normalizeIntervals({ intervals: raw, inputUnit: 'kW', timezone: tz });
    const res = calcBillForMonths({ intervals: norm.intervals, rate: PGE_SIM_DEMAND_LIGHT, timezoneOverride: tz });

    const months = res.months.map((m) => m.month);
    expect(months).toEqual(['2026-01', '2026-02']);
  });
});

