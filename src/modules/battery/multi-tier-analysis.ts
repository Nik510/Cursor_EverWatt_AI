/**
 * AI Best Recommendation Analysis
 * 
 * Generates and evaluates multiple battery configurations using defensible math,
 * then selects the single best recommendation based on a comprehensive scoring algorithm.
 * 
 * The AI considers:
 * - ROI and payback period
 * - Peak reduction achieved
 * - Cost efficiency (cost per kW reduced)
 * - Accuracy and confidence level
 * - NPV over 10 years
 * 
 * All calculations are based on hard math and physics, not fake computations.
 */

import type { LoadProfile, BatterySpec, SimulationResult } from './types';
import { simulatePeakShaving, detectPeakEvents } from './logic';
import { computeMonthlyBillingPeakReductionKwMonthSum } from './logic';
import type { CatalogBattery } from './optimal-selection';
import { checkSRateEligibility, isAlreadyOnOptionS, estimateSRateSavings } from '../../utils/rates/s-rate-eligibility';
import { calculateOptionSDemandCharges, DEFAULT_OPTION_S_RATES_2025_SECONDARY } from '../../utils/battery/s-rate-calculations';
import { analyzePeakCharacteristics, findBatteriesForPeakShaving } from './peak-characteristics';

export type AnalysisTier = 'conservative' | 'aggressive' | 'extreme';

export interface TierAnalysis {
  tier: AnalysisTier;
  batterySpec: BatterySpec;
  batteryInfo: {
    modelName: string;
    manufacturer: string;
    quantity: number;
    totalCapacityKwh: number;
    totalPowerKw: number;
    systemCost: number;
  };
  thresholdKw: number;
  simulationResult: SimulationResult;
  financials: {
    peakReductionKw: number;
    peakReductionPercent: number;
    annualSavings: number;
    paybackYears: number;
    roi: number;
    npv10yr: number;
    costPerKwReduced: number;
  };
  accuracy: {
    confidenceLevel: 'high' | 'medium' | 'low';
    expectedAccuracyPercent: number;
    limitingFactors: string[];
  };
  rationale: string;
}

export interface TieredRecommendation {
  originalPeakKw: number;
  options: Array<TierAnalysis & {
    peakSavingsPerDollar: number; // Primary metric: kW reduced / $ cost
    sRateValue?: number; // Annual savings from S-rate eligibility (if applicable)
    thresholdValue?: number; // Annual value from threshold benefit (if applicable)
    totalAnnualValue: number; // Peak savings + S-rate + threshold
    isRecommended: boolean; // True for the front runner
    recommendationReason: string;
  }>;
}

/**
 * Calculate demand response revenue
 * 
 * Demand Response programs typically pay:
 * - Capacity payment: $X/kW-month for committed capacity
 * - Event payment: $Y/kW for actual reduction during events
 * 
 * Conservative estimates based on CAISO/PG&E programs:
 * - Capacity: $5-15/kW-month
 * - Event: $0.50-2.00/kW per event
 */
export interface DemandResponseParams {
  enabled: boolean;
  capacityPaymentPerKwMonth: number; // $/kW-month
  eventPaymentPerKw: number; // $/kW per event
  estimatedEventsPerYear: number;
  minimumCommitmentKw: number; // Minimum kW to enroll
}

export function calculateDemandResponseRevenue(
  batteryPowerKw: number,
  params: DemandResponseParams
): {
  annualCapacityRevenue: number;
  annualEventRevenue: number;
  totalAnnualRevenue: number;
} {
  if (!params.enabled || batteryPowerKw < params.minimumCommitmentKw) {
    return {
      annualCapacityRevenue: 0,
      annualEventRevenue: 0,
      totalAnnualRevenue: 0,
    };
  }

  // Capacity revenue: committed capacity × rate × 12 months
  const annualCapacityRevenue = batteryPowerKw * params.capacityPaymentPerKwMonth * 12;

  // Event revenue: capacity × events × payment per kW
  const annualEventRevenue = batteryPowerKw * params.estimatedEventsPerYear * params.eventPaymentPerKw;

  return {
    annualCapacityRevenue,
    annualEventRevenue,
    totalAnnualRevenue: annualCapacityRevenue + annualEventRevenue,
  };
}

/**
 * Generate AI's best recommendation by evaluating multiple configurations
 * and selecting the optimal one based on comprehensive scoring
 */
export function generateBestRecommendation(
  loadProfile: LoadProfile,
  catalog: CatalogBattery[],
  demandRatePerKwMonth: number,
  rateCode?: string,
  demandResponseParams?: DemandResponseParams
): TieredRecommendation {
  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: PHYSICS-FIRST ANALYSIS - Understand the peaks (money-agnostic)
  // ═══════════════════════════════════════════════════════════════════════
  const peakCharacteristics = analyzePeakCharacteristics(loadProfile);
  const originalPeakKw = peakCharacteristics.peakKw;
  
  console.log('📊 Peak Characteristics Analysis:');
  console.log(`   Baseline: ${peakCharacteristics.baselineKw.toFixed(1)} kW`);
  console.log(`   Peak: ${peakCharacteristics.peakKw.toFixed(1)} kW`);
  console.log(`   Peak above baseline: ${peakCharacteristics.peakAboveBaselineKw.toFixed(1)} kW`);
  console.log(`   Peak events: ${peakCharacteristics.peakEvents.length}`);
  console.log(`   Max peak duration: ${peakCharacteristics.maxPeakDurationHours.toFixed(2)} hours`);
  console.log(`   Max peak intensity: ${peakCharacteristics.maxPeakIntensityKw.toFixed(1)} kW`);
  console.log(`   Required power: ${peakCharacteristics.requiredPowerKw.toFixed(1)} kW`);
  console.log(`   Required capacity: ${peakCharacteristics.requiredCapacityKwh.toFixed(1)} kWh`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: Find batteries that can physically shave the peaks
  // ═══════════════════════════════════════════════════════════════════════
  const catalogForAnalysis = catalog.map(b => ({
    modelName: b.modelName,
    manufacturer: b.manufacturer,
    capacityKwh: b.capacityKwh,
    powerKw: b.powerKw,
    efficiency: b.efficiency,
    warrantyYears: b.warrantyYears,
    price1_10: b.price1_10,
    price11_20: b.price11_20,
    price21_50: b.price21_50,
    price50Plus: b.price50Plus,
  }));
  
  const viableBatteries = findBatteriesForPeakShaving(peakCharacteristics, catalogForAnalysis);
  
  // Separate into: can fully shave peaks vs partial shaving
  const fullShaveBatteries = viableBatteries.filter(b => b.canShavePeaks);
  const partialShaveBatteries = viableBatteries.filter(b => !b.canShavePeaks);
  
  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Generate 3 tiers based on physics, then overlay financials
  // ═══════════════════════════════════════════════════════════════════════
  
  // TIER 1: MAXIMUM EFFECTIVENESS (can fully shave peaks)
  // This is what it would take if money wasn't an option
  const maxEffectivenessBattery = fullShaveBatteries.length > 0
    ? fullShaveBatteries[0] // Cheapest that can fully shave
    : viableBatteries[0]; // Best partial if none can fully shave
  
  // TIER 2: FINANCIALLY VIABLE (best value per dollar)
  // Find battery with best peak savings per dollar that still makes sense
  const financiallyViableBatteries = viableBatteries.slice(0, Math.min(10, viableBatteries.length));
  
  // TIER 3: CONSERVATIVE (smallest viable, best ROI)
  // Find smallest battery that provides meaningful peak reduction
  
  // For now, let's create 3 options:
  // 1. Maximum Effectiveness (can fully shave peaks)
  // 2. Best Value (best peak savings per dollar)
  // 3. Conservative (smallest viable)
  
  // Convert to BatterySpec format and run simulations
  const maxEffectBatterySpec: BatterySpec = {
    capacity_kwh: maxEffectivenessBattery.totalCapacityKwh,
    max_power_kw: maxEffectivenessBattery.totalPowerKw,
    round_trip_efficiency: maxEffectivenessBattery.battery.efficiency,
    min_soc: 0.10,
    max_soc: 0.90,
    depth_of_discharge: 0.90,
  };
  
  // Use baseline as threshold for maximum effectiveness (shave everything above baseline)
  const maxEffectThresholdKw = peakCharacteristics.baselineKw;
  const maxEffectSim = simulatePeakShaving(loadProfile, maxEffectBatterySpec, maxEffectThresholdKw);
  
  // For other tiers, we'll use percentage-based thresholds
  // But let's find batteries that make financial sense
  const conservativeTargetPercent = 7.5;
  const aggressiveTargetPercent = 17.5;
  
  const conservativeThresholdKw = originalPeakKw * (1 - conservativeTargetPercent / 100);
  const aggressiveThresholdKw = originalPeakKw * (1 - aggressiveTargetPercent / 100);
  
  // Find batteries for conservative and aggressive tiers
  const conservativeRequiredPowerKw = peakCharacteristics.maxPeakIntensityKw * 0.5; // 50% of peak intensity
  const conservativeRequiredCapacityKwh = conservativeRequiredPowerKw * peakCharacteristics.avgPeakDurationHours * 1.2;
  
  const aggressiveRequiredPowerKw = peakCharacteristics.maxPeakIntensityKw * 0.75; // 75% of peak intensity
  const aggressiveRequiredCapacityKwh = aggressiveRequiredPowerKw * peakCharacteristics.maxPeakDurationHours * 1.2;
  
  const conservativeBattery = findBestBatteryForTier(
    catalog,
    conservativeRequiredPowerKw,
    conservativeRequiredCapacityKwh,
    'conservative'
  );
  const aggressiveBattery = findBestBatteryForTier(
    catalog,
    aggressiveRequiredPowerKw,
    aggressiveRequiredCapacityKwh,
    'aggressive'
  );
  
  // Build battery info for max effectiveness
  const maxEffectBatteryInfo = {
    modelName: maxEffectivenessBattery.battery.modelName,
    manufacturer: maxEffectivenessBattery.battery.manufacturer,
    quantity: maxEffectivenessBattery.quantity,
    totalCapacityKwh: maxEffectivenessBattery.totalCapacityKwh,
    totalPowerKw: maxEffectivenessBattery.totalPowerKw,
    systemCost: maxEffectivenessBattery.systemCost,
  };
  
  const maxEffectFinancials = calculateTierFinancials(
    maxEffectSim,
    { info: maxEffectBatteryInfo },
    demandRatePerKwMonth,
    demandResponseParams
  );
  
  const conservativeSim = simulatePeakShaving(loadProfile, conservativeBattery.spec, conservativeThresholdKw);
  const aggressiveSim = simulatePeakShaving(loadProfile, aggressiveBattery.spec, aggressiveThresholdKw);

  // Calculate financials for each tier
  const conservativeFinancials = calculateTierFinancials(
    conservativeSim,
    conservativeBattery,
    demandRatePerKwMonth,
    demandResponseParams
  );
  const aggressiveFinancials = calculateTierFinancials(
    aggressiveSim,
    aggressiveBattery,
    demandRatePerKwMonth,
    demandResponseParams
  );

  // Build tier analyses
  // TIER 1: Maximum Effectiveness (can fully shave peaks - money-agnostic)
  const maximumEffectiveness: TierAnalysis = {
    tier: 'extreme', // Use 'extreme' as the tier name for maximum effectiveness
    batterySpec: maxEffectBatterySpec,
    batteryInfo: maxEffectBatteryInfo,
    thresholdKw: maxEffectThresholdKw,
    simulationResult: maxEffectSim,
    financials: maxEffectFinancials,
    accuracy: calculateAccuracy(maxEffectSim, maxEffectThresholdKw, originalPeakKw),
    rationale: `Maximum effectiveness: Can fully shave all peaks above baseline (${peakCharacteristics.baselineKw.toFixed(1)} kW). This is what it would take if money wasn't an option. Physically capable of ${peakCharacteristics.peakAboveBaselineKw.toFixed(1)} kW reduction.`,
  };

  // TIER 2: Best Value (best peak savings per dollar)
  const bestValue: TierAnalysis = {
    tier: 'aggressive',
    batterySpec: aggressiveBattery.spec,
    batteryInfo: aggressiveBattery.info,
    thresholdKw: aggressiveThresholdKw,
    simulationResult: aggressiveSim,
    financials: aggressiveFinancials,
    accuracy: calculateAccuracy(aggressiveSim, aggressiveThresholdKw, originalPeakKw),
    rationale: `Best value: Targets ${aggressiveTargetPercent.toFixed(1)}% peak reduction with optimal peak savings per dollar. Balanced approach for sites seeking good ROI.`,
  };

  // TIER 3: Conservative (smallest viable, best ROI)
  const conservative: TierAnalysis = {
    tier: 'conservative',
    batterySpec: conservativeBattery.spec,
    batteryInfo: conservativeBattery.info,
    thresholdKw: conservativeThresholdKw,
    simulationResult: conservativeSim,
    financials: conservativeFinancials,
    accuracy: calculateAccuracy(conservativeSim, conservativeThresholdKw, originalPeakKw),
    rationale: `Conservative: Targets ${conservativeTargetPercent.toFixed(1)}% peak reduction. Smallest viable battery with best ROI and lowest risk.`,
  };

  // Calculate load factor for S-rate eligibility
  const loadFactor = loadProfile.intervals.length > 0
    ? loadProfile.intervals.reduce((sum, i) => sum + i.kw, 0) / loadProfile.intervals.length / originalPeakKw
    : 0.5;

  // Calculate all paybacks first for normalization
  const allPaybacks = [
    maximumEffectiveness.financials.paybackYears === Infinity ? 999 : maximumEffectiveness.financials.paybackYears,
    bestValue.financials.paybackYears === Infinity ? 999 : bestValue.financials.paybackYears,
    conservative.financials.paybackYears === Infinity ? 999 : conservative.financials.paybackYears,
  ];
  const minPayback = Math.min(...allPaybacks);
  const maxPayback = Math.max(...allPaybacks);

  // Score each tier: Primary = Peak Savings per Dollar, Secondary = Payback Period
  const tierValues = [conservative, aggressive, extreme].map(tier => {
    // PRIMARY METRIC: Peak Savings per Dollar (kW reduced / $ cost)
    const peakSavingsPerDollar = tier.batteryInfo.systemCost > 0
      ? tier.financials.peakReductionKw / tier.batteryInfo.systemCost
      : 0;

    // Calculate S-rate value (if eligible but not on S-rate)
    const sRateInfo = calculateSRateValue(
      rateCode,
      tier.simulationResult.new_peak,
      tier.batteryInfo.totalCapacityKwh,
      tier.batteryInfo.totalPowerKw,
      loadFactor,
      demandRatePerKwMonth,
      loadProfile
    );

    // Calculate threshold benefits
    const thresholdInfo = detectThresholdBenefits(
      rateCode,
      tier.simulationResult.new_peak,
      originalPeakKw,
      demandRatePerKwMonth
    );

    // Total annual value = peak savings + S-rate value + threshold value
    const totalAnnualValue = tier.financials.annualSavings + (sRateInfo.annualValue || 0) + (thresholdInfo.annualValue || 0);

    // SECONDARY METRIC: Payback period (lower is better)
    const paybackYears = tier.financials.paybackYears === Infinity ? 999 : tier.financials.paybackYears;
    const paybackScore = maxPayback > minPayback
      ? 1 - (paybackYears - minPayback) / (maxPayback - minPayback)
      : 1;

    return {
      tier,
      peakSavingsPerDollar,
      sRateValue: sRateInfo.annualValue,
      thresholdValue: thresholdInfo.annualValue,
      totalAnnualValue,
      paybackYears,
      paybackScore,
    };
  });

  // Second pass: normalize and calculate overall scores
  const maxPeakSavingsPerDollar = Math.max(...tierValues.map(t => t.peakSavingsPerDollar));
  const scoredOptions = tierValues.map(t => {
    const normalizedPeakSavings = maxPeakSavingsPerDollar > 0
      ? t.peakSavingsPerDollar / maxPeakSavingsPerDollar
      : 0;

    // Overall score: 70% peak savings per dollar, 30% payback
    const overallScore = normalizedPeakSavings * 0.7 + t.paybackScore * 0.3;

    // Generate recommendation reason
    const reasons: string[] = [];
    if (t.peakSavingsPerDollar > 0) {
      reasons.push(`${(t.peakSavingsPerDollar * 1000).toFixed(2)} kW per $1,000 invested`);
    }
    if (t.paybackYears < 10) {
      reasons.push(`${t.paybackYears.toFixed(1)} year payback`);
    }
    if (t.sRateValue > 0) {
      reasons.push(`S-rate eligible: +$${t.sRateValue.toLocaleString()}/year`);
    }
    if (t.thresholdValue > 0) {
      reasons.push(`Threshold benefit: +$${t.thresholdValue.toLocaleString()}/year`);
    }

    return {
      ...t.tier,
      peakSavingsPerDollar: t.peakSavingsPerDollar,
      sRateValue: t.sRateValue,
      thresholdValue: t.thresholdValue,
      totalAnnualValue: t.totalAnnualValue,
      overallScore,
      isRecommended: false, // Will be set below
      recommendationReason: reasons.length > 0 ? reasons.join(', ') : 'Balanced performance',
    };
  });

  // Sort by overall score (peak savings per dollar weighted 70%, payback 30%)
  scoredOptions.sort((a, b) => b.overallScore - a.overallScore);

  // Mark the top option as recommended
  scoredOptions[0].isRecommended = true;

  return {
    originalPeakKw,
    options: scoredOptions,
  };
}

function generateSelectionReason(
  selected: TierAnalysis,
  conservative: TierAnalysis,
  aggressive: TierAnalysis,
  extreme: TierAnalysis
): string {
  const reasons: string[] = [];

  // ROI comparison
  if (selected.financials.roi >= aggressive.financials.roi && selected.financials.roi >= extreme.financials.roi) {
    reasons.push('excellent ROI');
  }

  // Payback comparison
  const selectedPayback = selected.financials.paybackYears === Infinity ? 999 : selected.financials.paybackYears;
  const minPayback = Math.min(
    conservative.financials.paybackYears === Infinity ? 999 : conservative.financials.paybackYears,
    aggressive.financials.paybackYears === Infinity ? 999 : aggressive.financials.paybackYears,
    extreme.financials.paybackYears === Infinity ? 999 : extreme.financials.paybackYears
  );
  if (selectedPayback <= minPayback + 1) {
    reasons.push('fastest payback period');
  }

  // NPV comparison
  if (selected.financials.npv10yr >= aggressive.financials.npv10yr && selected.financials.npv10yr >= extreme.financials.npv10yr) {
    reasons.push('strong 10-year NPV');
  }

  // Accuracy
  if (selected.accuracy.confidenceLevel === 'high') {
    reasons.push('high confidence accuracy');
  }

  // Cost efficiency
  const selectedCostPerKw = selected.financials.costPerKwReduced === Infinity ? 999999 : selected.financials.costPerKwReduced;
  const minCostPerKw = Math.min(
    conservative.financials.costPerKwReduced === Infinity ? 999999 : conservative.financials.costPerKwReduced,
    aggressive.financials.costPerKwReduced === Infinity ? 999999 : aggressive.financials.costPerKwReduced,
    extreme.financials.costPerKwReduced === Infinity ? 999999 : extreme.financials.costPerKwReduced
  );
  if (selectedCostPerKw <= minCostPerKw * 1.1) {
    reasons.push('cost-efficient per kW reduced');
  }

  // Peak reduction
  if (selected.financials.peakReductionPercent >= 15) {
    reasons.push(`significant ${selected.financials.peakReductionPercent.toFixed(1)}% peak reduction`);
  }

  if (reasons.length === 0) {
    return 'Balanced performance across all metrics';
  }

  return `Selected for: ${reasons.join(', ')}`;
}

// Keep the old function name for backward compatibility, but redirect to new function
export function generateMultiTierAnalysis(
  loadProfile: LoadProfile,
  catalog: CatalogBattery[],
  demandRatePerKwMonth: number,
  demandResponseParams?: DemandResponseParams
): BestRecommendationAnalysis {
  return generateBestRecommendation(loadProfile, catalog, demandRatePerKwMonth, demandResponseParams);
}

function findBestBatteryForTier(
  catalog: CatalogBattery[],
  requiredPowerKw: number,
  requiredCapacityKwh: number,
  tier: AnalysisTier
): {
  spec: BatterySpec;
  info: {
    modelName: string;
    manufacturer: string;
    quantity: number;
    totalCapacityKwh: number;
    totalPowerKw: number;
    systemCost: number;
  };
} {
  // Find batteries that meet or exceed requirements
  const candidates = catalog
    .map(battery => {
      // Calculate quantity needed
      const powerQuantity = Math.ceil(requiredPowerKw / battery.powerKw);
      const capacityQuantity = Math.ceil(requiredCapacityKwh / battery.capacityKwh);
      const quantity = Math.max(powerQuantity, capacityQuantity, 1);

      const totalPowerKw = battery.powerKw * quantity;
      const totalCapacityKwh = battery.capacityKwh * quantity;

      // Calculate system cost
      let unitPrice = battery.price1_10;
      if (quantity >= 50) unitPrice = battery.price50Plus;
      else if (quantity >= 21) unitPrice = battery.price21_50;
      else if (quantity >= 11) unitPrice = battery.price11_20;

      const systemCost = unitPrice * quantity;

      return {
        battery,
        quantity,
        totalPowerKw,
        totalCapacityKwh,
        systemCost,
        // Score: lower cost per kW-capacity is better
        score: systemCost / (totalPowerKw * totalCapacityKwh),
      };
    })
    .filter(c => c.totalPowerKw >= requiredPowerKw * 0.95 && c.totalCapacityKwh >= requiredCapacityKwh * 0.95)
    .sort((a, b) => a.score - b.score);

  if (candidates.length === 0) {
    // Fallback: use largest battery available
    const largest = catalog.sort((a, b) => (b.powerKw * b.capacityKwh) - (a.powerKw * a.capacityKwh))[0];
    const quantity = Math.max(
      Math.ceil(requiredPowerKw / largest.powerKw),
      Math.ceil(requiredCapacityKwh / largest.capacityKwh),
      1
    );
    let unitPrice = largest.price1_10;
    if (quantity >= 50) unitPrice = largest.price50Plus;
    else if (quantity >= 21) unitPrice = largest.price21_50;
    else if (quantity >= 11) unitPrice = largest.price11_20;

    return {
      spec: {
        capacity_kwh: largest.capacityKwh * quantity,
        max_power_kw: largest.powerKw * quantity,
        round_trip_efficiency: largest.efficiency,
        degradation_rate: 0.02,
        min_soc: 0.1,
        max_soc: 0.9,
        depth_of_discharge: 0.8,
      },
      info: {
        modelName: largest.modelName,
        manufacturer: largest.manufacturer,
        quantity,
        totalCapacityKwh: largest.capacityKwh * quantity,
        totalPowerKw: largest.powerKw * quantity,
        systemCost: unitPrice * quantity,
      },
    };
  }

  const best = candidates[0];
  return {
    spec: {
      capacity_kwh: best.totalCapacityKwh,
      max_power_kw: best.totalPowerKw,
      round_trip_efficiency: best.battery.efficiency,
      degradation_rate: 0.02,
      min_soc: 0.1,
      max_soc: 0.9,
      depth_of_discharge: 0.8,
    },
    info: {
      modelName: best.battery.modelName,
      manufacturer: best.battery.manufacturer,
      quantity: best.quantity,
      totalCapacityKwh: best.totalCapacityKwh,
      totalPowerKw: best.totalPowerKw,
      systemCost: best.systemCost,
    },
  };
}

function calculateTierFinancials(
  sim: SimulationResult,
  battery: { info: { systemCost: number; totalPowerKw: number } },
  demandRatePerKwMonth: number,
  demandResponseParams?: DemandResponseParams
): TierAnalysis['financials'] {
  const peakReductionKw = sim.original_peak - sim.new_peak;
  const peakReductionPercent = sim.original_peak > 0 ? (peakReductionKw / sim.original_peak) * 100 : 0;

  // Calculate monthly peak reduction
  const newIntervalsKw = sim.new_intervals_kw ?? sim.final_load_profile?.intervals?.map(i => i.kw) ?? [];
  const { reductionKwMonthSum, monthsCount } = computeMonthlyBillingPeakReductionKwMonthSum(
    { intervals: sim.final_load_profile?.intervals ?? [] },
    newIntervalsKw
  );
  const annualizeFactor = monthsCount > 0 ? 12 / monthsCount : 1;

  // Demand charge savings
  const annualDemandChargeSavings = (reductionKwMonthSum * annualizeFactor) * demandRatePerKwMonth;

  // Demand response revenue (if enabled)
  const drRevenue = demandResponseParams
    ? calculateDemandResponseRevenue(battery.info.totalPowerKw, demandResponseParams).totalAnnualRevenue
    : 0;

  const totalAnnualSavings = annualDemandChargeSavings + drRevenue;
  const paybackYears = totalAnnualSavings > 0 ? battery.info.systemCost / totalAnnualSavings : Infinity;
  const roi = paybackYears > 0 && Number.isFinite(paybackYears) ? (1 / paybackYears) * 100 : 0;

  // NPV over 10 years (8% discount rate)
  const discountRate = 0.08;
  let npv10yr = -battery.info.systemCost;
  for (let year = 1; year <= 10; year++) {
    // Account for degradation (2% per year)
    const degradedSavings = totalAnnualSavings * Math.pow(0.98, year - 1);
    npv10yr += degradedSavings / Math.pow(1 + discountRate, year);
  }

  const costPerKwReduced = peakReductionKw > 0 ? battery.info.systemCost / peakReductionKw : Infinity;

  return {
    peakReductionKw,
    peakReductionPercent,
    annualSavings: totalAnnualSavings,
    paybackYears,
    roi,
    npv10yr,
    costPerKwReduced,
  };
}

function calculateAccuracy(
  sim: SimulationResult,
  targetThresholdKw: number,
  originalPeakKw: number
): TierAnalysis['accuracy'] {
  const achievedReduction = originalPeakKw - sim.new_peak;
  const targetReduction = originalPeakKw - targetThresholdKw;
  const achievementPercent = targetReduction > 0 ? (achievedReduction / targetReduction) * 100 : 0;

  let confidenceLevel: 'high' | 'medium' | 'low';
  let expectedAccuracyPercent: number;
  const limitingFactors: string[] = [];

  if (achievementPercent >= 95) {
    confidenceLevel = 'high';
    expectedAccuracyPercent = 95;
  } else if (achievementPercent >= 80) {
    confidenceLevel = 'medium';
    expectedAccuracyPercent = 85;
    limitingFactors.push('Battery may be slightly undersized for worst-case events');
  } else {
    confidenceLevel = 'low';
    expectedAccuracyPercent = 70;
    limitingFactors.push('Battery likely undersized for peak events');
    limitingFactors.push('Consider larger capacity or power rating');
  }

  // Check for SOC limitations
  const socHistory = sim.battery_soc_history ?? [];
  const minSocReached = socHistory.some(soc => soc <= 0.11);
  if (minSocReached) {
    limitingFactors.push('Battery reached minimum SOC during peak events');
  }

  return {
    confidenceLevel,
    expectedAccuracyPercent,
    limitingFactors,
  };
}

