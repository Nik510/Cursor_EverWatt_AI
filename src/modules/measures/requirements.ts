import type { MeasureType } from './types';

export interface MeasureRequirement {
  measureType: MeasureType;
  required: Array<{
    kind: 'telemetry' | 'asset_field';
    /**
     * Examples:
     * - telemetry.electricity.interval15min.kW
     * - asset.ahu.properties.airflowCfm
     */
    key: string;
    description: string;
  }>;
}

export const MEASURE_REQUIREMENTS: Record<MeasureType, MeasureRequirement> = {
  VFD_RETROFIT: {
    measureType: 'VFD_RETROFIT',
    required: [
      { kind: 'asset_field', key: 'asset.fan.properties.motorHp', description: 'motor size (hp/kW) for target fans (baseline properties)' },
    ],
  },
  PUMP_VFD: {
    measureType: 'PUMP_VFD',
    required: [
      { kind: 'asset_field', key: 'asset.pump.properties.motorHp', description: 'motor size (hp/kW) for target pumps (baseline properties)' },
    ],
  },
  AHU_SCHEDULE_OPT: {
    measureType: 'AHU_SCHEDULE_OPT',
    required: [
      { kind: 'telemetry', key: 'telemetry.electricity.interval15min.kW', description: 'utility interval electricity data (15-min or hourly)' },
      { kind: 'asset_field', key: 'asset.ahu.properties.schedule', description: 'AHU operating schedule (baseline properties or building schedule)' },
    ],
  },
  VAV_RESET: {
    measureType: 'VAV_RESET',
    required: [
      { kind: 'telemetry', key: 'telemetry.electricity.interval15min.kW', description: 'utility interval electricity data (15-min or hourly)' },
      { kind: 'asset_field', key: 'asset.vav.properties.minFlowCfm', description: 'VAV minimum flow / turndown info (baseline properties)' },
    ],
  },
  CHILLED_WATER_RESET: {
    measureType: 'CHILLED_WATER_RESET',
    required: [
      { kind: 'telemetry', key: 'telemetry.electricity.interval15min.kW', description: 'utility interval electricity data (15-min or hourly)' },
      { kind: 'asset_field', key: 'asset.chiller.properties.chwsTempF', description: 'chilled water supply temperature (baseline properties)' },
    ],
  },
  HOT_WATER_RESET: {
    measureType: 'HOT_WATER_RESET',
    required: [
      { kind: 'telemetry', key: 'telemetry.electricity.interval15min.kW', description: 'utility interval electricity data (15-min or hourly)' },
      { kind: 'asset_field', key: 'asset.boiler.properties.hwstTempF', description: 'hot water supply temperature / reset range (baseline properties)' },
    ],
  },
  OCCUPANCY_CONTROLS: {
    measureType: 'OCCUPANCY_CONTROLS',
    required: [{ kind: 'asset_field', key: 'asset.lightingFixture.properties.fixtureWatts', description: 'existing fixture wattage (per fixture or per lamp)' }],
  },
  LIGHTING_RETROFIT: {
    measureType: 'LIGHTING_RETROFIT',
    required: [{ kind: 'asset_field', key: 'asset.lightingFixture.properties.fixtureWatts', description: 'existing fixture wattage (per fixture or per lamp)' }],
  },
  EMS_TUNING: {
    measureType: 'EMS_TUNING',
    required: [
      { kind: 'telemetry', key: 'telemetry.electricity.interval15min.kW', description: 'utility interval electricity data (15-min or hourly)' },
      { kind: 'asset_field', key: 'asset.ahu.properties.schedule', description: 'building or AHU operating schedule (needed to validate schedule changes)' },
    ],
  },
  CHILLER_PLANT_OPT: {
    measureType: 'CHILLER_PLANT_OPT',
    required: [
      { kind: 'telemetry', key: 'telemetry.electricity.interval15min.kW', description: 'utility interval electricity data (15-min or hourly)' },
      { kind: 'asset_field', key: 'asset.chiller.properties.tonnage', description: 'chiller capacity / tonnage (baseline properties)' },
    ],
  },
  BATTERY_PEAK_SHAVE: {
    measureType: 'BATTERY_PEAK_SHAVE',
    required: [
      { kind: 'telemetry', key: 'telemetry.electricity.interval15min.kW', description: 'utility interval electricity data (15-min or hourly)' },
      {
        kind: 'telemetry',
        key: 'telemetry.electricity.interval15min.kW.demandPeaks',
        description: 'interval kW demand peaks (to size battery power for peak shaving)',
      },
    ],
  },
  DEMAND_RESPONSE_ENROLLMENT: {
    measureType: 'DEMAND_RESPONSE_ENROLLMENT',
    required: [{ kind: 'telemetry', key: 'telemetry.electricity.interval15min.kW', description: 'utility interval electricity data (15-min or hourly)' }],
  },
  RATE_CHANGE: {
    measureType: 'RATE_CHANGE',
    required: [],
  },
  LOAD_SHIFTING_STRATEGY: {
    measureType: 'LOAD_SHIFTING_STRATEGY',
    required: [{ kind: 'telemetry', key: 'telemetry.electricity.interval15min.kW', description: 'utility interval electricity data (15-min or hourly)' }],
  },
  OPTION_S_EVALUATION: {
    measureType: 'OPTION_S_EVALUATION',
    required: [{ kind: 'telemetry', key: 'telemetry.electricity.interval15min.kW', description: 'utility interval electricity data (15-min or hourly)' }],
  },
  UTILITY_PROGRAM_ENROLLMENT: {
    measureType: 'UTILITY_PROGRAM_ENROLLMENT',
    required: [],
  },
  STEAM_OPTIMIZATION: {
    measureType: 'STEAM_OPTIMIZATION',
    required: [{ kind: 'asset_field', key: 'asset.other.properties.steamLoad', description: 'steam system load / operating profile (baseline properties)' }],
  },
  RADIATOR_TRV: {
    measureType: 'RADIATOR_TRV',
    required: [{ kind: 'asset_field', key: 'asset.other.properties.heatingZones', description: 'heating zone inventory / distribution details (baseline properties)' }],
  },
  OTHER: { measureType: 'OTHER', required: [] },
};

