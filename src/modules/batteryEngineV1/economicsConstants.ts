import { incentivesStubVersion, storageEconomicsVersion } from '../engineVersions';

export const storageEconomicsVersionTagV1 = storageEconomicsVersion;
export const incentivesStubVersionTagV1 = incentivesStubVersion;

export const defaultCapexModelV1 = {
  powerCostPerKwUsdRange: [500, 1200] as const,
  energyCostPerKwhUsdRange: [200, 500] as const,
  softCostsPctRange: [0.05, 0.2] as const,
  omPctOfCapexPerYearRange: [0.01, 0.03] as const,
  projectLifeYears: 10 as const,
  discountRateRange: [0.06, 0.12] as const,
} as const;

