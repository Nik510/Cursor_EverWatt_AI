import type { BatteryEngineConfigV1 } from './types';

export const batteryEngineVersionTagV1 = 'storage_opportunity_pack_v1.0' as const;

export const defaultBatteryEngineConfigV1: BatteryEngineConfigV1 = {
  rte: 0.9,
  maxCyclesPerDay: 1,
  dispatchDaysPerYear: 260,
  demandWindowStrategy: 'WINDOW_AROUND_DAILY_PEAK_V1',
  drTopEventDays: 10,
  drWindowDurationHours: 2,
};

