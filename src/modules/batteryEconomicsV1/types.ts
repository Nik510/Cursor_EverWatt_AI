export type ConfidenceTierV1 = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export type BatteryEconomicsBatteryV1 = {
  powerKw?: number | null;
  energyKwh?: number | null;
  /**
   * Optional usable energy size (kWh) for incentive/degradation basis.
   * v1.3+ modules will fall back to explicit conservative constants when absent.
   */
  usableKwh?: number | null;
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
  /** Optional utility rate code (for audit provenance). */
  rateCode?: string | null;
  /**
   * Optional supply context (SSA v1 / composed rate context).
   * Used to choose correct energy prices for CCA/DA when available.
   */
  supplyProviderType?: 'CCA' | 'DA' | null;
  supplyLseName?: string | null;
  /** Optional generation (CCA/DA) TOU price windows (energy only). */
  generationTouEnergyPrices?: Array<{
    periodId: string;
    startHourLocal: number;
    endHourLocalExclusive: number;
    days: 'all' | 'weekday' | 'weekend';
    pricePerKwh: number;
  }> | null;
  /** Optional derived all-in generation TOU price windows (energy + adders). Preferred when present. */
  generationAllInTouEnergyPrices?: Array<{
    periodId: string;
    startHourLocal: number;
    endHourLocalExclusive: number;
    days: 'all' | 'weekday' | 'weekend';
    pricePerKwh: number;
  }> | null;
  /** Optional derived all-in generation TOU windows including exit fees (flat adder in v0). Preferred over all-in without exit fees. */
  generationAllInWithExitFeesTouPrices?: Array<{
    periodId: string;
    startHourLocal: number;
    endHourLocalExclusive: number;
    days: 'all' | 'weekday' | 'weekend';
    pricePerKwh: number;
  }> | null;
  /** Optional blended adders $/kWh used to derive `generationAllInTouEnergyPrices`. */
  generationAddersPerKwhTotal?: number | null;
  /** Optional adders snapshot id/version tag for audit trail. */
  generationAddersSnapshotId?: string | null;
  /** Optional exit fees snapshot id/version tag for audit trail (PCIA/NBC/other). */
  exitFeesSnapshotId?: string | null;
  /** Optional flat exit fees total $/kWh applied (v0). */
  exitFeesPerKwhTotal?: number | null;
  nbcPerKwhTotal?: number | null;
  pciaPerKwhApplied?: number | null;
  otherExitFeesPerKwhTotal?: number | null;
  generationSnapshotId?: string | null;
  generationRateCode?: string | null;
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

export type BatteryEconomicsDeterminantsCycleV1_1 = {
  cycleLabel: string;
  cycleStartIso: string;
  cycleEndIso: string;
  /** Cycle max kW (from intervals) when available. */
  kWMax: number | null;
  /** Deterministic billed demand for cycle (after rules/ratchet) when available. */
  billingDemandKw?: number | null;
  billingDemandMethod?: string | null;
  ratchetDemandKw?: number | null;
  ratchetFloorPct?: number | null;
  ratchetHistoryMaxKw?: number | null;
};

export type BatteryEconomicsDeterminantsSignalsV1 = {
  ratchetDemandKw?: number | null;
  billingDemandKw?: number | null;
  billingDemandMethod?: string | null;
  /** Optional ratchet history maximum (kW) for annual ratchet modeling (lite). */
  ratchetHistoryMaxKw?: number | null;
  /** Optional ratchet floor percent (0..1) for annual ratchet modeling (lite). */
  ratchetFloorPct?: number | null;
  /**
   * Optional cycle-by-cycle determinants (billing month).
   * When present alongside `dispatch.cycles`, savings can be computed cycle-by-cycle deterministically.
   */
  cycles?: BatteryEconomicsDeterminantsCycleV1_1[] | null;
};

export type BatteryEconomicsDispatchCycleV1_1 = {
  cycleLabel: string;
  cycleStartIso: string;
  cycleEndIso: string;
  dispatchMethod: 'dispatch_v1_1';
  ok: boolean;
  kwhChargedByTou: Record<string, number>;
  kwhDischargedByTou: Record<string, number>;
  netKwhShiftedByTou: Record<string, number>;
  demandPeakBeforeKw: number | null;
  demandPeakAfterKw: number | null;
  peakTimestampIso: string | null;
  warnings?: string[];
};

export type BatteryEconomicsDispatchSignalsV1 = {
  /** Annual discharged/shifted energy (kWh). */
  shiftedKwhAnnual?: number | null;
  /** Conservative assumed peak kW reduction possible. */
  peakReductionKwAssumed?: number | null;
  /** Optional dispatch days per year used to compute shiftedKwhAnnual, for audit. */
  dispatchDaysPerYear?: number | null;
  /**
   * Optional cycle-by-cycle dispatch outputs (billing month).
   * When present, energy/demand savings can be computed per cycle and summed deterministically.
   */
  cycles?: BatteryEconomicsDispatchCycleV1_1[] | null;
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

export type BatteryEconomicsSgipInputsV0 = {
  eligible: boolean | null;
  category: 'general_market' | 'equity_resiliency' | 'equity' | null;
  isStoragePairedWithSolar?: boolean | null;
  customerIsCriticalFacility?: boolean | null;
  requestedIncentiveCapUsd?: number | null;
  effectiveYmd?: string | null;
};

export type BatteryEconomicsSgipOutputsV0 = {
  ok: boolean;
  awardUsd: number | null;
  awardUsdPerKwh: number | null;
  basisKwh: number | null;
  snapshotIdUsed?: string;
  acquisitionMethodUsed?: string;
  warnings: string[];
};

export type BatteryEconomicsTaxInputsV0 = {
  applyItc: boolean;
  itcPct?: number | null;
  itcBasisReductionPct?: number | null;
  applyMacrs: boolean;
  discountRate?: number | null;
  taxRateCombined?: number | null;
  macrsSchedule?: '5yr' | '7yr' | null;
};

export type BatteryEconomicsItcOutputsV0 = {
  itcUsd: number | null;
  itcPctUsed: number | null;
  itcBasisReductionPctUsed: number | null;
  warnings: string[];
};

export type BatteryEconomicsMacrsOutputsV0 = {
  deprScheduleYears: number[];
  deprUsdByYear: number[] | null;
  warnings: string[];
};

export type BatteryEconomicsTaxOutputsV0 = {
  itcV0: BatteryEconomicsItcOutputsV0;
  macrsV0: BatteryEconomicsMacrsOutputsV0;
};

export type BatteryEconomicsDegradationInputsV0 = {
  annualCapacityFadePct?: number | null;
  endOfLifeCapacityPct?: number | null;
  augmentationStrategy?: 'none' | 'augment_to_hold_usable_kwh' | 'replace_at_eol' | null;
  augmentationCostUsdPerKwh?: number | null;
  replacementCapexPctOfInitial?: number | null;
  analysisHorizonYears?: number | null;
};

export type BatteryEconomicsDegradationEventV0 = {
  year: number;
  addedKwh: number | null;
  capexUsd: number | null;
};

export type BatteryEconomicsReplacementEventV0 = {
  year: number;
  capexUsd: number | null;
};

export type BatteryEconomicsDegradationOutputsV0 = {
  usableKwhByYear: number[];
  effectiveSavingsMultiplierByYear: number[];
  augmentationEvents: BatteryEconomicsDegradationEventV0[];
  replacementEvent: BatteryEconomicsReplacementEventV0 | null;
  warnings: string[];
};

export type BatteryEconomicsInputsV1 = {
  battery?: BatteryEconomicsBatteryV1 | null;
  costs?: BatteryEconomicsCostsV1 | null;
  tariffs?: BatteryEconomicsTariffSignalsV1 | null;
  determinants?: BatteryEconomicsDeterminantsSignalsV1 | null;
  dispatch?: BatteryEconomicsDispatchSignalsV1 | null;
  dr?: BatteryEconomicsDrSignalsV1 | null;
  finance?: BatteryEconomicsFinanceV1 | null;
  sgipInputsV0?: BatteryEconomicsSgipInputsV0 | null;
  taxInputsV0?: BatteryEconomicsTaxInputsV0 | null;
  degradationInputsV0?: BatteryEconomicsDegradationInputsV0 | null;
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
  /**
   * Audit provenance for tariff-derived line items (and null for others).
   * Kept additive for backward compatibility.
   */
  rateSource?: {
    snapshotId: string | null;
    rateCode: string | null;
    kind?:
      | 'DELIVERY'
      | 'CCA_GEN_V0_ENERGY_ONLY'
      | 'CCA_GEN_V0_ALL_IN'
      | 'CCA_GEN_V0_ALL_IN_WITH_EXIT_FEES'
      | 'CCA_DELIVERY_FALLBACK'
      | 'DA_DELIVERY_FALLBACK';
  } | null;
  /**
   * Deterministic quantities used to compute the line item (stable ordering expected by callers/tests).
   * Kept additive for backward compatibility.
   */
  quantities?: Array<{ id: string; unit: string; value: number | null }> | null;
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
  sgipV0?: BatteryEconomicsSgipOutputsV0 | null;
  taxV0?: BatteryEconomicsTaxOutputsV0 | null;
  degradationV0?: BatteryEconomicsDegradationOutputsV0 | null;
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

