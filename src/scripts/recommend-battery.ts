/**
 * Battery Recommendation Script
 * Analyzes client usage data and recommends optimal battery systems
 * 
 * Usage: npx tsx src/scripts/recommend-battery.ts
 */

import path from 'path';
import { readIntervalData, intervalDataToLoadProfile, readMonthlyBills } from '../utils/excel-reader';
import { loadBatteryCatalog, catalogToBatterySpec } from '../utils/battery-catalog-loader';
import { computeMonthlyBillingPeakReductionKwMonthSum, simulatePeakShaving } from '../modules/battery/logic';
import type { BatterySpec, LoadProfile } from '../modules/battery/types';
import { getLegacyDemandRate } from '../utils/rates/demand-rate-lookup';

// File paths - using relative paths from project root
// Check for test data first, then fall back to data folder
const DATA_DIR = path.join(process.cwd(), 'data');
const INTERVAL_FILE = path.join(DATA_DIR, 'INTERVAL.csv');
const MONTHLY_BILLS_FILE = path.join(DATA_DIR, 'USAGE.csv');
const CATALOG_FILE = path.join(DATA_DIR, 'battery-catalog.csv');

/**
 * Get demand rate for a rate code
 * Uses comprehensive rate library instead of hardcoded lookup table
 */
function getDemandRateForCode(rateCode: string): { rate: number; description: string } | null {
  return getLegacyDemandRate(rateCode);
}

/**
 * Calculate effective demand rate from monthly bills
 * Uses actual PG&E rate schedules when rate code is available
 */
function calculateDemandRate(bills: Array<{ peakDemandKw: number; totalCost: number; rateCode?: string }>): number {
  // First, try to get rate from rate code in bills
  const ratesFromBills = bills
    .map(b => b.rateCode)
    .filter((code): code is string => !!code);
  
  if (ratesFromBills.length > 0) {
    const rateCounts = new Map<string, number>();
    ratesFromBills.forEach(code => {
      rateCounts.set(code, (rateCounts.get(code) || 0) + 1);
    });
    
    let mostCommonRate = '';
    let maxCount = 0;
    rateCounts.forEach((count, code) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonRate = code;
      }
    });
    
    const rateInfo = getDemandRateForCode(mostCommonRate);
    if (rateInfo && rateInfo.rate > 0) {
      console.log(`📊 Using actual PG&E rate: ${mostCommonRate} → $${rateInfo.rate.toFixed(2)}/kW/month (${rateInfo.description})`);
      return rateInfo.rate;
    }
  }
  
  // Fallback: derive from billing data
  let estimatedRate = 0;
  let validBillCount = 0;
  
  for (const bill of bills) {
    if (bill.peakDemandKw > 50 && bill.totalCost > 1000) {
      const estimatedDemandPortion = bill.totalCost * 0.40;
      const impliedRate = estimatedDemandPortion / bill.peakDemandKw;
      if (impliedRate >= 15 && impliedRate <= 60) {
        estimatedRate += impliedRate;
        validBillCount++;
      }
    }
  }
  
  if (validBillCount > 0) {
    const derivedRate = estimatedRate / validBillCount;
    console.log(`📊 Derived demand rate from bills: $${derivedRate.toFixed(2)}/kW/month`);
    return derivedRate;
  }
  
  // Final fallback: B-19 secondary default
  const defaultRate = 30.0;
  console.log(`📊 Using default demand rate: $${defaultRate.toFixed(2)}/kW/month`);
  return defaultRate;
}

/**
 * Calculate system cost for a battery
 */
function calculateSystemCost(catalogBattery: ReturnType<typeof loadBatteryCatalog>[0], quantity: number = 1): number {
  if (quantity >= 50) {
    return catalogBattery.price50Plus;
  } else if (quantity >= 21) {
    return catalogBattery.price21_50;
  } else if (quantity >= 11) {
    return catalogBattery.price11_20;
  } else {
    return catalogBattery.price1_10;
  }
}

interface BatteryRecommendation {
  modelName: string;
  manufacturer: string;
  capacityKwh: number;
  powerKw: number;
  peakReductionKw: number;
  annualSavings: number;
  systemCost: number;
  paybackYears: number;
  roi: number; // Return on investment percentage
}

/**
 * Main recommendation function
 */
function recommendBatteries(
  intervalData: any[],
  monthlyBills: any[],
  demandRate: number,
  catalogBatteries: ReturnType<typeof loadBatteryCatalog>
): BatteryRecommendation[] {
  // Convert interval data to LoadProfile
  const loadProfile: LoadProfile = intervalDataToLoadProfile(intervalData);
  
  // Find original peak demand
  const originalPeak = Math.max(...intervalData.map(d => d.demand));
  
  // Calculate threshold (use 90% of peak as threshold - more aggressive)
  // This allows batteries to shave peaks more effectively
  const threshold = originalPeak * 0.90;
  
  const recommendations: BatteryRecommendation[] = [];
  
  console.log(`\n🔋 Testing ${catalogBatteries.length} battery models...`);
  console.log(`📊 Original Peak Demand: ${originalPeak.toFixed(1)} kW`);
  console.log(`🎯 Peak Shaving Threshold: ${threshold.toFixed(1)} kW`);
  console.log(`💰 Demand Rate: $${demandRate.toFixed(2)}/kW/month\n`);
  
  for (const catalogBattery of catalogBatteries) {
    try {
      // Convert to BatterySpec
      const batterySpec: BatterySpec = catalogToBatterySpec(catalogBattery);
      
      // Debug first battery
      if (recommendations.length === 0) {
        console.log(`\n   Testing first battery: ${catalogBattery.modelName}`);
        console.log(`   Battery Spec: ${batterySpec.capacity_kwh}kWh, ${batterySpec.max_power_kw}kW, ${(batterySpec.round_trip_efficiency*100).toFixed(0)}% efficiency`);
        console.log(`   Load Profile: ${loadProfile.intervals.length} intervals`);
      }
      
      // Run simulation
      const result = simulatePeakShaving(loadProfile, batterySpec, threshold);
      
      // Debug first battery result
      if (recommendations.length === 0) {
        console.log(`   Simulation Result: Original Peak=${result.original_peak.toFixed(1)}kW, New Peak=${result.new_peak.toFixed(1)}kW`);
      }
      
      // Calculate metrics
      const peakReduction = originalPeak - result.new_peak;
      const newIntervalsKw = result.new_intervals_kw ?? result.final_load_profile.intervals.map(i => i.kw);
      const { reductionKwMonthSum, monthsCount } = computeMonthlyBillingPeakReductionKwMonthSum(loadProfile, newIntervalsKw);
      const annualizeFactor = monthsCount > 0 ? 12 / monthsCount : 1;
      const annualSavings = (reductionKwMonthSum * annualizeFactor) * demandRate;
      const systemCost = calculateSystemCost(catalogBattery);
      const paybackYears = annualSavings > 0 ? systemCost / annualSavings : Infinity;
      const roi = annualSavings > 0 ? (annualSavings / systemCost) * 100 : 0;
      
      // Debug: log results for first few batteries
      if (recommendations.length < 3) {
        console.log(`   ${catalogBattery.modelName}: Peak Reduction=${peakReduction.toFixed(1)}kW, Cost=$${systemCost.toLocaleString()}, Payback=${paybackYears.toFixed(2)}yrs`);
      }
      
      // Only include batteries that actually reduce peak and have positive savings
      if (peakReduction > 0 && annualSavings > 0) {
        recommendations.push({
          modelName: catalogBattery.modelName,
          manufacturer: catalogBattery.manufacturer,
          capacityKwh: catalogBattery.capacityKwh,
          powerKw: catalogBattery.powerKw,
          peakReductionKw: peakReduction,
          annualSavings,
          systemCost,
          paybackYears,
          roi,
        });
      }
    } catch (error) {
      console.warn(`⚠️  Error simulating ${catalogBattery.modelName}: ${error}`);
      // Continue with next battery
    }
  }
  
  // Sort by payback period (best ROI first)
  recommendations.sort((a, b) => a.paybackYears - b.paybackYears);
  
  return recommendations;
}

/**
 * Print results table
 */
function printResults(recommendations: BatteryRecommendation[]): void {
  console.log('='.repeat(120));
  console.log('🏆 WINNER\'S TABLE - BATTERY RECOMMENDATIONS');
  console.log('='.repeat(120));
  console.log();
  
  const header = [
    'Rank'.padEnd(5),
    'Model Name'.padEnd(25),
    'Manufacturer'.padEnd(15),
    'Size (kWh)'.padEnd(12),
    'Power (kW)'.padEnd(12),
    'Peak Reduction (kW)'.padEnd(20),
    'Annual Savings ($)'.padEnd(18),
    'System Cost ($)'.padEnd(16),
    'Payback (Years)'.padEnd(16),
    'ROI (%)'.padEnd(10),
  ].join(' | ');
  
  console.log(header);
  console.log('-'.repeat(120));
  
  recommendations.forEach((rec, index) => {
    const rank = `${index + 1}.`.padEnd(5);
    const model = rec.modelName.padEnd(25);
    const manufacturer = rec.manufacturer.padEnd(15);
    const capacity = rec.capacityKwh.toFixed(0).padEnd(12);
    const power = rec.powerKw.toFixed(0).padEnd(12);
    const reduction = rec.peakReductionKw.toFixed(1).padEnd(20);
    const savings = rec.annualSavings.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).padEnd(18);
    const cost = rec.systemCost.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).padEnd(16);
    const payback = rec.paybackYears === Infinity 
      ? 'Never'.padEnd(16)
      : rec.paybackYears.toFixed(2).padEnd(16);
    const roi = rec.roi.toFixed(1) + '%'.padEnd(10);
    
    console.log([rank, model, manufacturer, capacity, power, reduction, savings, cost, payback, roi].join(' | '));
  });
  
  console.log();
  console.log('='.repeat(120));
  
  if (recommendations.length > 0) {
    const winner = recommendations[0];
    console.log();
    console.log('🏅 TOP RECOMMENDATION:');
    console.log(`   ${winner.manufacturer} ${winner.modelName}`);
    console.log(`   Payback Period: ${winner.paybackYears.toFixed(2)} years`);
    console.log(`   Annual Savings: ${winner.annualSavings.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`);
    console.log(`   System Cost: ${winner.systemCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`);
    console.log(`   Peak Reduction: ${winner.peakReductionKw.toFixed(1)} kW`);
    console.log();
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(120));
  console.log('🔋 EVERWATT ENGINE - BATTERY RECOMMENDATION SYSTEM');
  console.log('='.repeat(120));
  console.log();
  
  try {
    // Step 1: Ingest data
    console.log('📂 Step 1: Loading data files...');
    console.log(`   Interval Data: ${INTERVAL_FILE}`);
    console.log(`   Monthly Bills: ${MONTHLY_BILLS_FILE}`);
    console.log(`   Battery Catalog: ${CATALOG_FILE}`);
    console.log();
    
    const intervalData = readIntervalData(INTERVAL_FILE);
    const monthlyBills = readMonthlyBills(MONTHLY_BILLS_FILE);
    const catalogBatteries = loadBatteryCatalog(CATALOG_FILE);
    
    console.log(`✅ Loaded ${intervalData.length} interval data points`);
    console.log(`✅ Loaded ${monthlyBills.length} monthly bills`);
    console.log(`✅ Loaded ${catalogBatteries.length} battery models from catalog`);
    console.log();
    
    // Step 2: Calculate demand rate
    console.log('💰 Step 2: Calculating financial baseline...');
    const demandRate = calculateDemandRate(monthlyBills);
    console.log(`   Effective Demand Rate: $${demandRate.toFixed(2)}/kW/month`);
    console.log();
    
    // Step 3: Battle Royale - Test all batteries
    console.log('⚔️  Step 3: Running simulations for all battery models...');
    const recommendations = recommendBatteries(intervalData, monthlyBills, demandRate, catalogBatteries);
    
    // Step 4: Output results
    console.log('📊 Step 4: Generating recommendations...');
    printResults(recommendations);
    
    console.log(`\n✅ Analysis complete! Analyzed ${catalogBatteries.length} batteries, found ${recommendations.length} viable options.`);
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the script
main();

