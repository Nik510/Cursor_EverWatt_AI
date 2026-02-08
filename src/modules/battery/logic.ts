/**
 * Battery peak shaving simulation engine
 * Implements the exact physics from project-manifesto.md
 * 
 * CRITICAL: This code translates the "Peak Shaving Dispatch Logic" from the Manifesto
 * directly into TypeScript code.
 */

import type { BatterySpec, LoadProfile, LoadInterval, SimulationResult, PeakEvent } from './types';

/**
 * Result of a hard cap-enforcement simulation.
 * This is used as the feasibility oracle for "billing max" optimization:
 * if ANY interval breaches the cap, the month fails.
 */
export type CapEnforcementResult = {
  /** True if no interval breached the cap. */
  feasible: boolean;
  /** Highest demand observed before dispatch within the simulated series. */
  originalPeakKw: number;
  /** Highest demand observed after dispatch within the simulated series. */
  newPeakKw: number;
  /** Series aligned to input intervals: net demand seen by meter after dispatch. */
  newIntervalsKw: number[];
  /** SOC after each interval (0..1). */
  socHistory: number[];
  /** Energy charged/discharged (kWh), for diagnostics. */
  energyDischargedKwh: number;
  energyChargedKwh: number;
  /** First violation details (if infeasible). */
  firstViolation?: {
    index: number;
    timestamp: Date;
    demandBeforeKw: number;
    demandAfterKw: number;
    capKw: number;
    violationKw: number;
    soc: number;
  };
};

/**
 * Enforce a hard cap C on demand for every interval.
 *
 * IMPORTANT:
 * - Charging is modeled as additional behind-the-meter load (it increases demand).
 * - If any interval ends with demandAfter > capKw, feasible=false.
 *
 * This is the correct objective for demand-charge peak shaving:
 * demand charges are set by the single highest interval in the billing month.
 */
export function simulateCapEnforcement(
  loadProfile: LoadProfile,
  battery: BatterySpec,
  capKw: number,
  opts?: {
    /** Interval length in hours (default 0.25 for 15-min). */
    intervalHours?: number;
    /** Safety margin below cap required for charging (kW). Default max(10, 5% of cap). */
    chargeMarginKw?: number;
    /** Numerical tolerance for cap comparison (kW). */
    capEpsilonKw?: number;
  }
): CapEnforcementResult {
  const intervals = loadProfile.intervals;
  const intervalHours = opts?.intervalHours ?? 0.25;
  const capEpsilonKw = opts?.capEpsilonKw ?? 0.01;
  const chargeMarginKw = opts?.chargeMarginKw ?? Math.max(10, capKw * 0.05);

  // Initialize battery state
  const minSOC = battery.min_soc ?? 0.10;
  const maxSOC = battery.max_soc ?? 0.90;
  const depthOfDischarge = battery.depth_of_discharge ?? 0.90;
  const oneWayEfficiency = Math.sqrt(battery.round_trip_efficiency);
  const usableCapacity = battery.capacity_kwh * depthOfDischarge;

  let soc = maxSOC;
  let storedEnergy = soc * usableCapacity;

  let originalPeakKw = 0;
  let newPeakKw = 0;
  let energyDischargedKwh = 0;
  let energyChargedKwh = 0;

  const socHistory: number[] = [];
  const newIntervalsKw: number[] = [];

  for (let idx = 0; idx < intervals.length; idx++) {
    const interval = intervals[idx];
    const demand = interval.kw;
    originalPeakKw = Math.max(originalPeakKw, demand);

    // Default: no simultaneous charge+discharge
    let dischargePowerKw = 0;
    let chargePowerKw = 0;

    // If demand is above cap, we must discharge enough to bring it down to cap (if possible)
    if (demand > capKw && soc > minSOC) {
      const excessKw = demand - capKw;
      const availableEnergyKwh = (soc - minSOC) * usableCapacity;
      const maxDischargeFromEnergyKw = availableEnergyKwh / intervalHours;
      dischargePowerKw = Math.min(battery.max_power_kw, maxDischargeFromEnergyKw, excessKw);
      // Do not charge when in a peak interval.
      chargePowerKw = 0;
    } else {
      // If below cap, opportunistically charge as much as possible WITHOUT risking a new billing peak.
      // Charging increases meter demand: demandAfter = demand + charge.
      if (soc < maxSOC) {
        const headroomKw = (capKw - chargeMarginKw) - demand;
        if (headroomKw > 0) {
          const availableCapacityKwh = (maxSOC - soc) * usableCapacity;
          const maxChargeFromCapacityKw = availableCapacityKwh / intervalHours;
          chargePowerKw = Math.min(battery.max_power_kw, maxChargeFromCapacityKw, headroomKw);
        }
      }
    }

    // Convert kW to kWh for interval
    const energyDischargedToMeterKwh = dischargePowerKw * intervalHours;
    const energyChargedFromMeterKwh = chargePowerKw * intervalHours;

    // Efficiency: discharge removes more from battery than delivered; charge adds less than consumed
    const energyRemovedFromBatteryKwh = energyDischargedToMeterKwh / oneWayEfficiency;
    const energyAddedToBatteryKwh = energyChargedFromMeterKwh * oneWayEfficiency;

    storedEnergy = storedEnergy - energyRemovedFromBatteryKwh + energyAddedToBatteryKwh;
    storedEnergy = Math.max(0, Math.min(usableCapacity, storedEnergy));
    soc = storedEnergy / usableCapacity;
    soc = Math.max(minSOC, Math.min(maxSOC, soc));
    storedEnergy = soc * usableCapacity;

    socHistory.push(soc);
    energyDischargedKwh += energyDischargedToMeterKwh;
    energyChargedKwh += energyChargedFromMeterKwh;

    const newDemand = demand - dischargePowerKw + chargePowerKw;
    newIntervalsKw.push(newDemand);
    newPeakKw = Math.max(newPeakKw, newDemand);

    if (newDemand > capKw + capEpsilonKw) {
      return {
        feasible: false,
        originalPeakKw,
        newPeakKw,
        newIntervalsKw,
        socHistory,
        energyDischargedKwh,
        energyChargedKwh,
        firstViolation: {
          index: idx,
          timestamp: interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp),
          demandBeforeKw: demand,
          demandAfterKw: newDemand,
          capKw,
          violationKw: newDemand - capKw,
          soc,
        },
      };
    }
  }

  return {
    feasible: true,
    originalPeakKw,
    newPeakKw,
    newIntervalsKw,
    socHistory,
    energyDischargedKwh,
    energyChargedKwh,
  };
}

/**
 * Optimize threshold to maximize peak reduction per dollar spent.
 * 
 * Strategy:
 * - Try thresholds from minimum feasible cap down to a reasonable minimum (e.g., 50% of peak)
 * - For each threshold, calculate peak reduction and annual savings
 * - Maximize: peakReductionKw / systemCost (peak reduction per dollar)
 * - Constraint: Must meet minimum ROI/payback requirements
 * 
 * @param loadProfile The load profile to optimize for
 * @param battery The battery specification
 * @param demandRatePerKwMonth Demand charge rate ($/kW/month)
 * @param systemCost Total system cost (pre-markup, pre-tax)
 * @param opts Optimization options
 * @returns Optimal threshold and associated metrics
 */
export function optimizeThresholdForValue(
  loadProfile: LoadProfile,
  battery: BatterySpec,
  demandRatePerKwMonth: number,
  systemCost: number,
  opts?: {
    /** Minimum acceptable payback period (years). Default: 15 */
    minPaybackYears?: number;
    /** Maximum acceptable payback period (years). Default: 25 */
    maxPaybackYears?: number;
    /** Minimum threshold as % of original peak. Default: 0.5 (50%) */
    minThresholdPercent?: number;
    /** Number of threshold candidates to test. Default: 20 */
    candidateCount?: number;
    /** Interval length in hours. Default: 0.25 */
    intervalHours?: number;
  }
): {
  optimalThresholdKw: number;
  peakReductionKw: number;
  peakReductionPercent: number;
  annualSavings: number;
  paybackYears: number;
  peakReductionPerDollar: number;
  feasible: boolean;
} {
  const minPaybackYears = opts?.minPaybackYears ?? 15;
  const maxPaybackYears = opts?.maxPaybackYears ?? 25;
  const minThresholdPercent = opts?.minThresholdPercent ?? 0.5;
  const candidateCount = opts?.candidateCount ?? 20;
  const intervalHours = opts?.intervalHours ?? 0.25;

  const originalPeak = Math.max(...loadProfile.intervals.map(i => i.kw));
  if (originalPeak <= 0) {
    return {
      optimalThresholdKw: originalPeak,
      peakReductionKw: 0,
      peakReductionPercent: 0,
      annualSavings: 0,
      paybackYears: Infinity,
      peakReductionPerDollar: 0,
      feasible: false,
    };
  }

  // Find minimum feasible cap (lowest threshold the battery can achieve)
  // Use binary search to find the minimum feasible threshold
  let minFeasible = originalPeak;
  let maxFeasible = originalPeak * minThresholdPercent;
  
  // Binary search for minimum feasible cap
  let lo = maxFeasible;
  let hi = originalPeak;
  const tolerance = 0.1; // kW
  
  while (hi - lo > tolerance) {
    const mid = (lo + hi) / 2;
    const test = simulateCapEnforcement(loadProfile, battery, mid, { intervalHours });
    if (test.feasible) {
      minFeasible = mid;
      hi = mid;
    } else {
      lo = mid;
    }
  }

  // Generate candidate thresholds from minFeasible to originalPeak
  const candidates: number[] = [];
  const step = (originalPeak - minFeasible) / (candidateCount - 1);
  for (let i = 0; i < candidateCount; i++) {
    candidates.push(minFeasible + step * i);
  }
  // Ensure we test the minimum feasible and original peak
  candidates[0] = minFeasible;
  candidates[candidates.length - 1] = originalPeak;

  // Evaluate each candidate
  let bestCandidate: {
    thresholdKw: number;
    peakReductionKw: number;
    peakReductionPercent: number;
    annualSavings: number;
    paybackYears: number;
    peakReductionPerDollar: number;
  } | null = null;

  for (const thresholdKw of candidates) {
    const result = simulateCapEnforcement(loadProfile, battery, thresholdKw, { intervalHours });
    
    if (!result.feasible) continue;

    const peakReductionKw = originalPeak - result.newPeakKw;
    const peakReductionPercent = (peakReductionKw / originalPeak) * 100;

    // Calculate actual monthly peak reduction using the proper function
    const { reductionKwMonthSum, monthsCount } = computeMonthlyBillingPeakReductionKwMonthSum(
      loadProfile,
      result.newIntervalsKw
    );
    const annualizeFactor = monthsCount > 0 ? 12 / monthsCount : 1;
    const annualSavings = reductionKwMonthSum * annualizeFactor * demandRatePerKwMonth;
    
    const paybackYears = annualSavings > 0 ? systemCost / annualSavings : Infinity;
    const peakReductionPerDollar = systemCost > 0 ? peakReductionKw / systemCost : 0;

    // Filter by payback constraints
    if (paybackYears < minPaybackYears || paybackYears > maxPaybackYears) {
      continue;
    }

    // Maximize peak reduction per dollar
    if (!bestCandidate || peakReductionPerDollar > bestCandidate.peakReductionPerDollar) {
      bestCandidate = {
        thresholdKw,
        peakReductionKw,
        peakReductionPercent,
        annualSavings,
        paybackYears,
        peakReductionPerDollar,
      };
    }
  }

  // If no candidate met constraints, use minimum feasible with warning
  if (!bestCandidate) {
    const result = simulateCapEnforcement(loadProfile, battery, minFeasible, { intervalHours });
    const peakReductionKw = originalPeak - result.newPeakKw;
    const peakReductionPercent = (peakReductionKw / originalPeak) * 100;
    
    const { reductionKwMonthSum, monthsCount } = computeMonthlyBillingPeakReductionKwMonthSum(
      loadProfile,
      result.newIntervalsKw
    );
    const annualizeFactor = monthsCount > 0 ? 12 / monthsCount : 1;
    const annualSavings = reductionKwMonthSum * annualizeFactor * demandRatePerKwMonth;
    const paybackYears = annualSavings > 0 ? systemCost / annualSavings : Infinity;
    const peakReductionPerDollar = systemCost > 0 ? peakReductionKw / systemCost : 0;

    return {
      optimalThresholdKw: minFeasible,
      peakReductionKw,
      peakReductionPercent,
      annualSavings,
      paybackYears,
      peakReductionPerDollar,
      feasible: result.feasible,
    };
  }

  return {
    optimalThresholdKw: bestCandidate.thresholdKw,
    peakReductionKw: bestCandidate.peakReductionKw,
    peakReductionPercent: bestCandidate.peakReductionPercent,
    annualSavings: bestCandidate.annualSavings,
    paybackYears: bestCandidate.paybackYears,
    peakReductionPerDollar: bestCandidate.peakReductionPerDollar,
    feasible: true,
  };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[idx];
}

/**
 * Detect consecutive peak events above the threshold.
 * Useful for sizing energy to realistic event durations instead of summing the whole year.
 */
export function detectPeakEvents(loadProfile: LoadProfile, threshold: number, intervalHours: number = 0.25): PeakEvent[] {
  const events: PeakEvent[] = [];
  let current: PeakEvent | null = null;

  for (const interval of loadProfile.intervals) {
    const demand = interval.kw;
    const above = demand > threshold;
    if (above) {
      if (!current) {
        current = {
          start: interval.timestamp,
          end: interval.timestamp,
          durationHours: 0,
          peakKw: demand,
          totalExcessKwh: 0,
        };
      }
      current.durationHours += intervalHours;
      current.end = interval.timestamp;
      current.peakKw = Math.max(current.peakKw, demand);
      current.totalExcessKwh += (demand - threshold) * intervalHours;
    } else if (current) {
      events.push(current);
      current = null;
    }
  }

  if (current) {
    events.push(current);
  }

  return events;
}

/**
 * Utility to derive an energy requirement from detected events.
 * Uses the 95th percentile event energy (totalExcessKwh) and the worst-case events-per-day count.
 */
export function estimateEnergyFromEvents(events: PeakEvent[]): { eventEnergy95: number; maxEventsPerDay: number } {
  if (events.length === 0) {
    return { eventEnergy95: 0, maxEventsPerDay: 0 };
  }
  const eventEnergies = events.map(e => e.totalExcessKwh);
  const eventEnergy95 = percentile(eventEnergies, 0.95);

  const eventsPerDay: Record<string, number> = {};
  for (const e of events) {
    const dayKey = e.start.toISOString().slice(0, 10);
    eventsPerDay[dayKey] = (eventsPerDay[dayKey] ?? 0) + 1;
  }
  const maxEventsPerDay = Math.max(...Object.values(eventsPerDay));

  return { eventEnergy95, maxEventsPerDay };
}

/**
 * Simulate peak shaving according to the manifesto physics
 * 
 * Logic: Loop through every interval. If demand > threshold, calculate the discharge.
 * 
 * Constraint 1: Check SOC > SOC_min
 * Constraint 2: Apply the η_roundtrip (Efficiency) loss. Discharging 10kW to the grid 
 *               costs more than 10kW from the battery.
 * Constraint 3: Do not exceed P_discharge limit.
 * 
 * Update the SOC (State of Charge) after every interval.
 */
export function simulatePeakShaving(
  loadProfile: LoadProfile,
  battery: BatterySpec,
  threshold: number // kW threshold to trigger discharge
): SimulationResult {
  const intervals = loadProfile.intervals;
  const finalIntervals: LoadInterval[] = [];
  const newIntervalsKw: number[] = [];
  
  // Initialize battery state
  const minSOC = battery.min_soc ?? 0.10; // Default minimum SOC
  const maxSOC = battery.max_soc ?? 0.90; // Default maximum SOC
  const depthOfDischarge = battery.depth_of_discharge ?? 0.90; // Default DoD
  
  // Calculate one-way efficiency from round-trip efficiency
  // Round-trip efficiency = one_way^2, so one_way = sqrt(round_trip)
  // This prevents double-applying efficiency (which would give efficiency^2)
  const oneWayEfficiency = Math.sqrt(battery.round_trip_efficiency);
  
  // Calculate usable capacity (accounting for depth of discharge)
  const usableCapacity = battery.capacity_kwh * depthOfDischarge; // kWh
  
  // Initialize State of Charge (start at max SOC)
  let soc = maxSOC; // Current state of charge (0-1)
  let storedEnergy = soc * usableCapacity; // Current stored energy in kWh
  
  // Track metrics
  let originalPeak = 0;
  let newPeak = 0;
  let totalEnergyDischarged = 0; // kWh
  let totalEnergyCharged = 0; // kWh
  const socHistory: number[] = [];
  
  // Time interval in hours (15 minutes = 0.25 hours)
  const intervalHours = 0.25;
  // Safety margin so charging doesn't create a new billing peak near the threshold.
  const chargeMarginKw = Math.max(10, threshold * 0.05);
  
  // Loop through every interval
  for (const interval of intervals) {
    const demand = interval.kw; // Current demand in kW
    
    // Track original peak
    if (demand > originalPeak) {
      originalPeak = demand;
    }
    
    // Initialize discharge power
    let dischargePower = 0; // kW (power discharged from battery)
    let chargePower = 0; // kW (power charged to battery)
    
    // PEAK SHAVING DISPATCH LOGIC (from Manifesto):
    // IF demand(t) > threshold AND SOC(t) > SOC_min: DISCHARGE
    if (demand > threshold && soc > minSOC) {
      // Calculate excess demand above threshold
      const excessDemand = demand - threshold; // kW
      
      // Calculate maximum discharge based on available energy
      // From Manifesto: (SOC - SOC_min) × E_usable / Δt
      const availableEnergy = (soc - minSOC) * usableCapacity; // kWh available
      const maxDischargeFromEnergy = availableEnergy / intervalHours; // kW
      
      // CONSTRAINT 3: Do not exceed P_discharge limit
      // From Manifesto: P_discharge ≤ min(P_battery, (SOC - SOC_min) × E_usable / Δt, demand(t) - threshold)
      const maxDischarge = Math.min(
        battery.max_power_kw, // Battery power limit
        maxDischargeFromEnergy, // Energy available constraint
        excessDemand // Don't discharge more than needed
      );
      
      dischargePower = maxDischarge;
    }
    
    // CHARGING LOGIC: Charge during off-peak to prepare for next peak
    // IF demand(t) < threshold AND SOC(t) < maxSOC: CHARGE
    // IMPORTANT: charging increases meter demand, so we must not charge in a way that creates
    // a new peak that wipes out demand-charge savings.
    // We only charge when we have headroom below (threshold - margin).
    if (demand < threshold - chargeMarginKw && soc < maxSOC) {
      // Calculate available charging capacity
      const availableCapacity = (maxSOC - soc) * usableCapacity; // kWh available to charge
      const maxChargeFromCapacity = availableCapacity / intervalHours; // kW
      const headroomKw = (threshold - chargeMarginKw) - demand;
      
      // Charge up to battery power limit, but don't exceed available capacity
      const maxCharge = Math.min(
        battery.max_power_kw, // Battery power limit
        maxChargeFromCapacity, // Capacity available constraint
        headroomKw // Do not exceed headroom to avoid creating a new peak
      );
      
      chargePower = Math.max(0, maxCharge);
    }
    
    // Calculate energy delivered to grid in this interval
    const energyDeliveredToGrid = dischargePower * intervalHours; // kWh
    
    // Calculate energy charged to battery in this interval
    const energyChargedToBattery = chargePower * intervalHours; // kWh
    
    // CONSTRAINT 2: Apply the one-way efficiency loss for discharging
    // Round-trip efficiency is the product of charge and discharge efficiencies
    // To avoid double-applying (which would give efficiency^2), we use sqrt(round_trip)
    // When discharging: energy_out = energy_stored * one_way_efficiency
    // Therefore: energy_removed = energy_delivered / one_way_efficiency
    // Discharging 10kW to the grid costs more than 10kW from the battery
    const energyRemovedFromBattery = energyDeliveredToGrid / oneWayEfficiency;
    
    // CONSTRAINT 2 (Charging): Apply efficiency loss for charging
    // When charging: energy_stored = energy_in * one_way_efficiency
    // Therefore: energy_added = energy_charged * one_way_efficiency
    const energyAddedToBattery = energyChargedToBattery * oneWayEfficiency;
    
    // Update stored energy (remove energy from battery when discharging, add when charging)
    storedEnergy = storedEnergy - energyRemovedFromBattery + energyAddedToBattery;
    
    // Ensure stored energy doesn't go below zero
    storedEnergy = Math.max(0, storedEnergy);
    
    // Update SOC
    soc = storedEnergy / usableCapacity;
    
    // Ensure SOC stays within bounds
    soc = Math.max(minSOC, Math.min(maxSOC, soc));
    
    // Recalculate stored energy based on constrained SOC
    storedEnergy = soc * usableCapacity;
    
    // Net demand seen by the meter:
    // - Discharge reduces demand
    // - Charge increases demand
    const newDemand = demand - dischargePower + chargePower;
    
    // Track new peak
    if (newDemand > newPeak) {
      newPeak = newDemand;
    }
    
    // Track metrics (energy delivered to grid and charged)
    totalEnergyDischarged += energyDeliveredToGrid;
    totalEnergyCharged += energyChargedToBattery;
    socHistory.push(soc);
    
    // Create final interval
    finalIntervals.push({
      timestamp: interval.timestamp,
      kw: newDemand,
    });
    newIntervalsKw.push(newDemand);
  }
  
  // Calculate total savings (energy that was shaved)
  // Savings = sum of all energy discharged
  const savingsKwh = totalEnergyDischarged;
  
  // Create final load profile
  const finalLoadProfile: LoadProfile = {
    intervals: finalIntervals,
  };
  
  // Return simulation result
  const result: SimulationResult = {
    original_peak: originalPeak,
    new_peak: newPeak,
    savings_kwh: savingsKwh,
    final_load_profile: finalLoadProfile,
    new_intervals_kw: newIntervalsKw,
    battery_soc_history: socHistory,
    energy_discharged: totalEnergyDischarged,
    energy_charged: totalEnergyCharged,
  };
  
  return result;
}

function monthKey(timestamp: Date | string): string {
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (!Number.isFinite(d.getTime())) return 'invalid';
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Demand charges are typically billed off the highest kW in each billing month.
 * This helper computes the sum of monthly peak reductions: Σ_month (peak_before - peak_after).
 *
 * Units: kW-month (i.e., "sum of monthly kW reductions")
 */
export function computeMonthlyBillingPeakReductionKwMonthSum(
  loadProfile: LoadProfile,
  newIntervalsKw: number[]
): { reductionKwMonthSum: number; monthsCount: number } {
  const before = new Map<string, number>();
  const after = new Map<string, number>();

  const n = Math.min(loadProfile.intervals.length, newIntervalsKw.length);
  for (let idx = 0; idx < n; idx++) {
    const interval = loadProfile.intervals[idx];
    const k = monthKey(interval.timestamp);

    const beforeKw = interval.kw;
    const afterKw = newIntervalsKw[idx] ?? beforeKw;

    before.set(k, Math.max(before.get(k) ?? -Infinity, beforeKw));
    after.set(k, Math.max(after.get(k) ?? -Infinity, afterKw));
  }

  let sum = 0;
  for (const [k, peakBefore] of before.entries()) {
    const peakAfter = after.get(k) ?? peakBefore;
    sum += Math.max(0, peakBefore - peakAfter);
  }

  return { reductionKwMonthSum: sum, monthsCount: before.size };
}

