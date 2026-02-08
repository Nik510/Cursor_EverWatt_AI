/**
 * NIFS (Non-IOU Fuel Source) Calculation Engine
 * Ported from Python to TypeScript
 * 
 * Core logic for calculating OBF-eligible savings based on usage data.
 */

import type { UsageDataPoint, NIFSResult, MonthlyBreakdown, ProjectTotal } from './types';

/**
 * Validates that usage data has the required format and 12 months.
 */
export function validateUsageData(usageData: UsageDataPoint[]): { isValid: boolean; error?: string } {
  if (!usageData || usageData.length === 0) {
    return { isValid: false, error: 'Usage data is empty' };
  }

  if (usageData.length !== 12) {
    return { isValid: false, error: `Expected 12 months of data, got ${usageData.length}` };
  }

  for (let i = 0; i < usageData.length; i++) {
    const month = usageData[i];
    if (!month.date) {
      return { isValid: false, error: `Month ${i + 1} missing 'date' field` };
    }
    if (month.kwh === undefined || month.kwh === null) {
      return { isValid: false, error: `Month ${i + 1} missing 'kwh' field` };
    }
    if (typeof month.kwh !== 'number' || isNaN(month.kwh)) {
      return { isValid: false, error: `Month ${i + 1} has invalid 'kwh' value: ${month.kwh}` };
    }
  }

  return { isValid: true };
}

/**
 * Calculates the OBF eligible savings based on NIFS rules.
 * 
 * Rules:
 * 1. Negative usage (Net Export) = 0 savings
 * 2. Positive usage caps savings at the usage amount
 * 3. Monthly savings are distributed evenly, then capped
 */
export function calculateNIFSEligibility(
  meterId: string,
  annualSavings: number,
  usageData: UsageDataPoint[],
  monthlyTarget?: number
): NIFSResult {
  // 1. Distribute Savings (Default: Even Split over 12 months)
  const target = monthlyTarget ?? annualSavings / 12;

  const breakdown: MonthlyBreakdown[] = [];
  let totalEligibleSavings = 0;

  for (const month of usageData) {
    const usage = month.kwh;

    // --- THE CORE NIFS LOGIC ---
    // Rule 1: If usage is negative (Net Export), PG&E allows 0 savings.
    // Rule 2: If usage is positive, savings are capped at the usage amount.

    let cappedSavings: number;
    let reason: string;

    if (usage <= 0) {
      cappedSavings = 0;
      reason = 'Net Export (Negative Usage)';
    } else {
      cappedSavings = Math.min(target, usage);
      reason = usage < target ? 'Capped by Usage' : 'Full Savings';
    }

    breakdown.push({
      billDate: month.date,
      gridUsage: usage,
      targetSavings: target,
      eligibleSavings: cappedSavings,
      note: reason,
    });

    totalEligibleSavings += cappedSavings;
  }

  return {
    meterId,
    totalRequested: annualSavings,
    totalEligible: totalEligibleSavings,
    savingsLost: annualSavings - totalEligibleSavings,
    breakdown,
    monthlyTarget: target,
  };
}

/**
 * Aggregates results from multiple meters for a project.
 */
export function calculateProjectTotal(meterResults: NIFSResult[]): ProjectTotal {
  const totalRequested = meterResults.reduce((sum, m) => sum + m.totalRequested, 0);
  const totalEligible = meterResults.reduce((sum, m) => sum + m.totalEligible, 0);

  return {
    totalRequested,
    totalEligible,
    totalSavingsLost: totalRequested - totalEligible,
    meterCount: meterResults.length,
    meters: meterResults,
  };
}

