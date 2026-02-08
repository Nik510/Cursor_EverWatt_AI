/**
 * Pre-populated Utility Rate Data
 * Common rates for major California utilities
 * 
 * Organization:
 * - Rates are organized by utility (PG&E, SCE, SDG&E)
 * - Active rates listed first, then legacy rates
 * - Each rate includes comprehensive TOU periods, demand charges, and fixed charges
 * - All rates updated to 2025 effective dates
 * 
 * Rate Categories:
 * - Active Rates: Currently available for new customers (B-19, B-20, B-10)
 * - Legacy Rates: Grandfathered only, being phased out (E-19, E-20)
 */

import type { UtilityRate, TOURate } from './types';
import { storeRates } from './storage';
import { allPGERates } from './pge-rates-comprehensive';

/**
 * PG&E B-19 Rate (Medium General Demand-Metered TOU)
 * Updated with 2024 rates
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
      amount: 3872.60,
      description: 'Monthly customer charge',
    },
    {
      name: 'TOU Meter Charge (Rate V)',
      amount: 342.20,
      description: 'Time-of-use metering charge',
    },
  ],
};

/**
 * PG&E B-20 Rate (Large General Demand-Metered TOU)
 * Updated with 2024 rates - Legacy rate for large C&I customers with solar
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
      amount: 3872.60,
      description: 'Monthly customer charge',
    },
    {
      name: 'TOU Meter Charge (Rate V)',
      amount: 342.20,
      description: 'Time-of-use metering charge',
    },
  ],
};

/**
 * SCE TOU-D-Prime Rate
 */
export const sceTOUDPrime: TOURate = {
  id: 'sce-tou-d-prime',
  utility: 'SCE',
  rateCode: 'TOU-D-Prime',
  rateName: 'TOU-D-Prime',
  description: 'Medium to large commercial customers with demand charges',
  rateType: 'TOU',
  serviceType: 'Electric',
  isActive: true,
  customerClass: 'Medium C&I',
  minimumDemand: 20,
  touPeriods: [
    {
      name: 'Peak',
      start: '16:00',
      end: '21:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.27,
      isPeak: true,
    },
    {
      name: 'Mid-Peak',
      start: '10:00',
      end: '16:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.19,
    },
    {
      name: 'Off-Peak',
      start: '21:00',
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
      name: 'Mid-Peak',
      start: '10:00',
      end: '18:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.17,
    },
    {
      name: 'Off-Peak',
      start: '18:00',
      end: '10:00',
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
      rate: 15.0,
      billingMethod: 'maximum',
    },
    {
      name: 'Peak Period Demand',
      period: 'Peak',
      rate: 15.0,
      season: 'Summer',
      billingMethod: 'maximum',
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 10.0,
    },
  ],
};

/**
 * SDG&E AL-TOU Rate
 */
export const sdegeALTOU: TOURate = {
  id: 'sdege-al-tou',
  utility: 'SDG&E',
  rateCode: 'AL-TOU',
  rateName: 'AL-TOU',
  description: 'Commercial and industrial time-of-use rate',
  rateType: 'TOU',
  serviceType: 'Electric',
  isActive: true,
  customerClass: 'Medium C&I',
  minimumDemand: 20,
  touPeriods: [
    {
      name: 'Peak',
      start: '16:00',
      end: '21:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.29,
      isPeak: true,
    },
    {
      name: 'Semi-Peak',
      start: '10:00',
      end: '16:00',
      season: 'Summer',
      dayType: 'Weekday',
      energyRate: 0.21,
    },
    {
      name: 'Off-Peak',
      start: '21:00',
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
      name: 'Semi-Peak',
      start: '10:00',
      end: '18:00',
      season: 'Winter',
      dayType: 'Weekday',
      energyRate: 0.19,
    },
    {
      name: 'Off-Peak',
      start: '18:00',
      end: '10:00',
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
      rate: 16.5,
      billingMethod: 'maximum',
    },
    {
      name: 'Peak Period Demand',
      period: 'Peak',
      rate: 16.5,
      season: 'Summer',
      billingMethod: 'maximum',
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 10.0,
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
      amount: 3500.00,
      description: 'Monthly customer charge (legacy rate)',
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
      amount: 3500.00,
      description: 'Monthly customer charge (legacy rate)',
    },
  ],
};

/**
 * PG&E B-10 Rate (Commercial Only Service)
 * Simple commercial rate without TOU or demand charges
 */
export const pgeB10: UtilityRate = {
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
 * Default blended rate (fallback)
 */
export const defaultBlendedRate: UtilityRate = {
  id: 'default-blended',
  utility: 'Other',
  rateCode: 'DEFAULT',
  rateName: 'Default Blended Rate',
  description: 'Default blended rate for calculations when no specific rate is available',
  rateType: 'Blended',
  serviceType: 'Electric',
  isActive: true,
  energyRate: 0.15,
  demandCharges: [
    {
      name: 'Demand Charge',
      period: 'All Hours',
      rate: 15.0,
    },
  ],
  fixedCharges: [
    {
      name: 'Customer Charge',
      amount: 10.0,
    },
  ],
};

/**
 * All pre-populated rates
 * Organized by utility and rate type
 * 
 * Note: Comprehensive PG&E rates (electric and gas) are imported from pge-rates-comprehensive.ts
 */
export const defaultRates: UtilityRate[] = [
  // PG&E Rates (comprehensive - includes all electric and gas rates)
  ...allPGERates,
  // Other Utilities
  sceTOUDPrime,
  sdegeALTOU,
  // Fallback
  defaultBlendedRate,
];

/**
 * Initialize rate storage with default rates
 */
export function initializeDefaultRates(): void {
  storeRates(defaultRates);
}
