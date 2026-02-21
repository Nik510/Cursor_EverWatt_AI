import { evaluateStorageOpportunityPackV1 } from '../../../batteryEngineV1/evaluateBatteryOpportunityV1';
import { exceptionName } from '../internals';
import type { AnalyzeUtilityV1Delta, AnalyzeUtilityV1State, NormalizedInputsV1, StepContextV1 } from '../types';

export async function stepBatteryOpportunity(args: {
  state: AnalyzeUtilityV1State;
  normalizedInputs: NormalizedInputsV1;
  ctx: StepContextV1;
}): Promise<AnalyzeUtilityV1Delta> {
  const { inputs, deps, storageEconomicsOverridesV1, warn, beginStep, endStep } = (() => {
    const ctx: any = args.ctx as any;
    return {
      inputs: ctx.inputs,
      deps: ctx.deps,
      warn: ctx.warn,
      beginStep: ctx.beginStep,
      endStep: ctx.endStep,
      // Stored on state by the normalizer; pull from state (not ctx) to preserve override precedence.
      storageEconomicsOverridesV1: (args.state as any).storageEconomicsOverridesV1 ?? null,
    };
  })();

  const intervalIntelligenceV1 = (args.state as any).intervalIntelligenceV1;
  const determinantsPackSummary = (args.state as any).determinantsPackSummary;
  const composedTariffPriceSignalsV1 = (args.state as any).composedTariffPriceSignalsV1;

  // Storage Opportunity Pack v1 (battery + dispatch + DR readiness): always attach (warnings-first).
  beginStep('batteryOpportunityPackV1');
  const storageOpportunityPackV1 = (() => {
    try {
      const det0: any = (determinantsPackSummary as any)?.meters?.[0]?.last12Cycles?.[0] || null;
      const determinantsV1 = det0
        ? {
            billingDemandKw: Number.isFinite(Number(det0?.billingDemandKw)) ? Number(det0.billingDemandKw) : null,
            ratchetDemandKw: Number.isFinite(Number(det0?.ratchetDemandKw)) ? Number(det0.ratchetDemandKw) : null,
            billingDemandMethod: String(det0?.billingDemandMethod || '').trim() || null,
          }
        : null;

      return evaluateStorageOpportunityPackV1({
        intervalInsightsV1: (intervalIntelligenceV1 as any) || null,
        intervalPointsV1: Array.isArray(deps?.intervalPointsV1) ? (deps?.intervalPointsV1 as any) : null,
        // Tariff price signals are not inferred here (no guessing); fixture tests can supply them directly to the engine.
        tariffPriceSignalsV1: (composedTariffPriceSignalsV1 as any) || null,
        determinantsV1,
        storageEconomicsOverridesV1,
        customerType: String((inputs as any)?.customerType || '').trim() || null,
        config: {
          rte: 0.9,
          maxCyclesPerDay: 1,
          dispatchDaysPerYear: 260,
          demandWindowStrategy: 'WINDOW_AROUND_DAILY_PEAK_V1',
        },
      });
    } catch (e) {
      warn({
        code: 'UIE_STORAGE_OPPORTUNITY_PACK_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'evaluateStorageOpportunityPackV1',
        exceptionName: exceptionName(e),
        contextKey: 'storageOpportunityPackV1',
      });
      // Last-resort deterministic fallback (do not throw from analyzeUtility).
      return evaluateStorageOpportunityPackV1({
        intervalInsightsV1: null,
        intervalPointsV1: null,
        tariffPriceSignalsV1: null,
        determinantsV1: null,
      });
    }
  })();
  endStep('batteryOpportunityPackV1');

  return { storageOpportunityPackV1 };
}

