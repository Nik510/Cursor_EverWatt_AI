/**
 * Financial calculations: ROI, NPV, IRR, Payback
 */

import type { FinancialAnalysis, YearlyFinancials, CEFOFinancing } from './types';
import type { FinancialParameters } from '@core/types';

/**
 * Calculate comprehensive financial analysis
 */
export function calculateFinancialAnalysis(
  initialCost: number,
  yearlySavings: number[],
  params: FinancialParameters
): FinancialAnalysis {
  const totalSavings = yearlySavings.reduce((sum, s) => sum + s, 0);
  
  // Calculate NPV
  const npv = calculateNPV(yearlySavings, initialCost, params.discountRate);
  
  // Calculate IRR
  const irr = calculateIRR(initialCost, yearlySavings);
  
  // Simple payback
  const simplePayback = calculateSimplePayback(initialCost, yearlySavings);
  
  // Adjusted payback (accounts for time value of money)
  const adjustedPayback = calculateAdjustedPayback(
    initialCost,
    yearlySavings,
    params.discountRate
  );
  
  // Year-by-year breakdown
  const yearByYear: YearlyFinancials[] = [];
  let cumulativeSavings = 0;
  let cumulativeNPV = -initialCost;
  
  yearlySavings.forEach((savings, year) => {
    cumulativeSavings += savings;
    const pv = savings / Math.pow(1 + params.discountRate, year + 1);
    cumulativeNPV += pv;
    
    yearByYear.push({
      year: year + 1,
      savings,
      cumulativeSavings,
      presentValue: pv,
      cumulativeNPV,
    });
  });
  
  return {
    initialCost,
    totalSavings,
    netPresentValue: npv,
    internalRateOfReturn: irr,
    simplePayback,
    adjustedPayback,
    yearByYear,
  };
}

/**
 * Calculate Net Present Value
 */
function calculateNPV(
  cashFlows: number[],
  initialInvestment: number,
  discountRate: number
): number {
  let npv = -initialInvestment;
  
  cashFlows.forEach((cf, year) => {
    npv += cf / Math.pow(1 + discountRate, year + 1);
  });
  
  return npv;
}

/**
 * Calculate Internal Rate of Return using Newton-Raphson method
 */
function calculateIRR(initialInvestment: number, cashFlows: number[]): number {
  // IRR is the rate where NPV = 0
  // Use Newton-Raphson to solve
  
  let rate = 0.1; // Initial guess (10%)
  const maxIterations = 100;
  const tolerance = 0.0001;
  
  for (let i = 0; i < maxIterations; i++) {
    const npv = calculateNPV(cashFlows, initialInvestment, rate);
    const npvDerivative = calculateNPVDerivative(cashFlows, rate);
    
    if (Math.abs(npv) < tolerance) break;
    if (Math.abs(npvDerivative) < tolerance) break; // Avoid division by zero
    
    rate = rate - npv / npvDerivative;
    
    // Keep rate reasonable
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }
  
  return rate * 100; // Return as percentage
}

/**
 * Calculate derivative of NPV with respect to discount rate
 */
function calculateNPVDerivative(cashFlows: number[], rate: number): number {
  let derivative = 0;
  
  cashFlows.forEach((cf, year) => {
    const period = year + 1;
    derivative -= (period * cf) / Math.pow(1 + rate, period + 1);
  });
  
  return derivative;
}

/**
 * Calculate simple payback period (years)
 */
function calculateSimplePayback(
  initialCost: number,
  yearlySavings: number[]
): number {
  let cumulativeSavings = 0;
  
  for (let year = 0; year < yearlySavings.length; year++) {
    cumulativeSavings += yearlySavings[year];
    if (cumulativeSavings >= initialCost) {
      // Linear interpolation for partial year
      const previousYearSavings = year > 0 
        ? yearlySavings.slice(0, year).reduce((sum, s) => sum + s, 0)
        : 0;
      const remaining = initialCost - previousYearSavings;
      const fraction = remaining / yearlySavings[year];
      return year + fraction;
    }
  }
  
  return yearlySavings.length; // Never paid back
}

/**
 * Calculate adjusted payback (discounted payback)
 */
function calculateAdjustedPayback(
  initialCost: number,
  yearlySavings: number[],
  discountRate: number
): number {
  let cumulativeNPV = -initialCost;
  
  for (let year = 0; year < yearlySavings.length; year++) {
    const pv = yearlySavings[year] / Math.pow(1 + discountRate, year + 1);
    cumulativeNPV += pv;
    
    if (cumulativeNPV >= 0) {
      // Linear interpolation for partial year
      const previousYearNPV = year > 0
        ? -initialCost + yearlySavings.slice(0, year).reduce((sum, s, idx) => 
            sum + s / Math.pow(1 + discountRate, idx + 1), 0)
        : -initialCost;
      const remaining = -previousYearNPV;
      const fraction = remaining / pv;
      return year + fraction;
    }
  }
  
  return yearlySavings.length; // Never paid back
}

/**
 * Calculate CEFO loan payment
 */
export function calculateCEFOPayment(financing: CEFOFinancing): number {
  const { loanAmount, interestRate, termYears, paymentFrequency } = financing;
  
  const periodsPerYear = paymentFrequency === 'monthly' ? 12 :
                         paymentFrequency === 'quarterly' ? 4 : 1;
  const totalPeriods = termYears * periodsPerYear;
  const periodRate = interestRate / periodsPerYear;
  
  if (periodRate === 0) {
    return loanAmount / totalPeriods;
  }
  
  const payment = loanAmount * 
    (periodRate * Math.pow(1 + periodRate, totalPeriods)) /
    (Math.pow(1 + periodRate, totalPeriods) - 1);
  
  return payment;
}

