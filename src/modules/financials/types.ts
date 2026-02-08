/**
 * Financial analysis module type definitions
 */

/**
 * Financial analysis result
 */
export interface FinancialAnalysis {
  initialCost: number;
  totalSavings: number; // Over analysis period
  netPresentValue: number; // NPV
  internalRateOfReturn: number; // IRR (%)
  simplePayback: number; // Years
  adjustedPayback: number; // Years (accounting for degradation)
  yearByYear: YearlyFinancials[];
}

/**
 * Yearly financial breakdown
 */
export interface YearlyFinancials {
  year: number;
  savings: number;
  cumulativeSavings: number;
  presentValue: number;
  cumulativeNPV: number;
}

/**
 * CEFO financing structure (OBF-style)
 */
export interface CEFOFinancing {
  loanAmount: number;
  interestRate: number; // Annual
  termYears: number;
  paymentFrequency: 'monthly' | 'quarterly' | 'annually';
  paymentAmount?: number; // Calculated if not provided
}

