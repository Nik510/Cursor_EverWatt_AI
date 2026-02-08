/**
 * Rate Storage and Management
 * Provides functions to store, retrieve, and manage utility rates
 */

import type { UtilityRate, RateFilter, UtilityProvider } from './types';

/**
 * In-memory rate storage (can be replaced with database/API)
 */
let rateStorage: Map<string, UtilityRate> = new Map();

/**
 * Store a rate
 */
export function storeRate(rate: UtilityRate): void {
  rateStorage.set(rate.id, rate);
}

/**
 * Store multiple rates
 */
export function storeRates(rates: UtilityRate[]): void {
  rates.forEach(rate => storeRate(rate));
}

/**
 * Get rate by ID
 */
export function getRateById(id: string): UtilityRate | undefined {
  return rateStorage.get(id);
}

/**
 * Get rate by utility and rate code
 */
export function getRateByCode(utility: UtilityProvider, rateCode: string): UtilityRate | undefined {
  for (const rate of rateStorage.values()) {
    if (rate.utility === utility && rate.rateCode === rateCode) {
      return rate;
    }
  }
  return undefined;
}

/**
 * Get all rates
 */
export function getAllRates(): UtilityRate[] {
  return Array.from(rateStorage.values());
}

/**
 * Search rates by filter
 */
export function searchRates(filter: RateFilter): UtilityRate[] {
  return Array.from(rateStorage.values()).filter(rate => {
    if (filter.utility && rate.utility !== filter.utility) return false;
    if (filter.rateType && rate.rateType !== filter.rateType) return false;
    if (filter.serviceType && rate.serviceType !== filter.serviceType) return false;
    if (filter.customerClass && rate.customerClass !== filter.customerClass) return false;
    if (filter.minDemand && rate.minimumDemand && rate.minimumDemand > filter.minDemand) return false;
    if (filter.maxDemand && rate.maximumDemand && rate.maximumDemand < filter.maxDemand) return false;
    if (filter.isActive !== undefined && rate.isActive !== filter.isActive) return false;
    if (filter.sRateEligible !== undefined && rate.sRateEligible !== filter.sRateEligible) return false;
    return true;
  });
}

/**
 * Get rates by utility
 */
export function getRatesByUtility(utility: UtilityProvider): UtilityRate[] {
  return searchRates({ utility });
}

/**
 * Get rates by type
 */
export function getRatesByType(rateType: UtilityRate['rateType']): UtilityRate[] {
  return searchRates({ rateType });
}

/**
 * Get active rates
 */
export function getActiveRates(): UtilityRate[] {
  return searchRates({ isActive: true });
}

/**
 * Delete rate by ID
 */
export function deleteRate(id: string): boolean {
  return rateStorage.delete(id);
}

/**
 * Update rate
 */
export function updateRate(id: string, updates: Partial<UtilityRate>): boolean {
  const rate = rateStorage.get(id);
  if (!rate) return false;
  
  const updated = { ...rate, ...updates };
  rateStorage.set(id, updated);
  return true;
}

/**
 * Clear all rates
 */
export function clearRates(): void {
  rateStorage.clear();
}

/**
 * Get rate count
 */
export function getRateCount(): number {
  return rateStorage.size;
}

/**
 * Check if rate exists
 */
export function rateExists(id: string): boolean {
  return rateStorage.has(id);
}

/**
 * Find best matching rate for customer profile
 */
export function findBestRate(
  utility: UtilityProvider,
  peakDemandKw: number,
  customerClass?: string,
  hasSolar?: boolean
): UtilityRate | null {
  const candidates = searchRates({
    utility,
    isActive: true,
    customerClass,
    sRateEligible: hasSolar,
  }).filter(rate => {
    if (rate.minimumDemand && peakDemandKw < rate.minimumDemand) return false;
    if (rate.maximumDemand && peakDemandKw > rate.maximumDemand) return false;
    return true;
  });
  
  if (candidates.length === 0) return null;
  
  // Prefer TOU rates for demand > 50kW, otherwise prefer simpler rates
  if (peakDemandKw > 50) {
    const touRates = candidates.filter(r => r.rateType === 'TOU');
    if (touRates.length > 0) return touRates[0];
  }
  
  return candidates[0];
}
