/**
 * EPA-based CO2e conversions + equivalencies.
 *
 * Sources (EPA):
 * - Greenhouse Gas Equivalencies Calculator: Calculations and References
 *   https://www.epa.gov/energy/greenhouse-gases-equivalencies-calculator-calculations-and-references
 *
 * Notes:
 * - Electricity has multiple factors; EPA provides "Electricity Used" and "Electricity Avoided".
 * - Values can change over time as EPA updates assumptions; keep these constants easy to update.
 */

export type ElectricityFactorMode = 'avoided' | 'used' | 'custom';

export type CarbonInputs = {
  avoidedKwh: number; // kWh
  avoidedTherms: number; // therms
  electricityFactorMode: ElectricityFactorMode;
  customElectricityTonsPerKwh?: number; // metric tons CO2e per kWh
};

export type CarbonTotals = {
  electricityMtCo2e: number;
  gasMtCo2e: number;
  totalMtCo2e: number;
  totalKgCo2e: number;
  totalLbCo2e: number;
};

export type CarbonEquivalencies = {
  urbanTreeSeedlings10yr: number; // seedlings grown for 10 years
  passengerVehiclesDrivenForOneYear: number;
  gallonsOfGasolineBurned: number;
  householdsElectricityUseForOneYear: number;
  propaneCylinders: number; // 16-lb cylinders
  railcarsOfCoalBurned: number;
};

const METRIC_TON_TO_KG = 1000;
const METRIC_TON_TO_LB = 2204.6226218;

/**
 * EPA (national avg) "Electricity Avoided" factor.
 * Web search snippet: 0.000672 metric tons CO2 per kWh.
 */
export const EPA_ELECTRICITY_AVOIDED_TONS_PER_KWH = 0.000672;

/**
 * EPA (national avg) "Electricity Used" factor.
 * Web search snippet: 0.000394 metric tons CO2 per kWh.
 */
export const EPA_ELECTRICITY_USED_TONS_PER_KWH = 0.000394;

/**
 * EPA natural gas combustion: 0.005302 metric tons CO2 per therm (~5.3 kg CO2/therm).
 */
export const EPA_NATURAL_GAS_TONS_PER_THERM = 0.005302;

/**
 * EPA urban tree seedling grown for 10 years: 0.060 metric tons CO2 sequestered.
 */
export const EPA_TREE_SEEDLING_TONS_CO2_10YR = 0.060;

/**
 * EPA passenger vehicle: ~4.20 metric tons CO2e per year.
 */
export const EPA_PASSENGER_VEHICLE_TONS_CO2E_PER_YEAR = 4.20;

/**
 * EPA gasoline: 0.00889 metric tons CO2 per gallon.
 */
export const EPA_GASOLINE_TONS_CO2_PER_GALLON = 0.00889;

/**
 * EPA average household electricity emissions: 4.798 metric tons CO2e per year.
 */
export const EPA_HOUSEHOLD_ELECTRICITY_TONS_CO2E_PER_YEAR = 4.798;

/**
 * EPA 16-lb propane cylinder: 0.022 metric tons CO2.
 */
export const EPA_PROPANE_CYLINDER_TONS_CO2 = 0.022;

/**
 * EPA average railcar of coal burned: 180.4 metric tons CO2.
 */
export const EPA_RAILCAR_COAL_TONS_CO2 = 180.4;

export function getElectricityFactorTonsPerKwh(input: CarbonInputs): number {
  if (input.electricityFactorMode === 'used') return EPA_ELECTRICITY_USED_TONS_PER_KWH;
  if (input.electricityFactorMode === 'custom') {
    const n = Number(input.customElectricityTonsPerKwh);
    return Number.isFinite(n) && n > 0 ? n : EPA_ELECTRICITY_AVOIDED_TONS_PER_KWH;
  }
  return EPA_ELECTRICITY_AVOIDED_TONS_PER_KWH;
}

export function calculateCarbonTotals(input: CarbonInputs): CarbonTotals {
  const kwh = Number(input.avoidedKwh || 0);
  const therms = Number(input.avoidedTherms || 0);

  const electricityFactor = getElectricityFactorTonsPerKwh(input);

  const electricityMtCo2e = Math.max(0, kwh) * electricityFactor;
  const gasMtCo2e = Math.max(0, therms) * EPA_NATURAL_GAS_TONS_PER_THERM;
  const totalMtCo2e = electricityMtCo2e + gasMtCo2e;

  return {
    electricityMtCo2e,
    gasMtCo2e,
    totalMtCo2e,
    totalKgCo2e: totalMtCo2e * METRIC_TON_TO_KG,
    totalLbCo2e: totalMtCo2e * METRIC_TON_TO_LB,
  };
}

export function calculateEpaEquivalencies(totalMtCo2e: number): CarbonEquivalencies {
  const t = Number(totalMtCo2e || 0);
  const safe = Number.isFinite(t) && t > 0 ? t : 0;

  return {
    urbanTreeSeedlings10yr: safe / EPA_TREE_SEEDLING_TONS_CO2_10YR,
    passengerVehiclesDrivenForOneYear: safe / EPA_PASSENGER_VEHICLE_TONS_CO2E_PER_YEAR,
    gallonsOfGasolineBurned: safe / EPA_GASOLINE_TONS_CO2_PER_GALLON,
    householdsElectricityUseForOneYear: safe / EPA_HOUSEHOLD_ELECTRICITY_TONS_CO2E_PER_YEAR,
    propaneCylinders: safe / EPA_PROPANE_CYLINDER_TONS_CO2,
    railcarsOfCoalBurned: safe / EPA_RAILCAR_COAL_TONS_CO2,
  };
}

