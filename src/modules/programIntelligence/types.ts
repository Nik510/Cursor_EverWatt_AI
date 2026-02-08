export type ProgramCatalogEntry = {
  programId: string; // stable
  name: string;
  utilityTerritory: string;
  category: 'DEMAND_RESPONSE' | 'INCENTIVE' | 'FINANCING' | 'STORAGE' | 'SOLAR' | 'OTHER';
  administrator: 'UTILITY' | 'CAISO' | 'AGGREGATOR' | 'OTHER';
  customerSegments?: string[];
  naicsInclude?: string[]; // supports prefixes
  naicsExclude?: string[];
  eligibility: {
    minPeakKw?: number;
    minMonthlyKwh?: number;
    minAnnualKwh?: number;
    requiresIntervalData?: boolean;
    requiresAdvancedMetering?: boolean;
    seasonMonths?: number[];
    weekdayOnly?: boolean;
  };
  drTraits?: {
    eventSeason?: string;
    eventHours?: string;
    notificationLeadTime?: string;
    maxEvents?: number;
    typicalDurationHours?: number;
  };
  benefitsSummary: string;
  requiredCustomerData: string[]; // keys
  nextSteps: string[];
  version: string;
  lastUpdated: string;
};

export type ProgramMatchResult = {
  programId: string;
  matchStatus: 'eligible' | 'likely_eligible' | 'unlikely' | 'unknown';
  score: number;
  because: string[];
  requiredInputsMissing: string[];
  flags?: string[];
  // Demand response operational fit (additive; only for DR programs when computable)
  drFitScore?: number; // 0..1
  drWhyNow?: string[];
  drWhyNotNow?: string[];
  drNextStepsChecklist?: string[];
};

