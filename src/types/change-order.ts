export type ChangeOrderFileFormat = 'pdf' | 'word';

export type ProjectCustomerDetails = {
  // Identifiers
  projectNumber: string; // human-facing project #
  obfNumber?: string; // optional OBF#
  projectName?: string; // optional human-facing project name (Project Builder)

  // Company/Facility
  companyName: string;
  facilityName?: string;
  facilityType?: string;
  siteLocation?: string;

  // Address
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;

  // Contacts
  primaryContactName?: string;
  primaryContactTitle?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;

  // Utility
  utilityCompany?: string;
  accountNumber?: string;

  // Sales
  salesPersonName?: string;
  salesPersonEmail?: string;
};

export type ProjectRecord = {
  id: string;
  driveFolderLink: string;
  customer: ProjectCustomerDetails;
  /**
   * Project Builder (Vault + Graph) extensions.
   * Optional so legacy callers (e.g., change orders) remain compatible.
   */
  telemetry?: {
    /**
     * Billing intake (v1): extracted PDF text pasted by user.
     */
    billPdfText?: string;
    /**
     * Interval intake (electric) v1: parsed interval points (deterministic).
     */
    intervalElectricV1?: Array<{
      timestampIso: string;
      intervalMinutes: number;
      kWh?: number;
      kW?: number;
      temperatureF?: number;
    }>;
    /**
     * Interval intake (electric) v1: deterministic parse meta + warnings.
     */
    intervalElectricMetaV1?: Record<string, unknown>;
    [k: string]: unknown;
  };
  /**
   * Append-only internal reports (v1).
   */
  reportsV1?: {
    internalEngineering?: Array<{
      id: string;
      createdAt: string;
      title?: string;
      reportHash?: string;
      reportJson: unknown;
    }>;
    [k: string]: unknown;
  };
  vault?: {
    files?: Array<{
      id: string;
      filename: string;
      contentType: string;
      sizeBytes?: number;
      kind:
        | 'pdf-plan-set'
        | 'pdf'
        | 'spreadsheet'
        | 'photo'
        | 'spec-sheet'
        | 'unknown';
      tags?: string[];
      storageKey?: string;
      storageUrl?: string;
      uploadedAt?: string;
      extracted?: Record<string, unknown>;
      chunks?: { count: number };
    }>;
  };
  /**
   * Project Graph (Phase 1): assets + measures + inbox, with provenance-first evidence links.
   * Stored as JSON on the project record.
   */
  graph?: import('./project-graph').ProjectGraph;
  eeScopeSummary?: {
    status?: 'draft' | 'approved';
    draftText?: string;
    approvedText?: string;
    updatedAt?: string;
  };
  decisionMemory?: Array<{
    id: string;
    title: string;
    note: string;
    createdAt?: string;
    updatedAt?: string;
    provenance?: Record<string, unknown>;
  }>;
  createdAt?: string;
  updatedAt?: string;

  /**
   * Calculator proposal packs (read-only until reviewed and committed).
   * Stored as lightweight index entries; full pack is persisted as an artifact.
   */
  proposalPacks?: Array<{
    proposalPackId: string;
    createdAt: string;
    createdBy: 'battery_calculator' | 'hvac_calculator' | string;
    title: string;
    summary?: string;
    basedOnSnapshotId?: string;
    storageKey?: string;
  }>;

  /**
   * Timeline events (governance / state history).
   */
  stateTimeline?: Array<{
    id: string;
    projectId: string;
    date: string;
    eventType: 'PROPOSAL_IMPORTED' | 'SCOPE_APPROVED' | 'INSTALL_COMPLETE' | 'COMMISSIONED' | string;
    linkedProposalPackId?: string;
    notes?: string;
    evidenceRefs?: import('./project-graph').EvidenceRef[];
  }>;
};

export type ChangeOrderInput = {
  projectId: string;
  driveFolderLink: string;
  customer: ProjectCustomerDetails;
  amountUsd: number;
  requestedBy?: string;
  salesNotes?: string;
  description: string; // the “basic details” input from sales
  requestedEffectiveDate?: string; // optional (YYYY-MM-DD)
};

export type ChangeOrderAiBody = {
  subjectLine: string;
  summary: string;
  scopeOfWork: string[];
  exclusions?: string[];
  scheduleImpact?: string;
  pricing: {
    amountUsd: number;
    pricingNotes?: string;
  };
  termsAndConditions: string[];
};

export type ChangeOrderFileRef = {
  format: ChangeOrderFileFormat;
  filename: string;
  storageKey?: string;
  storageUrl?: string;
  uploadedAt?: string;
};

export type ChangeOrderRecord = {
  id: string;
  projectId: string;
  changeOrderNumber: number;
  driveFolderLink: string;
  customer: ProjectCustomerDetails;
  amountUsd: number;
  description: string;
  aiBody?: ChangeOrderAiBody;
  files?: ChangeOrderFileRef[];
  metadata?: {
    generatedAt?: string;
    generatedBy?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type CreateProjectRequest = {
  driveFolderLink: string;
  customer: ProjectCustomerDetails;
};

export type CreateProjectResponse = {
  success: boolean;
  project: ProjectRecord;
};

export type ListProjectsResponse = {
  success: boolean;
  projects: ProjectRecord[];
};

export type GetProjectResponse = {
  success: boolean;
  project: ProjectRecord;
};

export type CreateChangeOrderRequest = {
  input: ChangeOrderInput;
  generateAiBody?: boolean;
};

export type CreateChangeOrderResponse = {
  success: boolean;
  changeOrder: ChangeOrderRecord;
};

export type ListChangeOrdersResponse = {
  success: boolean;
  changeOrders: ChangeOrderRecord[];
};

export type GetChangeOrderResponse = {
  success: boolean;
  changeOrder: ChangeOrderRecord;
};

export type UpdateChangeOrderRequest = {
  patch: Partial<Pick<ChangeOrderRecord, 'driveFolderLink' | 'customer' | 'amountUsd' | 'description' | 'aiBody' | 'files'>>;
};

export type UpdateChangeOrderResponse = {
  success: boolean;
  changeOrder: ChangeOrderRecord;
};

export type GenerateChangeOrderAiRequest = {
  input: ChangeOrderInput;
};

export type GenerateChangeOrderAiResponse = {
  success: boolean;
  aiBody: ChangeOrderAiBody;
  model?: string;
};


