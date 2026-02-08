/**
 * Test HBPES110 simulation specifically to see why it's only getting 8.4kW reduction
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { loadBatteryCatalog, catalogToBatterySpec } from '../utils/battery-catalog-loader';
import { intervalDataToLoadProfile } from '../utils/excel-reader';
import { simulatePeakShaving } from '../modules/battery/logic';
import type { BatterySpec, LoadProfile } from '../modules/battery/types';

const ANALYSIS_FILE = path.join(process.cwd(), 'data', 'analyses', '92252e3b-2824-48fd-8fa2-ef67aa34d22e.json');
const CATALOG_FILE = path.join(process.cwd(), 'data', 'battery-catalog.csv');

async function testHBPES110() {
  console.log('🔍 Testing HBPES110 (2x units) Simulation\n');
  console.log('='.repeat(100));

  const analysisData = JSON.parse(await readFile(ANALYSIS_FILE, 'utf-8'));
  const intervalData = analysisData.intervalData?.intervals || [];
  
  const formattedIntervals = intervalData.map((item: any) => ({
    timestamp: new Date(item.timestamp),
    demand: item.kw || item.demand || 0,
  }));

  const originalPeak = Math.max(...formattedIntervals.map((d: any) => d.demand));
  const threshold = originalPeak * 0.90;
  const targetReductionKw = originalPeak - threshold;

  console.log(`📊 Site Profile:`);
  console.log(`   Original Peak: ${originalPeak.toFixed(1)} kW`);
  console.log(`   Target Threshold: ${threshold.toFixed(1)} kW`);
  console.log(`   Target Reduction: ${targetReductionKw.toFixed(1)} kW\n`);

  const catalogBatteries = loadBatteryCatalog(CATALOG_FILE);
  const hbpes110 = catalogBatteries.find(b => b.modelName === 'HBPES110');
  
  if (!hbpes110) {
    console.error('❌ HBPES110 not found in catalog');
    process.exit(1);
  }

  console.log(`🔋 HBPES110 Specs (per unit):`);
  console.log(`   Power: ${hbpes110.powerKw}kW`);
  console.log(`   Capacity: ${hbpes110.capacityKwh}kWh`);
  console.log(`   Efficiency: ${(hbpes110.efficiency * 100).toFixed(0)}%\n`);

  // Test with 2 units (as calculated)
  const quantity = 2;
  const totalPowerKw = hbpes110.powerKw * quantity;
  const totalCapacityKwh = hbpes110.capacityKwh * quantity;

  console.log(`📦 System Configuration (${quantity}x units):`);
  console.log(`   Total Power: ${totalPowerKw}kW`);
  console.log(`   Total Capacity: ${totalCapacityKwh}kWh\n`);

  const batterySpec: BatterySpec = catalogToBatterySpec(hbpes110);
  const scaledBatterySpec: BatterySpec = {
    ...batterySpec,
    capacity_kwh: totalCapacityKwh,
    max_power_kw: totalPowerKw,
  };

  const loadProfile: LoadProfile = intervalDataToLoadProfile(formattedIntervals);

  console.log('🧪 Running simulation...\n');
  const result = simulatePeakShaving(loadProfile, scaledBatterySpec, threshold);

  const peakReduction = originalPeak - result.new_peak;
  const reductionPercent = (peakReduction / targetReductionKw) * 100;

  console.log('='.repeat(100));
  console.log('📊 SIMULATION RESULTS');
  console.log('='.repeat(100));
  console.log(`   Original Peak: ${result.original_peak.toFixed(1)} kW`);
  console.log(`   New Peak: ${result.new_peak.toFixed(1)} kW`);
  console.log(`   Peak Reduction: ${peakReduction.toFixed(1)} kW`);
  console.log(`   Target Reduction: ${targetReductionKw.toFixed(1)} kW`);
  console.log(`   Achievement: ${reductionPercent.toFixed(1)}% of target`);
  console.log(`   Energy Discharged: ${result.energy_discharged.toFixed(1)} kWh`);
  console.log(`   Battery Capacity Used: ${(result.energy_discharged / totalCapacityKwh * 100).toFixed(1)}%`);
  console.log();

  // Analyze why reduction is limited
  if (peakReduction < targetReductionKw) {
    console.log('⚠️  WHY REDUCTION IS LIMITED:');
    const shortfall = targetReductionKw - peakReduction;
    console.log(`   Shortfall: ${shortfall.toFixed(1)}kW (${targetReductionKw.toFixed(1)}kW target - ${peakReduction.toFixed(1)}kW achieved)`);
    
    if (totalPowerKw < targetReductionKw) {
      console.log(`   ❌ Power Constraint: Battery power (${totalPowerKw}kW) < Target reduction (${targetReductionKw.toFixed(1)}kW)`);
    } else {
      console.log(`   ✅ Power OK: Battery power (${totalPowerKw}kW) >= Target reduction (${targetReductionKw.toFixed(1)}kW)`);
    }
    
    const maxEnergyNeeded = targetReductionKw * 3 * 1.2; // 3hr peak × 1.2 buffer
    if (totalCapacityKwh < maxEnergyNeeded) {
      console.log(`   ❌ Energy Constraint: Battery capacity (${totalCapacityKwh}kWh) < Estimated need (${maxEnergyNeeded.toFixed(1)}kWh)`);
    } else {
      console.log(`   ✅ Energy OK: Battery capacity (${totalCapacityKwh}kWh) >= Estimated need (${maxEnergyNeeded.toFixed(1)}kWh)`);
    }
    
    // Check if battery ran out of charge
    const minSOC = batterySpec.min_soc ?? 0.10;
    const socAtEnd = result.battery_soc_history[result.battery_soc_history.length - 1];
    if (socAtEnd <= minSOC + 0.01) {
      console.log(`   ⚠️  Battery Depleted: Final SOC ${(socAtEnd * 100).toFixed(1)}% (min: ${(minSOC * 100).toFixed(0)}%)`);
      console.log(`      Battery may have run out of energy during peak events`);
    }
  }

  console.log('='.repeat(100));
}

testHBPES110()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
