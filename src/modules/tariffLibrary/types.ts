import type { CaTariffUtility } from './ca/sources';

export type TariffEvidenceV0 = {
  kind: 'url' | 'text' | 'meta' | 'pdf';
  value: string;
  /** Optional source URL this evidence came from (when applicable). */
  sourceUrl?: string;
  /** Optional enrichment field name (e.g., customerClass, voltage). */
  fieldName?: string;
  /** Optional inference rule id for derived fields. */
  inferenceRuleId?: string;
  /** Optional matched text/snippet for inference. */
  matchedText?: string;
  /** Optional stable hash of snippet (when storing snippet itself is too verbose). */
  snippetHash?: string;
};

export type TariffRateMetadata = {
  utility: CaTariffUtility;
  rateCode: string; // e.g., "B-19"
  name?: string;
  /** Enriched customer class label (deterministic). */
  customerClass?: string;
  customerClassSource?: 'explicit' | 'parsed' | 'pdf' | 'inferred' | 'unknown';
  /** Enriched voltage label (deterministic). */
  voltage?: string;
  voltageSource?: 'explicit' | 'parsed' | 'pdf' | 'inferred' | 'unknown';
  territory?: string | null;
  /** Free-text notes describing eligibility/applicability constraints (metadata only). */
  eligibilityNotes?: string;
  eligibilitySource?: 'explicit' | 'parsed' | 'pdf' | 'inferred' | 'unknown';
  /** Applicability scaffolding for future rules (do not interpret in v0). */
  minimumDemandKw?: number | null;
  maximumDemandKw?: number | null;
  voltageRequirement?: string | null;
  grandfathered?: boolean | null;
  /** Optional list of territoryIds this rate applies to (structure only; no geo logic yet). */
  applicableTerritories?: string[];
  effectiveStart?: string | null; // ISO date
  effectiveEnd?: string | null; // ISO date
  effectiveSource?: 'explicit' | 'parsed' | 'pdf' | 'inferred' | 'unknown';
  /** Truthful status derived from effective* fields (no guessing). */
  effectiveStatus?: 'UNKNOWN' | 'HAS_HINTS' | 'EXPLICIT_RANGE';

  /** Canonical customer segment classification (non-residential-first UX). */
  customerSegment?: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'institutional' | 'government' | 'other' | 'unknown';
  /**
   * Backwards-compatible field naming for segment source.
   * Prefer reading `segmentSource` going forward.
   */
  customerSegmentSource?: 'explicit' | 'parsed' | 'pdf' | 'inferred' | 'unknown';
  /** Canonical segment source (preferred). */
  segmentSource?: 'explicit' | 'parsed' | 'pdf' | 'inferred' | 'unknown';
  /**
   * Coarse grouping for default UX:
   * - Default filters should include `non_residential` and exclude `residential` and `unknown`.
   */
  sectorGroup?: 'residential' | 'non_residential' | 'unknown';
  /** Derived convenience flags for filtering. */
  isResidential?: boolean;
  isNonResidential?: boolean;
  /** True only for commercial/industrial/agricultural; unknown defaults false. */
  isBusinessRelevant?: boolean;

  /** Operator-curated tiering for rate discovery (never inferred from counts). */
  popularityTier?: 'featured' | 'common' | 'all';
  popularitySource?: 'OPERATOR_CURATED' | 'unknown';
  /** Operator-curation overlay fields (do not overwrite evidence-backed metadata). */
  curationHidden?: boolean;
  curationNotes?: string;
  curationTags?: string[];
  preferredForEverWatt?: boolean;

  /** Tariff Engine readiness (no full math; deterministic scaffolding only). */
  chargeDeterminantsVNext?: {
    hasDemandCharges?: boolean | null;
    demandChargeTypes?: Array<'max_kw' | 'tou_kw' | 'ratchet' | 'other'>;
    hasTouEnergy?: boolean | null;
    touPeriodsObserved?: string[] | null;
    determinantsSource?: 'explicit' | 'parsed' | 'pdf' | 'inferred' | 'unknown';
  };

  /**
   * EverWatt Business Canon (v1): deterministic family key for operator workflows.
   * - This is NOT a popularity metric; it is a curated/engineered shortlist of rate families we support first.
   */
  businessFamilyKey?: string | null; // e.g., "PGE_B19_FAMILY"
  businessFamilySource?: 'inferred' | 'unknown';
  isEverWattCanonicalBusiness?: boolean;
  sourceUrl: string;
  sourceTitle?: string;
  lastVerifiedAt: string; // ISO date-time
  evidence?: TariffEvidenceV0[];
};

export type TariffSnapshot = {
  utility: CaTariffUtility;
  capturedAt: string; // ISO date-time
  versionTag: string; // e.g., "2026-02-05T1200Z"
  rates: TariffRateMetadata[];
  /** Deterministic completeness summary for optional metadata fields. */
  metadataCompleteness?: import('./completeness').TariffMetadataCompletenessV0;
  /**
   * Deterministic fingerprints of fetched source contents (v0).
   * Used for change detection and audit-friendly "what changed" reporting.
   */
  sourceFingerprints: Array<{ url: string; contentHash: string }>;
  /**
   * Optional diff computed at ingestion time against the previous snapshot for the same utility.
   * This is metadata-only: rateCode set diffs (no tariff math parsing).
   */
  diffFromPrevious?: {
    previousVersionTag: string;
    addedRateCodes: string[];
    removedRateCodes: string[];
    unchangedRateCodes: string[];
  };
  /**
   * Backwards-compatible alias used by early v0 snapshots.
   * If present and sourceFingerprints is missing when loading, treat raw as sourceFingerprints.
   */
  raw?: Array<{ url: string; contentHash: string }>;
};

