/**
 * Battery degradation modeling
 * Implements realistic capacity loss over time based on usage patterns
 */

import type { BatterySpec, DegradationCurve } from './types';

/**
 * Calculate battery capacity at a given year, accounting for degradation
 */
export function calculateCapacityAtYear(
  battery: BatterySpec,
  year: number,
  usageFactor: number = 1.0 // 0-1, how heavily the battery is used
): number {
  const curve = battery.degradationCurve;
  const baseCapacity = battery.capacity;
  
  // Apply usage factor (more usage = more degradation)
  const adjustedYear = year * (0.5 + 0.5 * usageFactor);
  
  let retention: number;
  
  switch (curve.method) {
    case 'linear':
      retention = linearInterpolation(
        adjustedYear,
        curve.year1,
        curve.year5,
        curve.year10,
        curve.year20
      );
      break;
      
    case 'exponential':
      retention = exponentialInterpolation(
        adjustedYear,
        curve.year1,
        curve.year5,
        curve.year10
      );
      break;
      
    case 'custom':
      // For custom, use piecewise linear between known points
      retention = linearInterpolation(
        adjustedYear,
        curve.year1,
        curve.year5,
        curve.year10,
        curve.year20
      );
      break;
      
    default:
      retention = linearInterpolation(
        adjustedYear,
        curve.year1,
        curve.year5,
        curve.year10
      );
  }
  
  return baseCapacity * retention;
}

/**
 * Linear interpolation between degradation points
 */
function linearInterpolation(
  year: number,
  year1: number,
  year5: number,
  year10: number,
  year20?: number
): number {
  if (year <= 1) {
    return 1 - (1 - year1) * year;
  } else if (year <= 5) {
    return year1 - (year1 - year5) * ((year - 1) / 4);
  } else if (year <= 10) {
    return year5 - (year5 - year10) * ((year - 5) / 5);
  } else if (year20 !== undefined && year <= 20) {
    return year10 - (year10 - year20) * ((year - 10) / 10);
  } else {
    // Extrapolate beyond last known point
    const annualDegradation = (year10 - (year20 ?? year10 * 0.7)) / 10;
    return Math.max(0, year10 - annualDegradation * (year - 10));
  }
}

/**
 * Exponential degradation model
 * Assumes degradation follows exponential decay
 */
function exponentialInterpolation(
  year: number,
  year1: number,
  year5: number,
  year10: number
): number {
  // Fit exponential: retention = a * exp(-b * year)
  // Using year1, year5, year10 to solve for a and b
  
  // Simplified: use year1 and year10 to estimate decay rate
  const b = -Math.log(year10 / year1) / 9; // Decay rate from year 1 to 10
  const a = year1 / Math.exp(-b * 1);
  
  return a * Math.exp(-b * year);
}

/**
 * Calculate year-by-year capacity degradation
 */
export function calculateYearlyDegradation(
  battery: BatterySpec,
  years: number = 10,
  usageFactor: number = 1.0
): Array<{ year: number; capacity: number; retention: number }> {
  const results = [];
  
  for (let year = 0; year <= years; year++) {
    const capacity = calculateCapacityAtYear(battery, year, usageFactor);
    const retention = capacity / battery.capacity;
    results.push({ year, capacity, retention });
  }
  
  return results;
}

