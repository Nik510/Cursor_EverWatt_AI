import type { BatteryEconomicsCostsV1, BatteryEconomicsFinanceV1 } from './types';
import { batteryEconomicsVersion } from '../engineVersions';

export const batteryEconomicsVersionTagV1 = batteryEconomicsVersion;

export const defaultBatteryCostsV1: Required<BatteryEconomicsCostsV1> = {
  // Conservative placeholder defaults; must be explicitly tagged in audit/assumptions.
  batteryCostPerKwhUsd: 350,
  batteryCostPerKwUsd: 750,
  installAdderPct: 0.25,
  interconnectFlatUsd: 25_000,
  softCostsFlatUsd: 40_000,
  contingencyPct: 0.1,
  omPerKwYrUsd: 10,
  warrantyReservePctOfCapexPerYear: 0.0,
};

export const defaultFinanceV1: Required<BatteryEconomicsFinanceV1> = {
  discountRate: 0.09,
  termYears: 10,
  debtApr: null,
  debtTermMonths: null,
  itcPct: null,
  depreciationMethod: null,
};

