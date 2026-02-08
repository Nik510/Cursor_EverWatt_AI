import { describe, it, expect } from 'vitest';

import { simulateBillSimV2 } from '../src/modules/billingEngineV2/simulateBillV2';

describe('billingEngineV2: PG&E canon families (audit-first)', () => {
  it('computes fixed + demand line items deterministically and returns MissingInfo for missing TOU kWh', () => {
    const pack: any = {
      utility: 'PGE',
      rateCode: 'B-19',
      meters: [
        {
          meterId: 'm1',
          cycles: [
            {
              cycle: { label: '2026-01-31', startIso: '2026-01-01T00:00:00.000Z', endIso: '2026-02-01T00:00:00.000Z', timezone: 'America/Los_Angeles' },
              energy: { kwhTotal: 1000 },
              demand: { kWMax: 100, billingDemandKw: 90, kWMaxByTouPeriod: { onPeak: 80, offPeak: 70 } },
              evidence: [],
              because: [],
              missingInfo: [],
              confidence: 0.9,
            },
          ],
        },
      ],
      confidenceSummary: { confidence: 1, because: [] },
      missingInfo: [],
      warnings: [],
      determinantsVersionTag: 'x',
      touLabelerVersionTag: 'y',
      rulesVersionTag: 'z',
    };

    const sim = simulateBillSimV2({ determinantsPack: pack, tariffMetadata: { utility: 'PGE', rateCode: 'B-19', sourceUrl: 'x', lastVerifiedAt: 'x', isEverWattCanonicalBusiness: true, isBusinessRelevant: true } as any });
    expect(sim).toBeTruthy();
    const c0 = sim!.meters[0].cycles[0];
    expect(c0.totals.fixedDollars).toBeGreaterThan(0);
    expect(c0.totals.demandDollars).toBeGreaterThan(0);
    expect(c0.totals.energyDollars).toBeNull(); // missing kwhByTouPeriod
    expect(c0.totals.isPartial).toBe(true);
    expect(Array.isArray(c0.partialReasons)).toBe(true);
    expect(Array.isArray(c0.missingDeterminants)).toBe(true);
    expect(c0.missingDeterminants).toContain('energy.kwhByTouPeriod');
    expect(c0.lineItems.some((li) => li.type === 'fixed')).toBe(true);
    expect(c0.lineItems.some((li) => li.type === 'demand')).toBe(true);
    expect(c0.missingInfo.some((mi: any) => String(mi.id).includes('billSimV2.energy.kwhByTouPeriod.missing'))).toBe(true);
  });

  it('computes TOU energy when kwhByTouPeriod is provided', () => {
    const pack: any = {
      utility: 'PGE',
      rateCode: 'B-20',
      meters: [
        {
          meterId: 'm1',
          cycles: [
            {
              cycle: { label: '2026-01-31', startIso: '2026-01-01T00:00:00.000Z', endIso: '2026-02-01T00:00:00.000Z', timezone: 'America/Los_Angeles' },
              energy: { kwhTotal: 1000, kwhByTouPeriod: { offPeak: 700, onPeak: 300 } },
              demand: { kWMax: 100, billingDemandKw: 90, kWMaxByTouPeriod: { onPeak: 80, offPeak: 70 } },
              evidence: [],
              because: [],
              missingInfo: [],
              confidence: 0.9,
            },
          ],
        },
      ],
      confidenceSummary: { confidence: 1, because: [] },
      missingInfo: [],
      warnings: [],
      determinantsVersionTag: 'x',
      touLabelerVersionTag: 'y',
      rulesVersionTag: 'z',
    };

    const sim = simulateBillSimV2({ determinantsPack: pack, tariffMetadata: { utility: 'PGE', rateCode: 'B-20', sourceUrl: 'x', lastVerifiedAt: 'x', isEverWattCanonicalBusiness: true, isBusinessRelevant: true } as any });
    const c0 = sim!.meters[0].cycles[0];
    expect(c0.totals.energyDollars).not.toBeNull();
    expect(c0.lineItems.some((li) => li.type === 'energy')).toBe(true);
  });

  it('selects latest contiguous 12 reconcilable cycles when reconciliation matches exist', () => {
    const cycles: any[] = [];
    const matches: any[] = [];
    for (let i = 0; i < 14; i++) {
      const y = 2025 + Math.floor(i / 12);
      const m = (i % 12) + 1;
      const startIso = new Date(Date.UTC(y, m - 1, 1)).toISOString();
      const endIso = new Date(Date.UTC(y, m, 1)).toISOString();
      const label = `${y}-${String(m).padStart(2, '0')}`;
      cycles.push({
        cycle: { label, startIso, endIso, timezone: 'UTC' },
        energy: { kwhTotal: 1000, kwhByTouPeriod: { offPeak: 700, onPeak: 300 } },
        demand: { kWMax: 100, billingDemandKw: 90, kWMaxByTouPeriod: { onPeak: 80, offPeak: 70 } },
        evidence: [],
        because: [],
        missingInfo: [],
        confidence: 0.9,
      });
      matches.push({ cycleLabel: label, startIso, endIso, computedKwh: 1000, isReconcilable: true, notes: [], evidence: [] });
    }
    const pack: any = {
      utility: 'PGE',
      rateCode: 'B-19',
      meters: [{ meterId: 'm1', cycles, reconciliation: { matches, demandMismatchCount: 0, kwhMismatchCount: 0, missingInfo: [], warnings: [], confidenceImpact: 1 } }],
      confidenceSummary: { confidence: 1, because: [] },
      missingInfo: [],
      warnings: [],
      determinantsVersionTag: 'x',
      touLabelerVersionTag: 'y',
      rulesVersionTag: 'z',
    };
    const sim = simulateBillSimV2({ determinantsPack: pack, tariffMetadata: { utility: 'PGE', rateCode: 'B-19', sourceUrl: 'x', lastVerifiedAt: 'x', isEverWattCanonicalBusiness: true, isBusinessRelevant: true } as any });
    expect(sim!.meters[0].cycles.length).toBe(12);
    // Should include the latest cycle label and exclude the oldest two.
    const labels = sim!.meters[0].cycles.map((c: any) => String(c.cycleLabel));
    expect(labels).toContain('2026-02');
    expect(labels).not.toContain('2025-01');
    expect(labels).not.toContain('2025-02');
  });
});

