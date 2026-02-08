/**
 * Demand Rate Lookup Utility
 * Extracts demand rates from comprehensive rate library
 * Replaces hardcoded PGE_DEMAND_RATES lookup table
 */

import type { UtilityRate, TOURate } from './types';
import { defaultRates } from './rate-data';

export interface DemandRateInfo {
  rate: number; // Effective demand rate in $/kW/month
  summer: number; // Summer demand rate
  winter: number; // Winter demand rate
  description: string;
  rateCode: string;
  utility: string;
}

/**
 * Extract demand rate from a rate structure
 * Returns the total demand charge rate for the rate code
 * For rates with multiple demand charges (e.g., B-19 has Maximum + On-Peak), sums them
 */
export function extractDemandRate(rate: UtilityRate): DemandRateInfo | null {
  if (rate.rateType !== 'TOU' && rate.rateType !== 'Demand') {
    return null;
  }

  const touRate = rate as TOURate;
  if (!touRate.demandCharges || touRate.demandCharges.length === 0) {
    return null;
  }

  // Sum all demand charges for each season
  // Some rates have multiple demand charges (e.g., B-19: Maximum Demand + On-Peak Period Demand)
  let summerTotal = 0;
  let winterTotal = 0;
  let allHoursTotal = 0;

  for (const charge of touRate.demandCharges) {
    // Skip partial-peak demand charges (they're typically much lower)
    // Focus on maximum demand and on-peak period demand
    if (charge.period === 'Partial-Peak' || charge.period === 'Mid-Peak') {
      continue;
    }

    if (charge.season === 'Summer' || charge.season === 'All' || !charge.season) {
      if (charge.period === 'All Hours' || charge.period === 'Maximum Demand' || !charge.period) {
        summerTotal += charge.rate;
      } else if (charge.period === 'On-Peak' || charge.period === 'Peak') {
        summerTotal += charge.rate;
      }
    }
    if (charge.season === 'Winter' || charge.season === 'All' || !charge.season) {
      if (charge.period === 'All Hours' || charge.period === 'Maximum Demand' || !charge.period) {
        winterTotal += charge.rate;
      } else if (charge.period === 'On-Peak' || charge.period === 'Peak') {
        winterTotal += charge.rate;
      }
    }
    if (!charge.season) {
      allHoursTotal += charge.rate;
    }
  }

  // If no season-specific rates, use all-hours total
  if (summerTotal === 0 && winterTotal === 0) {
    summerTotal = allHoursTotal;
    winterTotal = allHoursTotal;
  }

  // If still no rates found, try summing all charges regardless of period
  if (summerTotal === 0 && winterTotal === 0) {
    for (const charge of touRate.demandCharges) {
      if (charge.season === 'Summer' || charge.season === 'All' || !charge.season) {
        summerTotal += charge.rate;
      }
      if (charge.season === 'Winter' || charge.season === 'All' || !charge.season) {
        winterTotal += charge.rate;
      }
    }
  }

  // If still no rates, return null
  if (summerTotal === 0 && winterTotal === 0) {
    return null;
  }

  // Calculate effective rate (weighted average: 60% summer, 40% winter)
  const effectiveRate = summerTotal * 0.6 + winterTotal * 0.4;

  return {
    rate: effectiveRate,
    summer: summerTotal || winterTotal,
    winter: winterTotal || summerTotal,
    description: `${rate.rateName} (${rate.rateCode})`,
    rateCode: rate.rateCode,
    utility: rate.utility,
  };
}

/**
 * Get demand rate for a rate code
 * Searches all available rates and returns demand rate info
 */
export function getDemandRateForCode(rateCode: string, utility: string = 'PG&E'): DemandRateInfo | null {
  if (!rateCode) return null;

  const normalized = rateCode.toUpperCase().trim().replace(/\s+/g, '');

  const utilNorm = utility.toUpperCase().replace(/\s+/g, '');
  const utilMatches = (u: string) => u.toUpperCase().replace(/\s+/g, '') === utilNorm;

  for (const rate of defaultRates) {
    if (!utilMatches(rate.utility)) continue;

    const rateCodeNormalized = rate.rateCode.toUpperCase().trim().replace(/\s+/g, '');

    // Exact match
    if (rateCodeNormalized === normalized) {
      const demandRate = extractDemandRate(rate);
      if (demandRate) return demandRate;
    }

    // Partial match (e.g., "B19" matches "B-19")
    const rateCodeNoDash = rateCodeNormalized.replace(/-/g, '');
    const normalizedNoDash = normalized.replace(/-/g, '');
    if (
      rateCodeNoDash === normalizedNoDash ||
      normalized.includes(rateCodeNoDash) ||
      rateCodeNoDash.includes(normalized)
    ) {
      const demandRate = extractDemandRate(rate);
      if (demandRate) return demandRate;
    }
  }

  return null;
}

/**
 * Get all demand rates for a utility
 * Returns a map of rate codes to demand rate info
 */
export function getAllDemandRates(utility: string = 'PG&E'): Map<string, DemandRateInfo> {
  const rates = new Map<string, DemandRateInfo>();

  const utilNorm = utility.toUpperCase().replace(/\s+/g, '');
  const utilMatches = (u: string) => u.toUpperCase().replace(/\s+/g, '') === utilNorm;

  for (const rate of defaultRates) {
    if (!utilMatches(rate.utility)) continue;
    const demandRate = extractDemandRate(rate);
    if (demandRate) {
      rates.set(rate.rateCode, demandRate);
      // Also add variants without dashes
      const codeNoDash = rate.rateCode.replace(/-/g, '');
      if (codeNoDash !== rate.rateCode) {
        rates.set(codeNoDash, demandRate);
      }
    }
  }

  return rates;
}

/**
 * Legacy function for backward compatibility
 * Returns the same format as the old PGE_DEMAND_RATES lookup
 */
export function getLegacyDemandRate(rateCode: string): { rate: number; description: string } | null {
  const demandRate = getDemandRateForCode(rateCode, 'PG&E');
  if (!demandRate) return null;
  
  return {
    rate: demandRate.rate,
    description: demandRate.description,
  };
}
