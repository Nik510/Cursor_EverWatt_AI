/**
 * Battery Library Contract (v1)
 *
 * Deterministic only. No LLM dependencies.
 * This is intentionally minimal and stable for candidate selection.
 */

export type BatteryChemistry = 'LFP' | 'NMC' | 'LMO' | 'OTHER';

export type BatteryUseCaseTag =
  | 'peak_shaving'
  | 'arbitrage'
  | 'demand_response'
  | 'backup'
  | 'resiliency'
  | 'solar_self_consumption'
  | 'other';

export type BatteryFootprint = {
  /** Optional: footprint area (approx) */
  areaSqft?: number;
  /** Optional: footprint dimensions (approx) */
  widthFt?: number;
  depthFt?: number;
  /** Optional: indoor/outdoor */
  placement?: 'indoor' | 'outdoor' | 'either';
};

export type BatteryConstraints = {
  /** Optional: temperature range constraints */
  ambientTempMinF?: number;
  ambientTempMaxF?: number;
  /** Optional: interconnection complexity flags */
  requiresUtilityReview?: boolean;
  /** Optional: minimum required electrical service */
  minServiceAmps?: number;
};

export type BatteryLibraryItemV1 = {
  sku: string;
  vendor: string;
  /** Rated max power (kW) */
  kw: number;
  /** Rated usable energy (kWh) */
  kwh: number;
  /** Round trip efficiency as fraction 0..1 */
  roundTripEfficiency: number;
  /** Maximum C-rate (kW/kWh) allowed for sustained dispatch */
  maxC: number;
  /** Minimum state of charge as fraction 0..1 */
  minSoc: number;
  /** Maximum state of charge as fraction 0..1 */
  maxSoc: number;
  chemistry: BatteryChemistry;
  useCaseTags: BatteryUseCaseTag[];

  constraints?: BatteryConstraints;
  footprint?: BatteryFootprint;
  interconnectionNotes?: string;
};

export type BatteryLibraryV1 = {
  version: 'v1';
  items: BatteryLibraryItemV1[];
  source?: { kind: 'fixture' | 'export' | 'other'; sourceKey?: string };
};

