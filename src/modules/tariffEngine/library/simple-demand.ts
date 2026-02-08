import type { TariffModel } from '../schema';

/**
 * Deterministic fallback tariff model:
 * - Single demand determinant over the entire billing cycle
 * - No energy charges modeled (explicitly reported as missing in reconciliation)
 *
 * This lets the system compute per-billing-cycle savings deterministically while
 * clearly surfacing what components are not yet modeled.
 */
export function makeSimpleDemandTariff(args: {
  rateCode: string;
  utility: string;
  demandRatePerKwMonth: number;
  timezone?: string;
}): TariffModel {
  const { rateCode, utility, demandRatePerKwMonth } = args;
  return {
    version: 'simple-demand-v1',
    tariffId: `${utility}:${rateCode}:simple-demand-v1`,
    rateCode,
    utility,
    region: undefined,
    eligibilityNotes: 'Fallback demand-only model (energy charges not modeled).',
    timezone: args.timezone || 'UTC',
    fixedMonthlyCharge: 0,
    energyCharges: [],
    demandDeterminants: [
      {
        id: 'demand_peak',
        name: 'Peak demand (billing)',
        kind: 'peak',
        windows: undefined,
        tiers: [{ upToKw: undefined, pricePerKw: demandRatePerKwMonth }],
      },
    ],
    ratchets: [],
  };
}

