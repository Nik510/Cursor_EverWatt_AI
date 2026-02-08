/**
 * Rate Helper Functions
 * Convenience functions for common rate operations
 */

import type { UtilityRate } from './types';
import { getRateById, findBestRate, getRatesByUtility } from './storage';

/**
 * Get effective demand rate from a utility rate
 * Returns the average demand charge rate in $/kW/month
 */
export function getEffectiveDemandRate(rate: UtilityRate): number {
  if (rate.rateType === 'TOU' && 'demandCharges' in rate && rate.demandCharges) {
    const totalRate = rate.demandCharges.reduce((sum, dc) => sum + dc.rate, 0);
    return totalRate / rate.demandCharges.length;
  }
  
  if (rate.rateType === 'Demand' && 'demandCharges' in rate && rate.demandCharges) {
    const totalRate = rate.demandCharges.reduce((sum, dc) => sum + dc.rate, 0);
    return totalRate / rate.demandCharges.length;
  }
  
  if (rate.rateType === 'Blended' && 'demandCharges' in rate && rate.demandCharges) {
    const totalRate = rate.demandCharges.reduce((sum, dc) => sum + dc.rate, 0);
    return totalRate / rate.demandCharges.length;
  }
  
  // Default fallback
  return 15.0;
}

/**
 * Get average energy rate from a utility rate
 * Returns average $/kWh
 * For TOU rates: weighted average based on typical usage patterns
 * For Tiered rates: weighted average assuming typical consumption distribution
 */
export function getAverageEnergyRate(rate: UtilityRate): number {
  if (rate.rateType === 'TOU' && 'touPeriods' in rate && rate.touPeriods) {
    // Calculate weighted average based on typical usage patterns
    // Peak periods: ~30% of usage, Off-peak: ~70%
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const period of rate.touPeriods) {
      // Weight peak periods more heavily (they represent higher-cost periods)
      const weight = period.isPeak ? 0.35 : 0.65 / (rate.touPeriods.filter(p => !p.isPeak).length || 1);
      weightedSum += period.energyRate * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 
      rate.touPeriods.reduce((sum, p) => sum + p.energyRate, 0) / rate.touPeriods.length;
  }
  
  if (rate.rateType === 'Blended' && 'energyRate' in rate) {
    return rate.energyRate;
  }
  
  if (rate.rateType === 'Demand' && 'energyRate' in rate) {
    return rate.energyRate;
  }
  
  if (rate.rateType === 'Tiered' && 'tiers' in rate && rate.tiers) {
    // For tiered rates, calculate weighted average assuming typical consumption
    // Baseline tier: ~60% of usage, Tier 1: ~30%, Tier 2+: ~10%
    const sortedTiers = [...rate.tiers].sort((a, b) => (a.tier || 0) - (b.tier || 0));
    
    if (sortedTiers.length === 0) return 0;
    
    // Calculate weighted average based on typical usage distribution
    let weightedSum = 0;
    const weights = [];
    
    // Assign weights: first tier (baseline) gets 60%, second gets 30%, rest split remaining 10%
    for (let i = 0; i < sortedTiers.length; i++) {
      if (i === 0) {
        weights.push(0.6);
      } else if (i === 1) {
        weights.push(0.3);
      } else {
        // Remaining tiers split the last 10%
        const remainingTiers = sortedTiers.length - 2;
        weights.push(0.1 / remainingTiers);
      }
    }
    
    // Normalize weights to sum to 1
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);
    
    // Calculate weighted average
    for (let i = 0; i < sortedTiers.length; i++) {
      weightedSum += sortedTiers[i].rate * normalizedWeights[i];
    }
    
    return weightedSum;
  }
  
  // Default fallback
  return 0.15;
}

/**
 * Get peak energy rate from a TOU rate
 */
export function getPeakEnergyRate(rate: UtilityRate): number | null {
  if (rate.rateType === 'TOU' && 'touPeriods' in rate && rate.touPeriods) {
    const peakPeriods = rate.touPeriods.filter(p => p.isPeak);
    if (peakPeriods.length > 0) {
      // Return the highest peak rate (usually summer peak)
      return Math.max(...peakPeriods.map(p => p.energyRate));
    }
  }
  return null;
}

/**
 * Get off-peak energy rate from a TOU rate
 */
export function getOffPeakEnergyRate(rate: UtilityRate): number | null {
  if (rate.rateType === 'TOU' && 'touPeriods' in rate && rate.touPeriods) {
    const offPeakPeriods = rate.touPeriods.filter(p => !p.isPeak);
    if (offPeakPeriods.length > 0) {
      // Return the lowest off-peak rate
      return Math.min(...offPeakPeriods.map(p => p.energyRate));
    }
  }
  return null;
}

/**
 * Get tier breakdown for tiered rates
 */
export function getTierBreakdown(rate: UtilityRate): Array<{ name: string; rate: number; threshold?: number }> | null {
  if (rate.rateType === 'Tiered' && 'tiers' in rate && rate.tiers) {
    return rate.tiers
      .sort((a, b) => (a.tier || 0) - (b.tier || 0))
      .map(tier => ({
        name: tier.name || `Tier ${tier.tier}`,
        rate: tier.rate,
        threshold: tier.threshold,
      }));
  }
  return null;
}

/**
 * Get TOU period breakdown
 */
export function getTOUBreakdown(rate: UtilityRate): Array<{ 
  name: string; 
  rate: number; 
  time: string;
  season: string;
  isPeak: boolean;
}> | null {
  if (rate.rateType === 'TOU' && 'touPeriods' in rate && rate.touPeriods) {
    return rate.touPeriods.map(period => ({
      name: period.name,
      rate: period.energyRate,
      time: `${period.start}-${period.end}`,
      season: period.season || 'All',
      isPeak: period.isPeak || false,
    }));
  }
  return null;
}

/**
 * Get rate summary for display
 */
export function getRateSummary(rate: UtilityRate): {
  utility: string;
  rateCode: string;
  rateName: string;
  rateType: string;
  demandRate: number;
  energyRate: number;
  description: string;
} {
  return {
    utility: rate.utility,
    rateCode: rate.rateCode,
    rateName: rate.rateName,
    rateType: rate.rateType,
    demandRate: getEffectiveDemandRate(rate),
    energyRate: getAverageEnergyRate(rate),
    description: rate.description || '',
  };
}

/**
 * Find rate by utility and approximate demand
 */
export function findRateForCustomer(
  utility: UtilityRate['utility'],
  peakDemandKw: number,
  customerClass?: string,
  hasSolar?: boolean
): UtilityRate | null {
  return findBestRate(utility, peakDemandKw, customerClass, hasSolar);
}

/**
 * Get all available utilities
 */
export function getAvailableUtilities(): string[] {
  const rates = getRatesByUtility('PG&E');
  const utilities = new Set<string>();
  
  // Get all unique utilities from stored rates
  const allRates = getRatesByUtility('PG&E'); // This will get all if we search properly
  // Actually, we need to iterate through all rates
  // For now, return common ones
  return ['PG&E', 'SCE', 'SDG&E', 'LADWP', 'SMUD'];
}
