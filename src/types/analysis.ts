/**
 * Analysis data types for storing and managing energy analyses
 */

import type { CustomerInformation } from '../components/CustomerInformationForm';
import type { BatteryRecommendation } from '../components/BatteryRecommendationCard';
import type { SimulationResult } from '../modules/battery/types';
import type { BatterySpec } from '../modules/battery/types';

/**
 * Stored battery analysis
 */
export interface BatteryAnalysis {
  id: string;
  userId: string; // User who created this analysis
  createdAt: string;
  updatedAt: string;
  
  // Customer information
  customerInfo: CustomerInformation;
  
  // Analysis configuration
  threshold: number;
  demandRate: number;
  
  // Data files (references or metadata)
  intervalFile?: {
    name: string;
    size: number;
    uploadedAt: string;
  };
  monthlyBillFile?: {
    name: string;
    size: number;
    uploadedAt: string;
  };
  
  // Analysis results
  summary?: {
    demandRate: number;
    batteriesAnalyzed: number;
    originalPeakKw: number;
    bestPeakReductionKw: number;
    bestAnnualSavings: number;
  };
  
  recommendations?: BatteryRecommendation[];
  selectedBattery?: BatteryRecommendation;
  
  // Detailed simulation results (if available)
  simulationResults?: {
    batterySpec: BatterySpec;
    result: SimulationResult;
  }[];
  
  // Status
  status: 'draft' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

/**
 * Analysis summary for listing
 */
export interface AnalysisSummary {
  id: string;
  projectName: string;
  companyName: string;
  facilityName: string;
  createdAt: string;
  updatedAt: string;
  status: BatteryAnalysis['status'];
  originalPeakKw?: number;
  bestPeakReductionKw?: number;
  bestAnnualSavings?: number;
}
