import type { IntervalIntelligenceV1 } from '../utilityIntelligence/intervalIntelligenceV1/types';

export type ConfidenceTierV1 = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export type RangeEstimateV1 = {
  min: number | null;
  max: number | null;
  method: string;
};

export type ScalarEstimateV1 = {
  value: number | null;
  method: string;
};

export type BatteryValueDriverIdV1 = 'TOU_ARBITRAGE' | 'DEMAND_PEAK_SHAVE' | 'RATCHET_REDUCTION' | 'LOAD_SHIFT';

export type BatteryConfigV1 = {
  powerKw: number;
  energyKwh: number;
  durationHours: number;
  rte: number;
  maxCyclesPerDay: number;
};

export type BatteryOpportunityV1 = {
  recommendedPowerKwRange: [number | null, number | null];
  recommendedEnergyKwhRange: [number | null, number | null];
  recommendedBatteryConfigs: BatteryConfigV1[];
  savingsEstimateAnnual: {
    energy: RangeEstimateV1;
    demand: RangeEstimateV1;
    total: RangeEstimateV1;
  };
  valueDrivers: BatteryValueDriverIdV1[];
  confidenceTier: ConfidenceTierV1;
  warnings: string[];
  missingInfo: string[];
  engineVersion: string;
};

export type DispatchStrategyIdV1 = 'PEAK_SHAVE_DAILY_V1' | 'TOU_SHIFT_V1' | 'HYBRID_V1';

export type DispatchStrategyResultV1 = {
  strategyId: DispatchStrategyIdV1;
  estimatedPeakKwReduction: RangeEstimateV1;
  estimatedShiftedKwhAnnual: ScalarEstimateV1;
  estimatedEnergySavingsAnnual: RangeEstimateV1;
  estimatedDemandSavingsAnnual: RangeEstimateV1;
  constraintsHit: string[];
};

export type DispatchSimulationV1 = {
  assumptions: {
    strategyId: 'DISPATCH_MULTI_STRATEGY_V1';
    rte: number;
    maxCyclesPerDay: number;
    dispatchDaysPerYear: number;
    demandWindowStrategy: DemandWindowStrategyIdV1;
  };
  strategyResults: DispatchStrategyResultV1[];
  warnings: string[];
};

export type DrEventWindowV1 = {
  dateIso: string; // local date key when timezone known (YYYY-MM-DD)
  startHourLocal: number;
  durationHours: number;
  peakKw: number | null;
  avgKw: number | null;
  baseloadKw: number | null;
  shedPotentialKw: ScalarEstimateV1;
};

export type DrReadinessV1 = {
  eventCandidateDefinition: {
    topDaysCount: number;
    windowDurationHours: number;
    basis: 'DAILY_PEAK_KW_V1';
    method: string;
  };
  topEventWindows: DrEventWindowV1[];
  typicalShedPotentialKwRange: [number | null, number | null];
  variabilityScore: ScalarEstimateV1; // 0..1
  confidenceTier: ConfidenceTierV1;
  warnings: string[];
  missingInfo: string[];
};

export type StorageOpportunityPackV1 = {
  batteryOpportunityV1: BatteryOpportunityV1;
  dispatchSimulationV1: DispatchSimulationV1;
  drReadinessV1: DrReadinessV1;
};

export type DemandWindowStrategyIdV1 = 'WINDOW_AROUND_DAILY_PEAK_V1' | 'TOU_ONPEAK_WINDOW_V1';

export type BatteryEngineConfigV1 = {
  rte: number;
  maxCyclesPerDay: number;
  dispatchDaysPerYear: number;
  demandWindowStrategy: DemandWindowStrategyIdV1;
  drTopEventDays: number;
  drWindowDurationHours: number;
};

export type IntervalPointV1 = { timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number; temperatureF?: number };

export type TouPriceWindowV1 = {
  periodId: string;
  startHourLocal: number; // 0..23
  endHourLocalExclusive: number; // 1..24
  days: 'all' | 'weekday' | 'weekend';
  pricePerKwh: number;
};

export type TariffPriceSignalsV1 = {
  timezone: string;
  touEnergyPrices: TouPriceWindowV1[];
  demandChargePerKw?: number | null;
};

export type DeterminantsSignalsV1 = {
  /** Optional billing demand for current cycle (kW), after deterministic demand rules/ratchet. */
  billingDemandKw?: number | null;
  /** Optional ratchet floor (kW), when applicable. */
  ratchetDemandKw?: number | null;
  /** Method tag for billingDemandKw/ratchetDemandKw derivation (from determinants). */
  billingDemandMethod?: string | null;
};

export type EvaluateStorageOpportunityPackV1Args = {
  intervalInsightsV1: IntervalIntelligenceV1 | null;
  intervalPointsV1?: IntervalPointV1[] | null;
  tariffPriceSignalsV1?: TariffPriceSignalsV1 | null;
  determinantsV1?: DeterminantsSignalsV1 | null;
  config?: Partial<BatteryEngineConfigV1>;
};

