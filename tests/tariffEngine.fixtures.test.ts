import { describe, it, expect } from 'vitest';
import { TariffModelSchema, BillingPeriodSchema, IntervalRowSchema } from '../src/modules/tariffEngine/schema';
import { assignIntervalsToBillingCycles } from '../src/modules/tariffEngine/join';
import { calculateBillsPerCycle } from '../src/modules/tariffEngine/billing';

describe('tariffEngine fixtures', () => {
  it('joins all intervals into billing cycles (no unassigned)', () => {
    const billingPeriods = [
      BillingPeriodSchema.parse({
        cycleId: 'acct:2026-01-31',
        accountId: 'acct',
        billStartDate: '2026-01-01',
        billEndDate: '2026-01-31',
        rateCode: 'TEST',
      }),
    ];

    const intervals = [
      IntervalRowSchema.parse({ timestamp: '2026-01-01T00:00:00Z', kw: 10 }),
      IntervalRowSchema.parse({ timestamp: '2026-01-15T12:00:00Z', kw: 50 }),
      IntervalRowSchema.parse({ timestamp: '2026-01-31T23:45:00Z', kw: 20 }),
    ];

    const { qa } = assignIntervalsToBillingCycles({ intervals, billingPeriods });
    expect(qa.unassignedIntervals).toBe(0);
    expect(qa.intervalsPerCycle['acct:2026-01-31']).toBe(3);
  });

  it('computes tiered demand charge deterministically', () => {
    const tariff = TariffModelSchema.parse({
      version: 'fixture-v1',
      tariffId: 'fixture:tiered',
      rateCode: 'FIXTURE',
      utility: 'TEST',
      timezone: 'UTC',
      fixedMonthlyCharge: 0,
      energyCharges: [],
      demandDeterminants: [
        {
          id: 'demand_peak',
          name: 'Peak demand',
          kind: 'peak',
          tiers: [
            { upToKw: 10, pricePerKw: 1 },
            { upToKw: 20, pricePerKw: 2 },
            { pricePerKw: 3 },
          ],
        },
      ],
      ratchets: [],
    });

    const billingPeriods = [
      BillingPeriodSchema.parse({
        cycleId: 'acct:2026-01-31',
        accountId: 'acct',
        billStartDate: '2026-01-01',
        billEndDate: '2026-01-31',
        rateCode: 'FIXTURE',
      }),
    ];

    const intervals = [
      IntervalRowSchema.parse({ timestamp: '2026-01-10T00:00:00Z', kw: 25 }),
      IntervalRowSchema.parse({ timestamp: '2026-01-10T00:15:00Z', kw: 5 }),
    ];

    const beforeAssign = assignIntervalsToBillingCycles({ intervals, billingPeriods });
    expect(beforeAssign.qa.unassignedIntervals).toBe(0);

    const out = calculateBillsPerCycle({
      tariff,
      billingPeriods,
      assignedBefore: beforeAssign.assigned,
      assignedAfter: beforeAssign.assigned,
    });

    // Tiered cost for 25 kW:
    // - first 10 @ $1 => 10
    // - next 10 @ $2 => 20
    // - remaining 5 @ $3 => 15
    // total = 45
    expect(out.cycles[0].total).toBeCloseTo(45, 6);
  });
});

