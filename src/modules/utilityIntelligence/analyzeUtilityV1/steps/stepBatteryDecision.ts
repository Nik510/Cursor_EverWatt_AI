import { evaluateBatteryEconomicsV1 } from '../../../batteryEconomicsV1/evaluateBatteryEconomicsV1';
import { buildBatteryDecisionPackV1 } from '../../../batteryEconomicsV1/decisionPackV1';
import { buildBatteryDecisionPackV1_2 } from '../../../batteryDecisionPackV1_2/buildBatteryDecisionPackV1_2';

import { asCaIouUtility, exceptionName } from '../internals';
import type { AnalyzeUtilityV1Delta, AnalyzeUtilityV1State, NormalizedInputsV1, StepContextV1 } from '../types';

export async function stepBatteryDecision(args: {
  state: AnalyzeUtilityV1State;
  normalizedInputs: NormalizedInputsV1;
  ctx: StepContextV1;
}): Promise<AnalyzeUtilityV1Delta> {
  const { inputs, deps, batteryDecisionConstraintsV1, warn, beginStep, endStep } = (() => {
    const ctx: any = args.ctx as any;
    return {
      inputs: ctx.inputs,
      deps: ctx.deps,
      warn: ctx.warn,
      beginStep: ctx.beginStep,
      endStep: ctx.endStep,
      // Stored on state by the normalizer; pull from state (not ctx) to preserve override precedence.
      batteryDecisionConstraintsV1: (args.state as any).batteryDecisionConstraintsV1 ?? null,
    };
  })();

  const intervalIntelligenceV1 = (args.state as any).intervalIntelligenceV1;
  const composedTariffPriceSignalsV1 = (args.state as any).composedTariffPriceSignalsV1;
  const determinantsPack = (args.state as any).determinantsPack;
  const determinantsPackSummary = (args.state as any).determinantsPackSummary;
  const storageOpportunityPackV1 = (args.state as any).storageOpportunityPackV1;

  // Battery Economics v1: always attach (warnings-first). No tariff/cost guessing in analyzeUtility.
  const batteryEconomicsV1 = (() => {
    try {
      const cfg0: any = (storageOpportunityPackV1 as any)?.batteryOpportunityV1?.recommendedBatteryConfigs?.[0] || null;
      const hy: any =
        (storageOpportunityPackV1 as any)?.dispatchSimulationV1?.strategyResults?.find((r: any) => String(r?.strategyId || '') === 'HYBRID_V1') ||
        (storageOpportunityPackV1 as any)?.dispatchSimulationV1?.strategyResults?.[0] ||
        null;
      const peakReductionMin = hy?.estimatedPeakKwReduction && typeof hy.estimatedPeakKwReduction === 'object' ? Number((hy.estimatedPeakKwReduction as any).min) : null;
      const shiftedKwhAnnual = hy?.estimatedShiftedKwhAnnual && typeof hy.estimatedShiftedKwhAnnual === 'object' ? Number((hy.estimatedShiftedKwhAnnual as any).value) : null;

      const det0: any = (determinantsPackSummary as any)?.meters?.[0]?.last12Cycles?.[0] || null;

      return evaluateBatteryEconomicsV1({
        battery: cfg0
          ? {
              powerKw: Number(cfg0?.powerKw),
              energyKwh: Number(cfg0?.energyKwh),
              roundTripEff: Number(cfg0?.rte),
              usableFraction: null,
              degradationPctYr: null,
            }
          : null,
        costs: null,
        tariffs: null,
        determinants: det0
          ? {
              ratchetDemandKw: Number.isFinite(Number(det0?.ratchetDemandKw)) ? Number(det0.ratchetDemandKw) : null,
              billingDemandKw: Number.isFinite(Number(det0?.billingDemandKw)) ? Number(det0.billingDemandKw) : null,
              billingDemandMethod: String(det0?.billingDemandMethod || '').trim() || null,
              ratchetHistoryMaxKw: Number.isFinite(Number(det0?.ratchetHistoryMaxKw)) ? Number(det0.ratchetHistoryMaxKw) : null,
              ratchetFloorPct: Number.isFinite(Number(det0?.ratchetFloorPct)) ? Number(det0.ratchetFloorPct) : null,
            }
          : null,
        dispatch: {
          shiftedKwhAnnual: Number.isFinite(shiftedKwhAnnual) ? shiftedKwhAnnual : null,
          peakReductionKwAssumed: Number.isFinite(peakReductionMin) ? peakReductionMin : null,
        },
        dr: null,
        finance: null,
      });
    } catch (e) {
      warn({
        code: 'UIE_BATTERY_ECONOMICS_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'evaluateBatteryEconomicsV1',
        exceptionName: exceptionName(e),
        contextKey: 'batteryEconomicsV1',
      });
      return evaluateBatteryEconomicsV1(null);
    }
  })();

  // Battery Decision Pack v1 (sizing search + deterministic economics): always attach (warnings-first).
  const batteryDecisionPackV1 = (() => {
    try {
      const det0: any = (determinantsPackSummary as any)?.meters?.[0]?.last12Cycles?.[0] || null;
      const determinantsV1 = det0
        ? {
            billingDemandKw: Number.isFinite(Number(det0?.billingDemandKw)) ? Number(det0.billingDemandKw) : null,
            ratchetDemandKw: Number.isFinite(Number(det0?.ratchetDemandKw)) ? Number(det0.ratchetDemandKw) : null,
            billingDemandMethod: String(det0?.billingDemandMethod || '').trim() || null,
            ratchetHistoryMaxKw: Number.isFinite(Number(det0?.ratchetHistoryMaxKw)) ? Number(det0.ratchetHistoryMaxKw) : null,
            ratchetFloorPct: Number.isFinite(Number(det0?.ratchetFloorPct)) ? Number(det0.ratchetFloorPct) : null,
          }
        : null;

      return buildBatteryDecisionPackV1({
        intervalPointsV1: Array.isArray(deps?.intervalPointsV1) ? (deps?.intervalPointsV1 as any) : null,
        intervalInsightsV1: (intervalIntelligenceV1 as any) || null,
        tariffPriceSignalsV1: (composedTariffPriceSignalsV1 as any) || null,
        tariffSnapshotId: String(deps?.tariffSnapshotId || '').trim() || null,
        determinantsV1,
        drReadinessV1: (storageOpportunityPackV1 as any)?.drReadinessV1 || null,
        drAnnualValueUsd: null,
        costs: null,
        finance: null,
        versionTags: {
          determinantsVersionTag: String((determinantsPack as any)?.determinantsVersionTag || (determinantsPack as any)?.rulesVersionTag || 'determinants_v1'),
          touLabelerVersionTag: String((determinantsPack as any)?.touLabelerVersionTag || 'tou_v1'),
        },
      });
    } catch (e) {
      warn({
        code: 'UIE_BATTERY_DECISION_PACK_V1_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'buildBatteryDecisionPackV1',
        exceptionName: exceptionName(e),
        contextKey: 'batteryDecisionPackV1',
      });
      return buildBatteryDecisionPackV1({
        intervalPointsV1: null,
        intervalInsightsV1: null,
        tariffPriceSignalsV1: null,
        tariffSnapshotId: null,
        determinantsV1: null,
        drReadinessV1: null,
        drAnnualValueUsd: null,
        costs: null,
        finance: null,
        versionTags: null,
      });
    }
  })();

  // Battery Decision Pack v1.2 (decision-quality: constraints + sensitivity + deterministic narrative): always attach (warnings-first).
  beginStep('batteryDecisionPackV1_2');
  const batteryDecisionPackV1_2 = (() => {
    try {
      const det0: any = (determinantsPackSummary as any)?.meters?.[0]?.last12Cycles?.[0] || null;
      const determinantsV1 = det0
        ? {
            billingDemandKw: Number.isFinite(Number(det0?.billingDemandKw)) ? Number(det0.billingDemandKw) : null,
            ratchetDemandKw: Number.isFinite(Number(det0?.ratchetDemandKw)) ? Number(det0.ratchetDemandKw) : null,
            billingDemandMethod: String(det0?.billingDemandMethod || '').trim() || null,
            ratchetHistoryMaxKw: Number.isFinite(Number(det0?.ratchetHistoryMaxKw)) ? Number(det0.ratchetHistoryMaxKw) : null,
            ratchetFloorPct: Number.isFinite(Number(det0?.ratchetFloorPct)) ? Number(det0.ratchetFloorPct) : null,
          }
        : null;

      const detCycles =
        Array.isArray((determinantsPackSummary as any)?.meters?.[0]?.last12Cycles) && (determinantsPackSummary as any).meters[0].last12Cycles.length
          ? ((determinantsPackSummary as any).meters[0].last12Cycles as any[]).map((c: any) => ({
              cycleLabel: String(c?.cycleLabel || '').trim() || 'cycle',
              startIso: String(c?.startIso || '').trim(),
              endIso: String(c?.endIso || '').trim(),
            }))
          : null;

      return buildBatteryDecisionPackV1_2({
        utility: asCaIouUtility(inputs.currentRate?.utility ?? inputs.utilityTerritory) || String(inputs.currentRate?.utility || inputs.utilityTerritory || '').trim() || null,
        rate: String(inputs.currentRate?.rateCode || '').trim() || null,
        intervalPointsV1: Array.isArray(deps?.intervalPointsV1) ? (deps?.intervalPointsV1 as any) : null,
        intervalInsightsV1: (intervalIntelligenceV1 as any) || null,
        tariffPriceSignalsV1: (composedTariffPriceSignalsV1 as any) || null,
        tariffSnapshotId: String(deps?.tariffSnapshotId || '').trim() || null,
        determinantsV1,
        determinantsCycles: detCycles,
        drReadinessV1: (storageOpportunityPackV1 as any)?.drReadinessV1 || null,
        drAnnualValueUsd: null,
        batteryDecisionConstraintsV1: (batteryDecisionConstraintsV1 as any) || null,
      });
    } catch (e) {
      warn({
        code: 'UIE_BATTERY_DECISION_PACK_V1_2_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'buildBatteryDecisionPackV1_2',
        exceptionName: exceptionName(e),
        contextKey: 'batteryDecisionPackV1_2',
      });
      return buildBatteryDecisionPackV1_2({
        utility: null,
        rate: null,
        intervalPointsV1: null,
        intervalInsightsV1: null,
        tariffPriceSignalsV1: null,
        tariffSnapshotId: null,
        determinantsV1: null,
        determinantsCycles: null,
        drReadinessV1: null,
        drAnnualValueUsd: null,
        batteryDecisionConstraintsV1: null,
      });
    }
  })();
  endStep('batteryDecisionPackV1_2');

  return { batteryEconomicsV1, batteryDecisionPackV1, batteryDecisionPackV1_2 };
}

