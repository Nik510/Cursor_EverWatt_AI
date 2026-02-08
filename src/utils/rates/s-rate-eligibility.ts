/**
 * S Rate (Option S) Eligibility Check
 * 
 * PG&E Option S is a daily demand charge rate structure that can be beneficial
 * for customers with battery storage systems. This utility checks eligibility
 * and provides recommendations.
 * 
 * Key eligibility criteria:
 * - Must be on a compatible rate (typically B-19S or similar)
 * - Battery capacity should be >= 10% of peak demand
 * - Load factor < 60% is favorable (peaky load profile)
 * - Daily demand charge structure ($1.61/kW/day for 2025)
 */

import type { LoadInterval } from '../../modules/battery/types';

export interface SRateEligibility {
  isEligible: boolean;
  reasons: string[];
  batteryCapacityPercent: number;
  loadFactor: number;
  estimatedSRateSavings?: number;
  recommendation: 'recommended' | 'not_recommended' | 'neutral';
  qualificationCriteria: {
    onCompatibleRate: boolean;
    batteryCapacitySufficient: boolean;
    loadFactorFavorable: boolean;
  };
}

/**
 * True if the customer is already on an Option S schedule (e.g. B-19S / E-19S).
 * In that case, we should NOT treat Option S as an "add-on" or optional comparison.
 */
export function isAlreadyOnOptionS(rateCode: string): boolean {
  if (!rateCode) return false;
  const normalized = rateCode.toUpperCase().trim().replace(/\s+/g, '').replace(/-/g, '');
  // Common PG&E schedules encode Option S as a trailing "S" (e.g., B19S, E19S).
  return normalized.endsWith('S');
}

/**
 * Check if a rate code is compatible with S rate
 */
function isCompatibleRate(rateCode: string): boolean {
  if (!rateCode) return false;
  
  const normalized = rateCode.toUpperCase().trim().replace(/\s+/g, '');
  
  // S rate is typically available for B-19S, E-19S, and similar rates
  // Also check for base rates that can be converted to S rate
  const compatibleRates = [
    'B-19S', 'B19S', 'B-19', 'B19',
    'E-19S', 'E19S', 'E-19', 'E19',
    'A-10', 'A10',
  ];
  
  return compatibleRates.some(rate => {
    const rateNormalized = rate.replace(/-/g, '');
    return normalized === rate || normalized.includes(rateNormalized) || rateNormalized.includes(normalized);
  });
}

/**
 * Calculate load factor from interval data
 */
function calculateLoadFactor(intervalData: LoadInterval[]): number {
  if (intervalData.length === 0) return 0;
  
  const demands = intervalData.map(i => i.kw);
  const peakDemand = Math.max(...demands);
  const avgDemand = demands.reduce((sum, d) => sum + d, 0) / demands.length;
  
  if (peakDemand === 0) return 0;
  return avgDemand / peakDemand;
}

/**
 * Check S rate eligibility based on customer profile and battery specifications
 */
export function checkSRateEligibility(
  rateCode: string,
  peakDemandKw: number,
  batteryCapacityKwh: number,
  batteryPowerKw: number,
  loadFactor: number,
  intervalData: LoadInterval[]
): SRateEligibility {
  const reasons: string[] = [];
  const qualificationCriteria = {
    onCompatibleRate: false,
    batteryCapacitySufficient: false,
    loadFactorFavorable: false,
  };

  // If already on an Option S schedule, this function should not be used to decide a "switch".
  // The customer is already enrolled; eligibility gating is about enrollment, not operation.
  if (isAlreadyOnOptionS(rateCode)) {
    return {
      isEligible: false,
      reasons: ['Customer is already on an Option S schedule (no “switch” needed).'],
      batteryCapacityPercent: peakDemandKw > 0 ? (batteryCapacityKwh / peakDemandKw) * 100 : 0,
      loadFactor: loadFactor > 0 ? loadFactor : calculateLoadFactor(intervalData),
      recommendation: 'neutral',
      qualificationCriteria: {
        onCompatibleRate: true,
        batteryCapacitySufficient: true,
        loadFactorFavorable: (loadFactor > 0 ? loadFactor : calculateLoadFactor(intervalData)) < 0.6,
      },
    };
  }
  
  // Check 1: Compatible rate code
  const onCompatibleRate = isCompatibleRate(rateCode);
  qualificationCriteria.onCompatibleRate = onCompatibleRate;
  
  if (onCompatibleRate) {
    reasons.push('✓ On compatible rate code for S rate');
  } else {
    reasons.push('✗ Rate code may not be compatible with S rate');
  }
  
  // Check 2: Battery capacity >= 10% of peak demand
  const batteryCapacityPercent = peakDemandKw > 0 
    ? (batteryCapacityKwh / peakDemandKw) * 100 
    : 0;
  const batteryCapacitySufficient = batteryCapacityPercent >= 10;
  qualificationCriteria.batteryCapacitySufficient = batteryCapacitySufficient;
  
  if (batteryCapacitySufficient) {
    reasons.push(`✓ Battery capacity (${batteryCapacityPercent.toFixed(1)}% of peak) meets 10% requirement`);
  } else {
    reasons.push(`✗ Battery capacity (${batteryCapacityPercent.toFixed(1)}% of peak) is below 10% requirement`);
  }
  
  // Check 3: Load factor < 60% is favorable
  const calculatedLoadFactor = loadFactor > 0 ? loadFactor : calculateLoadFactor(intervalData);
  const loadFactorFavorable = calculatedLoadFactor < 0.6;
  qualificationCriteria.loadFactorFavorable = loadFactorFavorable;
  
  if (loadFactorFavorable) {
    reasons.push(`✓ Load factor (${(calculatedLoadFactor * 100).toFixed(1)}%) indicates peaky profile, favorable for S rate`);
  } else {
    reasons.push(`⚠ Load factor (${(calculatedLoadFactor * 100).toFixed(1)}%) is moderate; S rate may still be beneficial`);
  }
  
  // Determine overall eligibility
  // Eligible if: compatible rate AND sufficient battery capacity
  const isEligible = onCompatibleRate && batteryCapacitySufficient;
  
  // Determine recommendation
  let recommendation: 'recommended' | 'not_recommended' | 'neutral' = 'neutral';
  
  if (isEligible && loadFactorFavorable) {
    recommendation = 'recommended';
  } else if (!onCompatibleRate || !batteryCapacitySufficient) {
    recommendation = 'not_recommended';
  } else {
    recommendation = 'neutral';
  }
  
  return {
    isEligible,
    reasons,
    batteryCapacityPercent,
    loadFactor: calculatedLoadFactor,
    recommendation,
    qualificationCriteria,
  };
}

/**
 * Estimate S rate savings compared to standard monthly demand charge
 * This is a simplified calculation - actual savings depend on many factors
 */
export function estimateSRateSavings(
  peakDemandKw: number,
  monthlyDemandRate: number, // $/kW/month
  sRateDailyRate: number = 1.61 // $/kW/day for 2025
): number {
  // Monthly demand charge on standard rate
  const monthlyDemandCharge = peakDemandKw * monthlyDemandRate;
  
  // S rate daily charge (30 days/month average)
  const sRateMonthlyCharge = peakDemandKw * sRateDailyRate * 30;
  
  // Savings (negative means S rate costs more)
  const savings = monthlyDemandCharge - sRateMonthlyCharge;
  
  return savings;
}
