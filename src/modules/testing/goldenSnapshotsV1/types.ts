export type GoldenSnapshotCaseV1 = {
  /** Stable case id (also used as snapshot filename). */
  caseId: string;
  /** Absolute path to the fixture directory for this case. */
  caseDir: string;
  /** Deterministic run timestamp for this case. */
  nowIso: string;
};

export type GoldenSnapshotOutputV1 = {
  caseId: string;
  /**
   * Full analysis-results-v1-like payload.
   * This is what the API returns under `workflow` (plus `success/project/summary` envelope).
   */
  response: {
    success: true;
    project: any;
    workflow: any;
    summary: { json: any; markdown: string };
    demo?: boolean;
  };
  /** Internal engineering report JSON (deterministic snapshot builder). */
  reportJson: any;
};

