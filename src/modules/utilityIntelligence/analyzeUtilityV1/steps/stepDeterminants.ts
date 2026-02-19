import { evaluateTariffApplicabilityV1 } from '../../../tariffApplicability/evaluateTariffApplicability';
import { buildDeterminantsPackV1 } from '../../../determinants/buildDeterminantsPack';

import { asCaIouUtility, exceptionName } from '../internals';
import type { AnalyzeUtilityV1Delta, AnalyzeUtilityV1State, NormalizedInputsV1, StepContextV1 } from '../types';

export function stepDeterminants(args: {
  state: AnalyzeUtilityV1State;
  normalizedInputs: NormalizedInputsV1;
  ctx: StepContextV1;
}): AnalyzeUtilityV1Delta {
  const { inputs, deps, warn, beginStep, endStep } = args.ctx as any;
  const tariffLibrary = (args.state as any).tariffLibrary;
  const supplyStructure = (args.state as any).supplyStructure;
  const intervalKwSeries = (args.state as any).intervalKwSeries;
  const intervalKwRaw = (args.state as any).intervalKwRaw;
  const tz = (args.state as any).tz;
  const billTou = (args.state as any).billTou;

  beginStep('determinantsPackV1');
  const tariffApplicability = (() => {
    try {
      const rateCode = String(inputs.currentRate?.rateCode || '').trim();
      if (!rateCode) return undefined;
      const u = asCaIouUtility(inputs.currentRate?.utility ?? inputs.utilityTerritory);
      if (!u) return undefined;

      const intervalResolutionMinutes =
        inputs.intervalDataRef?.resolution === '15min' ? 15 : inputs.intervalDataRef?.resolution === 'hourly' ? 60 : inputs.intervalDataRef?.resolution === 'daily' ? 1440 : undefined;

      return evaluateTariffApplicabilityV1({
        utility: u,
        rateCode,
        billingRecords: inputs.billingRecords || null,
        billPdfText: inputs.billPdfText || null,
        meterVoltageText: String(inputs.meterMeta?.voltage || '').trim() || null,
        tariffMetadata: (tariffLibrary as any)?.rateMetadata || null,
        supplyType: (supplyStructure as any)?.supplyType,
        territoryId: null,
        intervalKwSeries: intervalKwSeries,
        intervalResolutionMinutes: intervalResolutionMinutes ?? undefined,
      });
    } catch (e) {
      warn({
        code: 'UIE_TARIFF_APPLICABILITY_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'evaluateTariffApplicabilityV1',
        exceptionName: exceptionName(e),
        contextKey: 'tariffApplicability',
      });
      return undefined;
    }
  })();

  const determinantsPack = (() => {
    try {
      const rateCode = String(inputs.currentRate?.rateCode || '').trim();
      const u = asCaIouUtility(inputs.currentRate?.utility ?? inputs.utilityTerritory) || String(inputs.currentRate?.utility || inputs.utilityTerritory || '').trim() || 'unknown';
      if (!rateCode) return null;

      const intervalMinutes =
        inputs.intervalDataRef?.resolution === '15min'
          ? 15
          : inputs.intervalDataRef?.resolution === 'hourly'
            ? 60
            : inputs.intervalDataRef?.resolution === 'daily'
              ? 1440
              : null;

      const meterIdGuess = (() => {
        const br0: any = Array.isArray(inputs.billingRecords) && inputs.billingRecords.length ? inputs.billingRecords[0] : null;
        return String(br0?.saId || br0?.meterNumber || 'site').trim() || 'site';
      })();

      const canonicalPoints = Array.isArray(deps?.intervalPointsV1) && deps?.intervalPointsV1.length ? deps?.intervalPointsV1 : null;
      const billTouCycleLabel =
        billTou && String((billTou as any).cycleLabel || '').trim() && String((billTou as any).cycleLabel || '').trim() !== 'unknown'
          ? String((billTou as any).cycleLabel || '').trim()
          : null;
      const observedTouEnergyByMeterAndCycle =
        billTouCycleLabel && (billTou as any)?.observedTouEnergy?.values && Object.keys((billTou as any).observedTouEnergy.values).length
          ? {
              [meterIdGuess]: {
                [billTouCycleLabel]: {
                  values: (billTou as any).observedTouEnergy.values,
                  fields: (billTou as any).observedTouEnergy.fields,
                },
              },
            }
          : undefined;
      const observedTouDemandByMeterAndCycle =
        billTouCycleLabel && (billTou as any)?.observedTouDemand?.values && Object.keys((billTou as any).observedTouDemand.values).length
          ? {
              [meterIdGuess]: {
                [billTouCycleLabel]: {
                  values: (billTou as any).observedTouDemand.values,
                  fields: (billTou as any).observedTouDemand.fields,
                },
              },
            }
          : undefined;
      return buildDeterminantsPackV1({
        utility: String(u),
        rateCode,
        supplyType: (supplyStructure as any)?.supplyType,
        timezone: tz,
        billingRecords: inputs.billingRecords || null,
        billPdfText: inputs.billPdfText || null,
        ...(observedTouEnergyByMeterAndCycle ? { observedTouEnergyByMeterAndCycle } : {}),
        ...(observedTouDemandByMeterAndCycle ? { observedTouDemandByMeterAndCycle } : {}),
        intervalSeries: canonicalPoints || intervalKwRaw
          ? [
              {
                meterId: meterIdGuess,
                points: canonicalPoints
                  ? canonicalPoints.map((p) => ({
                      timestampIso: String((p as any)?.timestampIso || '').trim(),
                      intervalMinutes: Number((p as any)?.intervalMinutes),
                      ...(Number.isFinite(Number((p as any)?.kWh)) ? { kWh: Number((p as any).kWh) } : {}),
                      ...(Number.isFinite(Number((p as any)?.kW)) ? { kW: Number((p as any).kW) } : {}),
                      ...(Number.isFinite(Number((p as any)?.temperatureF)) ? { temperatureF: Number((p as any).temperatureF) } : {}),
                    }))
                  : intervalKwSeries,
                intervalMinutes: canonicalPoints ? undefined : (intervalMinutes ?? undefined),
                timezone: tz,
                source: canonicalPoints ? 'workflow:intervalPointsV1' : 'utilityIntelligence:intervalKwSeries',
              },
            ]
          : null,
      });
    } catch (e) {
      warn({
        code: 'UIE_DETERMINANTS_PACK_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'buildDeterminantsPackV1',
        exceptionName: exceptionName(e),
        contextKey: 'determinantsPack',
      });
      return null;
    }
  })();

  const determinantsPackSummary = (() => {
    try {
      if (!determinantsPack) return undefined;
      const meters = determinantsPack.meters.map((m: any) => {
        const cycles = [...(m.cycles || [])]
          .slice()
          .sort((a: any, b: any) => (new Date(b.cycle.endIso).getTime() || 0) - (new Date(a.cycle.endIso).getTime() || 0))
          .slice(0, 12)
          .map((c: any) => ({
            cycleLabel: c.cycle.label,
            startIso: c.cycle.startIso,
            endIso: c.cycle.endIso,
            kwhTotal: c.energy.kwhTotal,
            kWMax: c.demand.kWMax,
            ...(c.demand.kWMaxByTouPeriod ? { kWMaxByTouPeriod: c.demand.kWMaxByTouPeriod as any } : {}),
            billingDemandKw: c.demand.billingDemandKw ?? null,
            ratchetDemandKw: (c.demand as any).ratchetDemandKw ?? null,
            ratchetHistoryMaxKw: (c.demand as any).ratchetHistoryMaxKw ?? null,
            ratchetFloorPct: (c.demand as any).ratchetFloorPct ?? null,
            billingDemandMethod: String((c.demand as any).billingDemandMethod || '') || null,
            coveragePct: c.demand.coveragePct ?? null,
            intervalMinutes: c.demand.intervalMinutes ?? null,
          }));
        return {
          meterId: m.meterId,
          last12Cycles: cycles,
          reconciliation: {
            demandMismatchCount: Number((m.reconciliation as any)?.demandMismatchCount || 0),
            kwhMismatchCount: Number((m.reconciliation as any)?.kwhMismatchCount || 0),
            overlapStartIso: (m.reconciliation as any)?.overlapStartIso ?? null,
            overlapEndExclusiveIso: (m.reconciliation as any)?.overlapEndExclusiveIso ?? null,
            reconciledCycleCount: Number((m.reconciliation as any)?.reconciledCycleCount || 0),
            skippedCycleCountByReason: (m.reconciliation as any)?.skippedCycleCountByReason || { no_usage: 0, out_of_overlap_window: 0, low_interval_coverage: 0 },
            latestReconcilableBillEndDate: (m.reconciliation as any)?.latestReconcilableBillEndDate ?? null,
            earliestReconcilableBillEndDate: (m.reconciliation as any)?.earliestReconcilableBillEndDate ?? null,
          },
        };
      });
      return {
        rulesVersionTag: String(determinantsPack.rulesVersionTag || 'determinants:v1'),
        determinantsVersionTag: String((determinantsPack as any).determinantsVersionTag || 'determinants_v1'),
        touLabelerVersionTag: String((determinantsPack as any).touLabelerVersionTag || 'tou_v1'),
        meters,
        warnings: Array.isArray(determinantsPack.warnings) ? determinantsPack.warnings.slice(0, 6) : [],
      };
    } catch (e) {
      warn({
        code: 'UIE_DETERMINANTS_PACK_SUMMARY_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'determinantsPackSummary',
        exceptionName: exceptionName(e),
        contextKey: 'determinantsPackSummary',
      });
      return undefined;
    }
  })();
  {
    const hasRateCode = Boolean(String(inputs.currentRate?.rateCode || '').trim());
    if (!hasRateCode) endStep('determinantsPackV1', { skipped: true, reasonCode: 'NO_CURRENT_RATE_CODE' });
    else endStep('determinantsPackV1');
  }

  return { tariffApplicability, determinantsPack, determinantsPackSummary };
}

