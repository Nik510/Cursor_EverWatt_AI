/**
 * Peak shaving simulation engine
 * Optimizes battery dispatch to reduce peak demand charges
 */

import type { IntervalDataPoint } from '@core/types';
import type { BatterySpec, PeakShavingConfig, BatteryDispatch } from './types';
import { calculateCapacityAtYear } from './degradation';

/**
 * Simulate battery peak shaving over a period
 */
export function simulatePeakShaving(
  demandData: IntervalDataPoint[],
  battery: BatterySpec,
  config: PeakShavingConfig,
  year: number = 0 // For degradation calculation
): BatteryDispatch[] {
  const dispatches: BatteryDispatch[] = [];
  
  // Current usable capacity (accounting for degradation)
  const currentCapacity = calculateCapacityAtYear(battery, year);
  const usableCapacity = currentCapacity * battery.depthOfDischarge;
  
  // Initialize state
  let soc = config.maxSOC; // Start at max SOC
  let storedEnergy = soc * usableCapacity; // kWh
  
  // Process each interval
  for (const point of demandData) {
    const demand = point.demand;
    const intervalHours = 0.25; // 15 minutes = 0.25 hours
    
    // Determine if we need to discharge
    let dischargePower = 0;
    let chargePower = 0;
    
    if (config.strategy === 'threshold') {
      // Discharge when demand exceeds threshold
      if (demand > config.threshold && soc > config.minSOC) {
        const excessDemand = demand - config.threshold;
        const maxDischarge = Math.min(
          battery.power, // Battery power limit
          (soc - config.minSOC) * usableCapacity / intervalHours, // Energy available
          excessDemand // Don't discharge more than needed
        );
        dischargePower = maxDischarge;
      }
      
      // Charge when demand is low (if below threshold and not at max SOC)
      if (demand < config.threshold * 0.5 && soc < config.maxSOC) {
        const availableCapacity = (config.maxSOC - soc) * usableCapacity;
        const maxCharge = Math.min(
          battery.power,
          availableCapacity / intervalHours
        );
        chargePower = maxCharge;
      }
    } else if (config.strategy === 'target') {
      // Target reduction strategy
      if (demand > config.threshold && soc > config.minSOC) {
        const targetDemand = Math.max(config.threshold, demand - (config.targetReduction || 0));
        const neededReduction = demand - targetDemand;
        const maxDischarge = Math.min(
          battery.power,
          (soc - config.minSOC) * usableCapacity / intervalHours,
          neededReduction
        );
        dischargePower = maxDischarge;
      }
    } else if (config.strategy === 'optimized') {
      // Optimized strategy: balance peak shaving with maintaining SOC
      // This is a simplified version - full optimization would consider future periods
      if (demand > config.threshold && soc > config.minSOC) {
        const excessDemand = demand - config.threshold;
        // Discharge more aggressively if SOC is high
        const socFactor = (soc - config.minSOC) / (config.maxSOC - config.minSOC);
        const maxDischarge = Math.min(
          battery.power,
          (soc - config.minSOC) * usableCapacity / intervalHours,
          excessDemand * (0.5 + 0.5 * socFactor) // Scale discharge based on SOC
        );
        dischargePower = maxDischarge;
      }
      
      // Charge during low demand periods
      if (demand < config.threshold * 0.6 && soc < config.maxSOC) {
        const availableCapacity = (config.maxSOC - soc) * usableCapacity;
        const maxCharge = Math.min(
          battery.power,
          availableCapacity / intervalHours
        );
        chargePower = maxCharge;
      }
    }
    
    // Apply round-trip efficiency
    const energyDischarged = dischargePower * intervalHours;
    const energyCharged = chargePower * intervalHours;
    
    // Update SOC
    storedEnergy = storedEnergy - energyDischarged + (energyCharged * battery.roundTripEfficiency);
    storedEnergy = Math.max(0, Math.min(usableCapacity, storedEnergy));
    soc = storedEnergy / usableCapacity;
    
    // Calculate net demand after battery
    const netDemand = demand - dischargePower + chargePower;
    
    dispatches.push({
      timestamp: point.timestamp,
      demandBefore: demand,
      demandAfter: netDemand,
      batteryCharge: chargePower - dischargePower, // Negative = discharging
      batterySOC: soc,
      batteryCapacity: usableCapacity,
      energyStored: energyCharged,
      energyDischarged: energyDischarged,
    });
  }
  
  return dispatches;
}

/**
 * Calculate peak shaving summary metrics
 */
export function calculatePeakShavingSummary(
  dispatches: BatteryDispatch[],
  battery: BatterySpec,
  year: number = 0
): import('./types').BatterySummary {
  const totalEnergyStored = dispatches.reduce((sum, d) => sum + d.energyStored, 0);
  const totalEnergyDischarged = dispatches.reduce((sum, d) => sum + d.energyDischarged, 0);
  
  const peakShavingEvents = dispatches.filter(d => d.batteryCharge < 0).length;
  
  const socs = dispatches.map(d => d.batterySOC);
  const averageSOC = socs.reduce((sum, s) => sum + s, 0) / socs.length;
  const minSOC = Math.min(...socs);
  const maxSOC = Math.max(...socs);
  
  // Utilization: how much of the battery capacity was actually used
  const currentCapacity = calculateCapacityAtYear(battery, year);
  const usableCapacity = currentCapacity * battery.depthOfDischarge;
  const maxPossibleEnergy = usableCapacity * dispatches.length * 0.25; // 15-min intervals
  const utilizationRate = maxPossibleEnergy > 0 
    ? totalEnergyDischarged / maxPossibleEnergy 
    : 0;
  
  // Capture rate: energy discharged vs energy that could have been shaved
  const potentialShaving = dispatches
    .filter(d => d.demandBefore > 0 && d.batteryCharge < 0)
    .reduce((sum, d) => sum + Math.max(0, d.demandBefore - d.demandAfter), 0) * 0.25;
  const captureRate = potentialShaving > 0 
    ? totalEnergyDischarged / potentialShaving 
    : 0;
  
  return {
    totalEnergyStored,
    totalEnergyDischarged,
    peakShavingEvents,
    averageSOC,
    minSOC,
    maxSOC,
    utilizationRate,
    captureRate,
    degradationYear1: calculateCapacityAtYear(battery, 1),
    degradationYear5: calculateCapacityAtYear(battery, 5),
    degradationYear10: calculateCapacityAtYear(battery, 10),
  };
}

