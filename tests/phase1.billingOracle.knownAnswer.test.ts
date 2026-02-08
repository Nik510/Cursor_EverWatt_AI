import { describe, it, expect } from 'vitest';
import { computeBillDeterministic } from '../src/modules/phase1_tariff/billing/billingOracle';
import type { TariffModel } from '../src/modules/phase1_tariff/types';

describe('Phase 1 billing oracle — known-answer fixture', () => {
  it('computes deterministic bill for simple monthlyMax demand tariff', () => {
    const tariff: TariffModel = {
      version: 'fixture-v1',
      tariffId: 'fixture:monthlyMax',
      rateCode: 'FIXTURE',
      timezone: 'America/Los_Angeles',
      fixedMonthlyChargeUsd: 0,
      energyCharges: [],
      demandDeterminants: [
        {
          id: 'monthly_all',
          name: 'Monthly max demand (all hours)',
          kind: 'monthlyMax',
          tiers: [{ pricePerKw: 10 }], // $10/kW-month
        },
      ],
      meta: { utility: 'PG&E', territory: 'TEST' },
    };

    const intervals = [
      { timestamp: new Date('2026-01-01T00:00:00Z'), kw: 10 },
      { timestamp: new Date('2026-01-01T00:15:00Z'), kw: 25 },
      { timestamp: new Date('2026-01-01T00:30:00Z'), kw: 5 },
    ];

    const out1 = computeBillDeterministic({ tariff, intervals });
    const out2 = computeBillDeterministic({ tariff, intervals });

    // Deterministic: exact repeat
    expect(out1.bill.totalUsd).toBe(out2.bill.totalUsd);

    // Known answer: max demand = 25 kW @ $10/kW-month => $250
    expect(out1.bill.totalUsd).toBeCloseTo(250, 6);
    expect(out1.chargeBreakdown.demandUsd).toBeCloseTo(250, 6);
  });
});

