/**
 * Project Graph (Phase 1)
 *
 * Design goals:
 * - Engineer-first: assets have stable IDs and human tags (assetTag).
 * - AI-safe: every inferred/confirmed fact can carry provenance back to the Vault.
 * - Minimal: Phase 1 stores edges implicitly via references; no global edge list yet.
 */

/**
 * Evidence references are pointers into the non-authoritative Evidence lane.
 * They do not assert “truth”; they provide provenance.
 */
export type EvidenceRef = {
  fileId: string;
  page?: number | null;
  sheet?: string | null;
  cellRange?: string | null;
  /** Snapshot-mode value snippet that supports fast human verification (v1). */
  snippetText?: string | null;
  /** Workbook-specific provenance (v1). */
  rowStart?: number | null;
  rowEnd?: number | null;
  colStart?: number | null;
  colEnd?: number | null;
  /** Optional alternative snippet name used by workbook ingest. */
  snippet?: string | null;
  extractedAt?: string | null;
  /**
   * ProposalPack provenance (v1).
   * Note: keep `fileId` as the proposalPackId UUID for proposal-derived items.
   */
  source?: 'proposalPack' | null;
  proposalPackId?: string | null;
  scenarioId?: string | null;
  deltaId?: string | null;
  sourceKey?: string | null;
  storageKey?: string | null;
  bbox?: { x: number; y: number; w: number; h: number } | null; // reserved (V2+)
};

export type AssetType =
  | 'lightingFixture'
  | 'lightingControl'
  | 'lightingArea'
  | 'panel'
  | 'ahu'
  | 'rtu'
  | 'fan'
  | 'pump'
  | 'vav'
  | 'chiller'
  | 'boiler'
  | 'coolingTower'
  | 'other';

export type AssetNode = {
  kind: 'asset';
  /** Stable system ID (UUID) */
  id: string;
  /** Human-facing stable tag (unique within project), e.g. AHU-1 */
  assetTag: string;
  type: AssetType;
  /** Properties */
  name?: string;
  location?: string;
  tags?: string[];
  /**
   * Baseline component modeling (v1):
   * Keep the system-of-record asset-first. Components are just child assets.
   */
  assetRole?: 'primary' | 'component';
  attachedToAssetId?: string;
  componentType?: string;
  /**
   * Baseline (pre-side) blueprint for what existed.
   * Once frozen, this should not change (enforced server-side).
   */
  baseline?: {
    description?: string;
    equipment?: string[]; // e.g., ["No VFD", "Constant volume", "Fixed OA damper"]
    properties?: Record<string, string>; // lightweight key/value blueprint
    evidenceRefs?: EvidenceRef[];
    frozenAt?: string; // ISO; when set, baseline becomes immutable
  };
  /** Optional evidence links */
  evidenceRefs?: EvidenceRef[];
  /**
   * Optional (Phase 1 placeholders; do not implement automation here):
   * measures + assumptions live under an asset in the Phase 1 tree.
   */
  measures?: Array<{
    id: string;
    name: string;
    /** e.g. "VFD", "Controls", "Economizer", "Retro-commissioning" */
    measureType?: string;
    /**
     * Change description captured as before vs after.
     * Before should reference baseline state; after is what we implemented.
     */
    before?: { description?: string; equipment?: string[]; evidenceRefs?: EvidenceRef[] };
    after?: { description?: string; equipmentAdded?: string[]; evidenceRefs?: EvidenceRef[] };
    evidenceRefs?: EvidenceRef[];
    createdAt?: string;
    updatedAt?: string;
  }>;
  assumptions?: Array<{ id: string; key: string; value: string; evidenceRefs?: EvidenceRef[] }>;
  status?: 'confirmed';
  createdAt?: string;
  updatedAt?: string;
};

export type MeasureNode = {
  kind: 'measure';
  id: string;
  name: string;
  category?: string;
  evidenceRefs?: EvidenceRef[];
  status?: 'confirmed';
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Inbox items are ALWAYS non-authoritative suggestions.
 * They only become authoritative after confirmation.
 */
export type InboxItemKind = 'suggestedAsset' | 'suggestedProperty' | 'suggestedMeasure' | 'suggestedBomItems';

export type InboxItem = {
  /** Stable system ID (UUID) */
  id: string;
  /** What this item will become if confirmed */
  kind: InboxItemKind;
  status: 'inferred';
  /**
   * Stable provenance key for dedupe/debug (e.g. proposalPackId:scenarioId:deltaIndex).
   * Optional for backward compatibility.
   */
  sourceKey?: string;
  /** Suggested Asset */
  suggestedAsset?: {
    type?: AssetType;
    name?: string;
    assetTagHint?: string;
    location?: string;
    tags?: string[];
  };
  /** Suggested Measure */
  suggestedMeasure?: {
    id?: string;
    name?: string;
    category?: string;
    notes?: string;
  };
  /** Suggested BOM items */
  suggestedBomItems?: {
    measureId: string;
    items: any[];
  };
  /** Suggested Property */
  suggestedProperty?: {
    assetId?: string;
    key: string;
    value: string;
  };
  quantity?: number | null;
  unit?: string | null;
  /** Provenance for the proposed item (must exist for AI-safety) */
  provenance: EvidenceRef;
  confidence: number; // 0..1
  needsConfirmation: boolean;
  createdAt?: string;
};

export type InboxHistoryItem =
  | (InboxItem & { status: 'accepted' | 'rejected'; dispositionReason: string; reviewedAt: string })
  | (AssetNode & { reviewedAt?: string })
  | (MeasureNode & { reviewedAt?: string });

export type BomItemsRecord = {
  id: string;
  measureId: string;
  items: any[];
  provenance: EvidenceRef;
  sourceKey?: string;
  createdAt?: string;
};

export type DecisionDisposition = 'accepted' | 'rejected' | 'modified';

export type DecisionEntry = {
  id: string;
  date: string; // ISO
  disposition: DecisionDisposition;
  /** e.g. design | scope | assumption | change-order */
  decisionType: 'design' | 'scope' | 'assumption' | 'change-order';
  context: string;
  optionsConsidered?: string[];
  selectedOption?: string;
  rationale: string;
  linkedAssetIds?: string[];
  linkedMeasureIds?: string[];
  evidenceRefs?: EvidenceRef[];
};

/**
 * Edges (Phase 1)
 *
 * Edges are implicit:
 * - Node -> VaultFile edges via `evidenceRefs[]` and `provenance`.
 * - Inbox -> Confirmed nodes via the confirm action (item moves to `assets[]` or `measures[]`).
 */
export type ProjectGraph = {
  assets: AssetNode[];
  /**
   * Phase 1 tree treats measures as optional under assets,
   * but we keep top-level measures for compatibility with existing UI/code.
   * Do not add new top-level collections in Phase 1.
   */
  measures: MeasureNode[];
  inbox: InboxItem[];
  inboxHistory?: InboxHistoryItem[];
  bomItems?: BomItemsRecord[];
  decisions?: DecisionEntry[];
};

export function normalizeProjectGraph(input: unknown): ProjectGraph {
  const g = (input && typeof input === 'object' ? (input as any) : {}) as any;
  return {
    assets: Array.isArray(g.assets) ? g.assets : [],
    measures: Array.isArray(g.measures) ? g.measures : [],
    inbox: Array.isArray(g.inbox) ? g.inbox : [],
    inboxHistory: Array.isArray(g.inboxHistory) ? g.inboxHistory : [],
    bomItems: Array.isArray(g.bomItems) ? g.bomItems : [],
  };
}

