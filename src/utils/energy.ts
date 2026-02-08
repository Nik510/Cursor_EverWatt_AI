/**
 * Energy-Specific Utilities
 * Provides functions for energy unit conversions and calculations
 */

/**
 * Convert kW to MW
 */
export function kWToMW(kw: number): number {
  return kw / 1000;
}

/**
 * Convert MW to kW
 */
export function MWToKW(mw: number): number {
  return mw * 1000;
}

/**
 * Convert kWh to MWh
 */
export function kWhToMWh(kwh: number): number {
  return kwh / 1000;
}

/**
 * Convert MWh to kWh
 */
export function MWhToKWh(mwh: number): number {
  return mwh * 1000;
}

/**
 * Convert kW to kWh (assuming time in hours)
 */
export function kWToKWh(kw: number, hours: number): number {
  return kw * hours;
}

/**
 * Convert kWh to kW (assuming time in hours)
 */
export function kWhToKW(kwh: number, hours: number): number {
  if (hours === 0) return 0;
  return kwh / hours;
}

/**
 * Convert power to energy for a time interval (in minutes)
 */
export function powerToEnergy(powerKw: number, intervalMinutes: number = 15): number {
  return powerKw * (intervalMinutes / 60);
}

/**
 * Convert energy to power for a time interval (in minutes)
 */
export function energyToPower(energyKwh: number, intervalMinutes: number = 15): number {
  if (intervalMinutes === 0) return 0;
  return energyKwh / (intervalMinutes / 60);
}

/**
 * Calculate energy from power array (assuming 15-minute intervals)
 */
export function calculateEnergyFromPower(powerArray: number[], intervalMinutes: number = 15): number {
  const hours = intervalMinutes / 60;
  return powerArray.reduce((sum, power) => sum + power * hours, 0);
}

/**
 * Calculate average power from energy and time
 */
export function calculateAveragePower(energyKwh: number, hours: number): number {
  if (hours === 0) return 0;
  return energyKwh / hours;
}

/**
 * Calculate peak demand from power array
 */
export function calculatePeakDemand(powerArray: number[]): number {
  if (powerArray.length === 0) return 0;
  return Math.max(...powerArray);
}

/**
 * Calculate average demand from power array
 */
export function calculateAverageDemand(powerArray: number[]): number {
  if (powerArray.length === 0) return 0;
  const sum = powerArray.reduce((acc, val) => acc + val, 0);
  return sum / powerArray.length;
}

/**
 * Calculate load factor (average load / peak load)
 */
export function calculateLoadFactor(powerArray: number[]): number {
  if (powerArray.length === 0) return 0;
  const peak = calculatePeakDemand(powerArray);
  if (peak === 0) return 0;
  const average = calculateAverageDemand(powerArray);
  return average / peak;
}

/**
 * Calculate capacity factor (actual energy / maximum possible energy)
 */
export function calculateCapacityFactor(
  actualEnergyKwh: number,
  ratedCapacityKw: number,
  hours: number
): number {
  if (hours === 0 || ratedCapacityKw === 0) return 0;
  const maxPossibleEnergy = ratedCapacityKw * hours;
  return actualEnergyKwh / maxPossibleEnergy;
}

/**
 * Calculate round-trip efficiency
 */
export function calculateRoundTripEfficiency(
  energyOut: number,
  energyIn: number
): number {
  if (energyIn === 0) return 0;
  return energyOut / energyIn;
}

/**
 * Calculate energy savings percentage
 */
export function calculateEnergySavingsPercent(
  baselineEnergy: number,
  improvedEnergy: number
): number {
  if (baselineEnergy === 0) return 0;
  return ((baselineEnergy - improvedEnergy) / baselineEnergy) * 100;
}

/**
 * Calculate demand reduction
 */
export function calculateDemandReduction(
  baselinePeak: number,
  improvedPeak: number
): number {
  return baselinePeak - improvedPeak;
}

/**
 * Calculate demand reduction percentage
 */
export function calculateDemandReductionPercent(
  baselinePeak: number,
  improvedPeak: number
): number {
  if (baselinePeak === 0) return 0;
  return ((baselinePeak - improvedPeak) / baselinePeak) * 100;
}

/**
 * Convert tons of refrigeration to kW
 */
export function tonsToKW(tons: number, efficiencyKWPerTon: number = 0.7): number {
  return tons * efficiencyKWPerTon;
}

/**
 * Convert kW to tons of refrigeration
 */
export function kWToTons(kw: number, efficiencyKWPerTon: number = 0.7): number {
  if (efficiencyKWPerTon === 0) return 0;
  return kw / efficiencyKWPerTon;
}

/**
 * Convert MBH (thousands of BTU per hour) to kW
 */
export function MBHToKW(mbh: number): number {
  // 1 MBH = 0.293071 kW
  return mbh * 0.293071;
}

/**
 * Convert kW to MBH
 */
export function kWToMBH(kw: number): number {
  return kw / 0.293071;
}

/**
 * Convert BTU to kWh
 */
export function BTUToKWh(btu: number): number {
  // 1 BTU = 0.000293071 kWh
  return btu * 0.000293071;
}

/**
 * Convert kWh to BTU
 */
export function KWhToBTU(kwh: number): number {
  return kwh / 0.000293071;
}

/**
 * Calculate COP (Coefficient of Performance) from efficiency
 */
export function calculateCOP(efficiencyKWPerTon: number): number {
  // COP = 3.517 / (kW/ton)
  if (efficiencyKWPerTon === 0) return 0;
  return 3.517 / efficiencyKWPerTon;
}

/**
 * Calculate efficiency (kW/ton) from COP
 */
export function calculateEfficiencyFromCOP(cop: number): number {
  // kW/ton = 3.517 / COP
  if (cop === 0) return 0;
  return 3.517 / cop;
}

/**
 * Calculate EER (Energy Efficiency Ratio) from COP
 */
export function calculateEER(cop: number): number {
  // EER = COP × 3.412
  return cop * 3.412;
}

/**
 * Calculate COP from EER
 */
export function calculateCOPFromEER(eer: number): number {
  return eer / 3.412;
}

/**
 * Calculate annual energy consumption from power and operating hours
 */
export function calculateAnnualEnergy(
  powerKw: number,
  operatingHours: number
): number {
  return powerKw * operatingHours;
}

/**
 * Calculate energy cost
 */
export function calculateEnergyCost(
  energyKwh: number,
  ratePerKwh: number
): number {
  return energyKwh * ratePerKwh;
}

/**
 * Calculate demand charge cost
 */
export function calculateDemandCharge(
  peakDemandKw: number,
  ratePerKw: number
): number {
  return peakDemandKw * ratePerKw;
}

/**
 * Normalize power units (auto-detect and convert to kW)
 */
export function normalizeToKW(value: number, currentUnit: 'kW' | 'MW'): number {
  return currentUnit === 'MW' ? MWToKW(value) : value;
}

/**
 * Normalize energy units (auto-detect and convert to kWh)
 */
export function normalizeToKWh(value: number, currentUnit: 'kWh' | 'MWh'): number {
  return currentUnit === 'MWh' ? MWhToKWh(value) : value;
}

/**
 * Detect power unit from value (heuristic)
 */
export function detectPowerUnit(value: number): 'kW' | 'MW' {
  return value >= 1000 ? 'MW' : 'kW';
}

/**
 * Detect energy unit from value (heuristic)
 */
export function detectEnergyUnit(value: number): 'kWh' | 'MWh' {
  return value >= 1000 ? 'MWh' : 'kWh';
}
