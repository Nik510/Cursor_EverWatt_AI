import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';
import { evaluateBatteryEconomicsV1 } from '../src/modules/batteryEconomicsV1/evaluateBatteryEconomicsV1';
import { BatteryEconomicsReasonCodesV1 } from '../src/modules/batteryEconomicsV1/reasons';
import { CcaAddersLibraryReasonCodesV0 } from '../src/modules/ccaAddersLibraryV0/reasons';
import { CcaTariffLibraryReasonCodesV0 } from '../src/modules/ccaTariffLibraryV0/reasons';

function loadText(name: string): string {
  return readFileSync(path.join(process.cwd(), 'tests', 'fixtures', name), 'utf-8');
}

describe('ccaTariffLibraryV0 integration (bill text -> effectiveRateContext -> econ)', () => {
  it('attaches all-in generation TOU prices when adders are available', async () => {
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
          billingSummary: {
            monthly: [{ start: '2026-01-15', end: '2026-02-15', kWh: 1000, dollars: 250 }],
          },
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
      expect(Array.isArray(ctx.generation.generationAllInTouEnergyPrices)).toBe(true);
      expect(ctx.generation.generationAllInTouEnergyPrices.length).toBe(ctx.generation.generationTouEnergyPrices.length);
      expect(Number(ctx.generation.generationAddersPerKwhTotal)).toBeGreaterThan(0);

      expect(Array.isArray(ctx.warnings)).toBe(true);
      expect(ctx.warnings).not.toContain(CcaTariffLibraryReasonCodesV0.CCA_V0_ENERGY_ONLY_NO_EXIT_FEES);
      expect(ctx.warnings).not.toContain(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_MISSING);

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
          generationAllInTouEnergyPrices: ctx.generation.generationAllInTouEnergyPrices,
          generationAddersPerKwhTotal: ctx.generation.generationAddersPerKwhTotal,
          generationAddersSnapshotId: ctx.generation.generationAddersSnapshotId,
          generationSnapshotId: ctx.generation.snapshotId,
          generationRateCode: ctx.generation.rateCode,
        } as any,
        determinants: { billingDemandKw: 250, ratchetDemandKw: null, billingDemandMethod: 'fixture' },
        dispatch: { shiftedKwhAnnual: 5000, peakReductionKwAssumed: 20, dispatchDaysPerYear: 260 },
      });

      expect(out.warnings).not.toContain(BatteryEconomicsReasonCodesV1.BATTERY_ECON_SUPPLY_CCA_GENERATION_RATES_MISSING_FALLBACK);
      expect(out.warnings).not.toContain(CcaTariffLibraryReasonCodesV0.CCA_V0_ENERGY_ONLY_NO_EXIT_FEES);

      const items = Array.isArray(out.audit?.lineItems) ? out.audit.lineItems : [];
      const energyAnnual = items.find((li: any) => String(li?.id || '') === 'savings.energyAnnual') || null;
      expect(energyAnnual).toBeTruthy();
      expect(String((energyAnnual as any)?.rateSource?.kind || '')).toBe('CCA_GENERATION_V0_ALL_IN');
    }
  });

  it('keeps energy-only warning when adders are missing', async () => {
    const billPdfText = loadText('bill_text_cca_ebce.txt');

    const res = await analyzeUtility(
      {
        orgId: 'o_test',
        projectId: 'p_EBCE_missing_adders',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        currentRate: { utility: 'PGE', rateCode: 'E-19' },
        billingRecords: [{ billStartDate: '2026-02-15', billEndDate: '2026-03-15' }],
        billingSummary: {
          monthly: [{ start: '2026-02-15', end: '2026-03-15', kWh: 1000, dollars: 250 }],
        },
        billPdfText,
      } as any,
      { nowIso: '2026-02-10T00:00:00.000Z', idFactory: () => 'id_fixed' },
    );

    const ctx: any = (res.insights as any).effectiveRateContextV1;
    expect(ctx).toBeTruthy();
    expect(ctx.generation.providerType).toBe('CCA');
    expect(ctx.generation.lseName).toBe('East Bay Community Energy');
    expect(Array.isArray(ctx.generation.generationTouEnergyPrices)).toBe(true);
    expect(ctx.generation.generationTouEnergyPrices.length).toBeGreaterThan(0);
    expect(ctx.generation.generationAllInTouEnergyPrices == null).toBe(true);
    expect(ctx.warnings).toContain(CcaTariffLibraryReasonCodesV0.CCA_V0_ENERGY_ONLY_NO_EXIT_FEES);
    expect(ctx.warnings).toContain(CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_MISSING);
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

