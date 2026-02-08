import { computeBillDeterministic } from '../billing/billingOracle';
import { optimizeDispatchLp } from '../optimizer/dispatchLp';
import type { BatterySpec, BillBreakdown, CandidateAssets, RateScenario } from '../types';

export type EvaluateScenarioResult = {
  baselineBill: BillBreakdown;
  scenarioNoDispatchBill: BillBreakdown;
  optimizedBill: BillBreakdown;
  structuralSavingsUsd: number;
  operationalSavingsUsd: number;
  dispatchOutputs?: {
    netLoadKwSeries?: number[];
    socSeries?: number[];
    chargeKwSeries?: number[];
    dischargeKwSeries?: number[];
  };
  solverStatus?: string;
};

/**
 * Phase 1 evaluator:
 * - No-dispatch: tariff-only structural savings.
 * - Dispatch: LP optimization under the scenario tariff (if battery provided).
 */
export async function evaluateScenario(args: {
  baselineTariffIntervals: Array<{ timestamp: Date; kw: number }>;
  baselineBill: BillBreakdown;
  scenario: RateScenario;
  assets: CandidateAssets;
}): Promise<EvaluateScenarioResult> {
  const { baselineTariffIntervals, baselineBill, scenario, assets } = args;

  const scenarioNoDispatchBill = computeBillDeterministic({ tariff: scenario.tariff, intervals: baselineTariffIntervals }).bill;
  const structuralSavingsUsd = baselineBill.totalUsd - scenarioNoDispatchBill.totalUsd;

  // Default dispatch result is no-dispatch unless a battery is provided.
  let optimizedBill = scenarioNoDispatchBill;
  let operationalSavingsUsd = 0;
  let dispatchOutputs: EvaluateScenarioResult['dispatchOutputs'] | undefined;
  let solverStatus: string | undefined;

  const battery = assets.battery;
  if (battery) {
    const opt = await optimizeDispatchLp({ tariff: scenario.tariff, intervals: baselineTariffIntervals, battery });
    solverStatus = opt.solverStatus;

    const optimizedIntervals = baselineTariffIntervals.map((r, idx) => ({
      timestamp: r.timestamp,
      kw: opt.netLoadKwSeries[idx] ?? r.kw,
    }));

    optimizedBill = computeBillDeterministic({ tariff: scenario.tariff, intervals: optimizedIntervals }).bill;
    operationalSavingsUsd = scenarioNoDispatchBill.totalUsd - optimizedBill.totalUsd;

    dispatchOutputs = {
      netLoadKwSeries: opt.netLoadKwSeries,
      socSeries: opt.socKwhSeries ? toSocSeries(opt.socKwhSeries, battery) : undefined,
      chargeKwSeries: opt.chargeKwSeries,
      dischargeKwSeries: opt.dischargeKwSeries,
    };
  }

  return {
    baselineBill,
    scenarioNoDispatchBill,
    optimizedBill,
    structuralSavingsUsd,
    operationalSavingsUsd,
    dispatchOutputs,
    solverStatus,
  };
}

function toSocSeries(socKwhSeries: number[], battery: BatterySpec): number[] {
  const denom = battery.energyKwh > 0 ? battery.energyKwh : 1;
  return socKwhSeries.map((kwh) => Math.max(0, Math.min(1, kwh / denom)));
}

