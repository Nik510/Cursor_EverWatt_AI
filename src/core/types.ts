/**
 * Core type definitions shared across all modules
 */

/**
 * Interval data point (15-minute intervals)
 */
export interface IntervalDataPoint {
  timestamp: Date | string;
  demand: number; // kW or MW
  energy?: number; // kWh or MWh (optional, can be derived)
  temperature?: number; // Optional temperature data for HVAC calculations
}

/**
 * Data quality flags
 */
export interface DataQuality {
  isValid: boolean;
  gaps: Array<{ start: Date; end: Date }>;
  outliers: number[];
  unitDetected: 'kW' | 'MW' | 'unknown';
  sampleRate: number; // Expected vs actual intervals
}

/**
 * Utility rate structure
 */
export interface UtilityRate {
  utility: string;
  rateName: string;
  rateType: 'TOU' | 'Tiered' | 'Demand' | 'Blended';
  touPeriods?: TimeOfUsePeriod[];
  demandCharges?: DemandCharge[];
  energyCharges?: EnergyCharge[];
  sRateEligible?: boolean;
}

export interface TimeOfUsePeriod {
  name: string;
  start: string; // HH:MM format
  end: string;
  season?: 'Summer' | 'Winter' | 'All';
  energyRate: number; // $/kWh
  demandRate?: number; // $/kW
}

export interface DemandCharge {
  period: string;
  rate: number; // $/kW
  threshold?: number; // kW threshold if applicable
}

export interface EnergyCharge {
  tier?: number;
  rate: number; // $/kWh
  threshold?: number; // kWh threshold
}

/**
 * Financial parameters
 */
export interface FinancialParameters {
  discountRate: number; // Annual discount rate (e.g., 0.08 for 8%)
  analysisPeriod: number; // Years (typically 10)
  taxRate?: number;
  inflationRate?: number;
}

