import type { EvidenceRef, InboxItem, ProjectGraph, AssetNode, MeasureNode, DecisionEntry } from '../../types/project-graph';
import type { ProjectRecord } from '../../types/change-order';
import type { Measure } from '../measures/types';

/**
 * Completed Project Ingestion + EverWatt Memory + Recommendations (v1)
 *
 * Notes:
 * - `orgId` maps to the repo's existing "userId" concept when stored alongside `projects`.
 * - We keep v1 deterministic: no LLM requirement, no probabilistic embeddings.
 */

export type CompletedProjectAssetSummary = {
  ahuCount?: number;
  rtuCount?: number;
  vavCount?: number;
  fanCount?: number;
  pumpCount?: number;
  chillerCount?: number;
  boilerCount?: number;
  coolingTowerCount?: number;
  panelCount?: number;
  lightingFixtureCount?: number;
  lightingControlCount?: number;
  otherCount?: number;
};

export type CompletedProjectMeasureRecord = {
  measureId: string;
  /** Canonical measure type name (e.g. "VFD_RETROFIT", "EMS_TUNING", "LIGHTING_RETROFIT") */
  type: string;
  /** Freeform tags for grouping/recommendations, e.g. ["vfd", "controls", "hvac"] */
  tags?: string[];
  /** Deterministic parameters that describe the measure and its scope. */
  parameters?: Record<string, string | number | boolean | null>;
  notes?: string;
};

export type CompletedProjectOutcomes = {
  savingsKwh?: number | null;
  savingsKw?: number | null;
  savingsTherms?: number | null;
  savingsUsd?: number | null;
  costUsd?: number | null;
  paybackYears?: number | null;
};

export type CompletedProjectRationale = {
  /** Short human summary: what we did + why. */
  summary: string;
  /** Short structured tags like: ["comfort", "maintenance", "incentives", "schedule_misalignment"] */
  decisionTags?: string[];
  /** Key assumptions behind decisions/outcomes. */
  assumptions?: Array<{ key: string; value: string; tags?: string[] }>;
};

export type CompletedProjectEvidenceRef = {
  refId: string;
  label?: string;
  /** External link (Drive, SharePoint, etc.) */
  url?: string;
  /** Internal storage key (S3/local) if available */
  storageKey?: string;
  notes?: string;
};

export type CompletedProjectRecord = {
  completedProjectId: string;
  orgId: string;
  createdAt: string;
  importedAt: string;
  /**
   * Project Builder is the system of record.
   * Completed projects are stored as archived Project Builder projects.
   * By convention in v1 we set `archivedProjectId = completedProjectId`.
   */
  archivedProjectId?: string;
  building: {
    buildingType: string;
    sqft?: number | null;
    climateZone?: string | null;
    territory?: string | null;
    operatingSchedule?: { bucket: '24_7' | 'business_hours' | 'mixed' | 'unknown'; notes?: string };
  };
  assetsBefore?: CompletedProjectAssetSummary;
  assetsAfter?: CompletedProjectAssetSummary;
  /**
   * Canonical measures implemented (preferred v1+ field).
   * This is the single canonical “Measure” schema used across memory and recommendations.
   */
  measuresImplemented: Measure[];
  /**
   * Legacy import shape (kept for backward compatibility with early v1 templates/tests).
   * Do not rely on this in new code; normalize into `measuresImplemented`.
   */
  measures?: CompletedProjectMeasureRecord[];
  outcomes?: CompletedProjectOutcomes;
  rationale?: CompletedProjectRationale;
  evidenceRefs?: CompletedProjectEvidenceRef[];
  /** Optional: references into Project Builder evidence lane (Vault) if the completed project was imported into PB */
  projectBuilderEvidenceRefs?: EvidenceRef[];
  source?: { kind: 'json_template' | 'csv' | 'doc_export' | 'other'; sourceKey?: string };
};

export type MemoryIndexVersion = 'v1';
export type SqftBucket = '<50k' | '50-150k' | '150-500k' | '500k+';
export type ScheduleBucket = '24_7' | 'business_hours' | 'mixed' | 'unknown';

export type ProjectFeaturesV1 = {
  completedProjectId: string;
  buildingTypeBucket: string;
  sqftBucket: SqftBucket;
  climateZone: string | null;
  territory: string | null;
  scheduleBucket: ScheduleBucket;
  /** Inventory signature as a stable, ordered vector. */
  assetInventoryCounts: Required<CompletedProjectAssetSummary>;
  /** Top tags (normalized) used for measure aggregation. */
  measureTags: string[];
};

export type EverWattMemoryIndex = {
  indexId: string;
  orgId: string;
  generatedAt: string;
  version: MemoryIndexVersion;
  normalization: {
    version: MemoryIndexVersion;
    /** Stable ordering used to build vectors and compare counts. */
    assetKeys: Array<keyof Required<CompletedProjectAssetSummary>>;
  };
  /** Per-project derived features */
  featuresByProjectId: Record<string, ProjectFeaturesV1>;
  invertedIndexes: {
    measureTagToProjects: Record<string, string[]>;
    buildingTypeToProjects: Record<string, string[]>;
    systemTypeToProjects: Record<string, string[]>;
  };
};

export type RecommendationSuggestionStatus = 'proposed' | 'accepted' | 'rejected' | 'snoozed';

export type RecommendationBecause = {
  completedProjectId: string;
  similarityScore: number; // 0..1
  matchedFeatures: string[];
  measuresInProject?: string[];
};

export type RecommendationTopContributor = {
  completedProjectId: string;
  archivedProjectId?: string;
  summary: string;
  similarityScore: number; // 0..1
  matchedFeatures: string[];
};

export type RecommendationSuggestion = {
  suggestionId: string;
  orgId: string;
  projectId: string;
  /** In v1 we recommend based on baseline state only. */
  stateId: 'baseline' | 'proposed';
  /**
   * Canonical measure suggestion (single Measure schema).
   * `label` is the representative display label (most common among contributors in v1).
   */
  suggestedMeasure: Measure;
  score: number; // 0..1
  confidence: number; // 0..1
  playbookAlignment: 'preferred' | 'neutral' | 'discouraged';
  playbookRationale?: string | null;
  playbookId?: string | null;
  explain: {
    because: RecommendationBecause[];
    matchedFeatureSummary: string[];
    /** Top 3 contributing completed projects with human-readable summary. */
    topContributors: RecommendationTopContributor[];
    /** Explicit list of similarity features used by the scorer (v1). */
    matchingFeaturesUsed: Array<'buildingType' | 'sqftBucket' | 'climateZone' | 'territory' | 'assetInventory' | 'scheduleBucket'>;
    frequency: { seenInCount: number; sampleSizeTopN: number; text: string };
    playbooksApplied?: Array<{ playbookId: string; priority: 'LOW' | 'MED' | 'HIGH'; matchedBecause: string[] }>;
    scoreOverlay?: { baseScore: number; multiplier: number; adjustedScore: number };
  };
  requiredInputsMissing: string[];
  status: RecommendationSuggestionStatus;
  createdAt: string;
};

/**
 * Project Inbox Item (v1 foundation).
 *
 * The existing Project Builder already has a canonical inbox type inside `ProjectGraph`.
 * Recommendations are surfaced as Phase-1 `ProjectGraph.inbox[]` items of kind `suggestedMeasure`.
 *
 * This type exists to satisfy the "ProjectInboxItem" deliverable without changing Phase-1 schema.
 */
export type ProjectInboxItem = {
  itemId: string;
  projectId: string;
  type: 'suggestion' | 'missing_info' | 'alert';
  payloadRef: { kind: 'recommendationSuggestion'; suggestionId: string } | { kind: 'other'; refId: string };
  status: 'open' | 'accepted' | 'rejected' | 'snoozed';
  createdAt: string;
  updatedAt: string;
  actedAt?: string;
};

export type ProjectGraphInboxItem = InboxItem;

// ============================================================================
// Project + Asset Schema (v1 foundation types)
// ============================================================================

export type OrgScopedId = {
  orgId: string;
};

export type ProjectStatus = 'active' | 'archived';

/**
 * Canonical EverWatt Project type (v1).
 *
 * IMPORTANT: Project Builder remains the system of record in this repo.
 * This type is a convenience wrapper around the existing `ProjectRecord`.
 */
export type Project = OrgScopedId & {
  projectId: string;
  status: ProjectStatus;
  /** Underlying Project Builder record (source of truth). */
  projectBuilder: ProjectRecord;
};

export type Asset = OrgScopedId & {
  projectId: string;
  assetId: string;
  asset: AssetNode;
};

export type RelationType =
  | 'asset_attached_to_asset'
  | 'asset_linked_to_measure'
  | 'measure_supported_by_evidence'
  | 'decision_supported_by_evidence'
  | 'assumption_supported_by_evidence'
  | 'other';

export type Relation = OrgScopedId & {
  relationId: string;
  projectId: string;
  from: { kind: 'asset' | 'measure' | 'decision' | 'assumption' | 'evidence'; id: string };
  to: { kind: 'asset' | 'measure' | 'decision' | 'assumption' | 'evidence'; id: string };
  relationType: RelationType;
  evidenceRefs?: EvidenceRef[];
  createdAt: string;
};

export type TelemetryKind = 'interval_electricity' | 'interval_gas' | 'bms_trend' | 'other';

export type TelemetrySeriesRef = OrgScopedId & {
  telemetryId: string;
  projectId: string;
  kind: TelemetryKind;
  /** Storage pointer to the raw data (local/S3 key) */
  storageKey?: string;
  units?: string;
  timeRange?: { startIso: string; endIso: string };
  notes?: string;
};

export type EvidenceKind = 'vault_file' | 'external_link' | 'export' | 'other';

export type EvidenceItem = OrgScopedId & {
  evidenceId: string;
  projectId: string;
  kind: EvidenceKind;
  label: string;
  url?: string;
  storageKey?: string;
  evidenceRef?: EvidenceRef;
  createdAt: string;
};

export type Assumption = OrgScopedId & {
  assumptionId: string;
  projectId: string;
  key: string;
  value: string;
  tags?: string[];
  evidenceRefs?: EvidenceRef[];
  createdAt: string;
};

export type Decision = OrgScopedId & {
  decisionId: string;
  projectId: string;
  /** Mirrors Phase-1 `DecisionEntry` fields */
  decisionType: DecisionEntry['decisionType'];
  context: string;
  rationale: string;
  disposition?: DecisionEntry['disposition'];
  linkedAssetIds?: string[];
  linkedMeasureIds?: string[];
  evidenceRefs?: EvidenceRef[];
  createdAt: string;
};

export type CalcRunType = 'battery' | 'hvac' | 'tariff' | 'roi' | 'other';

export type CalcRun = OrgScopedId & {
  calcRunId: string;
  projectId: string;
  calcRunType: CalcRunType;
  /** Pointer to stored inputs/results (DB calculations record id, file key, etc.) */
  payloadRef: { kind: 'calculation_record'; id: string } | { kind: 'file'; storageKey: string } | { kind: 'inline'; note: string };
  createdAt: string;
  updatedAt: string;
};

export type Recommendation = RecommendationSuggestion;

export type ArchivedProjectSnapshot = OrgScopedId & {
  archivedProjectId: string;
  completedProjectId: string;
  project: ProjectRecord;
  graph: ProjectGraph;
  assets: AssetNode[];
  measures: MeasureNode[];
  decisions: DecisionEntry[];
  createdAt: string;
};


