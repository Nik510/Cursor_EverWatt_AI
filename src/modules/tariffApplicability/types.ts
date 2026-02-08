import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';

export type ApplicabilityStatus = 'applicable' | 'not_applicable' | 'unknown';

export type ApplicabilityDeterminants = {
  utility?: string;
  rateCode?: string;
  customerClass?: string;
  voltage?: 'secondary' | 'primary' | 'transmission' | 'unknown';
  maxDemandKwObserved?: number | null;
  demandSource?: 'billingRecords' | 'intervals' | 'unknown';
  hasIntervalData?: boolean;
  supplyType?: 'bundled' | 'CCA' | 'DA' | 'unknown';
  territoryId?: string | null;
  notes?: string[];
};

export type ApplicabilityResult = {
  status: ApplicabilityStatus;
  confidence: number; // 0..1
  because: string[];
  determinants: ApplicabilityDeterminants;
  missingInfo: MissingInfoItemV0[];
  warnings?: string[];
};

