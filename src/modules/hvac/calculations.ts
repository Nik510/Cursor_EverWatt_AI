/**
 * HVAC Energy Efficiency Calculations
 * Implements calculations for chiller, boiler, and VRF systems
 */

export interface HVACSystemInput {
  type: 'chiller' | 'boiler' | 'vrf';
  name: string;
  currentEfficiency: number;
  proposedEfficiency: number;
  capacity: number; // tons for chiller/vrf, MBH for boiler
  operatingHours: number;
  energyCost: number; // $/kWh for chiller/vrf, $/therm for boiler
}

export interface HVACCalculationResult {
  annualSavings: number;
  paybackYears: number;
  projectCost: number;
  npv10: number;
  co2Reduction: number; // tons/year
  energyReduction?: number; // kWh or therms
  annualEnergyBaseline?: number;
  annualEnergyProposed?: number;
}

/**
 * Calculate savings for a single HVAC system
 */
export function calculateHVACSavings(system: HVACSystemInput): HVACCalculationResult {
  let annualSavings = 0;
  let projectCost = 0;
  let co2Reduction = 0;
  let energyReduction = 0;
  let annualEnergyBaseline = 0;
  let annualEnergyProposed = 0;

  if (system.type === 'chiller') {
    // Chiller: Energy = Capacity (tons) × Efficiency (kW/ton) × Hours
    annualEnergyBaseline = system.capacity * system.currentEfficiency * system.operatingHours; // kWh
    annualEnergyProposed = system.capacity * system.proposedEfficiency * system.operatingHours; // kWh
    energyReduction = annualEnergyBaseline - annualEnergyProposed;
    annualSavings = energyReduction * system.energyCost;
    
    // Estimate project cost: $500-800 per ton for chiller replacement
    projectCost = system.capacity * 600;
    
    // CO2: ~0.4 kg CO2 per kWh (grid average)
    co2Reduction = (energyReduction * 0.4) / 1000; // tons CO2
  } else if (system.type === 'boiler') {
    // Boiler: Energy = Capacity (MBH) × Hours / Efficiency
    // 1 MBH = 100,000 BTU/hr = 0.1 MMBTU/hr
    annualEnergyBaseline = (system.capacity * system.operatingHours * 0.1) / system.currentEfficiency; // MMBTU
    annualEnergyProposed = (system.capacity * system.operatingHours * 0.1) / system.proposedEfficiency; // MMBTU
    energyReduction = annualEnergyBaseline - annualEnergyProposed; // MMBTU
    const thermReduction = energyReduction * 10; // 1 MMBTU = 10 therms
    annualSavings = thermReduction * system.energyCost;
    energyReduction = thermReduction; // Return in therms for clarity
    
    // Estimate project cost: $100-150 per MBH for boiler replacement
    projectCost = system.capacity * 125;
    
    // CO2: ~5.3 kg CO2 per therm of natural gas
    co2Reduction = (thermReduction * 5.3) / 1000; // tons CO2
  } else if (system.type === 'vrf') {
    // VRF: Converting from gas (AFUE) to electric (COP)
    // Gas energy: Capacity × Hours / AFUE
    // Electric energy: Capacity × Hours / (COP × 3.412) [converting COP to efficiency]
    const gasEnergy = (system.capacity * system.operatingHours * 0.1) / system.currentEfficiency; // MMBTU
    const electricEnergy = (system.capacity * system.operatingHours * 0.1) / (system.proposedEfficiency * 3.412); // MMBTU equivalent
    energyReduction = gasEnergy - electricEnergy; // MMBTU
    const thermReduction = energyReduction * 10; // therms saved
    const gasSavings = thermReduction * system.energyCost; // gas cost savings
    const electricCost = (system.capacity * system.operatingHours * 0.293) / system.proposedEfficiency * system.energyCost; // kWh × $/kWh
    annualSavings = gasSavings - electricCost; // net savings
    annualEnergyBaseline = gasEnergy;
    annualEnergyProposed = electricEnergy;
    
    // Estimate project cost: $3000-4000 per ton for VRF installation
    projectCost = system.capacity * 3500;
    
    // CO2: Gas emissions minus electric emissions (assuming cleaner grid)
    const gasCO2 = (thermReduction * 5.3) / 1000; // tons CO2 from gas
    const electricCO2 = (electricEnergy * 10 * 0.4) / 1000; // tons CO2 from electric (grid average)
    co2Reduction = gasCO2 - electricCO2; // net reduction
  }

  const paybackYears = annualSavings > 0 ? projectCost / annualSavings : Infinity;
  
  // Simple NPV calculation (10 years, 5% discount rate)
  const discountRate = 0.05;
  let npv10 = -projectCost;
  for (let year = 1; year <= 10; year++) {
    npv10 += annualSavings / Math.pow(1 + discountRate, year);
  }

  return {
    annualSavings,
    paybackYears: paybackYears === Infinity ? 0 : paybackYears,
    projectCost,
    npv10,
    co2Reduction,
    energyReduction,
    annualEnergyBaseline,
    annualEnergyProposed,
  };
}

/**
 * Calculate aggregated savings for multiple HVAC systems
 */
export function calculateAggregateHVACSavings(systems: HVACSystemInput[]): HVACCalculationResult {
  let totalSavings = 0;
  let totalCost = 0;
  let totalCO2 = 0;

  systems.forEach(system => {
    const result = calculateHVACSavings(system);
    totalSavings += result.annualSavings;
    totalCost += result.projectCost;
    totalCO2 += result.co2Reduction;
  });

  const avgPayback = totalSavings > 0 ? totalCost / totalSavings : Infinity;
  const npv10 = (totalSavings * 7.72) - totalCost; // Simplified NPV (10 years, 5%)

  return {
    annualSavings: totalSavings,
    paybackYears: avgPayback === Infinity ? 0 : avgPayback,
    projectCost: totalCost,
    npv10,
    co2Reduction: totalCO2,
  };
}

