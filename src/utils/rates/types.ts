/**
 * Enhanced Utility Rate Types
 * Comprehensive rate structure definitions for all rate types
 */

/**
 * Utility provider
 */
export type UtilityProvider = 
  | 'PG&E' 
  | 'SCE' 
  | 'SDG&E' 
  | 'LADWP' 
  | 'SMUD' 
  | 'Other';

/**
 * Service type (electric or gas)
 */
export type ServiceType = 'Electric' | 'Gas' | 'Both';

/**
 * Rate type classification
 */
export type RateType = 
  | 'TOU'           // Time-of-Use
  | 'Tiered'        // Tiered pricing
  | 'Demand'        // Demand-based
  | 'Blended'        // Simple blended rate
  | 'RealTime'      // Real-time pricing
  | 'CriticalPeak'; // Critical peak pricing

/**
 * Season definition
 */
export type Season = 'Summer' | 'Winter' | 'Spring' | 'Fall' | 'All';

/**
 * Day type
 */
export type DayType = 'Weekday' | 'Weekend' | 'Holiday' | 'All';

/**
 * Base rate structure
 */
export interface BaseRate {
  id: string;
  utility: UtilityProvider;
  rateCode: string; // e.g., "B-19", "E-19", "A-10", "G-1", "G-10"
  rateName: string;
  description?: string;
  rateType: RateType;
  serviceType: ServiceType; // Electric, Gas, or Both
  effectiveDate?: Date | string;
  expirationDate?: Date | string;
  isActive: boolean;
  customerClass?: 'Residential' | 'Small C&I' | 'Medium C&I' | 'Large C&I' | 'Agricultural';
  minimumDemand?: number; // kW (electric) or therms/month (gas) - minimum to qualify
  maximumDemand?: number; // kW (electric) or therms/month (gas) - maximum to qualify
  sRateEligible?: boolean; // Eligible for S-Rate (solar) - electric only
  netMetering?: boolean;
  notes?: string;
}

/**
 * Time-of-Use Period
 */
export interface TimeOfUsePeriod {
  name: string; // e.g., "Peak", "Off-Peak", "Mid-Peak"
  start: string; // HH:MM format (24-hour)
  end: string; // HH:MM format (24-hour)
  season?: Season;
  dayType?: DayType;
  energyRate: number; // $/kWh
  demandRate?: number; // $/kW (if applicable)
  isPeak?: boolean;
}

/**
 * Tier structure for tiered rates (electric or gas)
 */
export interface EnergyTier {
  tier: number;
  name?: string; // e.g., "Baseline", "Tier 1", "Tier 2"
  rate: number; // $/kWh (electric) or $/therm (gas)
  threshold?: number; // kWh or therms threshold (cumulative)
  thresholdType?: 'cumulative' | 'incremental'; // cumulative = total, incremental = this tier only
}

/**
 * Gas rate structure (for natural gas rates)
 */
export interface GasTier {
  tier: number;
  name?: string;
  rate: number; // $/therm
  threshold?: number; // therms threshold
  thresholdType?: 'cumulative' | 'incremental';
}

/**
 * Demand charge structure
 */
export interface DemandCharge {
  name: string; // e.g., "Maximum Demand", "Peak Period Demand"
  period?: string; // e.g., "On-Peak", "All Hours"
  rate: number; // $/kW
  threshold?: number; // kW threshold (if applicable)
  season?: Season;
  dayType?: DayType;
  billingMethod?: 'maximum' | 'average' | 'coincident'; // How demand is calculated
  ratchet?: {
    percentage: number; // e.g., 0.8 = 80% of summer peak applies to winter
    months: number[]; // Months where ratchet applies
  };
}

/**
 * Fixed charges
 */
export interface FixedCharge {
  name: string;
  amount: number; // $/month
  description?: string;
}

/**
 * Time-of-Use Rate
 */
export interface TOURate extends BaseRate {
  rateType: 'TOU';
  touPeriods: TimeOfUsePeriod[];
  demandCharges?: DemandCharge[];
  fixedCharges?: FixedCharge[];
  minimumCharge?: number; // $/month
}

/**
 * Tiered Rate
 */
export interface TieredRate extends BaseRate {
  rateType: 'Tiered';
  tiers: EnergyTier[];
  demandCharges?: DemandCharge[];
  fixedCharges?: FixedCharge[];
  minimumCharge?: number;
}

/**
 * Demand Rate
 */
export interface DemandRate extends BaseRate {
  rateType: 'Demand';
  energyRate: number; // $/kWh (base energy rate)
  demandCharges: DemandCharge[];
  fixedCharges?: FixedCharge[];
  minimumCharge?: number;
}

/**
 * Blended Rate (simple flat rate)
 */
export interface BlendedRate extends BaseRate {
  rateType: 'Blended';
  energyRate: number; // $/kWh (electric) or $/therm (gas)
  demandCharges?: DemandCharge[];
  fixedCharges?: FixedCharge[];
  minimumCharge?: number;
}

/**
 * Gas Rate (for natural gas service)
 */
export interface GasRate extends BaseRate {
  rateType: 'Tiered' | 'Blended';
  serviceType: 'Gas';
  gasRate?: number; // $/therm (if blended)
  gasTiers?: GasTier[]; // If tiered
  fixedCharges?: FixedCharge[];
  minimumCharge?: number;
  baselineAllowance?: number; // therms/month baseline
}

/**
 * Real-Time Pricing Rate
 */
export interface RealTimeRate extends BaseRate {
  rateType: 'RealTime';
  baseRate: number; // $/kWh base rate
  multiplierRange?: {
    min: number;
    max: number;
  };
  demandCharges?: DemandCharge[];
  fixedCharges?: FixedCharge[];
}

/**
 * Critical Peak Pricing Rate
 */
export interface CriticalPeakRate extends BaseRate {
  rateType: 'CriticalPeak';
  baseRate: number; // $/kWh
  criticalPeakRate: number; // $/kWh during critical events
  criticalPeakHours?: string[]; // Hours when CPP applies
  eventDays?: number; // Max number of event days per year
  demandCharges?: DemandCharge[];
  fixedCharges?: FixedCharge[];
}

/**
 * Union type for all rate structures
 */
export type UtilityRate = 
  | TOURate 
  | TieredRate 
  | DemandRate 
  | BlendedRate 
  | RealTimeRate 
  | CriticalPeakRate
  | GasRate;

/**
 * Rate calculation result
 */
export interface RateCalculationResult {
  totalCost: number;
  energyCost: number;
  demandCost: number;
  fixedCharges: number;
  breakdown: {
    period?: string;
    energyKwh: number;
    energyCost: number;
    demandKw?: number;
    demandCost?: number;
  }[];
  month: number;
  year: number;
}

/**
 * Annual rate calculation result
 */
export interface AnnualRateCalculationResult {
  totalCost: number;
  energyCost: number;
  demandCost: number;
  fixedCharges: number;
  monthlyBreakdown: RateCalculationResult[];
  averageMonthlyCost: number;
  peakDemand: number;
  totalEnergy: number;
}

/**
 * Rate lookup filter
 */
export interface RateFilter {
  utility?: UtilityProvider;
  rateType?: RateType;
  serviceType?: ServiceType; // Filter by Electric, Gas, or Both
  customerClass?: string;
  minDemand?: number;
  maxDemand?: number;
  isActive?: boolean;
  sRateEligible?: boolean;
}
