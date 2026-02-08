/**
 * Lighting Retrofit Calculations
 * Implements calculations for LED retrofits and networked controls
 */

export interface LightingSystemInput {
  type: 'retrofit' | 'controls';
  name: string;
  currentWattage: number; // watts per fixture
  proposedWattage: number; // watts per fixture
  fixtureCount: number;
  operatingHours: number; // hours per year
  energyCost: number; // $/kWh
  controlsSavings?: number; // % savings from controls (0-100)
}

export interface LightingCalculationResult {
  annualSavings: number;
  paybackYears: number;
  projectCost: number;
  npv10: number;
  co2Reduction: number; // tons/year
  kwhReduction: number;
  annualEnergyBaseline: number;
  annualEnergyProposed: number;
}

/**
 * Calculate savings for a single lighting system
 */
export function calculateLightingSavings(system: LightingSystemInput): LightingCalculationResult {
  let annualSavings = 0;
  let projectCost = 0;
  let kwhReduction = 0;

  if (system.type === 'retrofit') {
    // Retrofit: Energy reduction from lower wattage
    const currentEnergy = (system.currentWattage * system.fixtureCount * system.operatingHours) / 1000; // kWh
    const proposedEnergy = (system.proposedWattage * system.fixtureCount * system.operatingHours) / 1000; // kWh
    kwhReduction = currentEnergy - proposedEnergy;
    annualSavings = kwhReduction * system.energyCost;
    
    // Estimate project cost: $50-100 per fixture for LED retrofit
    projectCost = system.fixtureCount * 75;
  } else if (system.type === 'controls') {
    // Controls: Energy reduction from occupancy/dimming (same wattage, less runtime)
    const baselineEnergy = (system.currentWattage * system.fixtureCount * system.operatingHours) / 1000; // kWh
    const savingsPercent = system.controlsSavings || 30;
    kwhReduction = baselineEnergy * (savingsPercent / 100);
    annualSavings = kwhReduction * system.energyCost;
    
    // Estimate project cost: $100-200 per fixture for networked controls
    projectCost = system.fixtureCount * 150;
  }

  const annualEnergyBaseline = (system.currentWattage * system.fixtureCount * system.operatingHours) / 1000;
  const annualEnergyProposed = annualEnergyBaseline - kwhReduction;

  const paybackYears = annualSavings > 0 ? projectCost / annualSavings : Infinity;
  
  // Simple NPV calculation (10 years, 5% discount rate)
  const discountRate = 0.05;
  let npv10 = -projectCost;
  for (let year = 1; year <= 10; year++) {
    npv10 += annualSavings / Math.pow(1 + discountRate, year);
  }

  // CO2: ~0.4 kg CO2 per kWh (grid average)
  const co2Reduction = (kwhReduction * 0.4) / 1000; // tons CO2

  return {
    annualSavings,
    paybackYears: paybackYears === Infinity ? 0 : paybackYears,
    projectCost,
    npv10,
    co2Reduction,
    kwhReduction,
    annualEnergyBaseline,
    annualEnergyProposed,
  };
}

/**
 * Calculate aggregated savings for multiple lighting systems
 */
export function calculateAggregateLightingSavings(systems: LightingSystemInput[]): LightingCalculationResult {
  let totalSavings = 0;
  let totalCost = 0;
  let totalCO2 = 0;
  let totalKwh = 0;
  let totalBaseline = 0;
  let totalProposed = 0;

  systems.forEach(system => {
    const result = calculateLightingSavings(system);
    totalSavings += result.annualSavings;
    totalCost += result.projectCost;
    totalCO2 += result.co2Reduction;
    totalKwh += result.kwhReduction;
    totalBaseline += result.annualEnergyBaseline;
    totalProposed += result.annualEnergyProposed;
  });

  const avgPayback = totalSavings > 0 ? totalCost / totalSavings : Infinity;
  const npv10 = (totalSavings * 7.72) - totalCost; // Simplified NPV (10 years, 5%)

  return {
    annualSavings: totalSavings,
    paybackYears: avgPayback === Infinity ? 0 : avgPayback,
    projectCost: totalCost,
    npv10,
    co2Reduction: totalCO2,
    kwhReduction: totalKwh,
    annualEnergyBaseline: totalBaseline,
    annualEnergyProposed: totalProposed,
  };
}

