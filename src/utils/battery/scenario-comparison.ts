/**
 * Scenario Comparison Calculations
 * 
 * Calculates costs for three scenarios:
 * 1. Baseline: Current rate, no battery
 * 2. With Battery: Current rate + battery peak shaving
 * 3. With Battery + S Rate: S rate + battery peak shaving (if eligible)
 */

import type { LoadInterval } from '../../modules/battery/types';
import type { BatterySpec } from '../../modules/battery/types';
import type { DemandRateInfo } from '../rates/demand-rate-lookup';
import { simulatePeakShaving } from '../../modules/battery/logic';
import { calculateOptionSDemandCharges, DEFAULT_OPTION_S_RATES_2025_SECONDARY, simulateBatteryDispatchWithSRate } from './s-rate-calculations';
import { S_RATE_DAILY_RATE_2025 } from './s-rate-calculations';

export interface ScenarioResult {
  scenario: 'baseline' | 'battery' | 'battery_srate';
  monthlyDemandCharges: number[];
  monthlyEnergyCharges: number[];
  monthlyTotalCosts: number[];
  annualDemandCharge: number;
  annualEnergyCharge: number;
  annualTotalCost: number;
  annualSavings: number;
  peakDemandKw: number;
  monthlyPeaks: number[];
}

/**
 * Calculate monthly peak demand from interval data
 */
function calculateMonthlyPeaks(intervalData: LoadInterval[]): Map<string, number> {
  const monthlyPeaks = new Map<string, number>();
  
  for (const interval of intervalData) {
    const timestamp = interval.timestamp instanceof Date 
      ? interval.timestamp 
      : new Date(interval.timestamp);
    const monthKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
    
    const currentPeak = monthlyPeaks.get(monthKey) || 0;
    monthlyPeaks.set(monthKey, Math.max(currentPeak, interval.kw));
  }
  
  return monthlyPeaks;
}

/**
 * Calculate monthly energy consumption from interval data
 */
function calculateMonthlyEnergy(intervalData: LoadInterval[]): Map<string, number> {
  const monthlyEnergy = new Map<string, number>();
  const intervalHours = 0.25; // 15 minutes = 0.25 hours
  
  for (const interval of intervalData) {
    const timestamp = interval.timestamp instanceof Date 
      ? interval.timestamp 
      : new Date(interval.timestamp);
    const monthKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
    
    const currentEnergy = monthlyEnergy.get(monthKey) || 0;
    monthlyEnergy.set(monthKey, currentEnergy + interval.kw * intervalHours);
  }
  
  return monthlyEnergy;
}

/**
 * Calculate energy charges based on TOU periods
 * Simplified version - uses average energy rate if TOU rates not provided
 */
function calculateEnergyCharges(
  monthlyEnergy: Map<string, number>,
  energyRates: { onPeak: number; offPeak: number }
): Map<string, number> {
  const monthlyCharges = new Map<string, number>();
  
  // Simplified: use weighted average (60% on-peak, 40% off-peak)
  const avgEnergyRate = energyRates.onPeak * 0.6 + energyRates.offPeak * 0.4;
  
  for (const [monthKey, energyKwh] of monthlyEnergy.entries()) {
    monthlyCharges.set(monthKey, energyKwh * avgEnergyRate);
  }
  
  return monthlyCharges;
}

/**
 * Calculate scenario comparison for all three scenarios
 */
export function calculateScenarioComparison(
  intervalData: LoadInterval[],
  batterySpec: BatterySpec | null,
  currentRate: DemandRateInfo,
  sRateDailyRate: number = S_RATE_DAILY_RATE_2025,
  energyRates: { onPeak: number; offPeak: number },
  threshold: number
): ScenarioResult[] {
  const results: ScenarioResult[] = [];
  
  // Baseline month set
  const monthlyPeaksBaseline = calculateMonthlyPeaks(intervalData);
  const monthlyEnergyBaseline = calculateMonthlyEnergy(intervalData);
  const monthlyEnergyChargesBaseline = calculateEnergyCharges(monthlyEnergyBaseline, energyRates);
  
  const months = Array.from(monthlyPeaksBaseline.keys()).sort();
  
  // ===== SCENARIO 1: BASELINE =====
  const baselineMonthlyDemandCharges: number[] = [];
  const baselineMonthlyEnergyCharges: number[] = [];
  const baselineMonthlyTotalCosts: number[] = [];
  const baselineMonthlyPeaks: number[] = [];
  
  for (const month of months) {
    const peakKw = monthlyPeaksBaseline.get(month) || 0;
    const demandCharge = peakKw * currentRate.rate;
    const energyCharge = monthlyEnergyChargesBaseline.get(month) || 0;
    const totalCost = demandCharge + energyCharge;
    
    baselineMonthlyDemandCharges.push(demandCharge);
    baselineMonthlyEnergyCharges.push(energyCharge);
    baselineMonthlyTotalCosts.push(totalCost);
    baselineMonthlyPeaks.push(peakKw);
  }
  
  const baselineAnnualDemandCharge = baselineMonthlyDemandCharges.reduce((sum, c) => sum + c, 0);
  const baselineAnnualEnergyCharge = baselineMonthlyEnergyCharges.reduce((sum, c) => sum + c, 0);
  const baselineAnnualTotalCost = baselineAnnualDemandCharge + baselineAnnualEnergyCharge;
  const baselinePeakDemand = Math.max(...baselineMonthlyPeaks);
  
  results.push({
    scenario: 'baseline',
    monthlyDemandCharges: baselineMonthlyDemandCharges,
    monthlyEnergyCharges: baselineMonthlyEnergyCharges,
    monthlyTotalCosts: baselineMonthlyTotalCosts,
    annualDemandCharge: baselineAnnualDemandCharge,
    annualEnergyCharge: baselineAnnualEnergyCharge,
    annualTotalCost: baselineAnnualTotalCost,
    annualSavings: 0,
    peakDemandKw: baselinePeakDemand,
    monthlyPeaks: baselineMonthlyPeaks,
  });
  
  // ===== SCENARIO 2: WITH BATTERY =====
  if (batterySpec) {
    // Simulate battery peak shaving
    const loadProfile = { intervals: intervalData };
    const batteryResult = simulatePeakShaving(loadProfile, batterySpec, threshold);
    const batteryIntervals = batteryResult.final_load_profile.intervals;
    
    // Calculate monthly peaks from modified intervals
    const batteryMonthlyPeaks = calculateMonthlyPeaks(batteryIntervals);
    const batteryMonthlyEnergy = calculateMonthlyEnergy(batteryIntervals);
    const batteryMonthlyEnergyChargesMap = calculateEnergyCharges(batteryMonthlyEnergy, energyRates);
    const batteryMonthlyDemandCharges: number[] = [];
    const batteryMonthlyEnergyCharges: number[] = [];
    const batteryMonthlyTotalCosts: number[] = [];
    const batteryMonthlyPeaksArray: number[] = [];
    
    for (const month of months) {
      const peakKw = batteryMonthlyPeaks.get(month) || 0;
      const demandCharge = peakKw * currentRate.rate;
      const energyCharge = batteryMonthlyEnergyChargesMap.get(month) || 0;
      const totalCost = demandCharge + energyCharge;
      
      batteryMonthlyDemandCharges.push(demandCharge);
      batteryMonthlyEnergyCharges.push(energyCharge);
      batteryMonthlyTotalCosts.push(totalCost);
      batteryMonthlyPeaksArray.push(peakKw);
    }
    
    const batteryAnnualDemandCharge = batteryMonthlyDemandCharges.reduce((sum, c) => sum + c, 0);
    const batteryAnnualEnergyCharge = batteryMonthlyEnergyCharges.reduce((sum, c) => sum + c, 0);
    const batteryAnnualTotalCost = batteryAnnualDemandCharge + batteryAnnualEnergyCharge;
    const batteryPeakDemand = Math.max(...batteryMonthlyPeaksArray);
    const batteryAnnualSavings = baselineAnnualTotalCost - batteryAnnualTotalCost;
    
    results.push({
      scenario: 'battery',
      monthlyDemandCharges: batteryMonthlyDemandCharges,
      monthlyEnergyCharges: batteryMonthlyEnergyCharges,
      monthlyTotalCosts: batteryMonthlyTotalCosts,
      annualDemandCharge: batteryAnnualDemandCharge,
      annualEnergyCharge: batteryAnnualEnergyCharge,
      annualTotalCost: batteryAnnualTotalCost,
      annualSavings: batteryAnnualSavings,
      peakDemandKw: batteryPeakDemand,
      monthlyPeaks: batteryMonthlyPeaksArray,
    });
    
    // ===== SCENARIO 3: WITH BATTERY + S RATE =====
    // Simulate battery dispatch with S rate constraints
    const sRateResult = simulateBatteryDispatchWithSRate(
      intervalData,
      batterySpec.capacity_kwh,
      batterySpec.max_power_kw,
      batterySpec.round_trip_efficiency,
      threshold
    );
    
    const sRateIntervals = sRateResult.modifiedIntervals;
    const sRateMonthlyEnergy = calculateMonthlyEnergy(sRateIntervals);
    const sRateMonthlyEnergyChargesMap = calculateEnergyCharges(sRateMonthlyEnergy, energyRates);

    // Option S demand charges are schedule-based (daily Peak/Part-Peak accumulations + any monthly component).
    // Use the schedule-aware calculator rather than "daily max × rate".
    const optionSCost = calculateOptionSDemandCharges(sRateIntervals, DEFAULT_OPTION_S_RATES_2025_SECONDARY);
    const sRateMonthlyDemandChargeMap = new Map<string, number>();
    for (const m of optionSCost.monthly) {
      sRateMonthlyDemandChargeMap.set(m.month, m.totalDemandCharge);
    }
    // For display only: use dailyPeaks' max of daily max kW as a simple monthly proxy
    const sRateMonthlyPeakMap = new Map<string, number>();
    for (const dayPeak of sRateResult.dailyPeaks) {
      // dayPeak.date is YYYY-MM-DD (local). Avoid Date parsing (timezone-sensitive).
      const monthKey = String(dayPeak.date).slice(0, 7);
      sRateMonthlyPeakMap.set(monthKey, Math.max(sRateMonthlyPeakMap.get(monthKey) || 0, dayPeak.newPeak));
    }
    
    const sRateMonthlyDemandCharges: number[] = [];
    const sRateMonthlyEnergyCharges: number[] = [];
    const sRateMonthlyTotalCosts: number[] = [];
    const sRateMonthlyPeaksArray: number[] = [];
    
    for (const month of months) {
      const peakKw = sRateMonthlyPeakMap.get(month) || 0;
      const demandCharge = sRateMonthlyDemandChargeMap.get(month) || 0;
      const energyCharge = sRateMonthlyEnergyChargesMap.get(month) || 0;
      const totalCost = demandCharge + energyCharge;
      
      sRateMonthlyDemandCharges.push(demandCharge);
      sRateMonthlyEnergyCharges.push(energyCharge);
      sRateMonthlyTotalCosts.push(totalCost);
      sRateMonthlyPeaksArray.push(peakKw);
    }
    
    const sRateAnnualDemandCharge = sRateMonthlyDemandCharges.reduce((sum, c) => sum + c, 0);
    const sRateAnnualEnergyCharge = sRateMonthlyEnergyCharges.reduce((sum, c) => sum + c, 0);
    const sRateAnnualTotalCost = sRateAnnualDemandCharge + sRateAnnualEnergyCharge;
    const sRatePeakDemand = Math.max(...sRateMonthlyPeaksArray);
    const sRateAnnualSavings = baselineAnnualTotalCost - sRateAnnualTotalCost;
    
    results.push({
      scenario: 'battery_srate',
      monthlyDemandCharges: sRateMonthlyDemandCharges,
      monthlyEnergyCharges: sRateMonthlyEnergyCharges,
      monthlyTotalCosts: sRateMonthlyTotalCosts,
      annualDemandCharge: sRateAnnualDemandCharge,
      annualEnergyCharge: sRateAnnualEnergyCharge,
      annualTotalCost: sRateAnnualTotalCost,
      annualSavings: sRateAnnualSavings,
      peakDemandKw: sRatePeakDemand,
      monthlyPeaks: sRateMonthlyPeaksArray,
    });
  }
  
  return results;
}
