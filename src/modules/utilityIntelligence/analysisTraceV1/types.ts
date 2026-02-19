export type AnalysisTraceV1IntervalGranularity = '15m' | '60m' | 'daily' | 'unknown';

export type AnalysisTraceV1TariffMatchStatus = 'FOUND' | 'AMBIGUOUS' | 'NOT_FOUND' | 'UNSUPPORTED' | 'UNKNOWN';

export type AnalysisTraceV1SupplyProviderType = 'NONE' | 'CCA' | 'DA';

export type AnalysisTraceV1 = {
  /**
   * Deterministic trace timestamp for this run.
   * Use the request-scoped `nowIso` to avoid clock drift across modules.
   */
  generatedAtIso: string;

  /** Stable, sorted list of executed/high-signal modules. */
  ranModules: string[];

  /** Stable, sorted list of skipped modules with explicit reason codes. */
  skippedModules: Array<{ module: string; reasonCode: string }>;

  coverage: {
    hasInterval: boolean;
    intervalGranularity: AnalysisTraceV1IntervalGranularity | null;
    intervalDays: number | null;
    hasBillText: boolean;
    billMonths: number | null;
    hasWeatherDaily: boolean;
    weatherDays: number | null;
    tariffMatchStatus: AnalysisTraceV1TariffMatchStatus | null;
    supplyProviderType: AnalysisTraceV1SupplyProviderType | null;
    supplyConfidence: number | null;
    hasRatchetHistory: boolean | null;
  };

  warningsSummary: {
    engineWarningsCount: number;
    topEngineWarningCodes: string[]; // max 10
    missingInfoCount: number;
    topMissingInfoCodes: string[]; // max 10
  };

  provenance: {
    generationEnergySnapshotId?: string | null;
    addersSnapshotId?: string | null;
    exitFeesSnapshotId?: string | null;
    tariffSnapshotId?: string | null;
  };
};

