/**
 * Intelligent Peak Analysis & Holistic Cost-Benefit Optimization
 * 
 * PROPERLY understands baseline, calculates excess above baseline,
 * and tests MULTIPLE QUANTITIES and COMBINATIONS of batteries to find
 * optimal solutions.
 */

import type { LoadProfile, LoadInterval, BatterySpec } from './types';
import { simulateCapEnforcement } from './logic';
import { loadBatteryCatalog } from '../../utils/battery-catalog-loader';
import type { CatalogBatteryRow } from '../../utils/battery-catalog-loader';
import { catalogToBatterySpec } from '../../utils/battery-catalog-loader';
import { calculateFinancialAnalysis } from '../financials/calculations';
import type { FinancialParameters } from '../../core/types';

/**
 * Parse CSV in browser (simple parser, no Node.js dependencies)
 */
function parseCsvInBrowser(csvText: string): CatalogBatteryRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Find column indices
  const getIndex = (name: string) => {
    const idx = header.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
    return idx >= 0 ? idx : -1;
  };
  
  const modelIdx = getIndex('Model Name');
  const mfrIdx = getIndex('Manufacturer');
  const capIdx = getIndex('Capacity');
  const powerIdx = getIndex('Power');
  const cRateIdx = getIndex('C-Rate');
  const effIdx = getIndex('Efficiency');
  const warrantyIdx = getIndex('Warranty');
  const price1Idx = getIndex('Price 1-10');
  const price11Idx = getIndex('Price 11-20');
  const price21Idx = getIndex('Price 21-50');
  const price50Idx = getIndex('Price 50+');
  const activeIdx = getIndex('Active');
  
  const batteries: CatalogBatteryRow[] = [];
  
  // Parse rows
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    
    if (values.length < header.length) continue;
    
    const parseNum = (idx: number, def: number = 0) => {
      if (idx < 0) return def;
      const val = values[idx];
      const num = parseFloat(val);
      return isNaN(num) ? def : num;
    };
    
    const parseEfficiency = (idx: number, def: number = 0.90) => {
      if (idx < 0) return def;
      const val = values[idx];
      const num = parseFloat(val);
      if (isNaN(num)) return def;
      // Convert percentage to decimal if > 1
      return num > 1 ? num / 100 : num;
    };
    
    const parseBool = (idx: number, def: boolean = true) => {
      if (idx < 0) return def;
      const val = values[idx].toLowerCase();
      return val === 'yes' || val === 'true' || val === '1';
    };
    
    const battery: CatalogBatteryRow = {
      modelName: values[modelIdx] || '',
      manufacturer: values[mfrIdx] || '',
      capacityKwh: parseNum(capIdx),
      powerKw: parseNum(powerIdx),
      cRate: parseNum(cRateIdx, parseNum(powerIdx) / parseNum(capIdx, 1)),
      efficiency: parseEfficiency(effIdx, 0.90), // Store as decimal (0-1)
      warrantyYears: parseNum(warrantyIdx, 10),
      price1_10: parseNum(price1Idx),
      price11_20: parseNum(price11Idx, parseNum(price1Idx)),
      price21_50: parseNum(price21Idx, parseNum(price1Idx)),
      price50Plus: parseNum(price50Idx, parseNum(price1Idx)),
      active: parseBool(activeIdx, true),
    };
    
    if (battery.modelName && battery.capacityKwh > 0 && battery.powerKw > 0) {
      batteries.push(battery);
    }
  }
  
  return batteries;
}

export interface DetectedSpike {
  /** Start timestamp of the spike */
  start: Date;
  /** End timestamp of the spike */
  end: Date;
  /** Peak demand during this spike (kW) */
  peakKw: number;
  /** Average demand during the spike (kW) */
  avgKw: number;
  /** Duration in hours */
  durationHours: number;
  /** Total excess energy above baseline (kWh) */
  excessEnergyKwh: number;
  /** Baseline threshold used for detection (kW) */
  baselineKw: number;
  /** How many standard deviations above baseline */
  severity: number;
  /** Excess kW above baseline for this spike */
  excessKw: number;
}

export interface BaselineAnalysis {
  /** Typical operating level (kW) - median or most common operating level */
  typicalOperatingKw: number;
  /** Baseline threshold for spike detection (kW) */
  baselineKw: number;
  /** Mean demand (kW) */
  meanKw: number;
  /** Median demand (kW) */
  medianKw: number;
  /** Standard deviation (kW) */
  stdDevKw: number;
  /** Percentage of time operating at baseline level */
  baselinePercentage: number;
  /** Reasoning for baseline selection */
  reasoning: string[];
}

export interface BatteryConfiguration {
  /** Battery model(s) and quantities */
  components: Array<{
    modelName: string;
    manufacturer: string;
    quantity: number;
    unitCost: number;
  }>;
  /** Combined battery spec */
  combinedBattery: BatterySpec;
  /** Total system cost */
  totalCost: number;
  /** Total power (kW) */
  totalPowerKw: number;
  /** Total capacity (kWh) */
  totalCapacityKwh: number;
  /** Description of configuration */
  description: string;
}

export interface BatteryScenarioResult {
  /** Battery configuration (may be multiple units or combinations) */
  configuration: BatteryConfiguration;
  /** Is this scenario feasible? */
  feasible: boolean;
  /** New peak after shaving (kW) */
  newPeakKw: number;
  /** Peak reduction achieved (kW) */
  peakReductionKw: number;
  /** Total energy discharged (kWh) */
  energyDischargedKwh: number;
  /** Minimum SOC reached */
  minSOC: number;
  /** Why it failed (if not feasible) */
  failureReason?: string;
  /** Estimated annual savings */
  estimatedAnnualSavings?: number;
  /** Payback period (years) */
  paybackYears?: number;
  /** ROI percentage */
  roi?: number;
  /** NPV */
  npv?: number;
  /** Viability score (0-100) */
  viabilityScore?: number;
  /** Recommendation */
  recommendation?: 'recommended' | 'marginal' | 'not_recommended';
}

export interface ShavingScenario {
  /** Target: shave to this level (kW) */
  targetCapKw: number;
  /** Original peak (kW) */
  originalPeakKw: number;
  /** Excess above baseline that needs shaving (kW) */
  excessAboveBaselineKw: number;
  /** Baseline operating level (kW) */
  baselineKw: number;
  /** Required power to shave (kW) */
  requiredPowerKw: number;
  /** Required capacity (kWh) - estimated */
  requiredCapacityKwh: number;
  /** All battery configurations tested */
  batteryResults: BatteryScenarioResult[];
  /** Best configuration */
  bestConfiguration?: BatteryScenarioResult;
  /** Reasoning for this scenario */
  reasoning: string[];
}

/**
 * Analyze baseline operating level
 * Identifies typical operating level (not just mean, but actual typical usage pattern)
 */
export function analyzeBaseline(loadProfile: LoadProfile): BaselineAnalysis {
  const intervals = loadProfile.intervals;
  if (intervals.length === 0) {
    return {
      typicalOperatingKw: 0,
      baselineKw: 0,
      meanKw: 0,
      medianKw: 0,
      stdDevKw: 0,
      baselinePercentage: 0,
      reasoning: ['No data available'],
    };
  }

  const demands = intervals.map(i => i.kw).filter(d => Number.isFinite(d) && d >= 0);
  if (demands.length === 0) {
    return {
      typicalOperatingKw: 0,
      baselineKw: 0,
      meanKw: 0,
      medianKw: 0,
      stdDevKw: 0,
      baselinePercentage: 0,
      reasoning: ['No valid demand data'],
    };
  }

  // Calculate statistics
  const sorted = [...demands].sort((a, b) => a - b);
  const mean = demands.reduce((a, b) => a + b, 0) / demands.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = demands.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / demands.length;
  const stdDev = Math.sqrt(variance);

  // Find most common operating level (mode) by binning
  // Use 5 kW bins to find typical operating range
  const binSize = 5;
  const bins: Record<number, number> = {};
  demands.forEach(d => {
    const bin = Math.round(d / binSize) * binSize;
    bins[bin] = (bins[bin] || 0) + 1;
  });

  const mostCommonBin = Object.entries(bins).reduce((max, [bin, count]) => {
    return count > max[1] ? [Number(bin), count] : max;
  }, [0, 0]);

  // Typical operating level is the most common bin, or median if no clear mode
  const typicalOperatingKw = mostCommonBin[1] > demands.length * 0.1 
    ? mostCommonBin[0] 
    : median;

  // Baseline is typical operating level + small buffer (10% or 10 kW, whichever is smaller)
  const baselineKw = typicalOperatingKw + Math.min(typicalOperatingKw * 0.1, 10);

  // Calculate percentage of time at baseline
  const baselineCount = demands.filter(d => Math.abs(d - typicalOperatingKw) <= binSize).length;
  const baselinePercentage = (baselineCount / demands.length) * 100;

  const reasoning: string[] = [];
  reasoning.push(`Mean demand: ${mean.toFixed(1)} kW`);
  reasoning.push(`Median demand: ${median.toFixed(1)} kW`);
  reasoning.push(`Typical operating level: ${typicalOperatingKw.toFixed(1)} kW (${baselinePercentage.toFixed(1)}% of time)`);
  reasoning.push(`Baseline threshold: ${baselineKw.toFixed(1)} kW (for spike detection)`);
  reasoning.push(`Standard deviation: ${stdDev.toFixed(1)} kW`);

  return {
    typicalOperatingKw,
    baselineKw,
    meanKw: mean,
    medianKw: median,
    stdDevKw: stdDev,
    baselinePercentage,
    reasoning,
  };
}

/**
 * Automatically detect all significant spikes in the load profile
 * Uses baseline analysis to identify peaks above typical operating level
 */
export function detectAllSpikes(
  loadProfile: LoadProfile,
  baselineAnalysis?: BaselineAnalysis,
  options?: {
    /** Minimum spike duration in hours (default: 0.25 = 15 min) */
    minDurationHours?: number;
    /** Minimum absolute kW above baseline (default: 15) */
    minAbsoluteKw?: number;
    /** Minimum spike magnitude as % above baseline (default: 0.20 = 20%) */
    minMagnitudePercent?: number;
  }
): DetectedSpike[] {
  const intervals = loadProfile.intervals;
  if (intervals.length === 0) return [];

  // Get baseline analysis if not provided
  const baseline = baselineAnalysis || analyzeBaseline(loadProfile);
  if (baseline.baselineKw === 0) return [];

  const opts = {
    minDurationHours: options?.minDurationHours ?? 0.25,
    minAbsoluteKw: options?.minAbsoluteKw ?? 15,
    minMagnitudePercent: options?.minMagnitudePercent ?? 0.20,
  };

  // Calculate minimum spike threshold relative to baseline
  const minSpikeKw = Math.max(
    baseline.baselineKw + opts.minAbsoluteKw,
    baseline.baselineKw * (1 + opts.minMagnitudePercent)
  );

  // Detect spike events
  const spikes: DetectedSpike[] = [];
  let currentSpike: {
    start: Date;
    end: Date;
    peakKw: number;
    sumKw: number;
    count: number;
    intervals: LoadInterval[];
  } | null = null;

  const intervalHours = 0.25; // 15-minute intervals

  for (const interval of intervals) {
    const demand = interval.kw;
    const isSpike = demand > minSpikeKw;

    if (isSpike) {
      if (!currentSpike) {
        currentSpike = {
          start: interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp),
          end: interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp),
          peakKw: demand,
          sumKw: demand,
          count: 1,
          intervals: [interval],
        };
      } else {
        currentSpike.end = interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp);
        currentSpike.peakKw = Math.max(currentSpike.peakKw, demand);
        currentSpike.sumKw += demand;
        currentSpike.count++;
        currentSpike.intervals.push(interval);
      }
    } else if (currentSpike) {
      // Spike ended - check if it meets minimum duration
      const durationHours = (currentSpike.end.getTime() - currentSpike.start.getTime()) / (1000 * 60 * 60);
      if (durationHours >= opts.minDurationHours) {
        const avgKw = currentSpike.sumKw / currentSpike.count;
        const excessEnergyKwh = currentSpike.intervals.reduce((sum, i) => {
          return sum + Math.max(0, i.kw - baseline.baselineKw) * intervalHours;
        }, 0);
        const severity = (currentSpike.peakKw - baseline.typicalOperatingKw) / baseline.stdDevKw;
        const excessKw = currentSpike.peakKw - baseline.typicalOperatingKw;

        spikes.push({
          start: currentSpike.start,
          end: currentSpike.end,
          peakKw: currentSpike.peakKw,
          avgKw,
          durationHours,
          excessEnergyKwh,
          baselineKw: baseline.baselineKw,
          severity,
          excessKw,
        });
      }
      currentSpike = null;
    }
  }

  // Handle spike that extends to end of data
  if (currentSpike) {
    const durationHours = (currentSpike.end.getTime() - currentSpike.start.getTime()) / (1000 * 60 * 60);
    if (durationHours >= opts.minDurationHours) {
      const avgKw = currentSpike.sumKw / currentSpike.count;
      const excessEnergyKwh = currentSpike.intervals.reduce((sum, i) => {
        return sum + Math.max(0, i.kw - baseline.baselineKw) * intervalHours;
      }, 0);
      const severity = (currentSpike.peakKw - baseline.typicalOperatingKw) / baseline.stdDevKw;
      const excessKw = currentSpike.peakKw - baseline.typicalOperatingKw;

      spikes.push({
        start: currentSpike.start,
        end: currentSpike.end,
        peakKw: currentSpike.peakKw,
        avgKw,
        durationHours,
        excessEnergyKwh,
        baselineKw: baseline.baselineKw,
        severity,
        excessKw,
      });
    }
  }

  return spikes.sort((a, b) => b.peakKw - a.peakKw); // Sort by peak magnitude
}

/**
 * Create combined battery spec from multiple units
 */
function createCombinedBatterySpec(
  components: Array<{ catalogBattery: CatalogBatteryRow; quantity: number }>
): BatterySpec {
  let totalCapacity = 0;
  let totalPower = 0;
  let weightedEfficiency = 0;
  let totalWeight = 0;
  
  for (const { catalogBattery, quantity } of components) {
    const capacity = catalogBattery.capacityKwh * quantity;
    const power = catalogBattery.powerKw * quantity;
    const efficiency = catalogBattery.efficiency;
    
    totalCapacity += capacity;
    totalPower += power;
    weightedEfficiency += efficiency * capacity; // Weight by capacity
    totalWeight += capacity;
  }
  
  const avgEfficiency = totalWeight > 0 ? weightedEfficiency / totalWeight : 0.90;
  
  return {
    capacity_kwh: totalCapacity,
    max_power_kw: totalPower,
    round_trip_efficiency: avgEfficiency,
    degradation_rate: 0.02,
    min_soc: 0.10,
    max_soc: 0.90,
    depth_of_discharge: 0.90,
  };
}

/**
 * Calculate required capacity based on spikes
 */
function calculateRequiredCapacity(
  spikes: DetectedSpike[],
  excessKw: number,
  baselineKw: number
): number {
  if (spikes.length === 0) return excessKw * 2; // 2-hour duration assumption
  
  // Find worst-case spike
  const worstSpike = spikes.reduce((worst, current) => 
    current.excessKw > worst.excessKw ? current : worst
  );
  
  // Calculate energy needed: excess kW × duration × safety factor
  const worstCaseEnergy = worstSpike.excessKw * worstSpike.durationHours * 1.2; // 20% buffer
  
  // Account for multiple spikes per day
  const spikesPerDay = Math.max(
    ...Object.values(
      spikes.reduce((acc, spike) => {
        const dayKey = spike.start.toISOString().slice(0, 10);
        acc[dayKey] = (acc[dayKey] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
  );
  
  return worstCaseEnergy * Math.max(1, spikesPerDay - 1) * 1.1; // Extra 10% for recharge between spikes
}

/**
 * Generate battery configurations to test
 * Tests: single batteries (1x, 2x, 3x...), and combinations
 */
function generateBatteryConfigurations(
  batteryCatalog: CatalogBatteryRow[],
  requiredPowerKw: number,
  requiredCapacityKwh: number,
  maxUnits: number = 10
): BatteryConfiguration[] {
  const configs: BatteryConfiguration[] = [];
  
  // Strategy 1: Single battery model, multiple quantities
  for (const battery of batteryCatalog) {
    if (!battery.active) continue;
    
    // Calculate minimum quantity needed
    const minQtyForPower = Math.ceil(requiredPowerKw / battery.powerKw);
    const minQtyForCapacity = Math.ceil(requiredCapacityKwh / battery.capacityKwh);
    const minQty = Math.max(minQtyForPower, minQtyForCapacity, 1);
    
    // Test from minimum up to maxUnits
    for (let qty = minQty; qty <= Math.min(maxUnits, minQty + 5); qty++) {
      const unitCost = qty >= 50 ? battery.price50Plus :
                      qty >= 21 ? battery.price21_50 :
                      qty >= 11 ? battery.price11_20 :
                      battery.price1_10;
      
      const combinedBattery = createCombinedBatterySpec([{ catalogBattery: battery, quantity: qty }]);
      
      configs.push({
        components: [{
          modelName: battery.modelName,
          manufacturer: battery.manufacturer,
          quantity: qty,
          unitCost,
        }],
        combinedBattery,
        totalCost: unitCost * qty,
        totalPowerKw: battery.powerKw * qty,
        totalCapacityKwh: battery.capacityKwh * qty,
        description: qty === 1 ? battery.modelName : `${qty}× ${battery.modelName}`,
      });
    }
  }
  
  // Strategy 2: Two-battery combinations (for up to 3 combinations per pair)
  // This helps find cost-effective mixed solutions
  for (let i = 0; i < batteryCatalog.length && i < 5; i++) {
    for (let j = i + 1; j < batteryCatalog.length && j < 5; j++) {
      const bat1 = batteryCatalog[i];
      const bat2 = batteryCatalog[j];
      if (!bat1.active || !bat2.active) continue;
      
      // Test a few quantity combinations
      for (let qty1 = 1; qty1 <= 3; qty1++) {
        for (let qty2 = 1; qty2 <= 3; qty2++) {
          if (qty1 + qty2 > maxUnits) continue;
          
          const totalPower = (bat1.powerKw * qty1) + (bat2.powerKw * qty2);
          const totalCapacity = (bat1.capacityKwh * qty1) + (bat2.capacityKwh * qty2);
          
          // Only test if it meets minimum requirements
          if (totalPower < requiredPowerKw * 0.8 || totalCapacity < requiredCapacityKwh * 0.8) continue;
          
          const cost1 = qty1 >= 11 ? bat1.price11_20 : bat1.price1_10;
          const cost2 = qty2 >= 11 ? bat2.price11_20 : bat2.price1_10;
          
          const combinedBattery = createCombinedBatterySpec([
            { catalogBattery: bat1, quantity: qty1 },
            { catalogBattery: bat2, quantity: qty2 },
          ]);
          
          configs.push({
            components: [
              { modelName: bat1.modelName, manufacturer: bat1.manufacturer, quantity: qty1, unitCost: cost1 },
              { modelName: bat2.modelName, manufacturer: bat2.manufacturer, quantity: qty2, unitCost: cost2 },
            ],
            combinedBattery,
            totalCost: (cost1 * qty1) + (cost2 * qty2),
            totalPowerKw: totalPower,
            totalCapacityKwh: totalCapacity,
            description: `${qty1}× ${bat1.modelName} + ${qty2}× ${bat2.modelName}`,
          });
        }
      }
    }
  }
  
  // Sort by cost (cheapest first)
  return configs.sort((a, b) => a.totalCost - b.totalCost);
}

/**
 * Generate scenarios based on baseline and spikes
 * Creates scenarios that make sense: shave excess above baseline
 */
function generateBaselineBasedScenarios(
  loadProfile: LoadProfile,
  spikes: DetectedSpike[],
  baseline: BaselineAnalysis
): ShavingScenario[] {
  const scenarios: ShavingScenario[] = [];
  const demands = loadProfile.intervals.map(i => i.kw).filter(d => Number.isFinite(d) && d >= 0);
  const maxPeak = Math.max(...demands);
  
  if (spikes.length === 0) {
    // No spikes - create one scenario to shave to baseline
    const excessKw = maxPeak - baseline.typicalOperatingKw;
    if (excessKw > 10) { // Only if there's meaningful excess
      scenarios.push({
        targetCapKw: baseline.typicalOperatingKw,
        originalPeakKw: maxPeak,
        excessAboveBaselineKw: excessKw,
        baselineKw: baseline.typicalOperatingKw,
        requiredPowerKw: excessKw * 1.1, // 10% safety margin
        requiredCapacityKwh: excessKw * 2, // Assume 2-hour duration
        batteryResults: [],
        bestConfiguration: undefined,
        reasoning: [
          `Shave all excess above baseline (${excessKw.toFixed(1)} kW above ${baseline.typicalOperatingKw.toFixed(1)} kW)`,
          `Target: Cap demand at baseline operating level`,
        ],
      });
    }
    return scenarios;
  }
  
  // Scenario 1: Shave to baseline (most aggressive - shave ALL excess)
  const maxExcess = Math.max(...spikes.map(s => s.excessKw));
  if (maxExcess > 10) {
    const requiredCapacity = calculateRequiredCapacity(spikes, maxExcess, baseline.typicalOperatingKw);
    scenarios.push({
      targetCapKw: baseline.typicalOperatingKw,
      originalPeakKw: baseline.typicalOperatingKw + maxExcess,
      excessAboveBaselineKw: maxExcess,
      baselineKw: baseline.typicalOperatingKw,
      requiredPowerKw: maxExcess * 1.1,
      requiredCapacityKwh: requiredCapacity,
      batteryResults: [],
      bestConfiguration: undefined,
      reasoning: [
        `Most aggressive: Shave all ${maxExcess.toFixed(1)} kW above baseline`,
        `Target: Cap at baseline (${baseline.typicalOperatingKw.toFixed(1)} kW)`,
        `Requires: ${(maxExcess * 1.1).toFixed(0)} kW power, ${requiredCapacity.toFixed(0)} kWh capacity`,
      ],
    });
  }
  
  // Scenario 2: Shave 50% of excess (moderate)
  const moderateExcess = maxExcess * 0.5;
  if (moderateExcess > 10) {
    const targetCap = baseline.typicalOperatingKw + moderateExcess;
    const requiredCapacity = calculateRequiredCapacity(
      spikes.filter(s => s.excessKw > moderateExcess),
      moderateExcess,
      baseline.typicalOperatingKw
    );
    scenarios.push({
      targetCapKw: Math.round(targetCap),
      originalPeakKw: baseline.typicalOperatingKw + maxExcess,
      excessAboveBaselineKw: moderateExcess,
      baselineKw: baseline.typicalOperatingKw,
      requiredPowerKw: moderateExcess * 1.1,
      requiredCapacityKwh: requiredCapacity,
      batteryResults: [],
      bestConfiguration: undefined,
      reasoning: [
        `Moderate: Shave ${moderateExcess.toFixed(1)} kW (50% of excess)`,
        `Target: Cap at ${targetCap.toFixed(0)} kW (baseline + 50% of excess)`,
        `Requires: ${(moderateExcess * 1.1).toFixed(0)} kW power, ${requiredCapacity.toFixed(0)} kWh capacity`,
      ],
    });
  }
  
  // Scenario 3: Shave 75% of excess (aggressive but not full)
  const aggressiveExcess = maxExcess * 0.75;
  if (aggressiveExcess > 10 && aggressiveExcess !== moderateExcess) {
    const targetCap = baseline.typicalOperatingKw + (maxExcess * 0.25);
    const requiredCapacity = calculateRequiredCapacity(
      spikes.filter(s => s.excessKw > maxExcess * 0.25),
      aggressiveExcess,
      baseline.typicalOperatingKw
    );
    scenarios.push({
      targetCapKw: Math.round(targetCap),
      originalPeakKw: baseline.typicalOperatingKw + maxExcess,
      excessAboveBaselineKw: aggressiveExcess,
      baselineKw: baseline.typicalOperatingKw,
      requiredPowerKw: aggressiveExcess * 1.1,
      requiredCapacityKwh: requiredCapacity,
      batteryResults: [],
      bestConfiguration: undefined,
      reasoning: [
        `Aggressive: Shave ${aggressiveExcess.toFixed(1)} kW (75% of excess)`,
        `Target: Cap at ${targetCap.toFixed(0)} kW`,
        `Requires: ${(aggressiveExcess * 1.1).toFixed(0)} kW power, ${requiredCapacity.toFixed(0)} kWh capacity`,
      ],
    });
  }
  
  return scenarios;
}

/**
 * Analyze scenario with multiple battery configurations
 */
async function analyzeScenarioWithConfigurations(
  scenario: ShavingScenario,
  loadProfile: LoadProfile,
  options?: {
    demandRate?: number;
    financialParams?: FinancialParameters;
    batteryCatalogPath?: string;
  }
): Promise<ShavingScenario> {
  const opts = {
    demandRate: options?.demandRate ?? 20,
    financialParams: options?.financialParams ?? {
      discountRate: 0.06,
      inflationRate: 0.02,
      analysisPeriod: 15,
    },
    batteryCatalogPath: options?.batteryCatalogPath ?? 'data/battery-catalog.csv',
  };

  // Load battery catalog
  let batteryCatalog: CatalogBatteryRow[] = [];
  try {
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        const response = await fetch('/api/library/batteries');
        if (response.ok) {
          const apiData = await response.json();
          const apiBatteries = apiData.batteries || apiData;
          batteryCatalog = (Array.isArray(apiBatteries) ? apiBatteries : []).map((b: any) => {
            let efficiency = b.efficiency || 0.90;
            if (efficiency > 1) efficiency = efficiency / 100;
            return {
              modelName: b.modelName,
              manufacturer: b.manufacturer,
              capacityKwh: b.capacityKwh,
              powerKw: b.powerKw,
              cRate: b.cRate || (b.powerKw / b.capacityKwh),
              efficiency,
              warrantyYears: b.warrantyYears || 10,
              price1_10: b.price1_10 || 0,
              price11_20: b.price11_20 || b.price1_10 || 0,
              price21_50: b.price21_50 || b.price1_10 || 0,
              price50Plus: b.price50Plus || b.price1_10 || 0,
              active: b.active !== false,
            };
          });
        } else {
          throw new Error('API failed');
        }
      } catch (apiError) {
        const csvResponse = await fetch('/battery-catalog.csv');
        if (csvResponse.ok) {
          const csvText = await csvResponse.text();
          batteryCatalog = parseCsvInBrowser(csvText);
        } else {
          throw new Error('Could not load battery catalog');
        }
      }
    } else {
      batteryCatalog = loadBatteryCatalog(opts.batteryCatalogPath);
    }
  } catch (error) {
    console.error('Could not load battery catalog:', error);
    return scenario;
  }

  if (batteryCatalog.length === 0) {
    console.warn('Battery catalog is empty');
    return scenario;
  }

  // Generate configurations to test
  const configurations = generateBatteryConfigurations(
    batteryCatalog,
    scenario.requiredPowerKw,
    scenario.requiredCapacityKwh,
    10 // Max 10 units total
  );

  console.log(`Testing ${configurations.length} battery configurations for scenario: ${scenario.targetCapKw} kW cap`);

  const batteryResults: BatteryScenarioResult[] = [];

  // Test each configuration
  for (const config of configurations) {
    const result = simulateCapEnforcement(loadProfile, config.combinedBattery, scenario.targetCapKw);
    
    const peakReductionKw = result.originalPeakKw - result.newPeakKw;
    const minSOC = result.socHistory.length > 0 ? Math.min(...result.socHistory) : 1.0;
    
    // Calculate annual savings
    const yearlySavings: number[] = [];
    for (let year = 0; year < opts.financialParams.analysisPeriod; year++) {
      const degradationFactor = Math.pow(0.98, year);
      const annualSavings = peakReductionKw > 0
        ? peakReductionKw * degradationFactor * opts.demandRate * 12
        : 0;
      yearlySavings.push(annualSavings);
    }

    const financialAnalysis = calculateFinancialAnalysis(
      config.totalCost,
      yearlySavings,
      opts.financialParams
    );

    // Calculate viability score
    let viabilityScore = 0;
    if (result.feasible) {
      if (financialAnalysis.simplePayback <= 5) viabilityScore += 40;
      else if (financialAnalysis.simplePayback <= 10) viabilityScore += 30;
      else if (financialAnalysis.simplePayback <= 15) viabilityScore += 20;
      else viabilityScore += 10;

      const roi = (financialAnalysis.totalSavings / config.totalCost) * 100;
      if (roi > 200) viabilityScore += 30;
      else if (roi > 100) viabilityScore += 20;
      else if (roi > 50) viabilityScore += 10;

      if (financialAnalysis.netPresentValue > config.totalCost) viabilityScore += 30;
      else if (financialAnalysis.netPresentValue > 0) viabilityScore += 20;
      else viabilityScore += 10;
    } else if (peakReductionKw > 0) {
      // Partial success - give some points
      viabilityScore = Math.min(30, (peakReductionKw / scenario.excessAboveBaselineKw) * 30);
    }

    let recommendation: 'recommended' | 'marginal' | 'not_recommended' = 'not_recommended';
    if (result.feasible) {
      if (financialAnalysis.simplePayback <= 7 && financialAnalysis.netPresentValue > 0) {
        recommendation = 'recommended';
      } else if (financialAnalysis.simplePayback <= 12) {
        recommendation = 'marginal';
      }
    }

    batteryResults.push({
      configuration: config,
      feasible: result.feasible,
      newPeakKw: result.newPeakKw,
      peakReductionKw,
      energyDischargedKwh: result.energyDischargedKwh,
      minSOC,
      failureReason: result.feasible
        ? undefined
        : result.firstViolation
          ? `Insufficient power/capacity at ${result.firstViolation.timestamp.toISOString()}`
          : 'Unknown failure',
      estimatedAnnualSavings: yearlySavings[0],
      paybackYears: financialAnalysis.simplePayback,
      roi: (financialAnalysis.totalSavings / config.totalCost) * 100,
      npv: financialAnalysis.netPresentValue,
      viabilityScore,
      recommendation,
    });
  }

  // Find best configuration
  const feasibleConfigs = batteryResults.filter(r => r.feasible);
  let bestConfig: BatteryScenarioResult | undefined;
  
  if (feasibleConfigs.length > 0) {
    bestConfig = feasibleConfigs.reduce((best, current) => {
      if (current.viabilityScore! > best.viabilityScore!) return current;
      if (current.viabilityScore === best.viabilityScore && 
          (current.npv || 0) > (best.npv || 0)) return current;
      return best;
    });
  } else if (batteryResults.length > 0) {
    // Best attempt even if not feasible
    bestConfig = batteryResults.reduce((best, current) => {
      if (current.peakReductionKw > best.peakReductionKw) return current;
      if (current.peakReductionKw === best.peakReductionKw && 
          current.configuration.totalCost < best.configuration.totalCost) return current;
      return best;
    });
  }

  return {
    ...scenario,
    batteryResults,
    bestConfiguration: bestConfig,
  };
}

/**
 * Main holistic analysis function
 */
export async function performHolisticAnalysis(
  loadProfile: LoadProfile,
  options?: {
    demandRate?: number;
    financialParams?: FinancialParameters;
    batteryCatalogPath?: string;
    maxPaybackYears?: number;
  }
): Promise<{
  baseline: BaselineAnalysis;
  spikes: DetectedSpike[];
  scenarios: ShavingScenario[];
  recommendations: {
    bestScenario?: ShavingScenario;
    viableScenarios: ShavingScenario[];
    marginalScenarios: ShavingScenario[];
    notRecommended: ShavingScenario[];
    summary: string[];
  };
}> {
  // Step 1: Analyze baseline
  const baseline = analyzeBaseline(loadProfile);

  // Step 2: Detect spikes and calculate excess above baseline
  const spikes = detectAllSpikes(loadProfile, baseline);

  // Step 3: Generate scenarios based on baseline + excess
  const scenarios = generateBaselineBasedScenarios(loadProfile, spikes, baseline);

  // Step 4: Analyze each scenario with multiple configurations
  const analyzedScenarios = await Promise.all(
    scenarios.map(scenario => analyzeScenarioWithConfigurations(scenario, loadProfile, options))
  );

  // Step 5: Categorize
  const recommendations = categorizeScenarios(analyzedScenarios, options);

  return {
    baseline,
    spikes,
    scenarios: analyzedScenarios,
    recommendations,
  };
}

/**
 * Categorize scenarios by economic viability
 */
function categorizeScenarios(
  scenarios: ShavingScenario[],
  options?: {
    maxPaybackYears?: number;
  }
): {
  bestScenario?: ShavingScenario;
  viableScenarios: ShavingScenario[];
  marginalScenarios: ShavingScenario[];
  notRecommended: ShavingScenario[];
  summary: string[];
} {
  const maxPayback = options?.maxPaybackYears ?? 10;

  const viable: ShavingScenario[] = [];
  const marginal: ShavingScenario[] = [];
  const notRecommended: ShavingScenario[] = [];

  for (const scenario of scenarios) {
    if (!scenario.bestConfiguration) {
      notRecommended.push(scenario);
      continue;
    }

    const config = scenario.bestConfiguration;
    if (config.recommendation === 'recommended') {
      viable.push(scenario);
    } else if (config.recommendation === 'marginal') {
      marginal.push(scenario);
    } else {
      notRecommended.push(scenario);
    }
  }

  // Find best overall scenario (highest viability score)
  const bestScenario = [...viable, ...marginal]
    .filter(s => s.bestConfiguration)
    .sort((a, b) => (b.bestConfiguration!.viabilityScore || 0) - (a.bestConfiguration!.viabilityScore || 0))[0];

  // Generate summary
  const summary: string[] = [];
  summary.push(`Analyzed ${scenarios.length} shaving scenarios`);
  summary.push(`${viable.length} economically viable (payback ≤ ${maxPayback} years)`);
  summary.push(`${marginal.length} marginal (payback ${maxPayback}-15 years)`);
  summary.push(`${notRecommended.length} not recommended (payback > 15 years or infeasible)`);
  
  if (bestScenario && bestScenario.bestConfiguration) {
    const b = bestScenario.bestConfiguration;
    summary.push(`Best scenario: Shave to ${bestScenario.targetCapKw} kW using ${b.configuration.description}`);
    summary.push(`  Cost: $${b.configuration.totalCost.toLocaleString()}, Payback: ${b.paybackYears?.toFixed(1)} years, NPV: $${b.npv?.toLocaleString()}`);
  }

  return {
    bestScenario,
    viableScenarios: viable,
    marginalScenarios: marginal,
    notRecommended,
    summary,
  };
}
