/**
 * NIFS (Non-IOU Fuel Source) Analysis Types
 */

export interface UsageDataPoint {
  date: string; // YYYY-MM-DD format
  kwh: number;
}

export interface MonthlyBreakdown {
  billDate: string;
  gridUsage: number;
  targetSavings: number;
  eligibleSavings: number;
  note: string;
}

export interface NIFSResult {
  meterId: string;
  totalRequested: number;
  totalEligible: number;
  savingsLost: number;
  breakdown: MonthlyBreakdown[];
  monthlyTarget: number;
}

export interface MeterData {
  id: string;
  hasSolar: boolean;
  allocatedSavings: number;
  usageData?: UsageDataPoint[];
  result?: NIFSResult;
}

export interface ProjectData {
  projectName: string;
  totalProjectSavings: number;
  meters: MeterData[];
}

export interface ProjectTotal {
  totalRequested: number;
  totalEligible: number;
  totalSavingsLost: number;
  meterCount: number;
  meters: NIFSResult[];
}

