export type ConfidenceTierV1 = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export type RangeEstimateV1 = {
  min: number | null;
  max: number | null;
  method: string;
};

export type StorageEconomicsCapexOverridesV1 = {
  powerCostPerKwUsdRange?: [number, number];
  energyCostPerKwhUsdRange?: [number, number];
  softCostsPctRange?: [number, number];
  omPctOfCapexPerYearRange?: [number, number];
  projectLifeYears?: number;
  discountRateRange?: [number, number];
};

export type StorageEconomicsV1 = {
  /**
   * Legacy-to-canonical bridge fields (additive; derived from batteryEconomicsV1).
   * These are deterministic point estimates (not ranges).
   */
  totalCapexUsd?: number | null;
  opexAnnualUsd?: number | null;
  savingsAnnualUsdTotal?: number | null;
  savingsAnnualUsdComponents?: {
    demandUsd?: number | null;
    energyUsd?: number | null;
    ratchetAvoidedUsd?: number | null;
    drUsd?: number | null;
    otherUsd?: number | null;
  };
  simplePaybackYears?: number | null;
  npvUsd?: number | null;

  assumptions: {
    projectLifeYears: { value: number | null; method: string };
    discountRateRange: { min: number | null; max: number | null; method: string };
    capexModel: {
      powerCostPerKwUsdRange: { min: number | null; max: number | null; method: string };
      energyCostPerKwhUsdRange: { min: number | null; max: number | null; method: string };
      softCostsPctRange: { min: number | null; max: number | null; method: string };
      omPctOfCapexPerYearRange: { min: number | null; max: number | null; method: string };
    };
  };
  capexEstimate: {
    totalCapexUsdRange: [number | null, number | null];
    breakdown: {
      powerComponentRange: [number | null, number | null];
      energyComponentRange: [number | null, number | null];
      softCostsRange: [number | null, number | null];
    };
    capexMethodTag: string;
  };
  opexEstimate: {
    annualOmUsdRange: [number | null, number | null];
    opexMethodTag: string;
  };
  cashflow: {
    annualGrossSavingsUsdRange: [number | null, number | null];
    annualNetSavingsUsdRange: [number | null, number | null];
    savingsMethodTag: string;
  };
  payback: {
    simplePaybackYearsRange: [number | null, number | null];
    paybackMethodTag: string;
  };
  npvLite: {
    npvUsdRange: [number | null, number | null];
    npvMethodTag: string;
  };
  normalizedMetrics: {
    capexPerKwRange: [number | null, number | null];
    capexPerKwhRange: [number | null, number | null];
    annualNetSavingsPerKwRange: [number | null, number | null];
    annualNetSavingsPerKwhRange: [number | null, number | null];
    annualNetSavingsPerAnnualKwhRange: [number | null, number | null];
  };
  confidenceTier: ConfidenceTierV1;
  warnings: string[];
  missingInfo: string[];
  engineVersion: string;
};

export type StorageEconomicsInputsV1 = {
  recommendedConfig: { powerKw: number; energyKwh: number } | null;
  annualGrossSavingsUsdRange: RangeEstimateV1;
  annualNetSavingsUsdRange: RangeEstimateV1;
};

