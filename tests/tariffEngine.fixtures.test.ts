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

  it('assigns TOU windows for every interval and reconciles kWh + energy charges', () => {
    const tariff = TariffModelSchema.parse({
      version: 'fixture-v1',
      tariffId: 'fixture:tou-energy',
      rateCode: 'FIXTURE_TOU',
      utility: 'TEST',
      timezone: 'UTC',
      fixedMonthlyCharge: 0,
      energyCharges: [
        {
          id: 'OFF',
          season: 'all',
          pricePerKwh: 0.1,
          windows: [{ name: 'OFF', startMinute: 0, endMinute: 30, days: 'all' }],
        },
        {
          id: 'ON',
          season: 'all',
          pricePerKwh: 0.2,
          windows: [{ name: 'ON', startMinute: 30, endMinute: 1440, days: 'all' }],
        },
      ],
      demandDeterminants: [],
      ratchets: [],
    });

    const billingPeriods = [
      BillingPeriodSchema.parse({
        cycleId: 'acct:2026-01-01',
        accountId: 'acct',
        billStartDate: '2026-01-01',
        billEndDate: '2026-01-01',
        rateCode: 'FIXTURE_TOU',
      }),
    ];

    const intervals = [
      IntervalRowSchema.parse({ timestamp: '2026-01-01T00:00:00Z', kw: 10 }),
      IntervalRowSchema.parse({ timestamp: '2026-01-01T00:15:00Z', kw: 10 }),
      IntervalRowSchema.parse({ timestamp: '2026-01-01T00:30:00Z', kw: 20 }),
      IntervalRowSchema.parse({ timestamp: '2026-01-01T00:45:00Z', kw: 20 }),
    ];

    const joined = assignIntervalsToBillingCycles({ intervals, billingPeriods });
    expect(joined.qa.unassignedIntervals).toBe(0);

    const out = calculateBillsPerCycle({
      tariff,
      billingPeriods,
      assignedBefore: joined.assigned,
      assignedAfter: joined.assigned,
    });

    const eb = out.cycles[0].energyBreakdown!;
    expect(eb).toBeTruthy();
    expect(eb.reconcile.ok).toBe(true);
    // 4 intervals @ 15 min => OFF kWh = 10*0.25 + 10*0.25 = 5, ON kWh = 20*0.25 + 20*0.25 = 10, total = 15
    expect(eb.intervalMinutes).toBe(15);
    expect(eb.kwhByTouPeriod.OFF).toBeCloseTo(5, 9);
    expect(eb.kwhByTouPeriod.ON).toBeCloseTo(10, 9);
    expect(eb.kwhTotal).toBeCloseTo(15, 9);
    // Charges: 5*$0.10 + 10*$0.20 = 2.5
    expect(eb.chargesByTouPeriod.OFF).toBeCloseTo(0.5, 9);
    expect(eb.chargesByTouPeriod.ON).toBeCloseTo(2.0, 9);
    expect(eb.totalEnergyCharge).toBeCloseTo(2.5, 9);
    // Total equals energy total (no other line items)
    expect(out.cycles[0].total).toBeCloseTo(2.5, 9);
  });

  it('handles DST boundary correctly (America/Los_Angeles) with stable TOU bucketing', () => {
    // 2026-03-08 is DST spring-forward in America/Los_Angeles (02:00 -> 03:00).
    // We use UTC timestamps that map to local 01:45 (PST) and 03:00+ (PDT).
    const tariff = TariffModelSchema.parse({
      version: 'fixture-v1',
      tariffId: 'fixture:dST-la',
      rateCode: 'FIXTURE_DST',
      utility: 'TEST',
      timezone: 'America/Los_Angeles',
      fixedMonthlyCharge: 0,
      energyCharges: [
        { id: 'OFF', season: 'all', pricePerKwh: 0.1, windows: [{ name: 'OFF', startMinute: 0, endMinute: 180, days: 'all' }] },
        { id: 'ON', season: 'all', pricePerKwh: 0.2, windows: [{ name: 'ON', startMinute: 180, endMinute: 1440, days: 'all' }] },
      ],
      demandDeterminants: [],
      ratchets: [],
    });

    const billingPeriods = [
      BillingPeriodSchema.parse({
        cycleId: 'acct:2026-03-08',
        accountId: 'acct',
        billStartDate: '2026-03-08',
        billEndDate: '2026-03-08',
        rateCode: 'FIXTURE_DST',
      }),
    ];

    const intervals = [
      // local 01:45 PST -> OFF
      IntervalRowSchema.parse({ timestamp: '2026-03-08T09:45:00Z', kw: 10 }),
      // local 03:00 PDT -> ON
      IntervalRowSchema.parse({ timestamp: '2026-03-08T10:00:00Z', kw: 20 }),
      IntervalRowSchema.parse({ timestamp: '2026-03-08T10:15:00Z', kw: 20 }),
      IntervalRowSchema.parse({ timestamp: '2026-03-08T10:30:00Z', kw: 20 }),
    ];

    const joined = assignIntervalsToBillingCycles({ intervals, billingPeriods });
    expect(joined.qa.unassignedIntervals).toBe(0);

    const out = calculateBillsPerCycle({
      tariff,
      billingPeriods,
      assignedBefore: joined.assigned,
      assignedAfter: joined.assigned,
    });

    const eb = out.cycles[0].energyBreakdown!;
    expect(eb).toBeTruthy();
    expect(eb.reconcile.ok).toBe(true);
    // kWh: OFF=10*0.25=2.5, ON=20*0.25*3=15, total=17.5
    expect(eb.kwhByTouPeriod.OFF).toBeCloseTo(2.5, 9);
    expect(eb.kwhByTouPeriod.ON).toBeCloseTo(15, 9);
    expect(eb.kwhTotal).toBeCloseTo(17.5, 9);
    // Charges: 2.5*0.1 + 15*0.2 = 3.25
    expect(eb.totalEnergyCharge).toBeCloseTo(3.25, 9);
  });

  it('emits warnings-first unsupported-construct note and returns no partial energy math', () => {
    // Overlapping windows => ambiguous matches => unsupported construct for strict assignment.
    const tariff = TariffModelSchema.parse({
      version: 'fixture-v1',
      tariffId: 'fixture:unsupported-overlap',
      rateCode: 'FIXTURE_UNSUPPORTED',
      utility: 'TEST',
      timezone: 'UTC',
      fixedMonthlyCharge: 0,
      energyCharges: [
        { id: 'A', season: 'all', pricePerKwh: 0.1, windows: [{ name: 'A', startMinute: 0, endMinute: 60, days: 'all' }] },
        { id: 'B', season: 'all', pricePerKwh: 0.2, windows: [{ name: 'B', startMinute: 30, endMinute: 90, days: 'all' }] },
      ],
      demandDeterminants: [],
      ratchets: [],
    });

    const billingPeriods = [
      BillingPeriodSchema.parse({
        cycleId: 'acct:2026-01-01',
        accountId: 'acct',
        billStartDate: '2026-01-01',
        billEndDate: '2026-01-01',
        rateCode: 'FIXTURE_UNSUPPORTED',
      }),
    ];

    const intervals = [
      // 00:45 => matches both A and B
      IntervalRowSchema.parse({ timestamp: '2026-01-01T00:45:00Z', kw: 10 }),
      IntervalRowSchema.parse({ timestamp: '2026-01-01T01:00:00Z', kw: 10 }),
    ];

    const joined = assignIntervalsToBillingCycles({ intervals, billingPeriods });
    expect(joined.qa.unassignedIntervals).toBe(0);

    const out = calculateBillsPerCycle({
      tariff,
      billingPeriods,
      assignedBefore: joined.assigned,
      assignedAfter: joined.assigned,
    });

    expect(out.summary.missingComponentsNotes.join('\n')).toContain('TARIFFENGINE_UNSUPPORTED_CONSTRUCT');
    expect(out.cycles[0].energyBreakdown).toBeUndefined();
    expect(out.cycles[0].lineItems.some((li) => li.kind === 'energy')).toBe(false);
  });
});

