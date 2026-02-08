import type { BatterySpec, LoadInterval, LoadProfile } from './types';
import { simulateCapEnforcement, simulatePeakShaving } from './logic';
import type { OptionSRates } from '../../utils/battery/s-rate-calculations';
import {
  DEFAULT_OPTION_S_RATES_2025_SECONDARY,
  simulateBatteryDispatchWithSRate,
} from '../../utils/battery/s-rate-calculations';
import {
  DEFAULT_OPTION_S_RATES_2025_SECONDARY_OPTIMIZER,
  optimizeOptionSDispatch,
  toSimpleBatteryModel,
} from './option-s-optimizer';

export type DispatchEngine = 'standard' | 'capEnforcement' | 'optionS-optimizer' | 'optionS-heuristic';

export type DispatchRun = {
  engine: DispatchEngine;
  netLoadIntervals: LoadInterval[];
  netLoadKwSeries: number[];
  /** SOC fraction (0..1) per interval when available */
  socSeries?: number[];
  /** Charge kW per interval when available */
  chargeKwSeries?: number[];
  /** Discharge kW per interval when available */
  dischargeKwSeries?: number[];
  warnings: string[];
  solverStatus?: string;
};

export function runStandardPeakShavingDispatch(params: {
  loadProfile: LoadProfile;
  batterySpec: BatterySpec;
  thresholdKw: number;
}): DispatchRun {
  const sim = simulatePeakShaving(params.loadProfile, params.batterySpec, params.thresholdKw);
  const netLoadKwSeries = sim.new_intervals_kw ?? sim.final_load_profile.intervals.map((i) => i.kw);
  const netLoadIntervals: LoadInterval[] = params.loadProfile.intervals.map((orig, idx) => ({
    timestamp: orig.timestamp,
    kw: netLoadKwSeries[idx] ?? orig.kw,
  }));
  return {
    engine: 'standard',
    netLoadIntervals,
    netLoadKwSeries,
    socSeries: sim.battery_soc_history,
    warnings: [],
  };
}

export function runCapEnforcementDispatch(params: {
  loadProfile: LoadProfile;
  batterySpec: BatterySpec;
  capKw: number;
  intervalHours?: number;
}): DispatchRun & { feasible: boolean } {
  const res = simulateCapEnforcement(params.loadProfile, params.batterySpec, params.capKw, {
    intervalHours: params.intervalHours,
  });
  const netLoadIntervals: LoadInterval[] = params.loadProfile.intervals.map((orig, idx) => ({
    timestamp: orig.timestamp,
    kw: res.newIntervalsKw[idx] ?? orig.kw,
  }));
  return {
    engine: 'capEnforcement',
    feasible: res.feasible,
    netLoadIntervals,
    netLoadKwSeries: res.newIntervalsKw,
    socSeries: res.socHistory,
    warnings: res.feasible ? [] : ['Cap enforcement infeasible for the provided cap/battery.'],
  };
}

export async function runOptionSDispatch(params: {
  intervals: Array<{ timestamp: Date; kw: number }>;
  batteryCapacityKwh: number;
  batteryPowerKw: number;
  roundTripEfficiency: number;
  thresholdKw: number;
  rates?: OptionSRates;
  mode?: 'auto' | 'optimizer' | 'heuristic';
}): Promise<
  DispatchRun & {
    /** Raw engine result (useful for UI debug) */
    raw: unknown;
  }
> {
  const warnings: string[] = [];
  const rates = params.rates ?? DEFAULT_OPTION_S_RATES_2025_SECONDARY;
  const mode = params.mode ?? 'auto';

  const tryOptimizer = async (): Promise<DispatchRun & { raw: any }> => {
    const loadProfile: LoadProfile = { intervals: params.intervals };
    const batteryModel = toSimpleBatteryModel({
      id: 'req',
      powerKw: params.batteryPowerKw,
      energyKwh: params.batteryCapacityKwh,
      roundTripEfficiency: params.roundTripEfficiency,
    });
    const opt = await optimizeOptionSDispatch({
      loadProfile,
      battery: batteryModel as any,
      rates: DEFAULT_OPTION_S_RATES_2025_SECONDARY_OPTIMIZER,
    });
    return {
      engine: 'optionS-optimizer',
      netLoadIntervals: opt.modifiedIntervals,
      netLoadKwSeries: opt.modifiedIntervals.map((i) => i.kw),
      warnings,
      solverStatus: opt.dispatch.solverStatus,
      // Prefer SOC from optimizer if available
      socSeries: opt.dispatch.soc_kwh_series?.length
        ? opt.dispatch.soc_kwh_series.map((kwh) =>
            params.batteryCapacityKwh > 0 ? Math.max(0, Math.min(1, kwh / params.batteryCapacityKwh)) : 0
          )
        : undefined,
      chargeKwSeries: opt.dispatch.charge_kw_series,
      dischargeKwSeries: opt.dispatch.discharge_kw_series,
      raw: opt,
    };
  };

  const runHeuristic = (): DispatchRun & { raw: any } => {
    const res = simulateBatteryDispatchWithSRate(
      params.intervals as any,
      params.batteryCapacityKwh,
      params.batteryPowerKw,
      params.roundTripEfficiency,
      params.thresholdKw,
      rates
    );
    return {
      engine: 'optionS-heuristic',
      netLoadIntervals: res.modifiedIntervals,
      netLoadKwSeries: res.modifiedIntervals.map((i: LoadInterval) => i.kw),
      warnings,
      socSeries: res.socHistory,
      raw: res,
    };
  };

  if (mode === 'heuristic') return runHeuristic();
  if (mode === 'optimizer') return await tryOptimizer();

  try {
    return await tryOptimizer();
  } catch (e) {
    warnings.push(
      `Option S optimizer failed; falling back to heuristic dispatch. ${e instanceof Error ? e.message : ''}`.trim()
    );
    return runHeuristic();
  }
}


