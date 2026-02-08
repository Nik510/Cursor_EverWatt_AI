/**
 * Debug Battery Selection - Run actual calculations to see which battery should be selected
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { loadBatteryCatalog, catalogToBatterySpec } from '../utils/battery-catalog-loader';
import { intervalDataToLoadProfile } from '../utils/excel-reader';
import { simulatePeakShaving, detectPeakEvents, estimateEnergyFromEvents, computeMonthlyBillingPeakReductionKwMonthSum } from '../modules/battery/logic';
import type { BatterySpec, LoadProfile } from '../modules/battery/types';

const ANALYSIS_FILE = path.join(process.cwd(), 'data', 'analyses', '92252e3b-2824-48fd-8fa2-ef67aa34d22e.json');
const CATALOG_FILE = path.join(process.cwd(), 'data', 'battery-catalog.csv');

// Copy the scoring function from server.ts
function calculateBatteryScore(
  achievedReductionKw: number,
  targetReductionKw: number,
  systemCost: number,
  roiPercent: number,
  benchmarkCostPerKw: number = 800
): number {
  if (achievedReductionKw <= 0 || targetReductionKw <= 0 || systemCost <= 0) {
    return 0;
  }

  const fractionAchieved = achievedReductionKw / targetReductionKw;
  let perfScore = 0;
  if (fractionAchieved < 0.5) {
    perfScore = 0;
  } else {
    perfScore = Math.min(fractionAchieved, 1.1) * 100;
  }

  const costPerKw = systemCost / achievedReductionKw;
  const efficiencyRatio = benchmarkCostPerKw / costPerKw;
  const effScore = Math.min(efficiencyRatio, 1.5) * 100;

  const roiScore = Math.min(Math.max(roiPercent, 0), 100);

  const finalScore = (0.4 * perfScore) + (0.4 * effScore) + (0.2 * roiScore);
  
  return finalScore;
}

function calculateSystemCost(catalogBattery: any, quantity: number = 1): number {
  let unitPrice = catalogBattery.price1_10;
  if (quantity >= 50) {
    unitPrice = catalogBattery.price50Plus;
  } else if (quantity >= 21) {
    unitPrice = catalogBattery.price21_50;
  } else if (quantity >= 11) {
    unitPrice = catalogBattery.price11_20;
  }
  return unitPrice * quantity;
}

async function debugBatterySelection() {
  console.log('🔍 Debugging Battery Selection for American Baptist Homes\n');
  console.log('='.repeat(100));

  // Load analysis data
  if (!existsSync(ANALYSIS_FILE)) {
    console.error(`❌ Analysis file not found: ${ANALYSIS_FILE}`);
    process.exit(1);
  }

  const analysisData = JSON.parse(await readFile(ANALYSIS_FILE, 'utf-8'));
  const intervalData = analysisData.intervalData?.intervals || [];
  
  if (intervalData.length === 0) {
    console.error('❌ No interval data found in analysis file');
    process.exit(1);
  }

  console.log(`✅ Loaded ${intervalData.length} interval data points\n`);

  // Convert to format expected by simulation
  const formattedIntervals = intervalData.map((item: any) => ({
    timestamp: new Date(item.timestamp),
    demand: item.kw || item.demand || 0,
  }));

  // Find original peak
  const originalPeak = Math.max(...formattedIntervals.map((d: any) => d.demand));
  const threshold = originalPeak * 0.90;
  const targetReductionKw = originalPeak - threshold;

  console.log(`📊 Site Profile:`);
  console.log(`   Original Peak: ${originalPeak.toFixed(1)} kW`);
  console.log(`   Target Threshold: ${threshold.toFixed(1)} kW (90% of peak)`);
  console.log(`   Target Reduction: ${targetReductionKw.toFixed(1)} kW\n`);

  // Load battery catalog
  const catalogBatteries = loadBatteryCatalog(CATALOG_FILE);
  console.log(`✅ Loaded ${catalogBatteries.length} batteries from catalog\n`);

  // Calculate demand rate (use default for now)
  const demandRate = 30.0; // B-19 Secondary default
  console.log(`💰 Using demand rate: $${demandRate.toFixed(2)}/kW/month\n`);

  // Convert to LoadProfile
  const loadProfile: LoadProfile = intervalDataToLoadProfile(formattedIntervals);

  // Calculate required power and energy (event-based sizing)
  const requiredPowerKw = Math.max(0, originalPeak - threshold);
  let intervalHours = 0.25;
  if (formattedIntervals.length >= 2) {
    const dtMs = Math.abs(
      new Date(formattedIntervals[1].timestamp).getTime() - new Date(formattedIntervals[0].timestamp).getTime()
    );
    intervalHours = dtMs / (1000 * 60 * 60);
    if (!isFinite(intervalHours) || intervalHours <= 0) intervalHours = 0.25;
  }

  // Detect peak events and size energy to realistic bursts
  const peakEvents = detectPeakEvents(loadProfile, threshold, intervalHours);
  const longestEventHours = peakEvents.length > 0 ? Math.max(...peakEvents.map(e => e.durationHours)) : 0;
  const longestEventEnergy = peakEvents.length > 0 ? Math.max(...peakEvents.map(e => e.totalExcessKwh)) : 0;
  const { eventEnergy95, maxEventsPerDay } = estimateEnergyFromEvents(peakEvents);

  const baseRequiredEnergyKwh = requiredPowerKw * longestEventHours * 1.2;
  const dailyEventEnergyKwh = eventEnergy95 * Math.max(1, maxEventsPerDay) * 1.1;
  const minEnergyKwh = requiredPowerKw * 2; // Minimum 2 hours at full power
  const finalRequiredEnergyKwh = Math.max(
    baseRequiredEnergyKwh,
    longestEventEnergy * 1.1,
    dailyEventEnergyKwh,
    minEnergyKwh
  );

  console.log(`🔧 Technical Requirements:`);
  console.log(`   Required Power: ${requiredPowerKw.toFixed(1)} kW`);
  console.log(`   Peak Events: ${peakEvents.length} detected | Max events/day: ${maxEventsPerDay}`);
  console.log(`   Longest Event: ${longestEventHours.toFixed(2)} hours, Energy: ${longestEventEnergy.toFixed(1)} kWh`);
  console.log(`   95th % Event Energy: ${eventEnergy95.toFixed(1)} kWh`);
  console.log(`   Required Energy: ${finalRequiredEnergyKwh.toFixed(1)} kWh (daily realism + buffers)`);
  console.log(`   Minimum Energy (2hr rule): ${minEnergyKwh.toFixed(1)} kWh\n`);

  // Test all batteries
  const results: Array<{
    modelName: string;
    manufacturer: string;
    powerKw: number;
    capacityKwh: number;
    peakReduction: number;
    annualSavings: number;
    systemCost: number;
    paybackYears: number;
    roi: number;
    compositeScore: number;
    passedTechnicalFloor: boolean;
    passedMinimumScore: boolean;
    quantity?: number;
    unitPowerKw?: number;
    unitCapacityKwh?: number;
  }> = [];

  console.log('🧪 Testing all batteries...\n');

  for (const catalogBattery of catalogBatteries) {
    try {
      const batterySpec: BatterySpec = catalogToBatterySpec(catalogBattery);
      
      // Technical floor check - support multiple units
      const inverterKw = catalogBattery.powerKw;
      const capacityKwh = catalogBattery.capacityKwh;
      
      const minQuantityForPower = Math.ceil(requiredPowerKw / inverterKw);
      const minQuantityForEnergy = Math.ceil(finalRequiredEnergyKwh / capacityKwh);
      const minQuantity = Math.max(minQuantityForPower, minQuantityForEnergy);
      
      const totalPowerKw = inverterKw * minQuantity;
      const totalCapacityKwh = capacityKwh * minQuantity;
      const passedTechnicalFloor = totalPowerKw >= requiredPowerKw && totalCapacityKwh >= finalRequiredEnergyKwh;
      
      if (minQuantity > 10 || !passedTechnicalFloor) {
        results.push({
          modelName: catalogBattery.modelName,
          manufacturer: catalogBattery.manufacturer,
          powerKw: totalPowerKw,
          capacityKwh: totalCapacityKwh,
          peakReduction: 0,
          annualSavings: 0,
          systemCost: calculateSystemCost(catalogBattery, minQuantity),
          paybackYears: Infinity,
          roi: 0,
          compositeScore: 0,
          passedTechnicalFloor: false,
          passedMinimumScore: false,
          quantity: minQuantity,
          unitPowerKw: inverterKw,
          unitCapacityKwh: capacityKwh,
        });
        continue;
      }

      // Run simulation with scaled battery (total system)
      const scaledBatterySpec: BatterySpec = {
        ...batterySpec,
        capacity_kwh: totalCapacityKwh,
        max_power_kw: totalPowerKw,
      };
      
      const result = simulatePeakShaving(loadProfile, scaledBatterySpec, threshold);
      
      const peakReduction = originalPeak - result.new_peak;
      const newIntervalsKw = result.new_intervals_kw ?? result.final_load_profile.intervals.map(i => i.kw);
      const { reductionKwMonthSum, monthsCount } = computeMonthlyBillingPeakReductionKwMonthSum(loadProfile, newIntervalsKw);
      const annualizeFactor = monthsCount > 0 ? 12 / monthsCount : 1;
      const annualSavings = (reductionKwMonthSum * annualizeFactor) * demandRate;
      const systemCost = calculateSystemCost(catalogBattery, minQuantity);
      const paybackYears = annualSavings > 0 ? systemCost / annualSavings : Infinity;
      const roi = annualSavings > 0 ? (annualSavings / systemCost) * 100 : 0;

      // Calculate composite score
      let compositeScore = 0;
      let passedMinimumScore = false;
      
      if (peakReduction > 0 && annualSavings > 0 && paybackYears !== Infinity && targetReductionKw > 0) {
        compositeScore = calculateBatteryScore(
          peakReduction,
          targetReductionKw,
          systemCost,
          roi
        );
        passedMinimumScore = compositeScore >= 20;
      }

      results.push({
        modelName: catalogBattery.modelName,
        manufacturer: catalogBattery.manufacturer,
        powerKw: totalPowerKw,
        capacityKwh: totalCapacityKwh,
        peakReduction,
        annualSavings,
        systemCost,
        paybackYears,
        roi,
        compositeScore,
        passedTechnicalFloor: true,
        passedMinimumScore,
        quantity: minQuantity,
        unitPowerKw: inverterKw,
        unitCapacityKwh: capacityKwh,
      });
    } catch (error) {
      console.warn(`⚠️  Error testing ${catalogBattery.modelName}:`, error);
    }
  }

  // Sort by composite score
  results.sort((a, b) => {
    const scoreDiff = b.compositeScore - a.compositeScore;
    if (scoreDiff !== 0) return scoreDiff;
    return b.roi - a.roi;
  });

  // Display results
  console.log('='.repeat(100));
  console.log('📊 BATTERY EVALUATION RESULTS');
  console.log('='.repeat(100));
  console.log();

  const header = [
    'Rank'.padEnd(5),
    'Model'.padEnd(20),
    'Power'.padEnd(8),
    'Capacity'.padEnd(10),
    'Peak Red'.padEnd(10),
    'Cost'.padEnd(12),
    'ROI %'.padEnd(8),
    'Score'.padEnd(8),
    'Status'.padEnd(20),
  ].join(' | ');

  console.log(header);
  console.log('-'.repeat(100));

  results.forEach((batt, idx) => {
    const rank = `${idx + 1}.`.padEnd(5);
    const model = batt.modelName.padEnd(20);
    const qty = batt.quantity ? `${batt.quantity}x`.padEnd(5) : '1x'.padEnd(5);
    const power = `${batt.powerKw}kW`.padEnd(10);
    const capacity = `${batt.capacityKwh}kWh`.padEnd(12);
    const peakRed = `${batt.peakReduction.toFixed(1)}kW`.padEnd(10);
    const cost = `$${batt.systemCost.toLocaleString()}`.padEnd(12);
    const roi = `${batt.roi.toFixed(1)}%`.padEnd(8);
    const score = `${batt.compositeScore.toFixed(1)}`.padEnd(8);
    
    let status = '';
    if (!batt.passedTechnicalFloor) {
      status = '❌ Tech Floor Fail'.padEnd(20);
    } else if (!batt.passedMinimumScore) {
      status = '⚠️  Score < 20'.padEnd(20);
    } else {
      status = '✅ PASSED'.padEnd(20);
    }

    console.log([rank, model, qty, power, capacity, peakRed, cost, roi, score, status].join(' | '));
  });

  console.log();
  console.log('='.repeat(100));
  console.log('🏆 TOP 3 RECOMMENDATIONS');
  console.log('='.repeat(100));
  console.log();

  const top3 = results.filter(r => r.passedTechnicalFloor && r.passedMinimumScore).slice(0, 3);
  
  if (top3.length === 0) {
    console.log('❌ NO BATTERIES PASSED ALL FILTERS');
    console.log('\nBatteries that passed technical floor but failed minimum score:');
    const techPassed = results.filter(r => r.passedTechnicalFloor && !r.passedMinimumScore);
    techPassed.slice(0, 5).forEach(batt => {
      console.log(`   ${batt.modelName}: Score ${batt.compositeScore.toFixed(1)} (Peak Red: ${batt.peakReduction.toFixed(1)}kW, ROI: ${batt.roi.toFixed(1)}%)`);
    });
  } else {
    top3.forEach((batt, idx) => {
      const qty = batt.quantity || 1;
      const unitInfo = batt.unitPowerKw ? ` (${qty}x ${batt.unitPowerKw}kW/${batt.unitCapacityKwh}kWh units)` : '';
      console.log(`${idx + 1}. ${batt.manufacturer} ${batt.modelName}${unitInfo}`);
      console.log(`   Total System: ${batt.powerKw}kW | ${batt.capacityKwh}kWh`);
      console.log(`   Peak Reduction: ${batt.peakReduction.toFixed(1)}kW (${((batt.peakReduction / targetReductionKw) * 100).toFixed(1)}% of target)`);
      console.log(`   Annual Savings: $${batt.annualSavings.toLocaleString()}`);
      console.log(`   System Cost: $${batt.systemCost.toLocaleString()}`);
      console.log(`   ROI: ${batt.roi.toFixed(1)}% | Payback: ${batt.paybackYears.toFixed(1)} years`);
      console.log(`   Composite Score: ${batt.compositeScore.toFixed(1)}/100`);
      console.log();
    });
  }

  console.log('='.repeat(100));
}

debugBatterySelection()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
