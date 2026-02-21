export type InternalEngineeringReportJsonV1 = unknown;

/**
 * Snapshot payload returned by the Analysis Results v1 endpoint(s).
 *
 * Intentionally typed as `unknown` to avoid coupling this persistence layer
 * to evolving response shapes; the store is snapshot-only.
 */
export type AnalysisResultsV1PayloadSnapshot = unknown;

export type AnalysisRunV1 = {
  runId: string;
  createdAtIso: string;
  nowIso: string;
  projectId?: string | null;
  /**
   * Stable hash of normalized inputs used by the workflow.
   * Must exclude volatile/random ids.
   */
  inputFingerprint: string;
  engineVersions: Record<string, string>;
  provenance: {
    tariffSnapshotId?: string | null;
    generationEnergySnapshotId?: string | null;
    addersSnapshotId?: string | null;
    exitFeesSnapshotId?: string | null;
  };
  warningsSummary: {
    engineWarningsCount: number;
    topEngineWarningCodes: string[];
    missingInfoCount: number;
    topMissingInfoCodes: string[];
  };
  snapshot: {
    response: AnalysisResultsV1PayloadSnapshot;
    reportJson: InternalEngineeringReportJsonV1;
  };
};

export type AnalysisRunIndexRowV1 = {
  runId: string;
  createdAtIso: string;
  projectId?: string | null;
  inputFingerprint: string;
};

