export type ProgramStatusV0 = 'active' | 'paused' | 'retired' | 'unknown';

/**
 * Program metadata (structure only, DSIRE-ready).
 *
 * v0: no incentive math, no eligibility evaluation, no ingestion yet.
 * Every record must be traceable to source URLs + lastVerifiedAt.
 */
export type ProgramMetadataV0 = {
  id: string;
  name: string;
  administrator: string;
  /** Utility/territory anchors (free-text in v0; normalize later). */
  utility?: string;
  territory?: string;
  technologyTags: string[];
  status: ProgramStatusV0;
  stackingNotes?: string;
  lastVerifiedAt: string; // ISO date-time
  sourceUrls: string[];
};

export type ProgramSnapshotV0 = {
  scope: string; // e.g., "CA"
  capturedAt: string; // ISO date-time
  versionTag: string; // e.g., "2026-02-05T1200Z"
  programs: ProgramMetadataV0[];
};

