import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';
import { evaluateBatteryEconomicsV1 } from '../src/modules/batteryEconomicsV1/evaluateBatteryEconomicsV1';
import { BatteryEconomicsReasonCodesV1 } from '../src/modules/batteryEconomicsV1/reasons';

describe('SSA v1 integration (deterministic)', () => {
  it('analyzeUtility attaches effectiveRateContextV1 and stable missingInfo entries', async () => {
    const pointsPath = path.join(process.cwd(), 'tests', 'fixtures', 'batteryDecisionPack', 'v1', 'shared', 'intervalPoints_2days_hourly.json');
    const points = JSON.parse(readFileSync(pointsPath, 'utf-8')) as any[];

    const billPdfText = `PG&E
Rate Schedule: E-19

SF Clean Energy (San Francisco Clean Energy) generation charges.
`;

    const res = await analyzeUtility(
      {
        orgId: 'o_test',
        projectId: 'p_ssa_1',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        currentRate: { utility: 'PGE', rateCode: 'E-19' },
        billPdfText,
      } as any,
      {
        intervalPointsV1: points as any,
        nowIso: '2026-02-10T00:00:00.000Z',
        idFactory: () => 'id_fixed',
      },
    );

    const ctx: any = (res.insights as any).effectiveRateContextV1;
    expect(ctx).toBeTruthy();
    expect(ctx.method).toBe('ssa_v1');
    expect(ctx.iou.rateCode).toBe('E-19');
    expect(ctx.generation.providerType).toBe('CCA');
    expect(ctx.generation.lseName).toBe('CleanPowerSF');

    const missing = Array.isArray((res.insights as any).missingInfo) ? ((res.insights as any).missingInfo as any[]) : [];
    const has = missing.some((it: any) => String(it?.id || '') === 'supply.v1.lse_supported_but_generation_rates_missing');
    expect(has).toBe(true);
  });

  it('batteryEconomics warns + falls back when CCA detected but generation rates missing', () => {
    const out = evaluateBatteryEconomicsV1({
      battery: { powerKw: 100, energyKwh: 200, roundTripEff: 0.9, usableFraction: null, degradationPctYr: null },
      costs: null,
      finance: null,
      dr: null,
      tariffs: {
        snapshotId: 'snap_delivery_1',
        rateCode: 'E-19',
        timezone: 'America/Los_Angeles',
        supplyProviderType: 'CCA',
        supplyLseName: 'CleanPowerSF',
        demandChargePerKwMonthUsd: 20,
        touEnergyPrices: [
          { periodId: 'OFF', startHourLocal: 0, endHourLocalExclusive: 16, days: 'all', pricePerKwh: 0.12 },
          { periodId: 'ON', startHourLocal: 16, endHourLocalExclusive: 21, days: 'all', pricePerKwh: 0.42 },
        ],
        generationTouEnergyPrices: null,
        generationSnapshotId: null,
        generationRateCode: null,
      } as any,
      determinants: { billingDemandKw: 250, ratchetDemandKw: null, billingDemandMethod: 'fixture' },
      dispatch: { shiftedKwhAnnual: 5000, peakReductionKwAssumed: 20, dispatchDaysPerYear: 260 },
    });

    expect(out.warnings).toContain(BatteryEconomicsReasonCodesV1.BATTERY_ECON_SUPPLY_CCA_GENERATION_RATES_MISSING_FALLBACK);
    expect(Number(out.savingsAnnual.energyUsd || 0)).toBeGreaterThan(0);

    const lineItems = Array.isArray(out.audit?.lineItems) ? out.audit.lineItems : [];
    const energy = lineItems.find((li: any) => String(li?.id || '') === 'savings.energyAnnual');
    expect(energy).toBeTruthy();
    expect(String((energy as any)?.sourcePath || '')).toBe('inputs.tariffs.touEnergyPrices');
  });
});

