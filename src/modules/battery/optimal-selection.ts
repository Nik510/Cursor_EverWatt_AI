/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║               EVERWATT OPTIMAL BATTERY SELECTION ALGORITHM                    ║
 * ║                                                                               ║
 * ║   A PHYSICS-FIRST approach to battery sizing and selection.                   ║
 * ║   This module is ISOLATED and INDEPENDENT - designed for iterative tweaking.  ║
 * ║                                                                               ║
 * ║   Philosophy:                                                                 ║
 * ║   A battery must FIRST be CAPABLE of shaving peaks,                           ║
 * ║   THEN we optimize for cost. Never recommend a battery that can't do the job. ║
 * ║                                                                               ║
 * ║   3-Stage Selection Process:                                                  ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────┐ ║
 * ║   │ STAGE 1: PHYSICAL REQUIREMENTS                                         │ ║
 * ║   │          Analyze load profile → determine minimum specs                │ ║
 * ║   ├─────────────────────────────────────────────────────────────────────────┤ ║
 * ║   │ STAGE 2: VALIDATION                                                    │ ║
 * ║   │          Simulate each candidate → verify ≥80% target achievement      │ ║
 * ║   ├─────────────────────────────────────────────────────────────────────────┤ ║
 * ║   │ STAGE 3: OPTIMIZATION                                                  │ ║
 * ║   │          Score validated candidates by value delivered                 │ ║
 * ║   └─────────────────────────────────────────────────────────────────────────┘ ║
 * ║                                                                               ║
 * ║   Author: EverWatt AI Engine                                                  ║
 * ║   Version: 1.0.0                                                              ║
 * ║   Last Updated: 2024                                                          ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { LoadProfile, BatterySpec } from './types';
import { detectPeakEvents, simulateCapEnforcement, simulatePeakShaving } from './logic';

// ============================================================================
// CONFIGURATION - TWEAK THESE VALUES TO ADJUST ALGORITHM BEHAVIOR
// ============================================================================

/**
 * Algorithm Configuration Constants
 * 
 * These are the "knobs" you can turn to adjust the algorithm's behavior.
 * Each has a clear purpose and recommended range.
 */
export const ALGORITHM_CONFIG = {
  // === STAGE 1: LOAD ANALYSIS ===
  
  /** 
   * Percentile for identifying "peak" demand intervals (0.0 - 1.0)
   * Higher = more aggressive (only extreme peaks count)
   * Default: 0.95 (top 5% of demand intervals)
   */
  PEAK_PERCENTILE: 0.95,
  
  /**
   * Default target reduction as percentage of original peak (0 - 50)
   * This is overridden if user specifies a target
   * Default: 10 (reduce peak by 10%)
   */
  DEFAULT_TARGET_REDUCTION_PERCENT: 10,
  
  /**
   * Minimum duration assumption for peak events (hours)
   * Used when peak events can't be detected from data
   * Default: 1.0 hour
   */
  MIN_PEAK_DURATION_HOURS: 1.0,
  
  /**
   * Safety buffer multiplier for energy sizing
   * Accounts for degradation, temperature, and inefficiency
   * Default: 1.2 (20% buffer)
   */
  ENERGY_SAFETY_BUFFER: 1.2,
  
  /**
   * Minimum battery duration in hours (industry standard)
   * Batteries shorter than this are impractical for peak shaving
   * Default: 2.0 hours
   */
  MIN_BATTERY_DURATION_HOURS: 2.0,
  
  // === STAGE 2: VALIDATION ===
  
  /**
   * Minimum achievement percentage to pass validation (0 - 100)
   * Batteries must achieve at least this % of target reduction
   * Default: 80 (must achieve 80% of target)
   */
  MIN_ACHIEVEMENT_PERCENT: 80,
  
  /**
   * Maximum units allowed in a single recommendation
   * More units = more complex installation
   * Default: 10
   */
  MAX_UNITS_PER_RECOMMENDATION: 10,
  
  /**
   * Tolerance for meeting power/energy requirements (0.0 - 1.0)
   * 0.95 means 95% of requirement is acceptable
   * Default: 0.95
   */
  REQUIREMENT_TOLERANCE: 0.95,
  
  // === STAGE 3: SCORING ===
  
  /**
   * Weight for achievement score (0.0 - 1.0)
   * How much we value actually hitting the target
   * Default: 0.40 (40%)
   */
  WEIGHT_ACHIEVEMENT: 0.40,
  
  /**
   * Weight for cost efficiency score (0.0 - 1.0)
   * How much we value getting more reduction per dollar
   * Default: 0.35 (35%)
   */
  WEIGHT_COST_EFFICIENCY: 0.35,
  
  /**
   * Weight for durability score (0.0 - 1.0)
   * How much we value efficiency and warranty
   * Default: 0.25 (25%)
   */
  WEIGHT_DURABILITY: 0.25,
  
  /**
   * Reference efficiency for durability scoring (0.0 - 1.0)
   * Batteries at or below this efficiency get 0 bonus
   * Default: 0.85 (85%)
   */
  REFERENCE_EFFICIENCY: 0.85,
  
  /**
   * Reference warranty years for durability scoring
   * Batteries with this warranty get maximum warranty bonus
   * Default: 15 years
   */
  REFERENCE_WARRANTY_YEARS: 15,
  
  /**
   * Number of top candidates to return
   * Default: 3
   */
  TOP_CANDIDATES_COUNT: 3,
  
  // === MARGINAL ANALYSIS (NEW) ===
  
  /**
   * Enable marginal analysis mode
   * When true, uses incremental payback logic instead of fixed target
   * Default: true
   */
  USE_MARGINAL_ANALYSIS: true,
  
  /**
   * Maximum acceptable payback for each INCREMENTAL battery (years)
   * If adding one more battery has payback > this, STOP adding
   * Recommended: 7-10 years for California with SGIP incentives
   * Default: 10 years
   */
  MAX_INCREMENTAL_PAYBACK_YEARS: 15,
  
  /**
   * Minimum incremental savings to justify another battery ($/year)
   * Prevents adding batteries that barely move the needle
   * Default: 500 (battery must save at least $500/yr more)
   */
  MIN_INCREMENTAL_SAVINGS_ANNUAL: 500,
  
  /**
   * Efficiency ratio threshold for "elbow point" detection
   * Stop if new battery does less than this fraction of first battery's work
   * Example: 0.20 = stop if Battery N saves < 20% of what Battery 1 saved
   * Default: 0.15 (15%)
   */
  ELBOW_EFFICIENCY_RATIO: 0.15,
  
  /**
   * Minimum incremental peak shave (kW) required to justify another battery
   * Prevents adding batteries that add negligible kW reduction
   * Default: 3 kW (set to 0 to disable)
   */
  MIN_INCREMENTAL_SHAVE_KW: 0,
  
  /**
   * Maximum batteries to evaluate per model in marginal analysis
   * Prevents infinite loops
   * Default: 20
   */
  MAX_MARGINAL_ITERATIONS: 20,

  // === BILLING-CAP DISCOVERY (NEW - demand-charge correct) ===
  /**
   * Lower bound percentile for cap search within a month.
   * Uses a "baseload proxy" (below this is generally infeasible to hold).
   * Default: 0.20 (20th percentile).
   */
  CAP_SEARCH_LOWER_PERCENTILE: 0.20,
  /**
   * Stop binary search when hi-lo is below this (kW).
   * Default: 1.0 kW.
   */
  CAP_SEARCH_EPS_KW: 1.0,
  /**
   * Max iterations for cap binary search per month.
   * Default: 20 (enough to converge even on large ranges).
   */
  CAP_SEARCH_MAX_ITER: 20,
  /**
   * Charging safety margin as fraction of cap.
   * Charging will only occur when demand <= cap - max(10kW, cap*marginFrac).
   * Default: 0.05 (5% of cap).
   */
  CAP_CHARGE_MARGIN_FRAC: 0.05,
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Catalog battery entry (from database/catalog)
 */
export interface CatalogBattery {
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
}

/**
 * Peak profile analysis result
 */
export interface PeakProfile {
  /** Maximum demand observed (kW) */
  originalPeakKw: number;
  
  /** Average of top percentile demand intervals (kW) */
  avgPeakKw: number;
  
  /** Duration of longest single peak event (hours) */
  longestEventHours: number;
  
  /** Energy needed for longest peak event (kWh) */
  longestEventEnergyKwh: number;
  
  /** 95th percentile event energy - robust sizing (kWh) */
  p95EventEnergyKwh: number;
  
  /** Maximum peak events observed in a single day */
  peakEventsPerDay: number;
  
  /** Total energy needed per day for all peak events (kWh) */
  dailyPeakEnergyKwh: number;
  
  /** Total number of peak events detected */
  totalPeakEvents: number;
  
  /** Interval duration in the data (hours) */
  intervalHours: number;
}

/**
 * Minimum battery requirements derived from peak profile
 */
export interface BatteryRequirements {
  /** Minimum inverter power needed (kW) */
  minPowerKw: number;
  
  /** Minimum battery capacity needed (kWh) */
  minEnergyKwh: number;
  
  /** Target peak reduction (kW) */
  targetReductionKw: number;
  
  /** Target peak threshold after shaving (kW) */
  targetThresholdKw: number;
  
  /** Analysis metadata */
  analysisNotes: string[];
}

export type PricingTier = '1-10' | '11-20' | '21-50' | '50+';

export type PortfolioUnit = {
  battery: CatalogBattery;
  quantity: number;
};

export type PortfolioExplanation = {
  /** Human-readable one-line label (good for UI titles). */
  label: string;
  /** Portfolio composition. */
  units: Array<{
    modelName: string;
    manufacturer: string;
    quantity: number;
    unitPowerKw: number;
    unitCapacityKwh: number;
    unitEfficiency: number;
    unitPrice: number;
    lineCost: number;
  }>;
  /** Pricing tier (portfolio-wide). */
  pricingTier: PricingTier;
  totalUnits: number;
  totalPowerKw: number;
  totalCapacityKwh: number;
  roundTripEfficiency: number;
  thresholdKw: number;
  peakReductionKw: number;
  annualDemandSavings: number;
  systemCost: number;
  annualizedCapex: number;
  objectiveValue: number;
  paybackYears: number;
  /** Short explanation of why it won. */
  why: string[];
};

/**
 * Portfolio candidate (mix-and-match across battery models).
 */
export interface PortfolioCandidate {
  portfolio: PortfolioUnit[];
  pricingTier: PricingTier;
  totalUnits: number;
  totalPowerKw: number;
  totalCapacityKwh: number;
  roundTripEfficiency: number;
  thresholdKw: number;
  peakReductionKw: number;
  annualSavings: number;
  systemCost: number;
  annualizedCapex: number;
  objectiveValue: number;
  paybackYears: number;
  selectionReason: string;
  explanation: PortfolioExplanation;
}

// ---------------------------------------------------------------------------
// Legacy candidate shape (kept for internal helpers; no longer used by the API)
// ---------------------------------------------------------------------------
interface ValidatedCandidate {
  battery: CatalogBattery;
  quantity: number;
  totalPowerKw: number;
  totalCapacityKwh: number;
  simulatedReductionKw: number;
  achievementPercent: number;
  annualSavings: number;
  systemCost: number;
  paybackYears: number;
  valueScore: number;
  scoreBreakdown: { achievementScore: number; efficiencyScore: number; durabilityScore: number };
  selectionReason: string;
}

/**
 * Complete algorithm result
 */
export interface SelectionResult {
  /** Whether algorithm succeeded */
  success: boolean;
  
  /** Peak profile analysis */
  peakProfile: PeakProfile;
  
  /** Calculated requirements */
  requirements: BatteryRequirements;
  
  /** Top portfolio candidates (sorted by objective value) */
  candidates: PortfolioCandidate[];
  
  /** Total batteries evaluated */
  batteriesEvaluated: number;
  
  /** Batteries that passed validation */
  batteriesPassed: number;
  
  /** Algorithm execution log */
  log: string[];
  
  /** Marginal analysis results (if enabled) */
  marginalAnalysis?: MarginalAnalysisResult[];
}

// ============================================================================
// MARGINAL ANALYSIS TYPES (NEW)
// ============================================================================

/**
 * Single step in the marginal analysis iteration
 * Represents the decision to add or not add one more battery
 */
export interface MarginalStep {
  /** Battery count after this step */
  quantity: number;
  
  /** Total peak reduction at this quantity (kW) */
  totalPeakReductionKw: number;

  /**
   * Total reduction in billing peaks across months (sum of monthly (peak_before - peak_after)).
   * Units: kW-month (i.e., "sum of monthly kW reductions").
   */
  totalPeakReductionKwMonthSum?: number;
  
  /** Peak reduction as percentage of original */
  peakReductionPercent: number;
  
  /** Total annual savings at this quantity ($) */
  totalAnnualSavings: number;
  
  /** INCREMENTAL savings from adding THIS battery ($) */
  incrementalSavings: number;
  
  /**
   * INCREMENTAL peak shave from adding THIS battery.
   * Units: kW-month (incremental improvement in sum of monthly billing peak reductions).
   */
  incrementalShaveKw: number;

  /** Same as incrementalShaveKw, explicit name for clarity (kW-month). */
  incrementalPeakReductionKwMonthSum?: number;
  
  /** INCREMENTAL payback for THIS specific battery (years) */
  incrementalPayback: number;
  
  /** Total system cost at this quantity ($) */
  totalSystemCost: number;
  
  /** Average payback for entire system (years) */
  averagePayback: number;
  
  /** Decision: was this battery worth adding? */
  decision: 'KEEP' | 'STOP_PAYBACK' | 'STOP_DIMINISHING' | 'STOP_NO_BENEFIT';
  
  /** Reason for the decision */
  reason: string;
}

/**
 * Complete marginal analysis result for one battery model
 */
export interface MarginalAnalysisResult {
  /** The battery model analyzed */
  battery: CatalogBattery;
  
  /** Original peak demand (kW) */
  originalPeakKw: number;

  /** Baseline kW (flat load estimate) used as shave threshold */
  baselineKw?: number;

  /**
   * Sum of original monthly billing peaks (kW-month). Helpful for normalizing reductions.
   */
  originalMonthlyPeakSumKw?: number;
  
  /** OPTIMAL number of units (where we stopped adding) */
  optimalQuantity: number;
  
  /** Peak reduction at optimal quantity (kW) */
  totalPeakReductionKw: number;

  /** Peak reduction across months (sum of monthly reductions), kW-month */
  annualPeakReductionKwMonthSum?: number;
  
  /** Peak reduction as percentage */
  totalPeakReductionPercent: number;
  
  /** Annual savings at optimal quantity ($) */
  totalAnnualSavings: number;
  
  /** System cost at optimal quantity ($) */
  totalSystemCost: number;
  
  /** Average payback at optimal quantity (years) */
  averagePayback: number;
  
  /** Total system power at optimal quantity (kW) */
  totalPowerKw: number;
  
  /** Total system capacity at optimal quantity (kWh) */
  totalCapacityKwh: number;
  
  /** Full history of each iteration step */
  steps: MarginalStep[];
  
  /** The "first battery" savings - used for elbow detection */
  firstBatterySavings: number;

  /** First battery peak reduction across months (kW-month). Used for elbow detection. */
  firstBatteryPeakReductionKwMonthSum?: number;
  
  /** Value score for ranking across models */
  valueScore: number;
  
  /** Why this quantity was chosen */
  stopReason: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate percentile value from an array
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor(p * (sorted.length - 1));
  return sorted[index] ?? 0;
}

function monthKey(timestamp: Date | string): string {
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (!Number.isFinite(year) || !Number.isFinite(month)) return 'unknown';
  return `${year}-${String(month).padStart(2, '0')}`;
}

function monthlyPeaks(intervals: LoadProfile['intervals']): Map<string, number> {
  const m = new Map<string, number>();
  for (const i of intervals) {
    const k = monthKey(i.timestamp);
    m.set(k, Math.max(m.get(k) ?? -Infinity, i.kw));
  }
  return m;
}

function monthlyPeaksFromSeries(intervals: LoadProfile['intervals'], kwSeries: number[]): Map<string, number> {
  const m = new Map<string, number>();
  const n = Math.min(intervals.length, kwSeries.length);
  for (let idx = 0; idx < n; idx++) {
    const k = monthKey(intervals[idx]?.timestamp);
    const v = kwSeries[idx] ?? 0;
    m.set(k, Math.max(m.get(k) ?? -Infinity, v));
  }
  return m;
}

function sumMonthlyPeakReductions(before: Map<string, number>, after: Map<string, number>): number {
  let sum = 0;
  for (const [k, peakBefore] of before.entries()) {
    const peakAfter = after.get(k) ?? peakBefore;
    sum += Math.max(0, peakBefore - peakAfter);
  }
  return sum;
}

function sumMapValues(m: Map<string, number>): number {
  let sum = 0;
  for (const v of m.values()) sum += v;
  return sum;
}

function splitLoadProfileByMonth(loadProfile: LoadProfile): Map<string, LoadProfile> {
  const m = new Map<string, LoadProfile['intervals']>();
  for (const i of loadProfile.intervals) {
    const k = monthKey(i.timestamp);
    const arr = m.get(k) ?? [];
    arr.push(i);
    m.set(k, arr);
  }
  const out = new Map<string, LoadProfile>();
  for (const [k, intervals] of m.entries()) out.set(k, { intervals });
  return out;
}

export type MonthlyCapDiscovery = {
  monthKey: string;
  peakBeforeKw: number;
  capKw: number; // minimum feasible cap
  peakAfterKw: number; // max after dispatch at that cap (<= cap)
  feasible: boolean;
};

/**
 * Find the minimum feasible cap for one calendar month via binary search.
 * Feasible means the cap enforcement simulation never breaches the cap for any interval.
 */
function findMinimumFeasibleCapForMonth(
  monthProfile: LoadProfile,
  batterySpec: BatterySpec
): { capKw: number; peakBeforeKw: number; peakAfterKw: number; feasible: boolean } {
  const demands = monthProfile.intervals.map(i => i.kw).filter(v => isFinite(v));
  const peakBeforeKw = demands.length > 0 ? Math.max(...demands) : 0;
  if (demands.length === 0) {
    return { capKw: 0, peakBeforeKw: 0, peakAfterKw: 0, feasible: false };
  }

  // Search bounds
  let lo = percentile(demands, ALGORITHM_CONFIG.CAP_SEARCH_LOWER_PERCENTILE);
  let hi = peakBeforeKw;

  // Ensure bounds are sane
  if (!isFinite(lo) || lo < 0) lo = 0;
  if (!isFinite(hi) || hi < lo) hi = lo;

  // Quick: if even hi isn't feasible (should be rare), fail out
  const hiRes = simulateCapEnforcement(monthProfile, batterySpec, hi, {
    chargeMarginKw: Math.max(10, hi * ALGORITHM_CONFIG.CAP_CHARGE_MARGIN_FRAC),
  });
  if (!hiRes.feasible) {
    return { capKw: hi, peakBeforeKw, peakAfterKw: hiRes.newPeakKw, feasible: false };
  }

  let bestCap = hi;
  let bestPeakAfter = hiRes.newPeakKw;

  for (let iter = 0; iter < ALGORITHM_CONFIG.CAP_SEARCH_MAX_ITER; iter++) {
    if (hi - lo <= ALGORITHM_CONFIG.CAP_SEARCH_EPS_KW) break;
    const mid = (lo + hi) / 2;
    const res = simulateCapEnforcement(monthProfile, batterySpec, mid, {
      chargeMarginKw: Math.max(10, mid * ALGORITHM_CONFIG.CAP_CHARGE_MARGIN_FRAC),
    });
    if (res.feasible) {
      bestCap = mid;
      bestPeakAfter = res.newPeakKw;
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return { capKw: bestCap, peakBeforeKw, peakAfterKw: bestPeakAfter, feasible: true };
}

/**
 * Compute per-month minimum feasible caps for a battery, and aggregate to an annualized savings metric.
 * This is demand-charge correct: monthly savings are driven by monthlyMaxBefore - monthlyMaxAfter.
 */
export function computeCapDiscoveryAcrossMonths(
  loadProfile: LoadProfile,
  batterySpec: BatterySpec,
  demandRate: number
): {
  monthsCount: number;
  annualizeFactor: number;
  perMonth: MonthlyCapDiscovery[];
  guaranteedCapKw: number;
  reductionKwMonthSum: number;
  annualSavings: number;
  peakAfterByMonth: Map<string, number>;
} {
  const peaksBefore = monthlyPeaks(loadProfile.intervals);
  const monthsCount = peaksBefore.size;
  const annualizeFactor = monthsCount > 0 ? 12 / monthsCount : 1;

  const monthProfiles = splitLoadProfileByMonth(loadProfile);
  const perMonth: MonthlyCapDiscovery[] = [];
  const peakAfterByMonth = new Map<string, number>();

  let guaranteedCapKw = 0;
  let reductionKwMonthSum = 0;

  for (const [mk, monthProfile] of monthProfiles.entries()) {
    const peakBeforeKw = peaksBefore.get(mk) ?? 0;
    const { capKw, peakAfterKw, feasible } = findMinimumFeasibleCapForMonth(monthProfile, batterySpec);
    const capFinal = feasible ? capKw : peakBeforeKw;
    const peakAfterFinal = feasible ? Math.min(capFinal, peakAfterKw) : peakBeforeKw;
    guaranteedCapKw = Math.max(guaranteedCapKw, capFinal);
    peakAfterByMonth.set(mk, peakAfterFinal);

    perMonth.push({
      monthKey: mk,
      peakBeforeKw,
      capKw: capFinal,
      peakAfterKw: peakAfterFinal,
      feasible,
    });
  }

  // Savings is based on the actual after-peak per month (cap discovery result), annualized
  for (const { monthKey: mk, peakBeforeKw } of perMonth) {
    const after = peakAfterByMonth.get(mk) ?? peakBeforeKw;
    reductionKwMonthSum += Math.max(0, peakBeforeKw - after);
  }

  const annualSavings = (reductionKwMonthSum * annualizeFactor) * demandRate;

  // Sort months for consistency
  perMonth.sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  return {
    monthsCount,
    annualizeFactor,
    perMonth,
    guaranteedCapKw,
    reductionKwMonthSum,
    annualSavings,
    peakAfterByMonth,
  };
}

/**
 * Calculate system cost based on quantity tiers
 */
function getPricingTier(totalUnits: number): PricingTier {
  if (totalUnits <= 10) return '1-10';
  if (totalUnits <= 20) return '11-20';
  if (totalUnits <= 50) return '21-50';
  return '50+';
}

function unitPriceForTier(battery: CatalogBattery, tier: PricingTier): number {
  if (tier === '50+') return battery.price50Plus;
  if (tier === '21-50') return battery.price21_50;
  if (tier === '11-20') return battery.price11_20;
  return battery.price1_10;
}

function calculateSystemCost(battery: CatalogBattery, quantity: number): number {
  // NOTE: single-model helper; tier buckets must match portfolio rules:
  // 1-10, 11-20, 21-50, 50+ (where "50+" means >50).
  if (quantity <= 0) return 0;
  const tier = getPricingTier(quantity);
  const unitPrice = unitPriceForTier(battery, tier);
  return unitPrice * quantity;
}

/**
 * Get the cost of adding ONE more battery unit
 * Accounts for price tier changes when crossing thresholds
 */
function getIncrementalCost(battery: CatalogBattery, currentQuantity: number): number {
  // Cost to go from currentQuantity to currentQuantity + 1
  const totalCostBefore = calculateSystemCost(battery, currentQuantity);
  const totalCostAfter = calculateSystemCost(battery, currentQuantity + 1);
  return totalCostAfter - totalCostBefore;
}

// ============================================================================
// MARGINAL ANALYSIS ALGORITHM (NEW)
// ============================================================================

/**
 * MARGINAL ANALYSIS: Find optimal quantity for a single battery model
 * 
 * This is the core of the "diminishing returns" logic:
 * - Iterate through quantities 1, 2, 3, ...
 * - For each, simulate peak shaving and calculate savings
 * - Calculate INCREMENTAL benefit of that specific battery
 * - Stop when incremental payback exceeds threshold
 * 
 * Formula:
 *   Incremental Payback = Cost of 1 Battery / (Savings_N - Savings_{N-1})
 *   
 * Stop conditions:
 *   1. Incremental Payback > MAX_INCREMENTAL_PAYBACK_YEARS
 *   2. Incremental Savings < MIN_INCREMENTAL_SAVINGS_ANNUAL
 *   3. Efficiency Ratio < ELBOW_EFFICIENCY_RATIO (diminishing returns)
 *   4. Incremental Savings ≤ 0 (no more benefit)
 * 
 * @param loadProfile - The interval demand data
 * @param battery - The battery model to analyze
 * @param demandRate - Demand charge rate ($/kW/month)
 * @returns Complete marginal analysis result with optimal quantity
 */
export function performMarginalAnalysis(
  loadProfile: LoadProfile,
  battery: CatalogBattery,
  demandRate: number
): MarginalAnalysisResult {
  const intervalKw = loadProfile.intervals.map(i => i.kw);
  const originalPeak = intervalKw.length > 0 ? Math.max(...intervalKw) : 0;
  const steps: MarginalStep[] = [];

  // Billing peaks BEFORE (monthly)
  const peaksBefore = monthlyPeaks(loadProfile.intervals);
  const monthsCount = peaksBefore.size;
  const annualizeFactor = monthsCount > 0 ? 12 / monthsCount : 1;
  const originalMonthlyPeakSumKw = sumMapValues(peaksBefore) * annualizeFactor;
  
  let currentQuantity = 0;
  let currentAnnualSavings = 0;
  let currentGlobalPeakReductionKw = 0;
  let currentPeakReductionKwMonthSum = 0;
  let firstBatterySavings = 0;
  let firstBatteryPeakReductionKwMonthSum = 0;
  let stopReason = '';
  
  // NOTE: We no longer use a simple threshold-only dispatch to estimate peak shaving value.
  // Demand charges are set by the single highest interval in a month, so the correct objective
  // is to discover the minimum feasible monthly cap (per month) for each battery quantity.
  const baselineKw = percentile(intervalKw, 0.20);
  
  while (currentQuantity < ALGORITHM_CONFIG.MAX_MARGINAL_ITERATIONS) {
    const nextQuantity = currentQuantity + 1;
    
    // Create battery spec for this quantity
    const batterySpec: BatterySpec = {
      capacity_kwh: battery.capacityKwh * nextQuantity,
      max_power_kw: battery.powerKw * nextQuantity,
      round_trip_efficiency: battery.efficiency,
      degradation_rate: 0.02, // 2% per year default
      min_soc: 0.10,
      max_soc: 0.90,
      depth_of_discharge: 0.80,
    };
    
    // Discover billing-cap performance across months (demand-charge correct)
    let newGlobalPeakReductionKw = 0;
    let newPeakReductionKwMonthSum = 0;
    let newAnnualSavings = 0;
    try {
      // Still compute global peak reduction as a diagnostic
      const simResult = simulatePeakShaving(loadProfile, batterySpec, baselineKw);
      newGlobalPeakReductionKw = originalPeak - simResult.new_peak;

      const capDiscovery = computeCapDiscoveryAcrossMonths(loadProfile, batterySpec, demandRate);
      newAnnualSavings = capDiscovery.annualSavings;

      // reductionKwMonthSum is in dataset-month units (kW-month over months present)
      newPeakReductionKwMonthSum = capDiscovery.reductionKwMonthSum;
    } catch {
      // Simulation failed - stop here
      stopReason = 'Simulation failed';
      break;
    }
    
    // Calculate financials
    // newPeakReductionKwMonthSum is in kW-month over dataset months; annualize for reporting.
    const annualPeakReductionKwMonthSum = newPeakReductionKwMonthSum * annualizeFactor;
    const incrementalSavings = newAnnualSavings - currentAnnualSavings;
    const incrementalPeakReductionKwMonthSum = (newPeakReductionKwMonthSum - currentPeakReductionKwMonthSum) * annualizeFactor;
    const incrementalCost = getIncrementalCost(battery, currentQuantity);
    const totalSystemCost = calculateSystemCost(battery, nextQuantity);
    const averagePayback = newAnnualSavings > 0 ? totalSystemCost / newAnnualSavings : Infinity;
    
    // Calculate incremental payback
    const incrementalPayback = incrementalSavings > 0 
      ? incrementalCost / incrementalSavings 
      : Infinity;
    
    // Track first battery savings for elbow detection
    if (nextQuantity === 1) {
      firstBatterySavings = incrementalSavings;
      firstBatteryPeakReductionKwMonthSum = incrementalPeakReductionKwMonthSum;
    }
    
    // === DECISION LOGIC ===
    let decision: MarginalStep['decision'] = 'KEEP';
    let reason = '';
    
    // Check stop conditions (in order of priority)
    
    // 1. No additional peak reduction (performance-first)
    if (incrementalPeakReductionKwMonthSum <= 0) {
      decision = 'STOP_NO_BENEFIT';
      reason = `Battery #${nextQuantity} adds no additional peak reduction (Δ${incrementalPeakReductionKwMonthSum.toFixed(1)} kW-month, Δ$${incrementalSavings.toFixed(0)}/yr)`;
    }
    // 1b. Below absolute kW threshold
    else if (ALGORITHM_CONFIG.MIN_INCREMENTAL_SHAVE_KW > 0 && incrementalPeakReductionKwMonthSum < ALGORITHM_CONFIG.MIN_INCREMENTAL_SHAVE_KW) {
      decision = 'STOP_DIMINISHING';
      reason = `Battery #${nextQuantity} only adds ${incrementalPeakReductionKwMonthSum.toFixed(1)} kW-month (below ${ALGORITHM_CONFIG.MIN_INCREMENTAL_SHAVE_KW} minimum)`;
    }
    // 2. Elbow point detection (diminishing returns) based on kW shaved, not dollars
    else if (firstBatteryPeakReductionKwMonthSum > 0 && 
             (incrementalPeakReductionKwMonthSum / firstBatteryPeakReductionKwMonthSum) < ALGORITHM_CONFIG.ELBOW_EFFICIENCY_RATIO) {
      decision = 'STOP_DIMINISHING';
      reason = `Battery #${nextQuantity} adds only ${((incrementalPeakReductionKwMonthSum / firstBatteryPeakReductionKwMonthSum) * 100).toFixed(0)}% of Battery #1’s peak reduction (below ${ALGORITHM_CONFIG.ELBOW_EFFICIENCY_RATIO * 100}% threshold)`;
    }
    // 3. Optional finance sanity gates
    else if (incrementalSavings < ALGORITHM_CONFIG.MIN_INCREMENTAL_SAVINGS_ANNUAL) {
      decision = 'STOP_DIMINISHING';
      reason = `Battery #${nextQuantity} adds only $${incrementalSavings.toFixed(0)}/yr (below $${ALGORITHM_CONFIG.MIN_INCREMENTAL_SAVINGS_ANNUAL} minimum)`;
    }
    // 4. Incremental payback exceeds threshold
    else if (incrementalPayback > ALGORITHM_CONFIG.MAX_INCREMENTAL_PAYBACK_YEARS) {
      decision = 'STOP_PAYBACK';
      reason = `Battery #${nextQuantity} has ${incrementalPayback.toFixed(1)} year incremental payback (exceeds ${ALGORITHM_CONFIG.MAX_INCREMENTAL_PAYBACK_YEARS} year limit)`;
    }
    // 5. Good investment - keep it
    else {
      decision = 'KEEP';
      reason = `Battery #${nextQuantity}: +$${incrementalSavings.toFixed(0)}/yr, ${incrementalPayback.toFixed(1)} yr payback`;
    }
    
    // Record this step
    steps.push({
      quantity: nextQuantity,
      totalPeakReductionKw: newGlobalPeakReductionKw,
      totalPeakReductionKwMonthSum: annualPeakReductionKwMonthSum,
      peakReductionPercent: originalPeak > 0 ? (newGlobalPeakReductionKw / originalPeak) * 100 : 0,
      totalAnnualSavings: newAnnualSavings,
      incrementalSavings,
      incrementalShaveKw: incrementalPeakReductionKwMonthSum,
      incrementalPeakReductionKwMonthSum,
      incrementalPayback,
      totalSystemCost,
      averagePayback,
      decision,
      reason,
    });
    
    // Act on decision
    if (decision === 'KEEP') {
      currentQuantity = nextQuantity;
      currentAnnualSavings = newAnnualSavings;
      currentGlobalPeakReductionKw = newGlobalPeakReductionKw;
      currentPeakReductionKwMonthSum = newPeakReductionKwMonthSum;
    } else {
      stopReason = reason;
      break;
    }
  }
  
  // If we hit max iterations, set stop reason
  if (currentQuantity >= ALGORITHM_CONFIG.MAX_MARGINAL_ITERATIONS && !stopReason) {
    stopReason = `Reached maximum ${ALGORITHM_CONFIG.MAX_MARGINAL_ITERATIONS} units`;
  }
  
  // If no batteries were added, provide a reason
  if (currentQuantity === 0 && steps.length === 0) {
    stopReason = 'Could not simulate any batteries';
  }
  
  // Calculate value score for ranking
  // Prioritize: high savings, reasonable payback, high reduction %
  const avgPayback = currentAnnualSavings > 0 
    ? calculateSystemCost(battery, currentQuantity) / currentAnnualSavings 
    : Infinity;
  const reductionPercent = originalPeak > 0 ? (currentGlobalPeakReductionKw / originalPeak) * 100 : 0;
  
  // Value score: balance reduction achieved vs cost
  // Higher reduction % = better, lower payback = better
  const valueScore = currentQuantity > 0
    ? (reductionPercent * 0.5) + (Math.max(0, 20 - avgPayback) * 2.5)
    : 0;
  
  return {
    battery,
    originalPeakKw: originalPeak,
    baselineKw,
    originalMonthlyPeakSumKw,
    optimalQuantity: currentQuantity,
    totalPeakReductionKw: currentGlobalPeakReductionKw,
    annualPeakReductionKwMonthSum: currentPeakReductionKwMonthSum * annualizeFactor,
    totalPeakReductionPercent: reductionPercent,
    totalAnnualSavings: currentAnnualSavings,
    totalSystemCost: currentQuantity > 0 ? calculateSystemCost(battery, currentQuantity) : 0,
    averagePayback: avgPayback,
    totalPowerKw: battery.powerKw * currentQuantity,
    totalCapacityKwh: battery.capacityKwh * currentQuantity,
    steps,
    firstBatterySavings,
    firstBatteryPeakReductionKwMonthSum,
    valueScore,
    stopReason,
  };
}

/**
 * Run marginal analysis on all battery models and rank by value
 * 
 * @param loadProfile - The interval demand data
 * @param catalog - Available battery models
 * @param demandRate - Demand charge rate ($/kW/month)
 * @returns All models analyzed, sorted by value score
 */
export function runMarginalAnalysisOnCatalog(
  loadProfile: LoadProfile,
  catalog: CatalogBattery[],
  demandRate: number
): MarginalAnalysisResult[] {
  const results: MarginalAnalysisResult[] = [];
  
  for (const battery of catalog) {
    try {
      const result = performMarginalAnalysis(loadProfile, battery, demandRate);
      // Only include if at least 1 battery is viable
      if (result.optimalQuantity > 0) {
        results.push(result);
      }
    } catch (error) {
      console.warn(`Marginal analysis failed for ${battery.modelName}:`, error);
    }
  }
  
  // Sort by value score (highest first)
  results.sort((a, b) => b.valueScore - a.valueScore);
  
  return results;
}

// ============================================================================
// STAGE 1: LOAD PROFILE ANALYSIS
// ============================================================================

/**
 * Analyze load profile to understand peak characteristics and derive requirements
 * 
 * This is the FOUNDATION of the algorithm. We analyze:
 * - Peak demand magnitude
 * - Peak event duration and frequency
 * - Energy requirements to sustain discharge
 * 
 * @param loadProfile - The interval demand data
 * @param targetReductionPercent - Desired peak reduction as percentage (e.g., 10 = 10%)
 * @returns Peak profile and battery requirements
 */
export function analyzeLoadProfile(
  loadProfile: LoadProfile,
  targetReductionPercent: number = ALGORITHM_CONFIG.DEFAULT_TARGET_REDUCTION_PERCENT
): { profile: PeakProfile; requirements: BatteryRequirements } {
  const log: string[] = [];
  let intervals = loadProfile.intervals;
  
  // Auto-correct if data appears to be in Watts instead of kW
  const rawPeak = Math.max(...intervals.map(i => i.kw));
  if (rawPeak > 50000) {
    log.push(`   Detected very large peak (${rawPeak.toFixed(0)}); assuming Watts → converting to kW`);
    intervals = intervals.map(i => ({ ...i, kw: i.kw / 1000 }));
  }
  
  // Extract demands
  const demands = intervals.map(i => i.kw).filter(k => k > 0 && isFinite(k));
  
  if (demands.length === 0) {
    throw new Error('No valid demand data in load profile');
  }
  
  // === PEAK ANALYSIS ===
  
  // Sort demands descending to find peaks
  const sortedDemands = [...demands].sort((a, b) => b - a);
  const originalPeakKw = sortedDemands[0];
  
  // Average of top percentile (more robust than absolute max)
  const topCount = Math.max(1, Math.floor(sortedDemands.length * (1 - ALGORITHM_CONFIG.PEAK_PERCENTILE)));
  const avgPeakKw = sortedDemands.slice(0, topCount).reduce((a, b) => a + b, 0) / topCount;
  
  log.push(`Original peak: ${originalPeakKw.toFixed(1)} kW`);
  log.push(`Top ${((1 - ALGORITHM_CONFIG.PEAK_PERCENTILE) * 100).toFixed(0)}% average: ${avgPeakKw.toFixed(1)} kW`);
  
  // === TARGET CALCULATION ===
  
  const targetThresholdKw = originalPeakKw * (1 - targetReductionPercent / 100);
  const targetReductionKw = originalPeakKw - targetThresholdKw;
  
  log.push(`Target threshold: ${targetThresholdKw.toFixed(1)} kW (${targetReductionPercent}% reduction)`);
  log.push(`Target reduction: ${targetReductionKw.toFixed(1)} kW`);
  
  // === INTERVAL DURATION DETECTION ===
  
  let intervalHours = 0.25; // Default: 15-minute intervals
  if (intervals.length >= 2) {
    const t0 = new Date(intervals[0].timestamp).getTime();
    const t1 = new Date(intervals[1].timestamp).getTime();
    const detected = Math.abs(t1 - t0) / (1000 * 60 * 60);
    if (isFinite(detected) && detected > 0 && detected < 24) {
      intervalHours = detected;
    }
  }
  log.push(`Interval duration: ${(intervalHours * 60).toFixed(0)} minutes`);
  
  // === PEAK EVENT DETECTION ===
  
  const peakEvents = detectPeakEvents(loadProfile, targetThresholdKw, intervalHours);
  log.push(`Detected ${peakEvents.length} peak events above threshold`);
  
  // Longest event analysis
  let longestEventHours = ALGORITHM_CONFIG.MIN_PEAK_DURATION_HOURS;
  let longestEventEnergyKwh = targetReductionKw * longestEventHours;
  let p90EventHours = ALGORITHM_CONFIG.MIN_PEAK_DURATION_HOURS;
  let p90EventEnergyKwh = longestEventEnergyKwh;
  
  if (peakEvents.length > 0) {
    longestEventHours = Math.max(
      ...peakEvents.map(e => e.durationHours),
      ALGORITHM_CONFIG.MIN_PEAK_DURATION_HOURS
    );
    longestEventEnergyKwh = Math.max(...peakEvents.map(e => e.totalExcessKwh));
    
    // P90 duration/energy (more robust than absolute longest)
    const durations = peakEvents.map(e => e.durationHours);
    p90EventHours = Math.min(percentile(durations, 0.90), 2); // cap at 2 hours
    const energies = peakEvents.map(e => e.totalExcessKwh);
    p90EventEnergyKwh = percentile(energies, 0.90);
    log.push(`Longest event: ${longestEventHours.toFixed(2)} hours, ${longestEventEnergyKwh.toFixed(1)} kWh`);
    log.push(`P90 event: ${p90EventHours.toFixed(2)} hours, ${p90EventEnergyKwh.toFixed(1)} kWh (capped at 2h)`);
  }
  
  // 95th percentile event energy (robust sizing)
  const eventEnergies = peakEvents.map(e => e.totalExcessKwh).sort((a, b) => a - b);
  const p95EventEnergyKwh = eventEnergies.length > 0
    ? percentile(eventEnergies, 0.95)
    : longestEventEnergyKwh;
  
  // Events per day calculation
  const eventsPerDay: Record<string, number> = {};
  for (const e of peakEvents) {
    const dayKey = e.start.toISOString().slice(0, 10);
    eventsPerDay[dayKey] = (eventsPerDay[dayKey] ?? 0) + 1;
  }
  const peakEventsPerDay = Object.values(eventsPerDay).length > 0
    ? Math.max(...Object.values(eventsPerDay))
    : 1;
  
  const dailyPeakEnergyKwh = p95EventEnergyKwh * peakEventsPerDay;
  log.push(`Peak events per day (max): ${peakEventsPerDay}`);
  log.push(`Daily peak energy requirement: ${dailyPeakEnergyKwh.toFixed(1)} kWh`);
  
  // === REQUIREMENTS CALCULATION ===
  
  const analysisNotes: string[] = [];
  
  // Power requirement: Must discharge at the rate needed to shave peaks
  const minPowerKw = targetReductionKw;
  analysisNotes.push(`Power sized to target reduction: ${minPowerKw.toFixed(1)} kW`);
  
  // Energy requirement: Multiple constraints
  
  // 1. Longest event (with safety buffer)
  const energyForLongestEvent = longestEventEnergyKwh * ALGORITHM_CONFIG.ENERGY_SAFETY_BUFFER;
  
  // 1b. P90 event (capped duration) for robustness
  const energyForP90Event = p90EventEnergyKwh * ALGORITHM_CONFIG.ENERGY_SAFETY_BUFFER;
  
  // 2. Daily cycling (assuming some recharge between events)
  const energyForDailyCycling = dailyPeakEnergyKwh * 0.7; // 70% - battery can recharge
  
  // 3. Minimum duration standard
  const minDurationEnergy = minPowerKw * ALGORITHM_CONFIG.MIN_BATTERY_DURATION_HOURS;
  
  // Final: Maximum of all constraints
  const minEnergyKwh = Math.max(
    energyForLongestEvent,
    energyForP90Event,
    energyForDailyCycling,
    minDurationEnergy
  );
  
  analysisNotes.push(`Energy constraint (longest event): ${energyForLongestEvent.toFixed(1)} kWh`);
  analysisNotes.push(`Energy constraint (daily cycling): ${energyForDailyCycling.toFixed(1)} kWh`);
  analysisNotes.push(`Energy constraint (min duration): ${minDurationEnergy.toFixed(1)} kWh`);
  analysisNotes.push(`Final energy requirement: ${minEnergyKwh.toFixed(1)} kWh`);
  
  // Duration check
  const requiredDuration = minEnergyKwh / minPowerKw;
  analysisNotes.push(`Required duration: ${requiredDuration.toFixed(1)} hours`);
  
  return {
    profile: {
      originalPeakKw,
      avgPeakKw,
      longestEventHours,
      longestEventEnergyKwh,
      p95EventEnergyKwh,
      peakEventsPerDay,
      dailyPeakEnergyKwh,
      totalPeakEvents: peakEvents.length,
      intervalHours,
    },
    requirements: {
      minPowerKw,
      minEnergyKwh,
      targetReductionKw,
      targetThresholdKw,
      analysisNotes,
    },
  };
}

// ============================================================================
// STAGE 2: CANDIDATE VALIDATION
// ============================================================================

/**
 * Filter and validate battery candidates through simulation
 * 
 * Only batteries that achieve ≥80% of target reduction pass validation.
 * This is the CRITICAL GATE that prevents undersized batteries from being recommended.
 * 
 * @param loadProfile - The interval demand data
 * @param requirements - Calculated battery requirements
 * @param catalog - Available batteries to evaluate
 * @param demandRate - Demand charge rate ($/kW/month)
 * @returns Validated candidates that passed simulation
 */
export function validateCandidates(
  loadProfile: LoadProfile,
  requirements: BatteryRequirements,
  catalog: CatalogBattery[],
  demandRate: number
): { validated: ValidatedCandidate[]; log: string[] } {
  const validated: ValidatedCandidate[] = [];
  const log: string[] = [];
  
  log.push(`Evaluating ${catalog.length} batteries against requirements:`);
  log.push(`  Required power: ${requirements.minPowerKw.toFixed(1)} kW`);
  log.push(`  Required energy: ${requirements.minEnergyKwh.toFixed(1)} kWh`);
  log.push(`  Validation threshold: ${ALGORITHM_CONFIG.MIN_ACHIEVEMENT_PERCENT}% achievement`);
  
  let passedCount = 0;
  let failedCount = 0;
  
  for (const battery of catalog) {
    // === QUANTITY CALCULATION ===
    
    // Minimum quantity to meet power requirement
    const qtyForPower = Math.ceil(requirements.minPowerKw / battery.powerKw);
    
    // Minimum quantity to meet energy requirement
    const qtyForEnergy = Math.ceil(requirements.minEnergyKwh / battery.capacityKwh);
    
    // Need enough units for BOTH
    const minQty = Math.max(qtyForPower, qtyForEnergy, 1);
    
    // Skip if impractical
    if (minQty > ALGORITHM_CONFIG.MAX_UNITS_PER_RECOMMENDATION) {
      failedCount++;
      continue;
    }
    
    // Total system specs
    const totalPowerKw = battery.powerKw * minQty;
    const totalCapacityKwh = battery.capacityKwh * minQty;
    
    // Check against requirements (with tolerance)
    const powerMet = totalPowerKw >= requirements.minPowerKw * ALGORITHM_CONFIG.REQUIREMENT_TOLERANCE;
    const energyMet = totalCapacityKwh >= requirements.minEnergyKwh * ALGORITHM_CONFIG.REQUIREMENT_TOLERANCE;
    
    if (!powerMet || !energyMet) {
      failedCount++;
      continue;
    }
    
    // === SIMULATION VALIDATION ===
    
    const batterySpec: BatterySpec = {
      capacity_kwh: totalCapacityKwh,
      max_power_kw: totalPowerKw,
      round_trip_efficiency: battery.efficiency,
      degradation_rate: 0.02, // 2% per year default
      min_soc: 0.10,
      max_soc: 0.90,
      depth_of_discharge: 0.80,
    };
    
    try {
      const simResult = simulatePeakShaving(loadProfile, batterySpec, requirements.targetThresholdKw);
      const simulatedReductionKw = simResult.original_peak - simResult.new_peak;
      const achievementPercent = requirements.targetReductionKw > 0
        ? (simulatedReductionKw / requirements.targetReductionKw) * 100
        : 0;
      
      // === VALIDATION GATE ===
      if (achievementPercent < ALGORITHM_CONFIG.MIN_ACHIEVEMENT_PERCENT) {
        failedCount++;
        continue;
      }
      
      // === PASSED VALIDATION - Calculate financials ===
      
      const newIntervalsKw = simResult.new_intervals_kw ?? simResult.final_load_profile.intervals.map(i => i.kw);
      const peaksBefore = monthlyPeaks(loadProfile.intervals);
      const peaksAfter = monthlyPeaksFromSeries(loadProfile.intervals, newIntervalsKw);
      const reductionKwMonthSum = sumMonthlyPeakReductions(peaksBefore, peaksAfter);
      const monthsCount = peaksBefore.size;
      const annualizeFactor = monthsCount > 0 ? 12 / monthsCount : 1;
      const annualSavings = (reductionKwMonthSum * annualizeFactor) * demandRate;
      const systemCost = calculateSystemCost(battery, minQty);
      const paybackYears = annualSavings > 0 ? systemCost / annualSavings : Infinity;
      
      passedCount++;
      
      validated.push({
        battery,
        quantity: minQty,
        totalPowerKw,
        totalCapacityKwh,
        simulatedReductionKw,
        achievementPercent,
        annualSavings,
        systemCost,
        paybackYears,
        valueScore: 0, // Calculated in Stage 3
        scoreBreakdown: { achievementScore: 0, efficiencyScore: 0, durabilityScore: 0 },
        selectionReason: '',
      });
    } catch (error) {
      failedCount++;
      log.push(`  ⚠️ Simulation failed for ${battery.modelName}: ${error}`);
    }
  }
  
  log.push(`Validation complete: ${passedCount} passed, ${failedCount} failed`);
  
  return { validated, log };
}

// ============================================================================
// STAGE 3: SCORING AND RANKING
// ============================================================================

/**
 * Score validated candidates by VALUE delivered
 * 
 * Value Score Formula:
 *   (Achievement × 40%) + (Cost Efficiency × 35%) + (Durability × 25%)
 * 
 * This prioritizes:
 *   1. Actually achieving the target (most important)
 *   2. Cost per kW shaved (efficiency)
 *   3. Warranty/efficiency (long-term value)
 * 
 * @param candidates - Validated candidates from Stage 2
 * @returns Candidates with scores, sorted by value
 */
export function scoreAndRankCandidates(candidates: ValidatedCandidate[]): ValidatedCandidate[] {
  if (candidates.length === 0) return [];
  
  // Find normalization benchmarks
  // maxReduction could be used for normalization in future scoring models
  const _maxReduction = Math.max(...candidates.map(c => c.simulatedReductionKw));
  void _maxReduction; // Suppress unused warning - keep for future use
  const costPerKwValues = candidates.map(c => c.systemCost / c.simulatedReductionKw);
  const minCostPerKw = Math.min(...costPerKwValues.filter(v => isFinite(v)));
  
  for (const c of candidates) {
    // === ACHIEVEMENT SCORE (0-100) ===
    // How much of the target was achieved
    // 80% achievement = 80 points, 100% = 100 points, capped at 110
    const achievementScore = Math.min(c.achievementPercent, 110);
    
    // === COST EFFICIENCY SCORE (0-100) ===
    // Lower cost per kW = higher score
    const costPerKw = c.systemCost / c.simulatedReductionKw;
    const efficiencyScore = isFinite(costPerKw) && costPerKw > 0
      ? Math.min((minCostPerKw / costPerKw) * 100, 150) // Cap at 150 for normalization
      : 0;
    
    // === DURABILITY SCORE (0-100) ===
    // Based on efficiency and warranty
    const efficiencyBonus = Math.max(0, (c.battery.efficiency - ALGORITHM_CONFIG.REFERENCE_EFFICIENCY) * 200);
    const warrantyBonus = Math.min(c.battery.warrantyYears / ALGORITHM_CONFIG.REFERENCE_WARRANTY_YEARS, 1) * 80;
    const durabilityScore = Math.min(efficiencyBonus + warrantyBonus, 100);
    
    // === COMPOSITE VALUE SCORE ===
    c.valueScore = 
      (achievementScore * ALGORITHM_CONFIG.WEIGHT_ACHIEVEMENT) +
      (efficiencyScore * ALGORITHM_CONFIG.WEIGHT_COST_EFFICIENCY) +
      (durabilityScore * ALGORITHM_CONFIG.WEIGHT_DURABILITY);
    
    c.scoreBreakdown = {
      achievementScore: Math.round(achievementScore),
      efficiencyScore: Math.round(efficiencyScore),
      durabilityScore: Math.round(durabilityScore),
    };
    
    // Generate selection reason
    const reasons: string[] = [];
    if (achievementScore >= 100) reasons.push('Hits target');
    if (efficiencyScore >= 80) reasons.push('Cost effective');
    if (durabilityScore >= 70) reasons.push('Durable');
    if (c.paybackYears <= 5) reasons.push(`${c.paybackYears.toFixed(1)}yr payback`);
    c.selectionReason = reasons.join(', ') || 'Meets requirements';
  }
  
  // Sort by value score (highest first)
  candidates.sort((a, b) => b.valueScore - a.valueScore);
  
  return candidates;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * OPTIMAL BATTERY SELECTION - Main Entry Point
 * 
 * This is the main function you call to get battery recommendations.
 * It orchestrates all three stages and returns a complete result.
 * 
 * @param loadProfile - Interval demand data
 * @param catalog - Available batteries to evaluate
 * @param demandRate - Demand charge rate ($/kW/month)
 * @param targetReductionPercent - Desired peak reduction as percentage (default: 10%)
 * @returns Complete selection result with candidates and analysis
 */
export function selectOptimalBatteries(
  loadProfile: LoadProfile,
  catalog: CatalogBattery[],
  demandRate: number,
  targetReductionPercent: number = ALGORITHM_CONFIG.DEFAULT_TARGET_REDUCTION_PERCENT
): SelectionResult {
  const log: string[] = [];

  log.push('═══════════════════════════════════════════════════════════════');
  log.push('   EVERWATT OPTIMAL BATTERY SELECTION ALGORITHM');
  log.push('═══════════════════════════════════════════════════════════════');
  log.push('   Mode: PORTFOLIO SELECTION (mix-and-match, bounded search)');
  log.push(`   Demand rate: $${demandRate.toFixed(2)}/kW/month`);
  log.push(`   Batteries in catalog: ${catalog.length}`);
  log.push('');

  try {
    const { profile } = analyzeLoadProfile(loadProfile, targetReductionPercent);

    // Defaults per requirement
    const minPowerFraction = 0.5;
    const paybackTargetYears = 10;
    const sitePeakKw = profile.originalPeakKw;
    const targetKw = minPowerFraction * sitePeakKw;

    log.push('┌─────────────────────────────────────────────────────────────────┐');
    log.push('│ PORTFOLIO SELECTION (v1 objective)                              │');
    log.push('└─────────────────────────────────────────────────────────────────┘');
    log.push(`   Feasibility guard: totalPowerKw >= ${targetKw.toFixed(1)} kW (${(minPowerFraction * 100).toFixed(0)}% of peak ${sitePeakKw.toFixed(1)} kW)`);
    log.push(`   Objective: maximize (annualDemandSavings - annualizedCapex), annualizedCapex = totalCost / ${paybackTargetYears}y`);
    log.push('');

    const candidates = selectOptimalPortfolios({
      loadProfile,
      catalog,
      demandRate,
      sitePeakKw,
      minPowerFraction,
      paybackTargetYears,
      log,
    });

    log.push('═══════════════════════════════════════════════════════════════');

    return {
      success: candidates.length > 0,
      peakProfile: profile,
      requirements: {
        minPowerKw: targetKw,
        minEnergyKwh: 0,
        targetReductionKw: 0,
        targetThresholdKw: 0,
        analysisNotes: [
          'Portfolio selection v1: maximize annualDemandSavings - annualizedCapex.',
          `Hard feasibility guard: totalPowerKw >= ${(minPowerFraction * 100).toFixed(0)}% of site peak.`,
          'Tier pricing applied portfolio-wide using total unit count.',
        ],
      },
      candidates,
      batteriesEvaluated: catalog.length,
      batteriesPassed: candidates.length,
      log,
    };
  } catch (error) {
    log.push(`   ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
    log.push('═══════════════════════════════════════════════════════════════');

    return {
      success: false,
      peakProfile: {
        originalPeakKw: 0,
        avgPeakKw: 0,
        longestEventHours: 0,
        longestEventEnergyKwh: 0,
        p95EventEnergyKwh: 0,
        peakEventsPerDay: 0,
        dailyPeakEnergyKwh: 0,
        totalPeakEvents: 0,
        intervalHours: 0.25,
      },
      requirements: {
        minPowerKw: 0,
        minEnergyKwh: 0,
        targetReductionKw: 0,
        targetThresholdKw: 0,
        analysisNotes: [],
      },
      candidates: [],
      batteriesEvaluated: catalog.length,
      batteriesPassed: 0,
      log,
    };
  }
}

function selectOptimalPortfolios(args: {
  loadProfile: LoadProfile;
  catalog: CatalogBattery[];
  demandRate: number;
  sitePeakKw: number;
  minPowerFraction: number;
  paybackTargetYears: number;
  log: string[];
}): PortfolioCandidate[] {
  const {
    loadProfile,
    catalog,
    demandRate,
    sitePeakKw,
    minPowerFraction,
    paybackTargetYears,
    log,
  } = args;

  const targetKw = minPowerFraction * sitePeakKw;
  const maxKw = 2.0 * targetKw;

  const keyOf = (b: CatalogBattery) => `${b.manufacturer}::${b.modelName}`;

  // Step 1: pool = top-K by $/kW and top-K by $/kWh (baseline 1-10 pricing), unique
  const K = 6;
  const byKw = [...catalog]
    .filter((b) => b.powerKw > 0 && b.price1_10 > 0)
    .sort((a, b) => (a.price1_10 / a.powerKw) - (b.price1_10 / b.powerKw))
    .slice(0, K);
  const byKwh = [...catalog]
    .filter((b) => b.capacityKwh > 0 && b.price1_10 > 0)
    .sort((a, b) => (a.price1_10 / a.capacityKwh) - (b.price1_10 / b.capacityKwh))
    .slice(0, K);
  const poolMap = new Map<string, CatalogBattery>();
  for (const b of [...byKw, ...byKwh]) poolMap.set(keyOf(b), b);
  const pool = Array.from(poolMap.values());

  log.push(`   Candidate pool size: ${pool.length} (top-${K} by $/kW and $/kWh, unique)`);

  // Step 2: generate bounded portfolios
  const raw: PortfolioUnit[][] = [];

  // Single-model: n = 1..Nmax where Nmax = ceil(targetKw/P_i)+4
  for (const b of pool) {
    const nMax = Math.ceil(targetKw / Math.max(1e-9, b.powerKw)) + 4;
    for (let n = 1; n <= nMax; n++) {
      const totalPowerKw = n * b.powerKw;
      if (totalPowerKw < targetKw || totalPowerKw > maxKw) continue;
      raw.push([{ battery: b, quantity: n }]);
    }
  }

  // Two-model mixes: bounded grid, filter totalPower within [targetKw, 2*targetKw]
  for (let a = 0; a < pool.length; a++) {
    for (let b = a + 1; b < pool.length; b++) {
      const i = pool[a];
      const j = pool[b];
      const nMaxI = Math.ceil(targetKw / Math.max(1e-9, i.powerKw)) + 2;
      const nMaxJ = Math.ceil(targetKw / Math.max(1e-9, j.powerKw)) + 2;
      for (let ni = 0; ni <= nMaxI; ni++) {
        for (let nj = 0; nj <= nMaxJ; nj++) {
          if (ni === 0 && nj === 0) continue;
          const totalPowerKw = ni * i.powerKw + nj * j.powerKw;
          if (totalPowerKw < targetKw || totalPowerKw > maxKw) continue;
          const p: PortfolioUnit[] = [];
          if (ni > 0) p.push({ battery: i, quantity: ni });
          if (nj > 0) p.push({ battery: j, quantity: nj });
          raw.push(p);
        }
      }
    }
  }

  // De-dup portfolios
  const signature = (p: PortfolioUnit[]): string =>
    p
      .slice()
      .sort((a, b) => keyOf(a.battery).localeCompare(keyOf(b.battery)))
      .map((u) => `${keyOf(u.battery)}=${u.quantity}`)
      .join('|');

  const seen = new Set<string>();
  const portfolios = raw.filter((p) => {
    const s = signature(p);
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  });

  log.push(`   Portfolios generated: ${portfolios.length} (after power window + de-dup)`);

  // Precompute baseline monthly peaks
  const peaksBefore = monthlyPeaks(loadProfile.intervals);
  const monthsCount = peaksBefore.size;
  const annualizeFactor = monthsCount > 0 ? 12 / monthsCount : 1;

  // Threshold candidates are computed once from the demand distribution (small set).
  const demands = loadProfile.intervals.map((i) => i.kw).filter((v) => Number.isFinite(v));
  const originalPeak = demands.length ? Math.max(...demands) : 0;
  const thresholds = Array.from(
    new Set(
      [0.99, 0.985, 0.98, 0.975, 0.97, 0.965, 0.96, 0.955, 0.95]
        .map((p) => percentile(demands, p))
        .filter((t) => Number.isFinite(t) && t > 0 && t <= originalPeak)
        .concat([originalPeak])
    )
  ).sort((a, b) => a - b);

  const evalPortfolio = (p: PortfolioUnit[]): PortfolioCandidate | null => {
    const totalUnits = p.reduce((s, u) => s + u.quantity, 0);
    const pricingTier = getPricingTier(totalUnits);

    const totalPowerKw = p.reduce((s, u) => s + u.quantity * u.battery.powerKw, 0);
    const totalCapacityKwh = p.reduce((s, u) => s + u.quantity * u.battery.capacityKwh, 0);
    if (totalPowerKw < targetKw) return null;

    const roundTripEfficiency =
      totalCapacityKwh > 0
        ? p.reduce((s, u) => s + u.quantity * u.battery.capacityKwh * u.battery.efficiency, 0) / totalCapacityKwh
        : 0.9;

    const systemCost = p.reduce((s, u) => s + unitPriceForTier(u.battery, pricingTier) * u.quantity, 0);

    const batterySpec: BatterySpec = {
      capacity_kwh: totalCapacityKwh,
      max_power_kw: totalPowerKw,
      round_trip_efficiency: roundTripEfficiency,
      degradation_rate: 0.02,
      min_soc: 0.10,
      max_soc: 0.90,
      depth_of_discharge: 0.80,
    };

    let best: { thresholdKw: number; annualSavings: number; peakReductionKw: number; objectiveValue: number } | null =
      null;

    for (const thresholdKw of thresholds) {
      const sim = simulateCapEnforcement(loadProfile, batterySpec, thresholdKw, {
        chargeMarginKw: Math.max(10, thresholdKw * 0.05),
      });
      if (!sim.feasible) continue;

      const peaksAfter = monthlyPeaksFromSeries(loadProfile.intervals, sim.newIntervalsKw);
      const reductionKwMonthSum = sumMonthlyPeakReductions(peaksBefore, peaksAfter);
      const annualSavings = (reductionKwMonthSum * annualizeFactor) * demandRate;
      const annualizedCapex = systemCost / Math.max(1, paybackTargetYears);
      const objectiveValue = annualSavings - annualizedCapex;
      const peakReductionKw = Math.max(0, sim.originalPeakKw - sim.newPeakKw);

      if (!best || objectiveValue > best.objectiveValue) {
        best = { thresholdKw, annualSavings, peakReductionKw, objectiveValue };
      }
    }

    if (!best) return null;

    const annualizedCapex = systemCost / Math.max(1, paybackTargetYears);
    const paybackYears = best.annualSavings > 0 ? systemCost / best.annualSavings : Number.POSITIVE_INFINITY;

    const label = p
      .slice()
      .sort((a, b) => b.quantity * b.battery.powerKw - a.quantity * a.battery.powerKw)
      .map((u) => `${u.quantity}×${u.battery.modelName}`)
      .join(' + ');

    const units = p.map((u) => {
      const unitPrice = unitPriceForTier(u.battery, pricingTier);
      return {
        modelName: u.battery.modelName,
        manufacturer: u.battery.manufacturer,
        quantity: u.quantity,
        unitPowerKw: u.battery.powerKw,
        unitCapacityKwh: u.battery.capacityKwh,
        unitEfficiency: u.battery.efficiency,
        unitPrice,
        lineCost: unitPrice * u.quantity,
      };
    });

    const why: string[] = [
      `Meets feasibility guard: ${totalPowerKw.toFixed(0)}kW >= ${targetKw.toFixed(0)}kW`,
      `Portfolio-wide tier pricing: ${pricingTier} (${totalUnits} total units)`,
      `Objective: $${best.annualSavings.toFixed(0)} - $${annualizedCapex.toFixed(0)} = $${best.objectiveValue.toFixed(0)}`,
    ];

    return {
      portfolio: p,
      pricingTier,
      totalUnits,
      totalPowerKw,
      totalCapacityKwh,
      roundTripEfficiency,
      thresholdKw: best.thresholdKw,
      peakReductionKw: best.peakReductionKw,
      annualSavings: best.annualSavings,
      systemCost,
      annualizedCapex,
      objectiveValue: best.objectiveValue,
      paybackYears,
      selectionReason: `Best objective value: $${best.objectiveValue.toFixed(0)}`,
      explanation: {
        label,
        units,
        pricingTier,
        totalUnits,
        totalPowerKw,
        totalCapacityKwh,
        roundTripEfficiency,
        thresholdKw: best.thresholdKw,
        peakReductionKw: best.peakReductionKw,
        annualDemandSavings: best.annualSavings,
        systemCost,
        annualizedCapex,
        objectiveValue: best.objectiveValue,
        paybackYears,
        why,
      },
    };
  };

  const evaluated = portfolios.map(evalPortfolio).filter((c): c is PortfolioCandidate => Boolean(c));
  evaluated.sort((a, b) => b.objectiveValue - a.objectiveValue);

  const top = evaluated.slice(0, 5);
  if (top.length > 0) {
    log.push('');
    log.push('   🏆 TOP PORTFOLIOS (by objective value):');
    top.forEach((c, idx) => {
      log.push(`   ${idx + 1}. ${c.explanation.label}`);
      log.push(`      Tier: ${c.pricingTier} | Units: ${c.totalUnits}`);
      log.push(`      Total: ${c.totalPowerKw.toFixed(0)}kW / ${c.totalCapacityKwh.toFixed(0)}kWh`);
      log.push(`      Savings: $${c.annualSavings.toFixed(0)}/yr | Cost: $${c.systemCost.toFixed(0)} | Obj: $${c.objectiveValue.toFixed(0)}`);
      log.push('');
    });
  }

  return top;
}

// ============================================================================
// EXPORTS FOR EXTERNAL USE
// ============================================================================

export {
  calculateSystemCost,
  percentile,
};

