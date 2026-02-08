/**
 * Comprehensive PG&E Rate Data
 * All electric and gas rate schedules for PG&E
 * Updated to 2025 rates
 */

import type { UtilityRate, TOURate, TieredRate, BlendedRate, GasRate } from './types';

/**
 * PG&E A-1 Rate (Small General Service)
 * Small commercial customers without demand metering
 */
export const pgeA1: BlendedRate = {
  id: 'pge-a-1',
  utility: 'PG&E',
  rateCode: 'A-1',
  rateName: 'Small General Service',
  description: 'Small commercial customers without demand metering. Simple rate structure. Effective January 1, 2025.',
  rateType: 'Blended',
  serviceType: 'Electric',
  isActive: true,
  customerClass: 'Small C&I',
  maximumDemand: 20, // Typically under 20 kW
  effectiveDate: '2025-01-01',
  energyRate: 0.16959, // Approximate average
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 10.00,
    },
  ],
};

/**
 * PG&E A-6 Rate (Small General Time-of-Use Service)
 * Small commercial customers with TOU pricing
 */
export const pgeA6: TOURate = {
  id: 'pge-a-6',
  utility: 'PG&E',
  rateCode: 'A-6',
  rateName: 'Small General Time-of-Use Service',
  description: 'Small commercial customers with time-of-use pricing. No demand charges. Effective January 1, 2025.',
  rateType: 'TOU',
  serviceType: 'Electric',
  isActive: true,
  customerClass: 'Small C&I',
  maximumDemand: 20,
  effectiveDate: '2025-01-01',
  touPeriods: [
    {
      name: 'Peak',
      start: '15:00',
      end: '20:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.22,
      isPeak: true,
    },
    {
      name: 'Off-Peak',
      start: '20:00',
      end: '15:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.15,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Summer',
      dayType: 'Weekend',
      energyRate: 0.15,
    },
    {
      name: 'Peak',
      start: '15:00',
      end: '20:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.20,
      isPeak: true,
    },
    {
      name: 'Off-Peak',
      start: '20:00',
      end: '15:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.14,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Winter',
      dayType: 'Weekend',
      energyRate: 0.14,
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 10.00,
    },
  ],
};

/**
 * PG&E A-10 Rate (Medium General Demand-Metered Service)
 * Medium commercial customers with demand metering
 */
export const pgeA10: TOURate = {
  id: 'pge-a-10',
  utility: 'PG&E',
  rateCode: 'A-10',
  rateName: 'Medium General Demand-Metered Service',
  description: 'Medium commercial customers with demand metering. Similar to B-19 but for smaller customers. Effective January 1, 2025.',
  rateType: 'TOU',
  serviceType: 'Electric',
  isActive: true,
  customerClass: 'Medium C&I',
  minimumDemand: 75,
  maximumDemand: 500,
  effectiveDate: '2025-01-01',
  touPeriods: [
    {
      name: 'On-Peak',
      start: '15:00',
      end: '20:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.25755, // Secondary service
      isPeak: true,
    },
    {
      name: 'Partial-Peak',
      start: '10:00',
      end: '15:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.22,
    },
    {
      name: 'Off-Peak',
      start: '22:00',
      end: '10:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.16,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Summer',
      dayType: 'Weekend',
      energyRate: 0.16,
    },
    {
      name: 'On-Peak',
      start: '15:00',
      end: '20:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.25,
      isPeak: true,
    },
    {
      name: 'Off-Peak',
      start: '20:00',
      end: '15:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.16,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Winter',
      dayType: 'Weekend',
      energyRate: 0.16,
    },
  ],
  demandCharges: [
    {
      name: 'Maximum Demand',
      period: 'All Hours',
      rate: 18.00,
      season: 'Summer',
      billingMethod: 'maximum',
    },
    {
      name: 'Maximum Demand',
      period: 'All Hours',
      rate: 18.00,
      season: 'Winter',
      billingMethod: 'maximum',
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 314.29, // Secondary service
      description: 'Monthly customer charge',
    },
  ],
};

/**
 * PG&E E-1 Rate (Residential Service)
 * Standard residential rate with tiered pricing
 */
export const pgeE1: TieredRate = {
  id: 'pge-e-1',
  utility: 'PG&E',
  rateCode: 'E-1',
  rateName: 'Residential Service',
  description: 'Standard residential rate with tiered pricing. Baseline allowance applies. Effective January 1, 2025.',
  rateType: 'Tiered',
  serviceType: 'Electric',
  isActive: true,
  customerClass: 'Residential',
  effectiveDate: '2025-01-01',
  tiers: [
    {
      tier: 1,
      name: 'Baseline',
      rate: 0.28,
      threshold: 300, // kWh/month (varies by climate zone)
      thresholdType: 'cumulative',
    },
    {
      tier: 2,
      name: 'Tier 1',
      rate: 0.35,
      threshold: 400,
      thresholdType: 'cumulative',
    },
    {
      tier: 3,
      name: 'Tier 2',
      rate: 0.42,
      thresholdType: 'cumulative',
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 10.00,
    },
  ],
};

/**
 * PG&E E-TOU-C Rate (Residential Time-of-Use - Peak 4-9 PM)
 * Residential TOU with peak pricing 4-9 PM every day
 */
export const pgeETOUC: TOURate = {
  id: 'pge-e-tou-c',
  utility: 'PG&E',
  rateCode: 'E-TOU-C',
  rateName: 'Residential Time-of-Use (Peak 4-9 PM Daily)',
  description: 'Residential time-of-use rate with peak pricing from 4:00 PM to 9:00 PM every day. Effective March 1, 2025.',
  rateType: 'TOU',
  serviceType: 'Electric',
  isActive: true,
  customerClass: 'Residential',
  effectiveDate: '2025-03-01',
  touPeriods: [
    {
      name: 'Peak',
      start: '16:00',
      end: '21:00',
      season: 'All',
      dayType: 'All',
      energyRate: 0.43438, // Total cost per kWh
      isPeak: true,
    },
    {
      name: 'Off-Peak',
      start: '21:00',
      end: '16:00',
      season: 'All',
      dayType: 'All',
      energyRate: 0.30,
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 10.00,
    },
  ],
};

/**
 * PG&E E-TOU-D Rate (Residential Time-of-Use - Peak 5-8 PM Weekdays)
 * Residential TOU with peak pricing 5-8 PM weekdays only
 */
export const pgeETOUD: TOURate = {
  id: 'pge-e-tou-d',
  utility: 'PG&E',
  rateCode: 'E-TOU-D',
  rateName: 'Residential Time-of-Use (Peak 5-8 PM Weekdays)',
  description: 'Residential time-of-use rate with peak pricing from 5:00 PM to 8:00 PM on weekdays only. Effective January 1, 2025.',
  rateType: 'TOU',
  serviceType: 'Electric',
  isActive: true,
  customerClass: 'Residential',
  effectiveDate: '2025-01-01',
  touPeriods: [
    {
      name: 'Peak',
      start: '17:00',
      end: '20:00',
      season: 'All',
      dayType: 'Weekday',
      energyRate: 0.40,
      isPeak: true,
    },
    {
      name: 'Off-Peak',
      start: '20:00',
      end: '17:00',
      season: 'All',
      dayType: 'Weekday',
      energyRate: 0.28,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'All',
      dayType: 'Weekend',
      energyRate: 0.28,
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 10.00,
    },
  ],
};

/**
 * PG&E E-6 Rate (Residential Time-of-Use Service)
 * Alternative residential TOU plan
 */
export const pgeE6: TOURate = {
  id: 'pge-e-6',
  utility: 'PG&E',
  rateCode: 'E-6',
  rateName: 'Residential Time-of-Use Service',
  description: 'Alternative residential time-of-use rate plan. Effective January 1, 2025.',
  rateType: 'TOU',
  serviceType: 'Electric',
  isActive: true,
  customerClass: 'Residential',
  effectiveDate: '2025-01-01',
  touPeriods: [
    {
      name: 'Peak',
      start: '15:00',
      end: '20:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.38,
      isPeak: true,
    },
    {
      name: 'Off-Peak',
      start: '20:00',
      end: '15:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.26,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Summer',
      dayType: 'Weekend',
      energyRate: 0.26,
    },
    {
      name: 'Peak',
      start: '15:00',
      end: '20:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.35,
      isPeak: true,
    },
    {
      name: 'Off-Peak',
      start: '20:00',
      end: '15:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.25,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Winter',
      dayType: 'Weekend',
      energyRate: 0.25,
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 10.00,
    },
  ],
};

/**
 * PG&E E-10 Rate (Large General Service)
 * Large commercial/industrial service
 */
export const pgeE10: TOURate = {
  id: 'pge-e-10',
  utility: 'PG&E',
  rateCode: 'E-10',
  rateName: 'Large General Service',
  description: 'Large commercial and industrial service. Similar to E-20 but with different rate structure. Effective January 1, 2025.',
  rateType: 'TOU',
  serviceType: 'Electric',
  isActive: true,
  customerClass: 'Large C&I',
  minimumDemand: 1000,
  effectiveDate: '2025-01-01',
  touPeriods: [
    {
      name: 'On-Peak',
      start: '15:00',
      end: '20:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.19,
      isPeak: true,
    },
    {
      name: 'Partial-Peak',
      start: '10:00',
      end: '15:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.17,
    },
    {
      name: 'Off-Peak',
      start: '22:00',
      end: '10:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.14,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Summer',
      dayType: 'Weekend',
      energyRate: 0.14,
    },
    {
      name: 'On-Peak',
      start: '15:00',
      end: '20:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.18,
      isPeak: true,
    },
    {
      name: 'Off-Peak',
      start: '20:00',
      end: '15:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.14,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Winter',
      dayType: 'Weekend',
      energyRate: 0.14,
    },
  ],
  demandCharges: [
    {
      name: 'Maximum Demand',
      period: 'All Hours',
      rate: 18.50,
      season: 'Summer',
      billingMethod: 'maximum',
    },
    {
      name: 'Maximum Demand',
      period: 'All Hours',
      rate: 18.50,
      season: 'Winter',
      billingMethod: 'maximum',
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 349.61, // Base monthly charge ($11.65358/day * 30 days). Actual charges vary significantly by voltage class and service configuration for large C&I customers
      description: 'Monthly customer charge. Base rate shown; actual charges vary by voltage class (Secondary/Primary/Transmission) and service type.',
    },
  ],
};

/**
 * PG&E G-1 Rate (Residential Gas Service)
 * Standard residential natural gas service with baseline allowance
 */
export const pgeG1: GasRate = {
  id: 'pge-g-1',
  utility: 'PG&E',
  rateCode: 'G-1',
  rateName: 'Residential Gas Service',
  description: 'Standard residential natural gas service with tiered pricing and baseline allowance. Effective January 1, 2025.',
  rateType: 'Tiered',
  serviceType: 'Gas',
  isActive: true,
  customerClass: 'Residential',
  effectiveDate: '2025-01-01',
  baselineAllowance: 25, // therms/month (varies by climate zone)
  gasTiers: [
    {
      tier: 1,
      name: 'Baseline',
      rate: 1.35, // $/therm
      threshold: 25,
      thresholdType: 'cumulative',
    },
    {
      tier: 2,
      name: 'Tier 1',
      rate: 1.65,
      threshold: 50,
      thresholdType: 'cumulative',
    },
    {
      tier: 3,
      name: 'Tier 2',
      rate: 2.05,
      thresholdType: 'cumulative',
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 10.00,
    },
  ],
};

/**
 * PG&E G-NR1 Rate (Small Commercial Gas Service)
 * Small commercial natural gas service
 */
export const pgeGNR1: GasRate = {
  id: 'pge-g-nr1',
  utility: 'PG&E',
  rateCode: 'G-NR1',
  rateName: 'Small Commercial Gas Service',
  description: 'Small commercial natural gas service. Effective January 1, 2025.',
  rateType: 'Blended',
  serviceType: 'Gas',
  isActive: true,
  customerClass: 'Small C&I',
  effectiveDate: '2025-01-01',
  gasRate: 1.45, // $/therm
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 25.00,
    },
  ],
};

/**
 * PG&E G-NR2 Rate (Large Commercial Gas Service)
 * Large commercial and industrial natural gas service
 */
export const pgeGNR2: GasRate = {
  id: 'pge-g-nr2',
  utility: 'PG&E',
  rateCode: 'G-NR2',
  rateName: 'Large Commercial Gas Service',
  description: 'Large commercial and industrial natural gas service. Effective January 1, 2025.',
  rateType: 'Blended',
  serviceType: 'Gas',
  isActive: true,
  customerClass: 'Large C&I',
  effectiveDate: '2025-01-01',
  gasRate: 1.30, // $/therm (volume discounts may apply)
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 50.00,
    },
  ],
};

/**
 * PG&E G-10 Rate (Medium Commercial Gas Service)
 * Medium commercial natural gas service
 */
export const pgeG10: GasRate = {
  id: 'pge-g-10',
  utility: 'PG&E',
  rateCode: 'G-10',
  rateName: 'Medium Commercial Gas Service',
  description: 'Medium commercial natural gas service. Effective January 1, 2025.',
  rateType: 'Blended',
  serviceType: 'Gas',
  isActive: true,
  customerClass: 'Medium C&I',
  effectiveDate: '2025-01-01',
  gasRate: 1.40, // $/therm
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 35.00,
    },
  ],
};

/**
 * PG&E G-20 Rate (Large Commercial Gas Service)
 * Large commercial natural gas service with volume pricing
 */
export const pgeG20: GasRate = {
  id: 'pge-g-20',
  utility: 'PG&E',
  rateCode: 'G-20',
  rateName: 'Large Commercial Gas Service',
  description: 'Large commercial natural gas service with volume-based pricing. Effective January 1, 2025.',
  rateType: 'Tiered',
  serviceType: 'Gas',
  isActive: true,
  customerClass: 'Large C&I',
  effectiveDate: '2025-01-01',
  gasTiers: [
    {
      tier: 1,
      name: 'First 10,000 therms',
      rate: 1.35,
      threshold: 10000,
      thresholdType: 'cumulative',
    },
    {
      tier: 2,
      name: 'Next 40,000 therms',
      rate: 1.25,
      threshold: 50000,
      thresholdType: 'cumulative',
    },
    {
      tier: 3,
      name: 'Over 50,000 therms',
      rate: 1.15,
      thresholdType: 'cumulative',
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 75.00,
    },
  ],
};

/**
 * PG&E B-19 Rate (Medium General Demand-Metered TOU)
 * Updated with 2025 rates
 */
export const pgeB19: TOURate = {
  id: 'pge-b-19',
  utility: 'PG&E',
  rateCode: 'B-19',
  rateName: 'Medium General Demand-Metered TOU',
  description: 'Medium C&I customers. Multi-part demand charges: Maximum Demand ($/kW) and Maximum-Peak-Period Demand ($/kW). 15-minute interval averaging. Effective January 1, 2025.',
  rateType: 'TOU',
  serviceType: 'Electric',
  isActive: true,
  customerClass: 'Medium C&I',
  minimumDemand: 20,
  maximumDemand: 999,
  sRateEligible: true,
  effectiveDate: '2025-01-01',
  touPeriods: [
    {
      name: 'On-Peak',
      start: '15:00',
      end: '20:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.19551,
      isPeak: true,
    },
    {
      name: 'Partial-Peak',
      start: '10:00',
      end: '15:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.17922,
    },
    {
      name: 'Partial-Peak',
      start: '20:00',
      end: '22:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.17922,
    },
    {
      name: 'Off-Peak',
      start: '22:00',
      end: '10:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.14455,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Summer',
      dayType: 'Weekend',
      energyRate: 0.14455,
    },
    {
      name: 'On-Peak',
      start: '15:00',
      end: '20:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.19441,
      isPeak: true,
    },
    {
      name: 'Off-Peak',
      start: '20:00',
      end: '15:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.14532,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Winter',
      dayType: 'Weekend',
      energyRate: 0.14532,
    },
  ],
  demandCharges: [
    {
      name: 'Maximum Demand',
      period: 'All Hours',
      rate: 19.20,
      season: 'Summer',
      billingMethod: 'maximum',
    },
    {
      name: 'Maximum Demand',
      period: 'All Hours',
      rate: 19.20,
      season: 'Winter',
      billingMethod: 'maximum',
    },
    {
      name: 'On-Peak Period Demand',
      period: 'On-Peak',
      rate: 19.17,
      season: 'Summer',
      billingMethod: 'maximum',
    },
    {
      name: 'Partial-Peak Period Demand',
      period: 'Partial-Peak',
      rate: 4.79,
      season: 'Summer',
      billingMethod: 'maximum',
    },
    {
      name: 'On-Peak Period Demand',
      period: 'On-Peak',
      rate: 1.85,
      season: 'Winter',
      billingMethod: 'maximum',
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 349.61, // Derived from $11.65358 per meter per day (Voluntary rate) * 30 days
      description: 'Monthly customer charge (Voluntary rate; varies by voltage class and mandatory vs voluntary status)',
    },
  ],
};

/**
 * PG&E B-20 Rate (Large General Demand-Metered TOU)
 * Updated with 2025 rates - Legacy rate for large C&I customers with solar
 */
export const pgeB20: TOURate = {
  id: 'pge-b-20',
  utility: 'PG&E',
  rateCode: 'B-20',
  rateName: 'Large General Demand-Metered TOU',
  description: 'Legacy rate for large C&I customers with solar. Grandfathered for qualifying systems installed before B-20 mandate. Effective January 1, 2025.',
  rateType: 'TOU',
  serviceType: 'Electric',
  isActive: true,
  customerClass: 'Large C&I',
  minimumDemand: 1000,
  sRateEligible: true,
  effectiveDate: '2025-01-01',
  touPeriods: [
    {
      name: 'On-Peak',
      start: '15:00',
      end: '20:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.19551,
      isPeak: true,
    },
    {
      name: 'Partial-Peak',
      start: '10:00',
      end: '15:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.17922,
    },
    {
      name: 'Partial-Peak',
      start: '20:00',
      end: '22:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.17922,
    },
    {
      name: 'Off-Peak',
      start: '22:00',
      end: '10:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.14455,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Summer',
      dayType: 'Weekend',
      energyRate: 0.14455,
    },
    {
      name: 'On-Peak',
      start: '15:00',
      end: '20:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.19441,
      isPeak: true,
    },
    {
      name: 'Off-Peak',
      start: '20:00',
      end: '15:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.14532,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Winter',
      dayType: 'Weekend',
      energyRate: 0.14532,
    },
  ],
  demandCharges: [
    {
      name: 'Maximum Demand',
      period: 'All Hours',
      rate: 19.20,
      season: 'Summer',
      billingMethod: 'maximum',
    },
    {
      name: 'Maximum Demand',
      period: 'All Hours',
      rate: 19.20,
      season: 'Winter',
      billingMethod: 'maximum',
    },
    {
      name: 'On-Peak Period Demand',
      period: 'On-Peak',
      rate: 19.17,
      season: 'Summer',
      billingMethod: 'maximum',
    },
    {
      name: 'Partial-Peak Period Demand',
      period: 'Partial-Peak',
      rate: 4.79,
      season: 'Summer',
      billingMethod: 'maximum',
    },
    {
      name: 'On-Peak Period Demand',
      period: 'On-Peak',
      rate: 1.85,
      season: 'Winter',
      billingMethod: 'maximum',
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 349.61, // Base monthly charge ($11.65358/day * 30 days). Actual charges vary by voltage class: Secondary ~$3,263/mo, Primary ~$3,327/mo, Transmission ~$8,328/mo for mandatory customers
      description: 'Monthly customer charge. Base rate shown; actual charges vary significantly by voltage class (Secondary/Primary/Transmission) and mandatory vs voluntary status. Large B-20 customers typically on Primary/Transmission service.',
    },
  ],
};

/**
 * PG&E B-10 Rate (Commercial Only Service)
 * Simple commercial rate without TOU or demand charges
 */
export const pgeB10: BlendedRate = {
  id: 'pge-b-10',
  utility: 'PG&E',
  rateCode: 'B-10',
  rateName: 'Commercial Only Service',
  description: 'Simple commercial rate schedule for smaller commercial customers. No time-of-use periods or demand charges. Updated September 1, 2025.',
  rateType: 'Blended',
  serviceType: 'Electric',
  isActive: true,
  customerClass: 'Small C&I',
  effectiveDate: '2025-09-01',
  energyRate: 0.28, // Flat rate, no TOU
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 50.00,
      description: 'Monthly customer charge',
    },
  ],
};

/**
 * PG&E E-19 Rate (Legacy Medium General Service TOU)
 * Legacy rate being phased out, grandfathered for certain customers
 */
export const pgeE19: TOURate = {
  id: 'pge-e-19',
  utility: 'PG&E',
  rateCode: 'E-19',
  rateName: 'Medium General Service TOU (Legacy)',
  description: 'Legacy rate for medium C&I customers. Being phased out in favor of B-19. Grandfathered for certain customers. Effective January 1, 2025.',
  rateType: 'TOU',
  serviceType: 'Electric',
  isActive: false, // Being phased out
  customerClass: 'Medium C&I',
  minimumDemand: 20,
  maximumDemand: 999,
  sRateEligible: true,
  effectiveDate: '2025-01-01',
  notes: 'Legacy rate - new customers cannot select. Grandfathered customers may be transitioned to B-19.',
  touPeriods: [
    {
      name: 'On-Peak',
      start: '15:00',
      end: '20:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.18500, // Legacy rates typically lower
      isPeak: true,
    },
    {
      name: 'Partial-Peak',
      start: '10:00',
      end: '15:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.17000,
    },
    {
      name: 'Off-Peak',
      start: '22:00',
      end: '10:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.13500,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Summer',
      dayType: 'Weekend',
      energyRate: 0.13500,
    },
    {
      name: 'On-Peak',
      start: '15:00',
      end: '20:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.18000,
      isPeak: true,
    },
    {
      name: 'Off-Peak',
      start: '20:00',
      end: '15:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.13500,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Winter',
      dayType: 'Weekend',
      energyRate: 0.13500,
    },
  ],
  demandCharges: [
    {
      name: 'Maximum Demand',
      period: 'All Hours',
      rate: 18.00,
      season: 'Summer',
      billingMethod: 'maximum',
    },
    {
      name: 'Maximum Demand',
      period: 'All Hours',
      rate: 18.00,
      season: 'Winter',
      billingMethod: 'maximum',
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 349.61, // Derived from Voluntary rate ($11.65358/day * 30 days) - legacy rate, being phased out
      description: 'Monthly customer charge (varies by voltage class and mandatory vs voluntary status)',
    },
  ],
};

/**
 * PG&E E-20 Rate (Legacy Large General Service TOU)
 * Legacy rate for large customers, being phased out
 */
export const pgeE20: TOURate = {
  id: 'pge-e-20',
  utility: 'PG&E',
  rateCode: 'E-20',
  rateName: 'Large General Service TOU (Legacy)',
  description: 'Legacy rate for large C&I customers. Being phased out in favor of B-20. Grandfathered for certain customers. Effective January 1, 2025.',
  rateType: 'TOU',
  serviceType: 'Electric',
  isActive: false, // Being phased out
  customerClass: 'Large C&I',
  minimumDemand: 1000,
  sRateEligible: true,
  effectiveDate: '2025-01-01',
  notes: 'Legacy rate - new customers cannot select. Grandfathered customers may be transitioned to B-20.',
  touPeriods: [
    {
      name: 'On-Peak',
      start: '15:00',
      end: '20:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.18500,
      isPeak: true,
    },
    {
      name: 'Partial-Peak',
      start: '10:00',
      end: '15:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.17000,
    },
    {
      name: 'Off-Peak',
      start: '22:00',
      end: '10:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.13500,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Summer',
      dayType: 'Weekend',
      energyRate: 0.13500,
    },
    {
      name: 'On-Peak',
      start: '15:00',
      end: '20:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.18000,
      isPeak: true,
    },
    {
      name: 'Off-Peak',
      start: '20:00',
      end: '15:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.13500,
    },
    {
      name: 'Off-Peak',
      start: '00:00',
      end: '24:00',
      season: 'Winter',
      dayType: 'Weekend',
      energyRate: 0.13500,
    },
  ],
  demandCharges: [
    {
      name: 'Maximum Demand',
      period: 'All Hours',
      rate: 18.00,
      season: 'Summer',
      billingMethod: 'maximum',
    },
    {
      name: 'Maximum Demand',
      period: 'All Hours',
      rate: 18.00,
      season: 'Winter',
      billingMethod: 'maximum',
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 349.61, // Derived from Voluntary rate ($11.65358/day * 30 days) - legacy rate, being phased out
      description: 'Monthly customer charge (varies by voltage class and mandatory vs voluntary status)',
    },
  ],
};

/**
 * Export all PG&E rates
 */
export const allPGERates: UtilityRate[] = [
  // Electric - Commercial/Industrial
  pgeA1,
  pgeA6,
  pgeA10,
  pgeB10,
  pgeB19,
  pgeB20,
  pgeE10,
  pgeE19,
  pgeE20,
  // Electric - Residential
  pgeE1,
  pgeE6,
  pgeETOUC,
  pgeETOUD,
  // Gas - All Customer Classes
  pgeG1,
  pgeG10,
  pgeGNR1,
  pgeGNR2,
  pgeG20,
];
