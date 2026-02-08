import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { normalizeIntervals } from '../src/modules/billingEngineV1/interval/normalizeIntervals';
import { calcBill } from '../src/modules/billingEngineV1/calc/calcBill';
import { PGE_SIM_B19_LIKE } from '../src/modules/billingEngineV1/rates/pge_catalog_v1';

describe('billingEngineV1 bill calculation', () => {
  it('identifies the correct max-kW determinant interval', async () => {
    const tz = 'America/Los_Angeles';
    const raw = JSON.parse(
      await readFile(path.join(process.cwd(), 'tests', 'fixtures', 'interval_tiny_hourly_kw.local.json'), 'utf-8')
    ) as any[];

    const norm = normalizeIntervals({ intervals: raw, inputUnit: 'kW', timezone: tz });
    const bill = calcBill({
      intervals: norm.intervals,
      rate: PGE_SIM_B19_LIKE,
      billingPeriod: { start: '2026-01-05T00:00:00-08:00', end: '2026-01-06T00:00:00-08:00' },
      timezoneOverride: tz,
    });

    const monthlyMax = bill.auditTrace.demandDeterminants.find((d) => d.kind === 'monthlyMaxKw');
    expect(monthlyMax?.peakKw).toBe(50);
    expect(monthlyMax?.determinantIntervals[0]?.ts).toContain('2026-01-06T04:00:00.000Z'); // 2026-01-05 20:00 PST

    const touMax = bill.auditTrace.demandDeterminants.find((d) => d.kind === 'touMaxKw');
    expect(touMax?.touLabel).toBe('PEAK');
    expect(touMax?.peakKw).toBe(50);
  });

  it('computes deterministic totals and line items for a tiny fixture', async () => {
    const tz = 'America/Los_Angeles';
    const raw = JSON.parse(
      await readFile(path.join(process.cwd(), 'tests', 'fixtures', 'interval_tiny_hourly_kw.local.json'), 'utf-8')
    ) as any[];

    const norm = normalizeIntervals({ intervals: raw, inputUnit: 'kW', timezone: tz });
    const bill = calcBill({
      intervals: norm.intervals,
      rate: PGE_SIM_B19_LIKE,
      billingPeriod: { start: '2026-01-05T00:00:00-08:00', end: '2026-01-06T00:00:00-08:00' },
      timezoneOverride: tz,
    });

    // kWh totals: 10 + 40 + 50 + 5 = 105 kWh (hourly)
    expect(bill.totals.totalKwh).toBeCloseTo(105, 6);
    expect(bill.totals.peakKw).toBeCloseTo(50, 6);

    // Energy: OFF_PEAK (15kWh @ 0.18) + PEAK (90kWh @ 0.32) = 31.50
    const energyTotal = bill.lineItems.energy.reduce((s, x) => s + x.dollars, 0);
    expect(energyTotal).toBeCloseTo(31.5, 6);

    // Demand: monthlyMax 50kW @ 22.5 + peak TOU 50kW @ 8.0 = 1525.00
    const demandTotal = bill.lineItems.demand.reduce((s, x) => s + x.dollars, 0);
    expect(demandTotal).toBeCloseTo(1525, 6);

    // Fixed: perDay 12.0 * 1 day
    const fixedTotal = bill.lineItems.fixed.reduce((s, x) => s + x.dollars, 0);
    expect(fixedTotal).toBeCloseTo(12, 6);

    expect(bill.totals.totalDollars).toBeCloseTo(1568.5, 6);
  });
});

