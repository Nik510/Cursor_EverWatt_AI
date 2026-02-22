export type ScenarioLabConfidenceTierV1 = 'A' | 'B' | 'C';

export type ScenarioLabCategoryV1 = 'BATTERY' | 'TARIFF' | 'OPS' | 'RELIABILITY';

export type ScenarioLabStatusV1 = 'RAN' | 'BLOCKED' | 'SKIPPED';

export type ScenarioKpisV1 = {
  annualUsd?: number | null;
  annualKwh?: number | null;
  peakKwReduction?: number | null;
  capexUsd?: number | null;
  paybackYears?: number | null;
};

export type ScenarioGatingV1 = {
  /** Deterministically sorted. */
  blockedReasons: string[];
  /** Deterministically sorted + bounded. */
  requiredNextData: string[];
};

export type ScenarioProvenanceV1 = {
  runId: string | null;
  engineVersions: Record<string, string> | null;
  snapshotIds:
    | {
        tariffSnapshotId: string | null;
        generationEnergySnapshotId: string | null;
        addersSnapshotId: string | null;
        exitFeesSnapshotId: string | null;
      }
    | null;
};

export type ScenarioResultV1 = {
  scenarioId: string;
  title: string;
  category: ScenarioLabCategoryV1;
  status: ScenarioLabStatusV1;
  confidenceTier: ScenarioLabConfidenceTierV1;
  kpis: ScenarioKpisV1;
  gating: ScenarioGatingV1;
  pros: string[];
  cons: string[];
  provenance: ScenarioProvenanceV1;
};

export type FrontierAxesV1 = {
  /** Deterministic labels for clients. */
  savingsAxis: 'annualUsd' | 'annualKwh';
  capexAxis: 'capexUsd';
  /** Higher is better (A > B > C). */
  confidenceAxis: 'confidenceTier';
  /** Lower is better. */
  paybackAxis: 'paybackYears';
};

export type FrontierPointV1 = {
  scenarioId: string;
  title: string;
  confidenceTier: ScenarioLabConfidenceTierV1;
  annualUsd?: number | null;
  annualKwh?: number | null;
  capexUsd?: number | null;
  paybackYears?: number | null;
  /** Deterministic explanation string (bounded). */
  note?: string;
};

export type ScenarioFrontierV1 = {
  axes: FrontierAxesV1;
  points: FrontierPointV1[];
};

export type BlockedScenarioV1 = {
  scenarioId: string;
  title: string;
  category: ScenarioLabCategoryV1;
  blockedReasons: string[];
  requiredNextData: string[];
};

export type ScenarioLabInputsSummaryV1 = {
  hasInterval: boolean;
  intervalDays: number | null;
  tariffMatchStatus: string;
  providerType: string;
  truthConfidenceTier: ScenarioLabConfidenceTierV1 | 'UNKNOWN';
  verifierStatus: string;
  claimsStatus: string;
};

export type ScenarioLabResultV1 = {
  schemaVersion: 'scenarioLabV1';
  generatedAtIso: string;
  inputsSummary: ScenarioLabInputsSummaryV1;
  /** Bounded list, deterministic ordering. */
  scenarios: ScenarioResultV1[];
  frontier: ScenarioFrontierV1;
  /** Bounded list, deterministic ordering. */
  blockedScenarios: BlockedScenarioV1[];
  /** Deterministically sorted/bounded. */
  labWarnings: string[];
};

