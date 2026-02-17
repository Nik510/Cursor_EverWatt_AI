export type ConfidenceTierV1 = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export type BatteryEconomicsBatteryV1 = {
  powerKw?: number | null;
  energyKwh?: number | null;
  roundTripEff?: number | null;
  usableFraction?: number | null;
  degradationPctYr?: number | null;
};

export type BatteryEconomicsCostsV1 = {
  batteryCostPerKwhUsd?: number | null;
  batteryCostPerKwUsd?: number | null;
  installAdderPct?: number | null;
  interconnectFlatUsd?: number | null;
  softCostsFlatUsd?: number | null;
  contingencyPct?: number | null;
  omPerKwYrUsd?: number | null;
  warrantyReservePctOfCapexPerYear?: number | null;
};

export type BatteryEconomicsTariffSignalsV1 = {
  snapshotId?: string | null;
  /**
   * Optional timezone for interpreting TOU windows.
   * Note: economics v1 does not itself localize intervals; this is carried for audit/provenance only.
   */
  timezone?: string | null;
  /** If present, treated as $/kW-month. */
  demandChargePerKwMonthUsd?: number | null;
  /** If present, treated as a representative on/off pair for arbitrage. */
  energyPriceOnPeakUsdPerKwh?: number | null;
  energyPriceOffPeakUsdPerKwh?: number | null;
  /**
   * Optional TOU energy price windows (preferred over on/off proxy when present).
   * Deterministic arbitrage uses max/min prices (no guessing about dispatch schedule).
   */
  touEnergyPrices?: Array<{
    periodId: string;
    startHourLocal: number;
    endHourLocalExclusive: number;
    days: 'all' | 'weekday' | 'weekend';
    pricePerKwh: number;
  }> | null;
};

export type BatteryEconomicsDeterminantsSignalsV1 = {
  ratchetDemandKw?: number | null;
  billingDemandKw?: number | null;
  billingDemandMethod?: string | null;
  /** Optional ratchet history maximum (kW) for annual ratchet modeling (lite). */
  ratchetHistoryMaxKw?: number | null;
  /** Optional ratchet floor percent (0..1) for annual ratchet modeling (lite). */
  ratchetFloorPct?: number | null;
};

export type BatteryEconomicsDispatchSignalsV1 = {
  /** Annual discharged/shifted energy (kWh). */
  shiftedKwhAnnual?: number | null;
  /** Conservative assumed peak kW reduction possible. */
  peakReductionKwAssumed?: number | null;
  /** Optional dispatch days per year used to compute shiftedKwhAnnual, for audit. */
  dispatchDaysPerYear?: number | null;
};

export type BatteryEconomicsDrSignalsV1 = {
  annualValueUsd?: number | null;
};

export type BatteryEconomicsFinanceV1 = {
  discountRate?: number | null;
  termYears?: number | null;
  debtApr?: number | null;
  debtTermMonths?: number | null;
  itcPct?: number | null; // flag only in v1
  depreciationMethod?: string | null; // flag only in v1
};

export type BatteryEconomicsInputsV1 = {
  battery?: BatteryEconomicsBatteryV1 | null;
  costs?: BatteryEconomicsCostsV1 | null;
  tariffs?: BatteryEconomicsTariffSignalsV1 | null;
  determinants?: BatteryEconomicsDeterminantsSignalsV1 | null;
  dispatch?: BatteryEconomicsDispatchSignalsV1 | null;
  dr?: BatteryEconomicsDrSignalsV1 | null;
  finance?: BatteryEconomicsFinanceV1 | null;
};

export type BatteryEconomicsAuditLineItemV1 = {
  id: string;
  label: string;
  amountUsd: number | null;
  amountUsdRaw: number | null;
  basis: string;
  sourceEngine: 'tariffEngine' | 'billingEngine' | 'determinants' | 'assumption';
  sourcePath: string;
  snapshotId?: string | null;
  notes?: string | null;
};

export type BatteryEconomicsAssumptionV1 = {
  id: string;
  value: string;
  sourceEngine: 'tariffEngine' | 'billingEngine' | 'determinants' | 'assumption';
  sourcePath: string;
  notes?: string | null;
};

export type BatteryEconomicsOutputsV1 = {
  confidenceTier: ConfidenceTierV1;
  methodTag: 'battery_econ_v1';
  engineVersion: string;
  capex: {
    totalUsd: number | null;
    batteryEquipmentUsd: number | null;
    installUsd: number | null;
    interconnectUsd: number | null;
    softCostsUsd: number | null;
    contingencyUsd: number | null;
    assumptions: BatteryEconomicsAssumptionV1[];
  };
  opexAnnual: {
    omUsd: number | null;
    warrantyReserveUsd: number | null;
    totalUsd: number | null;
    assumptions: BatteryEconomicsAssumptionV1[];
  };
  savingsAnnual: {
    demandUsd: number | null;
    energyUsd: number | null;
    ratchetAvoidedUsd: number | null;
    drUsd: number | null;
    otherUsd: number | null;
    totalUsd: number | null;
    assumptions: BatteryEconomicsAssumptionV1[];
  };
  cashflow: {
    year0Usd: number | null;
    years1toNUsd: number[]; // length=termYears when available; deterministic ordering
    npvUsd: number | null;
    irrApprox: null;
    simplePaybackYears: number | null;
    discountedPaybackYears: number | null;
  };
  sizingSanity: {
    cRate: number | null;
    hoursAtPower: number | null;
    violations: string[];
  };
  audit: {
    lineItems: BatteryEconomicsAuditLineItemV1[];
  };
  warnings: string[];
};

