/**
 * Comprehensive Utility Data Types
 * Full data model for PG&E billing and interval data
 * 
 * This captures ALL fields from utility exports - no data is skimmed or lost
 */

/**
 * Complete Monthly Bill Record - captures every field from PG&E billing export
 */
export interface ComprehensiveBillRecord {
  // Customer Information
  billingName: string;
  siteAddress: string;
  siteCity: string;
  zipCode: string;
  
  // Account Identifiers
  saStatus: string;                    // Active, Inactive, etc.
  activity: string;                    // Building/activity description
  descriptor: string;
  accountNumber: string;
  meterNumber: string;
  nem: boolean;                        // Net Energy Metering flag
  saId: string;                        // Service Agreement ID - CRITICAL for cross-validation
  spId: string;                        // Service Point ID
  prsnId: string;                      // Person ID
  naicsCode: string;                   // Industry classification
  
  // Date Information
  yearOfBillEndDate: number;
  billStartDate: Date | null;
  billEndDate: Date;
  billingDays: number;
  
  // Rate Information
  rateCode: string;                    // e.g., "HB19S", "B-19", "A-10"
  serviceProvider: string;             // "PG&E" or "CCA (Comm Choice Aggregation)"
  
  // Cost Breakdown
  totalBillAmountPge: number;          // PG&E portion
  chargesPerKwh: number;               // $/kWh rate
  pgeRevenueAmount: number;
  espTotalRevenueAmount: number;       // Energy Service Provider (CCA)
  taxAmount: number;
  totalBillAmount: number;             // Total including all charges
  
  // TOU Energy Usage Breakdown (kWh)
  onPeakKwh: number;
  partialPeakKwh: number;
  offPeakKwh: number;
  superOffPeakKwh: number;
  totalUsageKwh: number;
  totalUsageTherms: number;            // For gas accounts
  hours: number;                       // Usage hours
  
  // Demand Breakdown (kW)
  maxMaxDemandKw: number;              // Highest 15-min peak
  onPeakDemandKw: number;
  partialPeakDemandKw: number;
  offPeakDemandKw: number;
  superOffPeakDemandKw: number;
  
  // Raw data for debugging
  rawRow: Record<string, any>;
}

/**
 * Complete Interval Data Record - captures every field from PG&E interval export
 */
export interface ComprehensiveIntervalRecord {
  // Account Identifier
  serviceAgreement: string;            // SAID - must match usage file
  
  // Time Period
  startDateTime: Date;
  endDateTime: Date;
  
  // Energy Data
  usage: number;                       // kWh for this interval
  usageUnit: string;                   // "KWH"
  
  // Environmental
  avgTemperature: number | null;
  temperatureUnit: string;             // "FAHRENHEIT"
  
  // Flags
  eventFlags: string;                  // Special events/flags
  
  // Demand
  peakDemand: number;                  // kW
  demandUnit: string;                  // "KW"
  
  // Raw data for debugging
  rawRow: Record<string, any>;
}

/**
 * Processed Usage Data Summary
 * Aggregated and analyzed data from usage file
 */
export interface UsageDataSummary {
  // Identifiers (extracted from data)
  saId: string;
  accountNumber: string;
  meterNumber: string;
  billingName: string;
  siteAddress: string;
  
  // Rate Info (extracted from data)
  rateCode: string;
  serviceProvider: string;
  
  // All bills (not grouped - every single row)
  allBills: ComprehensiveBillRecord[];
  
  // Aggregated Statistics
  statistics: {
    totalBillCount: number;
    dateRange: {
      start: Date;
      end: Date;
    };
    
    // Usage Stats
    totalUsageKwh: number;
    avgMonthlyUsageKwh: number;
    minMonthlyUsageKwh: number;
    maxMonthlyUsageKwh: number;
    
    // Demand Stats
    peakDemandKw: number;              // Highest ever
    avgMonthlyDemandKw: number;
    minMonthlyDemandKw: number;
    maxMonthlyDemandKw: number;
    
    // Cost Stats
    totalCost: number;
    avgMonthlyCost: number;
    minMonthlyCost: number;
    maxMonthlyCost: number;
    
    // TOU Breakdown (totals)
    touBreakdown: {
      onPeakKwh: number;
      partialPeakKwh: number;
      offPeakKwh: number;
      superOffPeakKwh: number;
      onPeakPercent: number;
      partialPeakPercent: number;
      offPeakPercent: number;
      superOffPeakPercent: number;
    };
  };
}

/**
 * Processed Interval Data Summary
 * Aggregated and analyzed data from interval file
 */
export interface IntervalDataSummary {
  // Identifier (extracted from data)
  serviceAgreement: string;            // SAID
  
  // All intervals (raw data preserved)
  allIntervals: ComprehensiveIntervalRecord[];
  
  // Aggregated Statistics
  statistics: {
    totalIntervalCount: number;
    intervalDurationMinutes: number;   // Usually 15
    dateRange: {
      start: Date;
      end: Date;
    };
    
    // Demand Analysis
    peakDemandKw: number;
    avgDemandKw: number;
    minDemandKw: number;
    
    // Peak Event Analysis
    peakEvents: Array<{
      timestamp: Date;
      demandKw: number;
      rank: number;
    }>;
    
    // Usage
    totalUsageKwh: number;
    avgDailyUsageKwh: number;
    
    // Temperature Correlation (if available)
    temperatureStats?: {
      avgTemperature: number;
      minTemperature: number;
      maxTemperature: number;
      peakDemandTemperature: number;   // Temperature at peak demand
    };
  };
}

/**
 * 3-Tier Verification Result
 */
export interface ThreeTierVerification {
  // Tier 1: User Input vs File Data
  tier1: {
    status: 'match' | 'mismatch' | 'warning';
    userSelectedRate: string | null;
    fileRateCode: string | null;
    userSaId: string | null;
    fileSaId: string | null;
    issues: string[];
  };
  
  // Tier 2: Cross-File Validation
  tier2: {
    status: 'match' | 'mismatch' | 'warning' | 'critical_mismatch';
    usageFileSaId: string | null;
    intervalFileSaId: string | null;
    usageFileRateCode: string | null;
    issues: string[];
  };
  
  // Tier 3: Rate Intelligence (System Rate Library)
  tier3: {
    status: 'match' | 'mismatch' | 'warning' | 'unknown';
    fileRateCode: string | null;
    matchedSystemRate: {
      rateCode: string;
      rateName: string;
      description: string;
      demandCharges: {
        summer: number;
        winter: number;
        effective: number;   // Weighted average
      };
      energyRates: {
        onPeak: number;
        partialPeak: number;
        offPeak: number;
      };
    } | null;
    calculatedDemandRate: number;
    derivedDemandRate: number;        // Derived from actual bill data
    variance: number;                  // % difference
    issues: string[];
    recommendations: string[];
  };
  
  // Overall Status
  overallStatus: 'verified' | 'needs_review' | 'critical_mismatch';
  confidenceScore: number;             // 0-100%
  allIssues: string[];
  allRecommendations: string[];
}

/**
 * Complete Utility Data Package
 * Everything the system knows about a customer's utility account
 */
export interface UtilityDataPackage {
  // Unique identifier for this package
  packageId: string;
  createdAt: Date;
  
  // Source files
  usageFileName: string | null;
  intervalFileName: string | null;
  
  // Processed data
  usageData: UsageDataSummary | null;
  intervalData: IntervalDataSummary | null;
  
  // Verification results
  verification: ThreeTierVerification;
  
  // User overrides (if they acknowledged mismatches)
  userOverrides?: {
    acknowledgedAt: Date;
    acknowledgedMismatches: string[];
    notes: string;
  };
}
