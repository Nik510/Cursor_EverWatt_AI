import type { EvidenceRef, AssetNode } from './project-graph';

/**
 * ==========================================
 * Calculator ↔ Project Builder Contract (v0)
 * ==========================================
 *
 * Project Builder is the system of record.
 * Calculators consume baseline snapshots (read-only) and return Proposal Packs (deltas).
 */

export type AssumptionStatus = 'proposed' | 'confirmed';

export type Assumption = {
  id: string;
  key: string;
  value: unknown;
  status: AssumptionStatus;
  evidenceRefs?: EvidenceRef[];
  updatedAt?: string;
};

export type DataSource = {
  id: string;
  kind: 'interval' | 'billing' | 'workbook' | 'other';
  fileId?: string | null;
  coverage?: { start?: string; end?: string } | null;
  notes?: string | null;
  evidenceRefs?: EvidenceRef[];
};

export type FixtureGroup = {
  id: string;
  assetTag?: string;
  qty?: number | null;
  fixtureTypeKey?: string | null;
  existingDesc?: string | null;
  proposedDesc?: string | null;
  evidenceRefs?: EvidenceRef[];
  needsConfirmation?: boolean;
};

export type ProjectBaselineSnapshot = {
  projectId: string;
  snapshotId: string;
  createdAt: string;
  timezone: string;

  assets: AssetNode[];
  lightingFixtureGroups: FixtureGroup[];
  assumptions: Assumption[];
  dataSources: DataSource[];
  constraints?: {
    noExport?: boolean;
    interconnectionKwLimit?: number;
    maxPaybackYears?: number;
  };

  provenancePolicy: {
    requireEvidenceRefs: boolean;
    requireConfirmation: boolean;
  };
};

export type MissingInfoItem = {
  key: string;
  message: string;
  severity: 'info' | 'warning' | 'blocking';
  evidenceRef?: EvidenceRef;
};

export type AssumptionRef = {
  assumptionId?: string;
  key?: string;
  value?: unknown;
  status?: AssumptionStatus;
};

export type EconomicsResult = {
  annualSavingsUsd?: number | null;
  capexUsd?: number | null;
  paybackYears?: number | null;
  npvUsd?: number | null;
  irr?: number | null;
};

export type PerformanceResult = {
  peakKwBefore?: number | null;
  peakKwAfter?: number | null;
  kwShaved?: number | null;
  kwhShifted?: number | null;
};

export type ProposedDelta =
  | { id: string; kind: 'ADD_ASSET'; asset: any }
  | { id: string; kind: 'UPDATE_ASSET_META'; assetId: string; patch: Record<string, unknown> }
  | { id: string; kind: 'ADD_MEASURE'; measure: any }
  | { id: string; kind: 'LINK_ASSET_TO_MEASURE'; assetId: string; measureId: string }
  | { id: string; kind: 'ADD_ASSUMPTION'; assumption: any }
  | { id: string; kind: 'UPDATE_ASSUMPTION'; assumptionId: string; value: any; status?: 'proposed' }
  | { id: string; kind: 'ADD_BOM_ITEMS'; measureId: string; items: any[] };

export type ProposalScenario = {
  scenarioId: string;
  name: string;
  objective: 'max_savings' | 'max_roi' | 'min_payback' | 'max_npv';
  constraints: {
    maxPaybackYears: number;
    noExport: boolean;
    [k: string]: unknown;
  };

  deltas: ProposedDelta[];
  economics: EconomicsResult;
  performance: PerformanceResult;
  confidence: number; // 0..1
  notes: string[];
};

export type ProposalPack = {
  proposalPackId: string;
  projectId: string;
  basedOnSnapshotId: string;
  createdAt: string;
  createdBy: 'battery_calculator' | 'hvac_calculator';
  title: string;
  summary: string;

  scenarios: ProposalScenario[];
  recommendedScenarioId: string;

  assumptionsUsed: AssumptionRef[];
  missingInfo: MissingInfoItem[];
  riskFlags: string[];
  evidenceRefs?: EvidenceRef[];
};

export type ProposalReviewDecision = {
  proposalPackId: string;
  scenarioId: string;
  decisions: Array<{
    deltaId: string;
    action: 'ACCEPT' | 'REJECT' | 'MODIFY';
    reason?: string;
    modifiedValue?: unknown;
  }>;
  committedToTimeline: 'PROPOSED' | 'APPROVED' | 'IMPLEMENTED';
};

export type ProjectStateEvent = {
  id: string;
  projectId: string;
  date: string;
  eventType: 'PROPOSAL_IMPORTED' | 'SCOPE_APPROVED' | 'INSTALL_COMPLETE' | 'COMMISSIONED';
  linkedProposalPackId?: string;
  notes?: string;
  evidenceRefs?: EvidenceRef[];
};

