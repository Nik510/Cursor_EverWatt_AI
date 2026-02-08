export type CaGasTariffUtility = 'PGE' | 'SDGE' | 'SOCALGAS';

export type GasTariffEvidenceV0 = {
  kind: 'url' | 'text' | 'meta' | 'pdf';
  value: string;
  sourceUrl?: string;
  fieldName?: string;
  inferenceRuleId?: string;
  matchedText?: string;
  snippetHash?: string;
};

export type GasTariffRateMetadata = {
  utility: CaGasTariffUtility;
  rateCode: string; // e.g., "G-10", "GR", "G-NR1"
  name?: string;

  customerClass?: string;
  customerClassSource?: 'explicit' | 'parsed' | 'pdf' | 'inferred' | 'unknown';

  // Gas rates generally do not use voltage/TOU, but we keep parity for UI columns.
  voltage?: string;
  voltageSource?: 'explicit' | 'parsed' | 'pdf' | 'inferred' | 'unknown';

  eligibilityNotes?: string;
  eligibilitySource?: 'explicit' | 'parsed' | 'pdf' | 'inferred' | 'unknown';

  effectiveStart?: string | null; // ISO date
  effectiveEnd?: string | null; // ISO date
  effectiveSource?: 'explicit' | 'parsed' | 'pdf' | 'inferred' | 'unknown';
  effectiveStatus?: 'UNKNOWN' | 'HAS_HINTS' | 'EXPLICIT_RANGE';

  // Segmentation (shared taxonomy with electric)
  customerSegment?: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'institutional' | 'government' | 'other' | 'unknown';
  customerSegmentSource?: 'explicit' | 'parsed' | 'pdf' | 'inferred' | 'unknown';
  segmentSource?: 'explicit' | 'parsed' | 'pdf' | 'inferred' | 'unknown';
  sectorGroup?: 'residential' | 'non_residential' | 'unknown';
  isResidential?: boolean;
  isNonResidential?: boolean;

  sourceUrl: string;
  sourceTitle?: string;
  lastVerifiedAt: string; // ISO date-time
  evidence?: GasTariffEvidenceV0[];
};

export type GasTariffSnapshot = {
  utility: CaGasTariffUtility;
  capturedAt: string; // ISO date-time
  versionTag: string; // e.g., "2026-02-05T1200Z"
  rates: GasTariffRateMetadata[];
  metadataCompleteness?: import('./completeness').GasTariffMetadataCompletenessV0;
  sourceFingerprints: Array<{ url: string; contentHash: string }>;
  diffFromPrevious?: {
    previousVersionTag: string;
    addedRateCodes: string[];
    removedRateCodes: string[];
    unchangedRateCodes: string[];
  };
  raw?: Array<{ url: string; contentHash: string }>;
};

