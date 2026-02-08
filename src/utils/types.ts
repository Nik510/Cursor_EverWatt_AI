/**
 * Utility types for file parsing and data extraction
 */

/**
 * Monthly utility bill data
 */
export interface MonthlyBill {
  date: Date;
  totalUsageKwh: number;
  peakDemandKw: number;
  totalCost: number;
  rateCode?: string; // e.g., "HB19S", "B-19", "A-10"
}

