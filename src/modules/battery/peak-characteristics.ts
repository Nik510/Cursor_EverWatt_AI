/**
 * Peak Characteristics Analysis
 * 
 * Physics-first approach: Analyze the load profile to understand:
 * 1. Baseline demand
 * 2. Peak events (magnitude, duration, intensity)
 * 3. What battery specs would be needed to shave those peaks
 * 
 * This analysis is money-agnostic - it determines what's physically needed
 * before considering financial viability.
 */

import type { LoadProfile, LoadInterval, PeakEvent } from './types';
import { detectPeakEvents } from './logic';

export interface PeakCharacteristics {
  baselineKw: number; // Typical/normal demand level
  peakKw: number; // Maximum demand observed
  peakAboveBaselineKw: number; // How much above baseline
  
  peakEvents: PeakEvent[];
  avgPeakDurationHours: number;
  maxPeakDurationHours: number;
  avgPeakIntensityKw: number; // Average excess kW during peaks
  maxPeakIntensityKw: number; // Maximum excess kW during any peak
  
  // Energy characteristics
  totalPeakEnergyKwh: number; // Total energy above baseline during peaks
  avgPeakEnergyKwh: number; // Average energy per peak event
  
  // Battery requirements (money-agnostic)
  requiredPowerKw: number; // Minimum power needed to shave peaks
  requiredCapacityKwh: number; // Minimum capacity needed for longest peak
  requiredDurationHours: number; // Minimum duration rating needed
}

/**
 * Calculate baseline demand using percentile method
 * Baseline = 50th percentile (median) of all demand values
 * This represents "normal" operation, excluding peaks
 */
function calculateBaseline(intervals: LoadInterval[]): number {
  if (intervals.length === 0) return 0;
  
  const demands = intervals.map(i => i.kw).sort((a, b) => a - b);
  const medianIndex = Math.floor(demands.length / 2);
  
  // Use median as baseline (50th percentile)
  // This excludes peaks and represents normal operation
  return demands[medianIndex];
}

/**
 * Analyze peak characteristics from load profile
 * This is the physics-first analysis before financial considerations
 */
export function analyzePeakCharacteristics(
  loadProfile: LoadProfile,
  peakThresholdPercent: number = 0.90 // Consider top 10% as peaks
): PeakCharacteristics {
  const intervals = loadProfile.intervals;
  if (intervals.length === 0) {
    throw new Error('Load profile is empty');
  }

  // Step 1: Calculate baseline (median demand)
  const baselineKw = calculateBaseline(intervals);
  
  // Step 2: Find absolute peak
  const peakKw = Math.max(...intervals.map(i => i.kw));
  const peakAboveBaselineKw = peakKw - baselineKw;
  
  // Step 3: Detect peak events (demand above threshold)
  // Use 90% of peak as threshold to identify significant peaks
  const thresholdKw = baselineKw + (peakKw - baselineKw) * peakThresholdPercent;
  const peakEvents = detectPeakEvents(loadProfile, thresholdKw);
  
  // Step 4: Analyze peak characteristics
  const avgPeakDurationHours = peakEvents.length > 0
    ? peakEvents.reduce((sum, e) => sum + e.durationHours, 0) / peakEvents.length
    : 0;
  
  const maxPeakDurationHours = peakEvents.length > 0
    ? Math.max(...peakEvents.map(e => e.durationHours))
    : 0;
  
  const avgPeakIntensityKw = peakEvents.length > 0
    ? peakEvents.reduce((sum, e) => sum + e.avgExcessKw, 0) / peakEvents.length
    : 0;
  
  const maxPeakIntensityKw = peakEvents.length > 0
    ? Math.max(...peakEvents.map(e => e.maxExcessKw))
    : 0;
  
  // Step 5: Calculate total peak energy
  const totalPeakEnergyKwh = peakEvents.reduce((sum, e) => sum + e.totalExcessKwh, 0);
  const avgPeakEnergyKwh = peakEvents.length > 0
    ? totalPeakEnergyKwh / peakEvents.length
    : 0;
  
  // Step 6: Determine battery requirements (physics-first, money-agnostic)
  // Required power = maximum peak intensity (need to handle worst case)
  const requiredPowerKw = maxPeakIntensityKw;
  
  // Required capacity = energy needed for longest peak event
  // Add 20% buffer for round-trip efficiency losses
  const requiredCapacityKwh = maxPeakDurationHours > 0
    ? (maxPeakIntensityKw * maxPeakDurationHours * 1.2)
    : 0;
  
  // Required duration = longest peak duration
  const requiredDurationHours = maxPeakDurationHours;
  
  return {
    baselineKw,
    peakKw,
    peakAboveBaselineKw,
    peakEvents,
    avgPeakDurationHours,
    maxPeakDurationHours,
    avgPeakIntensityKw,
    maxPeakIntensityKw,
    totalPeakEnergyKwh,
    avgPeakEnergyKwh,
    requiredPowerKw,
    requiredCapacityKwh,
    requiredDurationHours,
  };
}

/**
 * Find battery configurations that meet the physical requirements
 * Returns batteries that can actually shave the peaks (money-agnostic)
 */
export function findBatteriesForPeakShaving(
  characteristics: PeakCharacteristics,
  catalog: Array<{
    modelName: string;
    manufacturer: string;
    capacityKwh: number;
    powerKw: number;
    efficiency: number;
    warrantyYears: number;
    price1_10: number;
    price11_20: number;
    price21_50: number;
    price50Plus: number;
  }>
): Array<{
  battery: typeof catalog[0];
  quantity: number;
  totalPowerKw: number;
  totalCapacityKwh: number;
  systemCost: number;
  canShavePeaks: boolean; // True if this config can physically shave all peaks
  maxShaveableKw: number; // Maximum kW this config can shave
  maxShaveableDurationHours: number; // Maximum duration this config can shave
}> {
  const results: Array<{
    battery: typeof catalog[0];
    quantity: number;
    totalPowerKw: number;
    totalCapacityKwh: number;
    systemCost: number;
    canShavePeaks: boolean;
    maxShaveableKw: number;
    maxShaveableDurationHours: number;
  }> = [];
  
  for (const battery of catalog) {
    // Calculate minimum quantity needed for power
    const powerQuantity = Math.ceil(characteristics.requiredPowerKw / battery.powerKw);
    
    // Calculate minimum quantity needed for capacity
    const capacityQuantity = Math.ceil(characteristics.requiredCapacityKwh / battery.capacityKwh);
    
    // Need enough units to meet both power and capacity requirements
    const quantity = Math.max(powerQuantity, capacityQuantity, 1);
    
    const totalPowerKw = battery.powerKw * quantity;
    const totalCapacityKwh = battery.capacityKwh * quantity;
    
    // Calculate system cost
    let unitPrice = battery.price1_10;
    if (quantity >= 50) unitPrice = battery.price50Plus;
    else if (quantity >= 21) unitPrice = battery.price21_50;
    else if (quantity >= 11) unitPrice = battery.price11_20;
    
    const systemCost = unitPrice * quantity;
    
    // Check if this configuration can physically shave the peaks
    const canShavePeaks = totalPowerKw >= characteristics.requiredPowerKw &&
                          totalCapacityKwh >= characteristics.requiredCapacityKwh;
    
    // Calculate what this config can actually shave
    const maxShaveableKw = totalPowerKw;
    // Duration = capacity / power (accounting for efficiency)
    const efficiency = battery.efficiency ?? 0.90;
    const maxShaveableDurationHours = totalCapacityKwh * efficiency / totalPowerKw;
    
    results.push({
      battery,
      quantity,
      totalPowerKw,
      totalCapacityKwh,
      systemCost,
      canShavePeaks,
      maxShaveableKw,
      maxShaveableDurationHours,
    });
  }
  
  // Sort by: can shave peaks first, then by cost
  results.sort((a, b) => {
    if (a.canShavePeaks !== b.canShavePeaks) {
      return a.canShavePeaks ? -1 : 1;
    }
    return a.systemCost - b.systemCost;
  });
  
  return results;
}

