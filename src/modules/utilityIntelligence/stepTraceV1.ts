export const ANALYZE_UTILITY_STEP_ORDER_V1 = [
  'normalizeIntervalInputsV1',
  'supplyStructureAnalyzerV1_2',
  'tariffMatchAndRateContext',
  'determinantsPackV1',
  'intervalIntelligenceV1',
  'weatherRegressionV1',
  'batteryOpportunityPackV1',
  'batteryDecisionPackV1_2',
  'programIntelligenceV1',
  'recommendationsAssembly',
  'missingInfoAssembly',
] as const;

export type AnalyzeUtilityStepNameV1 = (typeof ANALYZE_UTILITY_STEP_ORDER_V1)[number];

export type AnalyzeUtilityStepStatusV1 = 'RAN' | 'SKIPPED';

export type AnalyzeUtilityStepTraceItemV1 = {
  name: AnalyzeUtilityStepNameV1;
  status: AnalyzeUtilityStepStatusV1;
  reasonCode?: string;
};

/**
 * Minimal, deterministic step trace recorder (request-scoped).
 * Intended to be created by the workflow runner and passed into `analyzeUtility`.
 */
export class StepTraceV1 {
  private readonly idxByName: Record<string, number>;
  private readonly items: AnalyzeUtilityStepTraceItemV1[];

  constructor(stepOrder: readonly AnalyzeUtilityStepNameV1[] = ANALYZE_UTILITY_STEP_ORDER_V1) {
    this.idxByName = Object.create(null);
    this.items = stepOrder.map((name, idx) => {
      this.idxByName[name] = idx;
      return { name, status: 'SKIPPED', reasonCode: 'NOT_RUN' };
    });
  }

  beginStep(name: AnalyzeUtilityStepNameV1): void {
    const idx = this.idxByName[name];
    if (!Number.isFinite(idx)) return;
    const cur = this.items[idx]!;
    // Mark as RAN by default; `endStep(..., { skipped: true })` can override.
    cur.status = 'RAN';
    delete cur.reasonCode;
  }

  endStep(name: AnalyzeUtilityStepNameV1, opts?: { skipped?: boolean; reasonCode?: string }): void {
    const idx = this.idxByName[name];
    if (!Number.isFinite(idx)) return;
    const cur = this.items[idx]!;
    if (opts?.skipped) {
      cur.status = 'SKIPPED';
      const rc = String(opts?.reasonCode || '').trim();
      cur.reasonCode = rc || 'SKIPPED';
      return;
    }
    // If it was never begun, keep SKIPPED/NOT_RUN. Otherwise keep RAN.
    if (cur.status !== 'RAN') return;
    // Explicitly clear reason code for RAN steps (deterministic).
    delete cur.reasonCode;
  }

  getSteps(): AnalyzeUtilityStepTraceItemV1[] {
    // Already in fixed order; clone to avoid mutation by consumers.
    return this.items.map((s) => ({ ...s }));
  }
}

