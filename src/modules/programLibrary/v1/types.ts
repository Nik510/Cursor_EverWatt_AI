import type { MissingInfoItemV0 } from '../../utilityIntelligence/missingInfo/types';

export type ProgramCustomerClassTagV1 = 'nonresidential' | 'residential' | 'mixed';
export type ProgramStatusV1 = 'active' | 'paused' | 'retired' | 'unknown';

export type ProgramEligibilityCalloutV1 = {
  title: string;
  value: string;
  severity: 'info' | 'warn' | 'critical';
};

export type ProgramCustomerSizeGuidelineV1 = {
  min?: number;
  max?: number;
  units: 'kW' | 'kWhAnnual' | 'sqft' | 'accounts';
  notes?: string;
};

export type ProgramSourceV1 = {
  url: string;
  retrievedAtIso: string;
  fingerprintHash?: string;
  provider?: string;
};

export type ProgramV1 = {
  programId: string;
  utilityKey: string;
  programName: string;
  implementer?: string;
  status: ProgramStatusV1;
  customerClassTags: ProgramCustomerClassTagV1[];
  measureCategories: string[];
  eligibilityText?: string;
  eligibilityCallouts?: ProgramEligibilityCalloutV1[];
  customerSizeGuidelines?: ProgramCustomerSizeGuidelineV1[];
  effectiveStartIso?: string;
  effectiveEndIso?: string;
  source: ProgramSourceV1;
  because: string[];
  evidence: any[];
  missingInfo: MissingInfoItemV0[];
  /**
   * EverWatt operations overlay fields (curation-driven).
   * These are deterministic, non-authoritative annotations intended for operators.
   */
  participatedBefore?: boolean;
  /** Standardized on numeric 1–5 (backward-compatible parsing happens at curation/apply time). */
  internalRating?: 1 | 2 | 3 | 4 | 5;
  worthItThresholds?: {
    minCustomerKw?: number;
    minAnnualKwh?: number;
    minAnnualSpendUsd?: number;
    minIncentiveUsd?: number;
    notes?: string;
  };
  prominentCallouts?: string[];
  hidden?: boolean;
  /**
   * Optional links to EverWatt canonical business tariff families (v1).
   * This is operator-maintained metadata; keep deterministic and conservative.
   */
  relatedTariffFamilies?: string[];
  /** Optional curation/policy notes applied at read time (not part of authoritative source). */
  policyNotes?: string[];
  /** Optional curation fields applied at read time. */
  curation?: any;
};

export type ProgramSnapshotV1 = {
  utilityKey: string;
  capturedAt: string;
  versionTag: string;
  programs: ProgramV1[];
  sourceFingerprints?: Array<{ url: string; contentHash: string }>;
};

