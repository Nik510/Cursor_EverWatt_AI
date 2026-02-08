/**
 * Canonical Measure schema (v1)
 *
 * Deterministic only. No LLM dependencies.
 */

export type MeasureType =
  | 'VFD_RETROFIT'
  | 'AHU_SCHEDULE_OPT'
  | 'VAV_RESET'
  | 'CHILLED_WATER_RESET'
  | 'HOT_WATER_RESET'
  | 'OCCUPANCY_CONTROLS'
  | 'LIGHTING_RETROFIT'
  | 'EMS_TUNING'
  | 'BATTERY_PEAK_SHAVE'
  | 'DEMAND_RESPONSE_ENROLLMENT'
  | 'RATE_CHANGE'
  | 'LOAD_SHIFTING_STRATEGY'
  | 'OPTION_S_EVALUATION'
  | 'UTILITY_PROGRAM_ENROLLMENT'
  | 'STEAM_OPTIMIZATION'
  | 'RADIATOR_TRV'
  | 'PUMP_VFD'
  | 'CHILLER_PLANT_OPT'
  /**
   * Fallback when a completed project measure cannot be reliably mapped.
   * Keep deterministic; do not invent a more specific type.
   */
  | 'OTHER';

export interface Measure {
  measureType: MeasureType;
  /** Original human label/name from source data (preserved). */
  label?: string;
  /** Normalized tags (always defined; empty allowed). */
  tags: string[];
  /** Deterministic parameters (always defined; empty allowed). */
  parameters: Record<string, number | string | boolean | null>;
  affectedAssetIds?: string[];
  /** Align to Project Builder `AssetNode.type` where possible. */
  affectedAssetTypes?: string[];
}

