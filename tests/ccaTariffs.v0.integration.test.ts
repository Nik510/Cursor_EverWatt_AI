import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';
import { evaluateBatteryEconomicsV1 } from '../src/modules/batteryEconomicsV1/evaluateBatteryEconomicsV1';
import { BatteryEconomicsReasonCodesV1 } from '../src/modules/batteryEconomicsV1/reasons';
import { CcaTariffLibraryReasonCodesV0 } from '../src/modules/ccaTariffLibraryV0/reasons';

function loadText(name: string): string {
  return readFileSync(path.join(process.cwd(), 'tests', 'fixtures', name), 'utf-8');
}

describe('ccaTariffLibraryV0 integration (bill text -> effectiveRateContext -> econ)', () => {
  it('attaches generationTouEnergyPrices for supported CCAs and suppresses missingInfo fallback', async () => {
    const cases = [
      { billTextFile: 'bill_text_cca_ebce.txt', expectLseName: 'East Bay Community Energy' },
      { billTextFile: 'bill_text_cca_svce.txt', expectLseName: 'Silicon Valley Clean Energy' },
      { billTextFile: 'bill_text_cca_cleanpowersf.txt', expectLseName: 'CleanPowerSF' },
    ];

    for (const c of cases) {
      const billPdfText = loadText(c.billTextFile);

      const res = await analyzeUtility(
        {
          orgId: 'o_test',
          projectId: `p_${c.expectLseName.replace(/\s+/g, '_')}`,
          serviceType: 'electric',
          utilityTerritory: 'PGE',
          currentRate: { utility: 'PGE', rateCode: 'E-19' },
          billPdfText,
        } as any,
        {
          nowIso: '2026-02-10T00:00:00.000Z',
          idFactory: () => 'id_fixed',
        },
      );

      const ctx: any = (res.insights as any).effectiveRateContextV1;
      expect(ctx).toBeTruthy();
      expect(ctx.generation.providerType).toBe('CCA');
      expect(ctx.generation.lseName).toBe(c.expectLseName);
      expect(Array.isArray(ctx.generation.generationTouEnergyPrices)).toBe(true);
      expect(ctx.generation.generationTouEnergyPrices.length).toBeGreaterThan(0);

      const missing = Array.isArray((res.insights as any).missingInfo) ? ((res.insights as any).missingInfo as any[]) : [];
      const has = missing.some((it: any) => String(it?.id || '') === 'supply.v1.lse_supported_but_generation_rates_missing');
      expect(has).toBe(false);

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
          supplyLseName: c.expectLseName,
          demandChargePerKwMonthUsd: 20,
          touEnergyPrices: [
            { periodId: 'OFF', startHourLocal: 0, endHourLocalExclusive: 16, days: 'all', pricePerKwh: 0.12 },
            { periodId: 'ON', startHourLocal: 16, endHourLocalExclusive: 21, days: 'all', pricePerKwh: 0.42 },
          ],
          generationTouEnergyPrices: ctx.generation.generationTouEnergyPrices,
          generationSnapshotId: ctx.generation.snapshotId,
          generationRateCode: ctx.generation.rateCode,
        } as any,
        determinants: { billingDemandKw: 250, ratchetDemandKw: null, billingDemandMethod: 'fixture' },
        dispatch: { shiftedKwhAnnual: 5000, peakReductionKwAssumed: 20, dispatchDaysPerYear: 260 },
      });

      expect(out.warnings).not.toContain(BatteryEconomicsReasonCodesV1.BATTERY_ECON_SUPPLY_CCA_GENERATION_RATES_MISSING_FALLBACK);
      expect(out.warnings).toContain(CcaTariffLibraryReasonCodesV0.CCA_V0_ENERGY_ONLY_NO_EXIT_FEES);
    }
  });

  it('keeps missingInfo for unsupported CCA (no deterministic provider mapping)', async () => {
    const billPdfText = loadText('bill_text_cca_unsupported.txt');
    const res = await analyzeUtility(
      {
        orgId: 'o_test',
        projectId: 'p_cca_unsupported',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        currentRate: { utility: 'PGE', rateCode: 'E-19' },
        billPdfText,
      } as any,
      { nowIso: '2026-02-10T00:00:00.000Z', idFactory: () => 'id_fixed' },
    );

    const missing = Array.isArray((res.insights as any).missingInfo) ? ((res.insights as any).missingInfo as any[]) : [];
    const ids = missing.map((it: any) => String(it?.id || '')).filter(Boolean);
    expect(ids).toContain('supply.v1.lse_unsupported');
  });
});

