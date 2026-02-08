/**
 * Battery storage module type definitions
 * Data structures supporting the physics defined in project-manifesto.md
 */

/**
 * Battery specifications
 * Must include capacity_kwh, max_power_kw, round_trip_efficiency, and degradation_rate
 */
export interface BatterySpec {
  capacity_kwh: number; // Battery capacity in kWh
  max_power_kw: number; // Maximum charge/discharge power in kW
  round_trip_efficiency: number; // Round-trip efficiency (0-1, e.g., 0.90 for 90%)
  degradation_rate: number; // Annual degradation rate (0-1, e.g., 0.02 for 2% per year)
  min_soc?: number; // Minimum state of charge (0-1, default 0.10)
  max_soc?: number; // Maximum state of charge (0-1, default 0.90)
  depth_of_discharge?: number; // Usable depth of discharge (0-1, default 0.90)
}

/**
 * Single interval in load profile
 */
export interface LoadInterval {
  timestamp: Date | string; // Timestamp of the interval
  kw: number; // Demand in kW for this interval
  /** Optional temperature metadata (°F or °C depending on source). */
  temperature?: number;
}

/**
 * Load profile containing array of intervals (timestamp + kW value)
 */
export interface LoadProfile {
  intervals: LoadInterval[];
}

/**
 * Peak event above a threshold (consecutive intervals).
 * Used for sizing and explainability (duration and energy demand).
 */
export interface PeakEvent {
  start: Date | string;
  end: Date | string;
  durationHours: number;
  peakKw: number;
  totalExcessKwh: number;
}

/**
 * Simulation result
 * Must return original_peak, new_peak, savings_kwh, and the final_load_profile
 */
export interface SimulationResult {
  original_peak: number; // Original peak demand in kW
  new_peak: number; // New peak demand after peak shaving in kW
  savings_kwh: number; // Total energy savings in kWh
  final_load_profile: LoadProfile; // Final load profile after battery dispatch
  /**
   * Convenience series: post-dispatch demand kW for each interval, same ordering/length
   * as the input `loadProfile.intervals`. This makes it easy to compute billing peaks
   * (monthly / TOU windows) without re-walking `final_load_profile`.
   */
  new_intervals_kw?: number[];
  battery_soc_history?: number[]; // Optional: SOC history for each interval
  energy_discharged?: number; // Optional: Total energy discharged in kWh
  energy_charged?: number; // Optional: Total energy charged in kWh
}

// ============================
// Diagnostics / Insights Types
// ============================

export type LimitingFactorType =
  | 'power_limit'
  | 'capacity_limit'
  | 'soc_limit'
  | 'charging_opportunity'
  | 'efficiency_loss';

export type LimitingFactorSeverity = 'critical' | 'moderate' | 'minor';

export interface LimitingFactor {
  factor: LimitingFactorType;
  severity: LimitingFactorSeverity;
  description: string;
  /** Approximate kW impact or 0 if not estimated. */
  impactKw: number;
  recommendation: string;
}

export interface PeakEventWithCapture {
  start: Date | string;
  end: Date | string;
  durationHours: number;
  peakKw: number;
  totalExcessKwh: number;
  /** Fraction (0..1) of event excess energy actually captured/shaved. */
  captureRate: number;
}

export interface BatteryEfficiencyDiagnostic {
  captureRate: number; // 0..1
  utilizationRate: number; // 0..1 (energy utilization heuristic)
  powerAdequacy: 'sufficient' | 'undersized' | 'oversized';
  capacityAdequacy: 'sufficient' | 'undersized' | 'oversized';
  peakEventAnalysis: {
    totalEvents: number;
    averageDurationHours: number;
    averageExcessKw: number;
    longestEvent: PeakEventWithCapture | null;
    mostSevereEvent: PeakEventWithCapture | null;
    eventsPerMonth: number[];
    excessEnergyKwhPerMonth: number[];
    capturedEnergyKwhPerMonth: number[];
  };
  limitingFactors: LimitingFactor[];
  usagePatternInsights: {
    loadFactor: number;
    peakinessScore: number; // 0..100
    /** Fraction (0..1) of peak-event days where the battery hits min SOC. */
    emptyAtPeakRate: number;
    weeklyPattern: {
      weekdayPeakKw: number;
      weekendPeakKw: number;
      weekdayAvgKw: number;
      weekendAvgKw: number;
    };
  };
  kpis: {
    peakBeforeKw: number;
    peakAfterKw: number;
    thresholdKw: number;
    excessEnergyKwh: number;
    shavedEnergyKwh: number;
    dischargedEnergyKwh: number;
    chargedEnergyKwh: number;
    achievedRoundTripEfficiency: number | null;
    timeUtilization: number; // 0..1
    chargingHeadroomHours: number;
    chargingPossibleKwh: number;
    chargingEffectiveness: number | null;
  };
  improvementOpportunities: Array<{
    opportunity: string;
    potentialSavingsIncrease: number;
    difficulty: 'easy' | 'medium' | 'hard';
    description: string;
  }>;
}

// ============================
// Peak Pattern Analysis Types
// ============================

export type PeakPatternType = 'morning_spike' | 'afternoon_peak' | 'evening_ramp' | 'sustained_high' | 'random';

export interface PeakPattern {
  patternType: PeakPatternType;
  /** Average frequency observed across the dataset (events / month observed). */
  frequencyPerMonth: number;
  typicalDurationHours: number;
  /** Typical average excess kW above the threshold within events. */
  typicalMagnitudeKw: number;
  timeOfDay: { startHour: number; endHour: number };
  /** Most common days (0=Sun..6=Sat) */
  dayOfWeek: number[];
  seasonalTrend: 'summer' | 'winter' | 'year_round';
  batterySuitability: 'excellent' | 'good' | 'poor';
  reasoning: string;
}

export interface FrequencyAnalysis {
  eventsPerMonth: Record<string, number>;
  eventsPerDayOfWeek: number[]; // length 7
  eventsPerHour: number[]; // length 24
}

// ============================
// Usage Optimization Types
// ============================

export interface LoadShiftingOpportunity {
  equipment: string;
  currentPeakTime: string;
  recommendedShiftTime: string;
  potentialPeakReductionKw: number;
  estimatedSavings: number;
  feasibility: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface PeakSpreadingAnalysis {
  /** 0..1 share of exceedances concentrated into the busiest hour-of-day bucket */
  currentPeakConcentration: number;
  recommendedSpread: string;
  potentialBenefit: number;
}

export interface DemandResponseOpportunity {
  eligible: boolean;
  potentialSavings: number;
  participationLevel: 'aggressive' | 'moderate' | 'conservative';
}

export interface EfficiencySynergy {
  measure: string;
  peakReductionKw: number;
  batterySavingsIncrease: number;
  standaloneSavings: number;
  combinedSavings: number;
  notes?: string;
}

export interface UsageOptimization {
  loadShifting: LoadShiftingOpportunity[];
  peakSpreading: PeakSpreadingAnalysis;
  demandResponse: DemandResponseOpportunity;
  efficiencySynergies: EfficiencySynergy[];
}

// ============================
// Optimal Sizing Types
// ============================

export interface SizingScenario {
  label: string;
  powerKw: number;
  capacityKwh: number;
  captureRate: number; // 0..1
  annualSavings: number;
  systemCost: number;
  paybackYears: number;
  recommendation: 'optimal' | 'viable' | 'marginal';
}

export interface SizingAnalysis {
  currentBattery: {
    powerKw: number;
    capacityKwh: number;
    adequacyScore: number; // 0..100
  };
  diagnostic: BatteryEfficiencyDiagnostic;
}

export interface OptimalSizingAnalysis {
  /** Optional: filled when analyzing a selected battery run. */
  currentBattery: SizingAnalysis['currentBattery'] | null;
  recommendedSizing: {
    minPowerKw: number;
    optimalPowerKw: number;
    maxPowerKw: number;
    minCapacityKwh: number;
    optimalCapacityKwh: number;
    maxCapacityKwh: number;
    reasoning: string[];
  };
  sizingScenarios: SizingScenario[];
  helpers?: {
    paybackYearsFromAnnualSavings: (systemCost: number, annualSavings: number) => number;
  };
}