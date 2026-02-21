import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { dispatchV1_1 } from '../src/modules/batteryEngineV1/dispatchV1_1';
import { evaluateBatteryEconomicsV1 } from '../src/modules/batteryEconomicsV1/evaluateBatteryEconomicsV1';

function safeNum(x: unknown): number | null {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return n;
}

function sum(nums: Array<number | null | undefined>): number {
  return nums.reduce((s, x) => s + (safeNum(x) ?? 0), 0);
}

describe('batteryEconomicsV1 v1.1 reconcile invariants (cycle-based, deterministic)', () => {
  it('reconciles savings totals to audit line items (<= $0.01)', () => {
    const pointsPath = path.join(process.cwd(), 'tests', 'fixtures', 'dispatch', 'v1_1', 'shared', 'intervalPoints_2day_hourly_arbitrage.json');
    const points = JSON.parse(readFileSync(pointsPath, 'utf-8')) as any[];

    const cycles = [
      { cycleLabel: '2026-01', cycleStartIso: '2026-01-15T08:00:00.000Z', cycleEndIso: '2026-01-16T08:00:00.000Z', timezone: 'America/Los_Angeles' },
      { cycleLabel: '2026-02', cycleStartIso: '2026-01-16T08:00:00.000Z', cycleEndIso: '2026-01-17T08:00:00.000Z', timezone: 'America/Los_Angeles' },
    ];

    const touEnergyPrices = [
      { periodId: 'OFF', startHourLocal: 0, endHourLocalExclusive: 16, days: 'all' as const, pricePerKwh: 0.1 },
      { periodId: 'ON', startHourLocal: 16, endHourLocalExclusive: 21, days: 'all' as const, pricePerKwh: 0.3 },
      { periodId: 'OFF2', startHourLocal: 21, endHourLocalExclusive: 24, days: 'all' as const, pricePerKwh: 0.12 },
    ];

    const battery = { powerKw: 50, energyKwh: 200, rte: 0.9, minSoc: 0.1, maxSoc: 0.9 };

    const dispatch = dispatchV1_1({
      cycles,
      intervalPointsV1: points as any,
      touEnergyPrices: touEnergyPrices as any,
      battery,
    });

    expect(dispatch.cycles.every((c) => c.dispatchMethod === 'dispatch_v1_1')).toBe(true);
    expect(dispatch.cycles.every((c) => c.ok)).toBe(true);

    // Determinants cycles: include billed demand + ratchet floor for cycle 2.
    const determinantsCycles = dispatch.cycles.map((c) => {
      const kWMax = safeNum(c.demandPeakBeforeKw);
      const billingDemandKw = kWMax;
      const base: any = {
        cycleLabel: c.cycle.cycleLabel,
        cycleStartIso: c.cycle.cycleStartIso,
        cycleEndIso: c.cycle.cycleEndIso,
        kWMax,
        billingDemandKw,
        billingDemandMethod: 'fixture',
      };
      if (c.cycle.cycleLabel === '2026-02') {
        // Apply a binding ratchet floor (history present) to prove it limits savings.
        base.billingDemandMethod = 'pge_ratchet_common_v1';
        base.ratchetHistoryMaxKw = 200;
        base.ratchetFloorPct = 0.9;
      }
      return base;
    });

    const out = evaluateBatteryEconomicsV1({
      battery: { powerKw: 50, energyKwh: 200, roundTripEff: 0.9, usableFraction: null, degradationPctYr: null },
      costs: null,
      finance: null,
      dr: null,
      tariffs: {
        snapshotId: 'snap_test_1',
        rateCode: 'TEST-TOU',
        timezone: 'America/Los_Angeles',
        demandChargePerKwMonthUsd: 20,
        touEnergyPrices: touEnergyPrices as any,
      },
      determinants: {
        cycles: determinantsCycles as any,
      } as any,
      dispatch: {
        cycles: dispatch.cycles.map((c) => ({
          cycleLabel: c.cycle.cycleLabel,
          cycleStartIso: c.cycle.cycleStartIso,
          cycleEndIso: c.cycle.cycleEndIso,
          dispatchMethod: c.dispatchMethod,
          ok: c.ok,
          kwhChargedByTou: c.kwhChargedByTou,
          kwhDischargedByTou: c.kwhDischargedByTou,
          netKwhShiftedByTou: c.netKwhShiftedByTou,
          demandPeakBeforeKw: c.demandPeakBeforeKw,
          demandPeakAfterKw: c.demandPeakAfterKw,
          peakTimestampIso: c.peakTimestampIso,
          warnings: c.warnings,
        })) as any,
      },
    });

    const lineItems = Array.isArray(out.audit?.lineItems) ? out.audit.lineItems : [];

    const get = (id: string): any => lineItems.find((li: any) => String(li?.id || '') === id) || null;
    const total = get('savings.totalAnnual');
    const energyAnnual = get('savings.energyAnnual');
    const demandAnnual = get('savings.demandAnnual');
    expect(total).toBeTruthy();
    expect(energyAnnual).toBeTruthy();
    expect(demandAnnual).toBeTruthy();

    const energyTouItems = lineItems.filter((li: any) => String(li?.id || '').startsWith('savings.energyShift.cycle.') && String(li?.id || '').includes('.tou.'));
    const demandCycleItems = lineItems.filter((li: any) => String(li?.id || '').startsWith('savings.demand.cycle.'));

    const sumEnergyTou = sum(energyTouItems.map((li: any) => safeNum(li?.amountUsdRaw)));
    const sumDemandCycles = sum(demandCycleItems.map((li: any) => safeNum(li?.amountUsdRaw)));

    expect(sumEnergyTou).toBeCloseTo(safeNum(energyAnnual?.amountUsdRaw) ?? 0, 6);
    expect(sumDemandCycles).toBeCloseTo(safeNum(demandAnnual?.amountUsdRaw) ?? 0, 6);

    const componentsSum = sum([
      safeNum(demandAnnual?.amountUsdRaw),
      safeNum(energyAnnual?.amountUsdRaw),
      safeNum(get('savings.ratchetAvoidedAnnual')?.amountUsdRaw),
      safeNum(get('savings.drAnnual')?.amountUsdRaw),
      safeNum(get('savings.otherAnnual')?.amountUsdRaw),
    ]);

    expect(Math.abs(componentsSum - (safeNum(total?.amountUsdRaw) ?? 0))).toBeLessThanOrEqual(0.01);
  });
});

