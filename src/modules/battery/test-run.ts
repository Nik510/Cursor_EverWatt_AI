/**
 * Dry Run Test Script for Battery Peak Shaving Logic
 * 
 * Scenario:
 * - 24-hour load profile with base load of 50 kW
 * - Spike to 200 kW at 2:00 PM (14:00) for 2 hours
 * - Battery: 500 kWh capacity, 100 kW max power, 90% round-trip efficiency
 * - Threshold: 100 kW
 */

import { simulateCapEnforcement, simulatePeakShaving } from './logic';
import type { BatterySpec, LoadProfile, LoadInterval } from './types';

/**
 * Create mock 24-hour load profile
 * Base load: 50 kW
 * Spike: 200 kW from 14:00 to 16:00 (2 hours = 8 intervals)
 */
function createMockLoadProfile(): LoadProfile {
  const intervals: LoadInterval[] = [];
  const startDate = new Date('2024-01-01T00:00:00');
  
  // 24 hours = 96 intervals (15-minute intervals)
  for (let i = 0; i < 96; i++) {
    const timestamp = new Date(startDate);
    timestamp.setMinutes(timestamp.getMinutes() + i * 15);
    
    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();
    
    // Base load: 50 kW
    let demand = 50;
    
    // Spike: 200 kW from 14:00 (2:00 PM) to 16:00 (4:00 PM)
    // That's 8 intervals: 14:00, 14:15, 14:30, 14:45, 15:00, 15:15, 15:30, 15:45
    if (hour === 14 || (hour === 15 && minute < 60)) {
      demand = 200;
    }
    
    intervals.push({
      timestamp,
      kw: demand,
    });
  }
  
  return { intervals };
}

/**
 * Create standard test battery
 */
function createTestBattery(): BatterySpec {
  return {
    capacity_kwh: 500,
    max_power_kw: 100,
    round_trip_efficiency: 0.90, // 90%
    degradation_rate: 0.02, // 2% per year (not used in this test)
    min_soc: 0.10,
    max_soc: 0.90,
    depth_of_discharge: 0.90,
  };
}

/**
 * Calculate energy lost to efficiency
 */
function calculateEnergyLost(
  energyDelivered: number,
  roundTripEfficiency: number
): number {
  const oneWayEfficiency = Math.sqrt(roundTripEfficiency);
  const energyRemoved = energyDelivered / oneWayEfficiency;
  const energyLost = energyRemoved - energyDelivered;
  return energyLost;
}

/**
 * Create ASCII chart of load profile
 */
function createASCIIChart(
  originalProfile: LoadProfile,
  finalProfile: LoadProfile,
  maxValue: number
): string {
  const chartWidth = 96; // One char per interval
  const chartHeight = 20;
  const intervals = originalProfile.intervals;
  
  let chart = '\n';
  chart += 'Load Profile Chart (Original vs After Battery)\n';
  chart += '='.repeat(chartWidth + 10) + '\n';
  
  // Y-axis and chart area
  for (let row = chartHeight; row >= 0; row--) {
    const value = (row / chartHeight) * maxValue;
    const yLabel = row % 5 === 0 ? `${Math.round(value)}kW`.padStart(6) : '      ';
    chart += yLabel + '│';
    
    for (let col = 0; col < intervals.length && col < chartWidth; col++) {
      const origVal = originalProfile.intervals[col].kw;
      const finalVal = finalProfile.intervals[col].kw;
      
      const origHeight = Math.round((origVal / maxValue) * chartHeight);
      const finalHeight = Math.round((finalVal / maxValue) * chartHeight);
      
      if (row === origHeight && origVal > 50) {
        chart += '●'; // Original peak (above base load)
      } else if (row === finalHeight && finalVal > 50) {
        chart += '○'; // After battery (above base load)
      } else if (row < origHeight && row >= finalHeight && origVal > finalVal) {
        chart += '│'; // Shaved area
      } else if (row === 0) {
        chart += '─'; // Baseline
      } else {
        chart += ' ';
      }
    }
    chart += '\n';
  }
  
  // X-axis with time labels
  chart += '      └' + '─'.repeat(Math.min(intervals.length, chartWidth)) + '\n';
  chart += '       ';
  for (let i = 0; i < intervals.length && i < chartWidth; i += 4) {
    const date = new Date(intervals[i].timestamp);
    const hour = date.getHours().toString().padStart(2, '0');
    chart += hour + '  ';
  }
  chart += '\n';
  chart += '      Legend: ● = Original Peak, ○ = After Battery, │ = Shaved Area\n';
  
  return chart;
}

/**
 * Main test execution
 */
function runTest() {
  console.log('='.repeat(80));
  console.log('BATTERY PEAK SHAVING - DRY RUN TEST');
  console.log('='.repeat(80));
  console.log();
  
  // Create test data
  console.log('Creating mock load profile...');
  const loadProfile = createMockLoadProfile();
  console.log(`✓ Created ${loadProfile.intervals.length} intervals (24 hours, 15-min intervals)`);
  console.log();
  
  console.log('Creating test battery...');
  const battery = createTestBattery();
  console.log(`✓ Battery: ${battery.capacity_kwh} kWh, ${battery.max_power_kw} kW, ${(battery.round_trip_efficiency * 100).toFixed(0)}% efficiency`);
  console.log();
  
  // Run simulation
  const threshold = 100; // kW
  console.log(`Running simulation with threshold: ${threshold} kW...`);
  const result = simulatePeakShaving(loadProfile, battery, threshold);
  console.log('✓ Simulation complete');
  console.log();

  // ===========================
  // NEW: Hard cap enforcement sanity checks
  // ===========================
  console.log('Running cap enforcement sanity checks...');
  const feasibleCap = 120;
  const infeasibleCap = 80;

  const capOk = simulateCapEnforcement(loadProfile, battery, feasibleCap);
  const capBad = simulateCapEnforcement(loadProfile, battery, infeasibleCap);

  console.log(`  Cap=${feasibleCap}kW → feasible=${capOk.feasible}, newPeak=${capOk.newPeakKw.toFixed(1)}kW`);
  console.log(`  Cap=${infeasibleCap}kW → feasible=${capBad.feasible}${capBad.firstViolation ? `, firstViolation=${capBad.firstViolation.violationKw.toFixed(1)}kW @ idx ${capBad.firstViolation.index}` : ''}`);

  // Charging should increase meter demand during low-load intervals AFTER the battery has discharged.
  // The cap simulator starts at max SOC, so charging won't happen until some discharge occurs.
  let chargeIdx = -1;
  for (let i = 0; i < loadProfile.intervals.length; i++) {
    const before = loadProfile.intervals[i]?.kw ?? 0;
    const after = capOk.newIntervalsKw[i] ?? before;
    if (after > before + 0.01) {
      chargeIdx = i;
      break;
    }
  }
  if (chargeIdx >= 0) {
    const before = loadProfile.intervals[chargeIdx]?.kw ?? 0;
    const after = capOk.newIntervalsKw[chargeIdx] ?? before;
    console.log(`  Charging check (idx ${chargeIdx}): before=${before.toFixed(1)}kW, after=${after.toFixed(1)}kW`);
  } else {
    console.log('  Charging check: no charging intervals detected (battery may have stayed at max SOC).');
  }

  if (!capOk.feasible || capOk.newPeakKw > feasibleCap + 0.1) {
    console.log('⚠ WARNING: Feasible cap test did not remain under cap as expected.');
  } else {
    console.log('✓ Cap enforcement stays under cap for feasible case.');
  }
  if (capBad.feasible) {
    console.log('⚠ WARNING: Infeasible cap test unexpectedly passed.');
  } else {
    console.log('✓ Infeasible cap correctly fails fast.');
  }
  console.log();
  
  // Calculate energy lost to efficiency
  const energyLost = calculateEnergyLost(
    result.energy_discharged || 0,
    battery.round_trip_efficiency
  );
  
  // Print results
  console.log('='.repeat(80));
  console.log('RESULTS');
  console.log('='.repeat(80));
  console.log();
  console.log(`Original Peak Demand: ${result.original_peak.toFixed(2)} kW`);
  console.log(`New Peak Demand:      ${result.new_peak.toFixed(2)} kW`);
  console.log(`Target Threshold:    ${threshold} kW`);
  console.log();
  
  if (result.new_peak <= threshold) {
    console.log('✓ SUCCESS: Peak demand successfully capped at threshold!');
  } else {
    console.log(`⚠ WARNING: Peak demand (${result.new_peak.toFixed(2)} kW) exceeds threshold (${threshold} kW)`);
    console.log('  This may indicate insufficient battery capacity or power.');
  }
  console.log();
  
  console.log(`Total Energy Discharged: ${(result.energy_discharged || 0).toFixed(2)} kWh`);
  console.log(`Energy Lost to Efficiency: ${energyLost.toFixed(2)} kWh`);
  console.log(`Efficiency Loss %: ${((energyLost / (result.energy_discharged || 1)) * 100).toFixed(2)}%`);
  console.log();
  
  // Verify efficiency calculation
  const oneWayEfficiency = Math.sqrt(battery.round_trip_efficiency);
  const expectedEnergyRemoved = (result.energy_discharged || 0) / oneWayEfficiency;
  const actualEnergyRemoved = expectedEnergyRemoved - (result.energy_discharged || 0);
  console.log(`Efficiency Verification:`);
  console.log(`  Round-trip efficiency: ${(battery.round_trip_efficiency * 100).toFixed(0)}%`);
  console.log(`  One-way efficiency: ${(oneWayEfficiency * 100).toFixed(2)}%`);
  console.log(`  Energy delivered to grid: ${(result.energy_discharged || 0).toFixed(2)} kWh`);
  console.log(`  Energy removed from battery: ${expectedEnergyRemoved.toFixed(2)} kWh`);
  console.log(`  Energy lost: ${energyLost.toFixed(2)} kWh`);
  console.log();
  
  // Create and print ASCII chart
  const maxChartValue = Math.max(result.original_peak, 200);
  const chart = createASCIIChart(loadProfile, result.final_load_profile, maxChartValue);
  console.log(chart);
  
  // Print summary table for spike period
  console.log('='.repeat(80));
  console.log('SPIKE PERIOD DETAILS (14:00 - 16:00)');
  console.log('='.repeat(80));
  console.log();
  console.log('Time    | Original | After Battery | Discharge | SOC');
  console.log('--------|----------|---------------|-----------|------');
  
  const spikeStart = 14 * 4; // 14:00 = interval 56 (14 * 4 intervals per hour)
  const spikeEnd = 16 * 4; // 16:00 = interval 64
  
  for (let i = spikeStart; i < spikeEnd && i < loadProfile.intervals.length; i++) {
    const orig = loadProfile.intervals[i];
    const final = result.final_load_profile.intervals[i];
    const date = new Date(orig.timestamp);
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    const discharge = orig.kw - final.kw;
    const soc = result.battery_soc_history?.[i] || 0;
    
    console.log(
      `${timeStr}   | ${orig.kw.toFixed(1).padStart(8)} | ${final.kw.toFixed(1).padStart(13)} | ${discharge.toFixed(1).padStart(9)} | ${(soc * 100).toFixed(1).padStart(4)}%`
    );
  }
  console.log();
}

// Execute the test
runTest();

