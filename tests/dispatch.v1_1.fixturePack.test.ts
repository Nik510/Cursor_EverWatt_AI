import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { dispatchV1_1 } from '../src/modules/batteryEngineV1/dispatchV1_1';

type DispatchFixture = {
  caseId: string;
  cycles: Array<{ cycleLabel: string; cycleStartIso: string; cycleEndIso: string; timezone: string }>;
  intervalPointsFile?: string;
  dailyProfileBuckets?: Array<{ bucketStartHourLocal: number; avgKw: number }>;
  touEnergyPrices?: Array<{ periodId: string; startHourLocal: number; endHourLocalExclusive: number; days: 'all' | 'weekday' | 'weekend'; pricePerKwh: number }>;
  generationTouEnergyPrices?: Array<{ periodId: string; startHourLocal: number; endHourLocalExclusive: number; days: 'all' | 'weekday' | 'weekend'; pricePerKwh: number }>;
  generationAllInTouEnergyPrices?: Array<{ periodId: string; startHourLocal: number; endHourLocalExclusive: number; days: 'all' | 'weekday' | 'weekend'; pricePerKwh: number }>;
  generationAllInWithExitFeesTouPrices?: Array<{ periodId: string; startHourLocal: number; endHourLocalExclusive: number; days: 'all' | 'weekday' | 'weekend'; pricePerKwh: number }>;
  supplyProviderType?: 'CCA' | 'DA' | null;
  battery: { powerKw: number; energyKwh: number; rte: number; minSoc: number; maxSoc: number };
  expect?: {
    okAllCycles?: boolean;
    warningsMustContain?: string[];
    checksByCycleLabel?: Record<
      string,
      {
        demandPeakAfterLtBefore?: boolean;
        chargedTouMustContain?: string[];
        dischargedTouMustContain?: string[];
        netTouMustContain?: string[];
        dischargedKwhOnTouEq?: Record<string, number>;
        chargedKwhOnTouEq?: Record<string, number>;
      }
    >;
  };
};

function safeNum(x: unknown): number | null {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return n;
}

function sumVals(obj: Record<string, number> | null | undefined): number {
  const xs = obj && typeof obj === 'object' ? Object.values(obj) : [];
  return xs.reduce((s, x) => s + (safeNum(x) ?? 0), 0);
}

function resolveRepoPath(rel: string): string {
  const raw = String(rel || '').trim();
  if (!raw) return '';
  const normalized = raw.replace(/\\/g, '/');
  return path.join(process.cwd(), ...normalized.split('/'));
}

describe('dispatch_v1_1 fixture pack (deterministic)', () => {
  it('matches all dispatch v1.1 fixture expectations (fast)', () => {
    const casesDir = path.join(process.cwd(), 'tests', 'fixtures', 'dispatch', 'v1_1', 'cases');
    const files = [
      '01_full_interval_tou.json',
      '02_flat_prices_zero_arbitrage.json',
      '03_demand_only_no_tou.json',
      '04_missing_interval.json',
      '05_bucket_only_shape.json',
      '06_ambiguous_tou_windows.json',
      '07_generation_prices_preferred.json',
      '08_supply_da_delivery_fallback_warn.json',
    ];
    expect(files.length).toBeGreaterThanOrEqual(7);

    for (const f of files) {
      const fixturePath = path.join(casesDir, f);
      const fx = JSON.parse(readFileSync(fixturePath, 'utf-8')) as DispatchFixture;

      const points = (() => {
        const fp = fx.intervalPointsFile ? resolveRepoPath(String(fx.intervalPointsFile)) : null;
        if (!fp) return null;
        return JSON.parse(readFileSync(fp, 'utf-8')) as any[];
      })();

      const out = dispatchV1_1({
        cycles: fx.cycles,
        intervalPointsV1: points as any,
        dailyProfileBuckets: fx.dailyProfileBuckets || null,
        touEnergyPrices: (fx.touEnergyPrices as any) || null,
        generationTouEnergyPrices: (fx.generationTouEnergyPrices as any) || null,
        generationAllInTouEnergyPrices: (fx.generationAllInTouEnergyPrices as any) || null,
        generationAllInWithExitFeesTouPrices: (fx.generationAllInWithExitFeesTouPrices as any) || null,
        supplyProviderType: (fx.supplyProviderType as any) ?? null,
        battery: fx.battery,
      });

      // Deterministic: one result per cycle.
      expect(out.cycles.length).toBe(fx.cycles.length);

      if (fx.expect?.okAllCycles != null) {
        const ok = out.cycles.every((c) => c.ok === fx.expect!.okAllCycles);
        expect(ok).toBe(true);
      }

      if (Array.isArray(fx.expect?.warningsMustContain)) {
        for (const w of fx.expect!.warningsMustContain!) expect(out.warnings).toContain(String(w));
      }

      // Basic invariants: maps reconcile by key union.
      for (const c of out.cycles) {
        const net = c.netKwhShiftedByTou || {};
        const discharge = c.kwhDischargedByTou || {};
        const charge = c.kwhChargedByTou || {};
        const keys = Array.from(new Set([...Object.keys(net), ...Object.keys(discharge), ...Object.keys(charge)]));
        for (const k of keys) {
          const n = safeNum(net[k]) ?? 0;
          const d = safeNum(discharge[k]) ?? 0;
          const ch = safeNum(charge[k]) ?? 0;
          expect(n).toBeCloseTo(d - ch, 6);
        }
      }

      const checks = fx.expect?.checksByCycleLabel || {};
      for (const [label, ex] of Object.entries(checks)) {
        const c = out.cycles.find((x) => x.cycle.cycleLabel === label);
        expect(c).toBeTruthy();
        if (!c) continue;

        if (ex.demandPeakAfterLtBefore === true) {
          expect(safeNum(c.demandPeakBeforeKw)).not.toBeNull();
          expect(safeNum(c.demandPeakAfterKw)).not.toBeNull();
          expect(Number(c.demandPeakAfterKw)).toBeLessThan(Number(c.demandPeakBeforeKw));
        }

        for (const must of ex.chargedTouMustContain || []) expect(Object.keys(c.kwhChargedByTou || {})).toContain(String(must));
        for (const must of ex.dischargedTouMustContain || []) expect(Object.keys(c.kwhDischargedByTou || {})).toContain(String(must));
        for (const must of ex.netTouMustContain || []) expect(Object.keys(c.netKwhShiftedByTou || {})).toContain(String(must));

        for (const [pid, v] of Object.entries(ex.dischargedKwhOnTouEq || {})) {
          expect(Number(c.kwhDischargedByTou?.[pid] ?? 0)).toBeCloseTo(Number(v), 6);
        }
        for (const [pid, v] of Object.entries(ex.chargedKwhOnTouEq || {})) {
          expect(Number(c.kwhChargedByTou?.[pid] ?? 0)).toBeCloseTo(Number(v), 6);
        }
      }

      // Smoke: non-negative totals.
      for (const c of out.cycles) {
        expect(sumVals(c.kwhChargedByTou)).toBeGreaterThanOrEqual(0);
        expect(sumVals(c.kwhDischargedByTou)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

