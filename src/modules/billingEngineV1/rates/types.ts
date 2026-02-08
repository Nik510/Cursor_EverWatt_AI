export type RateFixedChargeV1 =
  | { kind: 'perDay'; dollars: number }
  | { kind: 'perMonth'; dollars: number };

export type TouWindowV1 = {
  /** Start hour in local time (0-24). Inclusive. */
  startHour: number;
  /** End hour in local time (0-24). Exclusive. Can be <= startHour to indicate wrap across midnight. */
  endHour: number;
};

export type TouPeriodDefinitionV1 = {
  /** Human-friendly label used for energy/demand lookups. */
  label: string;
  /** Windows applied Monday–Friday (local time). */
  weekday: TouWindowV1[];
  /** Windows applied Saturday/Sunday (local time). If omitted, falls back to weekday. */
  weekend?: TouWindowV1[];
  notes?: string[];
};

export type DemandChargeRuleV1 =
  | {
      kind: 'monthlyMaxKw';
      /** Always 'ANY' for monthly max. */
      touLabel: 'ANY';
      dollarsPerKw: number;
      notes?: string[];
    }
  | {
      kind: 'touMaxKw';
      /** The TOU label the max applies to. */
      touLabel: string;
      dollarsPerKw: number;
      notes?: string[];
    };

export type RateDefinitionV1 = {
  /** Unique ID for the engine. Stable across versions. */
  rateId: string;
  utilityTerritory: string; // e.g. "PGE"
  serviceClassTags: string[];

  /** IANA timezone identifier, e.g. "America/Los_Angeles". */
  timezone: string;

  billing: {
    fixedCharges: RateFixedChargeV1[];
  };

  touPeriods: TouPeriodDefinitionV1[];

  /** $/kWh by TOU label. Labels must match `touPeriods[].label`. */
  energyCharges: Record<string, number>;

  /**
   * Demand charges in $/kW.
   * - monthlyMaxKw: max kW in the whole billing period
   * - touMaxKw: max kW within a TOU label subset
   */
  demandCharges: DemandChargeRuleV1[];

  notes?: string[];
  version: string;
};

