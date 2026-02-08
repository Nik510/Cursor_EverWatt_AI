/**
 * Energy Intelligence Module Types
 * Types for multi-source data collection, analysis, and equipment fit assessment
 */

// =============================================================================
// Data Point Types
// =============================================================================

export interface IntervalDataPoint {
  timestamp: Date;
  demandKw: number;
  usageKwh: number;
  temperature?: number;
}

export interface SolarDataPoint {
  timestamp: Date;
  generationKwh: number;
  irradiance?: number;
  temperature?: number;
}

export interface ThermsDataPoint {
  date: Date;
  therms: number;
  cost?: number;
  billPeriodDays?: number;
}

export interface WeatherDataPoint {
  date: Date;
  avgTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  humidity?: number;
  cloudCover?: number;
  heatingDegreeDays?: number;
  coolingDegreeDays?: number;
}

// =============================================================================
// Manual Input Types
// =============================================================================

export type HVACSystemType = 
  | 'packaged_rtu'
  | 'split_system'
  | 'mini_split'
  | 'chiller'
  | 'vrf'
  | 'boiler_heating'
  | 'heat_pump'
  | 'ptac'
  | 'evaporative'
  | 'unknown';

// =============================================================================
// Facility Profile Types for AI Analysis
// =============================================================================

export type FacilityType =
  | 'hospital'
  | 'office'
  | 'manufacturing'
  | 'retail'
  | 'warehouse'
  | 'school'
  | 'hotel'
  | 'data_center'
  | 'laboratory'
  | 'grocery'
  | 'senior_living'
  | 'multifamily'
  | 'restaurant'
  | 'cold_storage'
  | 'other';

export type ClimateZone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export type PrimaryEnergyConcern =
  | 'demand_charges'
  | 'usage_reduction'
  | 'decarbonization'
  | 'backup_power'
  | 'rate_optimization'
  | 'sustainability_goals'
  | 'regulatory_compliance';

export type KnownEquipmentType =
  | 'chillers'
  | 'rtus'
  | 'boilers'
  | 'vrf'
  | 'lighting_fluorescent'
  | 'lighting_led'
  | 'compressed_air'
  | 'refrigeration'
  | 'data_center_cooling'
  | 'process_heating'
  | 'solar_pv'
  | 'battery_storage'
  | 'ev_chargers';

export interface FacilityProfile {
  facilityType: FacilityType | null;
  climateZone: ClimateZone | null;
  buildingAge: 'pre_1980' | '1980_2000' | '2000_2010' | 'post_2010' | null;
  operatingSchedule: '24_7' | 'business_hours' | 'extended_hours' | 'seasonal' | null;
  knownEquipment: KnownEquipmentType[];
  primaryEnergyConcern: PrimaryEnergyConcern | null;
}

export type OccupancyType =
  | 'office'
  | 'retail'
  | 'industrial'
  | 'warehouse'
  | 'healthcare'
  | 'education'
  | 'hospitality'
  | 'multifamily'
  | 'restaurant'
  | 'grocery'
  | 'data_center'
  | 'other';

export type OperatingSchedule =
  | '24_7'
  | '8_to_5_weekdays'
  | '8_to_5_daily'
  | 'extended_hours'
  | 'seasonal'
  | 'custom';

export interface ManualFacilityData {
  // Building Information
  squareFootage: number | null;
  buildingAge: number | null;
  yearBuilt: number | null;
  numberOfFloors: number | null;
  
  // Operating Profile
  occupancyType: OccupancyType | null;
  operatingSchedule: OperatingSchedule | null;
  customScheduleDescription: string | null;
  averageOccupancy: number | null; // percentage 0-100
  
  // HVAC System
  hvacType: HVACSystemType | null;
  hvacSizeTons: number | null;
  hvacAge: number | null;
  multipleHvacUnits: boolean | null;
  numberOfHvacUnits: number | null;
  hasRoofEquipment: boolean | null;
  roofEquipmentNotes: string | null;
  
  // Energy Profile (fallback if no interval data)
  avgMonthlyKwh: number | null;
  peakDemandKw: number | null;
  avgMonthlyBill: number | null;
  rateSchedule: string | null;
  
  // Gas Usage
  hasGasService: boolean | null;
  avgMonthlyTherms: number | null;
  
  // Solar
  hasExistingSolar: boolean | null;
  solarSystemSizeKw: number | null;
  
  // Additional Notes
  notes: string | null;
}

// =============================================================================
// Facility Verification
// =============================================================================

export interface FacilityCoordinates {
  lat: number;
  lng: number;
  address?: string;
  placeId?: string;
}

export interface SatelliteVerification {
  hasVisibleRoofEquipment: boolean | null;
  roofCondition: 'good' | 'fair' | 'poor' | 'unknown' | null;
  estimatedRoofArea: number | null; // sq ft
  parkingAvailable: boolean | null;
  notes: string | null;
}

// =============================================================================
// Upload Status Types
// =============================================================================

export interface DataSourceStatus {
  isUploaded: boolean;
  fileName: string | null;
  recordCount: number;
  dateRange: { start: Date; end: Date } | null;
  error: string | null;
}

export interface AllDataSources {
  interval: DataSourceStatus;
  usage: DataSourceStatus;
  solar: DataSourceStatus;
  therms: DataSourceStatus;
  weather: DataSourceStatus;
  manual: boolean;
}

// =============================================================================
// Equipment Fit Assessment Types
// =============================================================================

export interface FitAssessment {
  isGoodFit: boolean;
  fitScore: number; // 0-100
  reasons: string[];
  recommendations: string[];
  excludedTechnologies: string[];
  warnings: string[];
}

export interface TechnologyFitResult {
  technology: string;
  isApplicable: boolean;
  fitScore: number;
  reasons: string[];
  excludeReason: string | null;
}

// =============================================================================
// Analysis Configuration
// =============================================================================

export interface AnalysisConfig {
  includeIntervalData: boolean;
  includeSolarData: boolean;
  includeThermsData: boolean;
  includeWeatherData: boolean;
  useManualInputs: boolean;
  granularity: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

// =============================================================================
// Combined Analysis Input
// =============================================================================

export interface EnergyIntelligenceInput {
  // Data Sources
  intervalData: IntervalDataPoint[];
  solarData: SolarDataPoint[];
  thermsData: ThermsDataPoint[];
  weatherData: WeatherDataPoint[];
  
  // Manual Inputs
  manualInputs: ManualFacilityData;
  
  // Facility Verification
  facilityCoordinates: FacilityCoordinates | null;
  satelliteVerification: SatelliteVerification | null;
  
  // Customer Info
  customerName: string;
  siteAddress: string;
  
  // Analysis Config
  config: AnalysisConfig;
}

// =============================================================================
// Utility Functions
// =============================================================================

export function createEmptyManualInputs(): ManualFacilityData {
  return {
    squareFootage: null,
    buildingAge: null,
    yearBuilt: null,
    numberOfFloors: null,
    occupancyType: null,
    operatingSchedule: null,
    customScheduleDescription: null,
    averageOccupancy: null,
    hvacType: null,
    hvacSizeTons: null,
    hvacAge: null,
    multipleHvacUnits: null,
    numberOfHvacUnits: null,
    hasRoofEquipment: null,
    roofEquipmentNotes: null,
    avgMonthlyKwh: null,
    peakDemandKw: null,
    avgMonthlyBill: null,
    rateSchedule: null,
    hasGasService: null,
    avgMonthlyTherms: null,
    hasExistingSolar: null,
    solarSystemSizeKw: null,
    notes: null,
  };
}

export function createEmptyDataSourceStatus(): DataSourceStatus {
  return {
    isUploaded: false,
    fileName: null,
    recordCount: 0,
    dateRange: null,
    error: null,
  };
}

export function createEmptyAllDataSources(): AllDataSources {
  return {
    interval: createEmptyDataSourceStatus(),
    usage: createEmptyDataSourceStatus(),
    solar: createEmptyDataSourceStatus(),
    therms: createEmptyDataSourceStatus(),
    weather: createEmptyDataSourceStatus(),
    manual: false,
  };
}

export function hasMinimumDataForAnalysis(
  sources: AllDataSources,
  manualInputs: ManualFacilityData
): boolean {
  // Has interval data uploaded
  if (sources.interval.isUploaded && sources.interval.recordCount > 0) {
    return true;
  }
  
  // Has manual energy inputs as fallback
  if (manualInputs.avgMonthlyKwh && manualInputs.peakDemandKw) {
    return true;
  }
  
  return false;
}

export function createEmptyFacilityProfile(): FacilityProfile {
  return {
    facilityType: null,
    climateZone: null,
    buildingAge: null,
    operatingSchedule: null,
    knownEquipment: [],
    primaryEnergyConcern: null,
  };
}

// Climate zone lookup by California region
export const CALIFORNIA_CLIMATE_ZONES: Record<string, ClimateZone> = {
  'Arcata': 1,
  'Santa Rosa': 2,
  'Oakland': 3,
  'San Jose': 4,
  'Santa Maria': 5,
  'Torrance': 6,
  'San Diego': 7,
  'Fullerton': 8,
  'Burbank': 9,
  'Riverside': 10,
  'Red Bluff': 11,
  'Sacramento': 12,
  'Fresno': 13,
  'Palmdale': 14,
  'Palm Springs': 15,
  'Blue Canyon': 16,
};

// Facility type display names
export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  hospital: 'Hospital / Healthcare',
  office: 'Commercial Office',
  manufacturing: 'Manufacturing / Industrial',
  retail: 'Retail Store',
  warehouse: 'Warehouse / Distribution',
  school: 'School / Education',
  hotel: 'Hotel / Hospitality',
  data_center: 'Data Center',
  laboratory: 'Laboratory / R&D',
  grocery: 'Grocery / Supermarket',
  senior_living: 'Senior Living / Assisted',
  multifamily: 'Multifamily Residential',
  restaurant: 'Restaurant / Food Service',
  cold_storage: 'Cold Storage / Refrigerated',
  other: 'Other',
};
