export type ISODateTime = string;
export type IANATimezone = string;

export type EvidenceRef = {
  kind:
    | 'interval_data'
    | 'bill_pdf'
    | 'utility_portal_export'
    | 'single_line'
    | 'battery_cut_sheet'
    | 'interconnection'
    | 'other';
  uri?: string;
  note?: string;
};

export type MissingInfoItem = {
  id: string;
  title: string;
  whyNeeded: string;
  howToGet: string;
  evidence?: EvidenceRef[];
  severity: 'blocker' | 'important' | 'nice_to_have';
};

export type DeterministicRuleResult = {
  passed: boolean;
  confidence: number; // 0..1 (deterministic mapping, not ML)
  reasons: string[];
  missingInfo: MissingInfoItem[];
  evidenceUsed: EvidenceRef[];
};

export type TouWindow = {
  name: string;
  startMinute: number; // 0..1440 local minutes
  endMinute: number; // 0..1440 local minutes
  days: 'all' | 'weekday' | 'weekend';
  season?: 'all' | 'summer' | 'winter';
};

export type DemandTier = {
  upToKw?: number; // undefined => infinity
  pricePerKw: number; // USD/kW (billing period defined by determinant kind)
};

export type DemandDeterminant = {
  id: string;
  name: string;
  kind: 'monthlyMax' | 'dailyMax' | 'custom';
  windows?: TouWindow[]; // if omitted => all intervals
  tiers: DemandTier[];
};

export type EnergyCharge = {
  id: string;
  season: 'all' | 'summer' | 'winter';
  windows: TouWindow[];
  pricePerKwh: number; // USD/kWh
};

export type TariffEligibilityMeta = {
  utility: 'PG&E' | 'SCE' | 'SDG&E' | 'Other';
  territory?: string;
  customerClass?: 'C&I' | 'Residential' | 'Other';
  notes?: string;
};

export type TariffModel = {
  version: string;
  tariffId: string;
  rateCode: string;
  timezone: IANATimezone;
  fixedMonthlyChargeUsd?: number;
  energyCharges: EnergyCharge[];
  demandDeterminants: DemandDeterminant[];
  meta: TariffEligibilityMeta;
};

export type BatterySpec = {
  powerKw: number;
  energyKwh: number;
  roundTripEfficiency: number; // 0..1
  minSocFrac?: number;
  maxSocFrac?: number;
};

export type CandidateAssets = {
  battery?: BatterySpec;
};

export type BaselineSnapshot = {
  snapshotId: string;
  createdAt: ISODateTime;
  timezone: IANATimezone;
  territory: {
    utility: TariffEligibilityMeta['utility'];
    territory?: string;
    rateCodeFromUser?: string;
  };
  intervals: Array<{ timestamp: ISODateTime; kw: number }>;
  dataQuality: {
    intervalMinutes: number;
    coveragePct: number;
    gapsCount: number;
    outliersCount: number;
    notes: string[];
    confidence: number;
    evidenceUsed: EvidenceRef[];
  };
  tariffInference: {
    detectedRateCode?: string;
    detectedTariffId?: string;
    confidence: number;
    why: string[];
    missingInfo: MissingInfoItem[];
    evidenceUsed: EvidenceRef[];
  };
  assumptions: Array<{
    id: string;
    text: string;
    confidence: number;
    evidenceUsed: EvidenceRef[];
  }>;
  derived: {
    peakKw_12mo?: number;
    avgKw?: number;
    loadFactor?: number;
  };
};

export type TariffOptionKind = 'rate_switch' | 'tariff_modifier' | 'eligibility_trigger' | 'program_interaction';

export type TariffOption = {
  optionId: string;
  version: string;
  kind: TariffOptionKind;
  name: string;
  utility: TariffEligibilityMeta['utility'];

  trigger_conditions: (baseline: BaselineSnapshot) => boolean;
  eligibility_rules: (baseline: BaselineSnapshot, candidateAssets: CandidateAssets) => DeterministicRuleResult;
  billing_transform: (
    base: TariffModel,
    baseline: BaselineSnapshot,
    candidateAssets: CandidateAssets
  ) => { transformedTariff: TariffModel; transformNotes: string[] };

  required_assets: Array<{ id: string; description: string }>;
  evidence_requirements: Array<{ id: string; description: string; required: boolean; evidence: EvidenceRef[] }>;
  explain_text: { summary: string; details: string[] };
};

export type RateScenario = {
  scenarioId: string;
  version: string;
  baseTariffId: string;
  appliedOptionIds: string[];
  tariff: TariffModel;
  scenarioNotes: string[];
  eligibility: DeterministicRuleResult;
};

export type BillBreakdown = {
  totalUsd: number;
  energyUsd?: number;
  demandUsd?: number;
  fixedUsd?: number;
  determinants?: Array<{
    determinantId: string;
    name: string;
    beforeKw?: number;
    afterKw?: number;
    bindingTimestampsBefore?: ISODateTime[];
    bindingTimestampsAfter?: ISODateTime[];
  }>;
  notes: string[];
};

export type AuditTrace = {
  engineVersion: string;
  tariffLibraryVersion: string;
  inputsHash: string;
  solver?: { name: string; version?: string; status?: string };
  steps: Array<{
    stepId: string;
    title: string;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    evidenceUsed: EvidenceRef[];
  }>;
};

export type StrategyResult = {
  strategyId: string;
  title: string;
  summary: string;
  scenario: RateScenario;
  candidateAssets: CandidateAssets;
  evaluation: {
    noDispatch: {
      baselineBill: BillBreakdown;
      scenarioBill: BillBreakdown;
      structuralSavingsUsd: number;
      operationalSavingsUsd: 0;
    };
    dispatch: {
      baselineBill: BillBreakdown;
      optimizedBill: BillBreakdown;
      structuralSavingsUsd: number;
      operationalSavingsUsd: number;
      dispatchOutputs?: {
        netLoadKwSeries?: number[];
        socSeries?: number[];
        chargeKwSeries?: number[];
        dischargeKwSeries?: number[];
      };
    };
  };
  viability: {
    feasible: boolean;
    feasibilityNotes: string[];
    requiredEvidence: EvidenceRef[];
  };
  risks: Array<{ id: string; title: string; severity: 'low' | 'medium' | 'high'; description: string; mitigation: string }>;
  confidence: {
    overall: number;
    tariffInference: number;
    dataQuality: number;
    eligibility: number;
    notes: string[];
    missingInfo: MissingInfoItem[];
  };
  audit: AuditTrace;
};

export type ProposalPack = {
  packId: string;
  createdAt: ISODateTime;
  baselineSnapshotId: string;
  strategiesRanked: StrategyResult[];
  rejectedCandidates: Array<{ scenarioId: string; reason: string; eligibility: DeterministicRuleResult }>;
  missingInfo: MissingInfoItem[];
};

