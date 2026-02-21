import type { EngineWarning, UtilityInputs, UtilityInsights, UtilityRecommendation } from '../types';
import type { MissingInfoItemV0 } from '../missingInfo/types';
import type { NormalizedIntervalV1 } from '../intervalNormalizationV1/types';
import type { AnalyzeUtilityStepNameV1, StepTraceV1 } from '../stepTraceV1';

export type NormalizedInputsV1 = {
  nowIso: string;

  /** Canonical normalized interval series (or null when absent). */
  normalizedIntervalV1: NormalizedIntervalV1 | null;

  /** Coverage flags (consolidated; values must match prior behavior). */
  hasInterval: boolean;
  intervalDays: number | null;
  granularityMinutes: number | null;

  hasBillText: boolean;
  billMonths: number | null;

  hasWeatherDaily: boolean;
  overlapDays: number | null;

  /** Tariff selection metadata (additive only). */
  currentRateCode: string | null;
  currentRateSelectionSource: UtilityInputs['currentRateSelectionSource'] | null;
  tariffOverrideV1: UtilityInputs['tariffOverrideV1'] | null;
};

export type StepContextV1 = {
  inputs: UtilityInputs;
  deps?: any;
  nowIso: string;
  idFactory: () => string;
  stepTraceV1: StepTraceV1 | null;
  warn: (w: EngineWarning) => void;
  beginStep: (name: AnalyzeUtilityStepNameV1) => void;
  endStep: (name: AnalyzeUtilityStepNameV1, opts?: { skipped?: boolean; reasonCode?: string }) => void;
};

export type AnalyzeUtilityV1State = {
  normalizedInputs: NormalizedInputsV1;

  insights: UtilityInsights;
  recommendations: UtilityRecommendation[];

  // Additive decision-safety outputs (assembled late)
  missingInfo: MissingInfoItemV0[];
  requiredInputsMissing: string[];

  // Internal scratchpad for step handoff (snapshot-gated; keep additive).
  [k: string]: any;
};

export type AnalyzeUtilityV1Delta = Partial<AnalyzeUtilityV1State> & Record<string, any>;

