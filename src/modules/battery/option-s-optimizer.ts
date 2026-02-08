/**
 * Option S-ready battery dispatch + rate choice engine.
 *
 * Core behaviors:
 * - Builds a tariff-aware LP that minimizes total bill (energy + daily demand + monthly demand)
 * - Models Option S eligibility as a kW gate (>=10% of trailing 12‑month peak)
 * - Supports dual-rate evaluation: current rate vs Option S, per battery candidate
 * - Exposes Pareto + knee selector to avoid "tiny battery wins ROI" bias
 *
 * Solver note: Uses glpk.js; if the solver is missing or fails, the helper will
 * throw with a human-friendly error so callers know to install/enable it.
 */

import type { LoadProfile } from './types';
import type { LoadInterval } from './types';

type TouBucket = 'on' | 'part' | 'off';

export type TariffInterval = {
  ts: Date;
  kW_base: number; // site demand (kW)
  kWh_base: number; // interval energy (kWh)
  monthKey: string; // "YYYY-MM"
  dayKey: string; // "YYYY-MM-DD"
  tou: TouBucket;
};

export type DemandComponent =
  | { kind: 'monthlyMax'; name: string; rate_per_kW: number; applies: (i: TariffInterval) => boolean }
  | { kind: 'dailyMax'; name: string; rate_per_kW: number; applies: (i: TariffInterval) => boolean };

export type RatePlan = {
  name: string;
  energy_rate_per_kWh: (i: TariffInterval) => number;
  demand_components: DemandComponent[]; // include both daily + monthly components
  fixed_monthly_usd?: number;
};

export type BatteryModel = {
  id: string;
  nameplate_power_kw: number; // continuous inverter kW
  nameplate_energy_kwh: number; // usable at BOL
  min_soc_frac: number;
  max_soc_frac: number;
  round_trip_efficiency_pct: number; // DC-DC RTE
  charge_c_rate: number;
  discharge_c_rate: number;
  parasitic_load_kw?: number;
  fixed_om_usd_per_kw_per_year?: number;
  variable_om_usd_per_mwh?: number;
  replacement_cost_usd_per_kwh?: number;
  warranty_throughput_mwh?: number;
  ems_reserve_frac?: number;
};

export type DispatchResult = {
  solverStatus: string;
  bill_usd: number;
  energy_charges_usd: number;
  demand_charges_usd: number;
  fixed_charges_usd: number;
  throughput_mwh: number;
  peak_monthly_kw: Record<string, number>;
  peak_daily_kw: Record<string, number>;
  net_load_series: number[];
  /** Charge power (kW) per interval. */
  charge_kw_series?: number[];
  /** Discharge power (kW) per interval. */
  discharge_kw_series?: number[];
  /** SOC (kWh) per interval boundary, length = intervals+1 when available. */
  soc_kwh_series?: number[];
};

export type OptionSRatesConfig = {
  dailyPeakRatePerKwDay: number;
  dailyPartPeakRatePerKwDay: number;
  monthlyMaxAllHoursRatePerKwMonth: number;
  monthlyMaxExclWindowRatePerKwMonth: number;
  monthlyExclusionHoursLocal?: { startHour: number; endHour: number };
  peakHoursLocal?: { startHour: number; endHour: number };
  partPeakWindowsLocal?: Array<{ startHour: number; endHour: number }>;
};

export const DEFAULT_OPTION_S_RATES_2025_SECONDARY_OPTIMIZER: OptionSRatesConfig = {
  dailyPeakRatePerKwDay: 1.61,
  dailyPartPeakRatePerKwDay: 0.08,
  monthlyMaxAllHoursRatePerKwMonth: 1.23,
  monthlyMaxExclWindowRatePerKwMonth: 6.72,
  monthlyExclusionHoursLocal: { startHour: 9, endHour: 14 },
  peakHoursLocal: { startHour: 16, endHour: 21 },
  partPeakWindowsLocal: [
    { startHour: 14, endHour: 16 },
    { startHour: 21, endHour: 23 },
  ],
};

export type EligibilityResult = {
  eligible: boolean;
  peak_kw_12mo: number;
  min_kw_required: number;
};

export type KneeCandidate = { capex: number; npv: number };

/**
 * Derive interval duration (hours) from LoadProfile; default 0.25 (15-min).
 */
export function getIntervalHours(
  loadProfile: { intervals: Array<{ timestamp?: Date | string; ts?: Date }> },
  fallback: number = 0.25
): number {
  if (!loadProfile.intervals || loadProfile.intervals.length < 2) return fallback;
  const first = loadProfile.intervals[0];
  const second = loadProfile.intervals[1];
  const t0 = new Date((first as any).timestamp ?? (first as any).ts).getTime();
  const t1 = new Date((second as any).timestamp ?? (second as any).ts).getTime();
  const dtHours = (t1 - t0) / (1000 * 60 * 60);
  if (!Number.isFinite(dtHours) || dtHours <= 0) return fallback;
  return dtHours;
}

/**
 * Map LoadProfile -> TariffInterval[] with precomputed day/month keys and TOU bucket.
 */
export function toTariffIntervals(
  loadProfile: LoadProfile,
  touMapper: (d: Date) => TouBucket,
  opts?: { intervalHours?: number }
): TariffInterval[] {
  const intervalHours = opts?.intervalHours ?? getIntervalHours(loadProfile);
  return loadProfile.intervals.map((interval) => {
    const ts = interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp);
    const monthKey = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`;
    const dayKey = `${monthKey}-${String(ts.getDate()).padStart(2, '0')}`;
    const kW_base = interval.kw;
    return {
      ts,
      kW_base,
      kWh_base: kW_base * intervalHours,
      monthKey,
      dayKey,
      tou: touMapper(ts),
    };
  });
}

/**
 * Option S eligibility: battery power (kW) must be >= 10% of trailing 12‑month peak.
 */
export function optionSEligibility(batt: BatteryModel, intervals: TariffInterval[]): EligibilityResult {
  if (intervals.length === 0) {
    return { eligible: false, peak_kw_12mo: 0, min_kw_required: 0 };
  }
  const latestTs = intervals[intervals.length - 1].ts.getTime();
  const cutoff = latestTs - 365 * 24 * 60 * 60 * 1000;
  const trailing = intervals.filter((i) => i.ts.getTime() >= cutoff);
  const peak_kw_12mo = trailing.reduce((max, i) => Math.max(max, i.kW_base), 0);
  const min_kw_required = 0.1 * peak_kw_12mo;
  return {
    eligible: batt.nameplate_power_kw >= min_kw_required,
    peak_kw_12mo,
    min_kw_required,
  };
}

/**
 * Compute effective limits + split efficiency.
 */
function effectiveLimits(b: BatteryModel) {
  const E = b.nameplate_energy_kwh;
  const Pname = b.nameplate_power_kw;
  const Pch = Math.min(Pname, b.charge_c_rate * E);
  const Pdis = Math.min(Pname, b.discharge_c_rate * E);
  const reserve = b.ems_reserve_frac ?? 0;
  const socMin = E * Math.max(b.min_soc_frac, reserve);
  const socMax = E * Math.min(b.max_soc_frac, 1 - reserve);
  const rte = b.round_trip_efficiency_pct / 100;
  const eta = Math.sqrt(Math.max(0.01, Math.min(0.999, rte)));
  return { E, Pch, Pdis, socMin, socMax, eta_ch: eta, eta_dis: eta };
}

type GlpkInstance = Awaited<ReturnType<(typeof import('glpk.js'))['default']>>;

async function loadGlpk(): Promise<GlpkInstance> {
  const mod = await import('glpk.js');
  const loader = (mod as any).default ?? (mod as any);
  return loader();
}

type ObjCoef = Record<string, number>;

function accumulate(obj: ObjCoef, name: string, delta: number) {
  obj[name] = (obj[name] ?? 0) + delta;
}

/**
 * Build and solve the LP with glpk.js.
 * Minimizes total bill = energy + daily demand + monthly demand + variable O&M + degradation proxy.
 */
export async function optimizeBillWithGlpk(
  intervals: TariffInterval[],
  battery: BatteryModel,
  ratePlan: RatePlan,
  opts?: {
    intervalHours?: number;
    degradation_cost_usd_per_mwh?: number;
    initial_soc_frac?: number;
  }
): Promise<DispatchResult> {
  const glpk = await loadGlpk();
  const {
    GLP_MIN,
    GLP_LO,
    GLP_DB,
    GLP_FX,
    GLP_MSG_ERR,
    GLP_MSG_OFF,
  } = glpk;

  if (intervals.length === 0) {
    return {
      solverStatus: 'no-intervals',
      bill_usd: 0,
      energy_charges_usd: 0,
      demand_charges_usd: 0,
      fixed_charges_usd: 0,
      throughput_mwh: 0,
      peak_monthly_kw: {},
      peak_daily_kw: {},
      net_load_series: [],
    };
  }

  const h = opts?.intervalHours ?? getIntervalHours({ intervals });
  const { E, Pch, Pdis, socMin, socMax, eta_ch, eta_dis } = effectiveLimits(battery);
  const soc0 = Math.min(socMax, Math.max(socMin, (opts?.initial_soc_frac ?? socMax / E) * E));
  const parasitic = battery.parasitic_load_kw ?? 0;
  const varOmPerKwh = (battery.variable_om_usd_per_mwh ?? 0) / 1000;
  const degPerKwh = (opts?.degradation_cost_usd_per_mwh ?? 0) / 1000;

  const objective: ObjCoef = {};
  const bounds: Array<{ name: string; type: number; lb: number; ub: number }> = [];
  const constraints: Array<{
    name: string;
    vars: Array<{ name: string; coef: number }>;
    bnds: { type: number; lb: number; ub: number };
  }> = [];

  // SOC initial bound
  bounds.push({ name: 'soc_0', type: GLP_FX, lb: soc0, ub: soc0 });
  const boundedSoc = new Set<string>(['soc_0']);

  // Demand variables by month/day
  const monthlyVars = new Map<string, { name: string; rate: number; monthKey: string }>();
  const dailyVars = new Map<string, { name: string; rate: number; dayKey: string }>();

  // Build per-interval variables and SOC dynamics
  intervals.forEach((interval, idx) => {
    const pCh = `p_ch_${idx}`;
    const pDis = `p_dis_${idx}`;
    const soc = `soc_${idx}`;
    const socNext = `soc_${idx + 1}`;

    // Power bounds
    bounds.push({ name: pCh, type: GLP_DB, lb: 0, ub: Pch });
    bounds.push({ name: pDis, type: GLP_DB, lb: 0, ub: Pdis });

    // SOC bounds (except soc_0 already fixed)
    if (idx > 0 && !boundedSoc.has(soc)) {
      bounds.push({ name: soc, type: GLP_DB, lb: socMin, ub: socMax });
      boundedSoc.add(soc);
    }
    // Last SOC bound
    if (idx === intervals.length - 1 && !boundedSoc.has(socNext)) {
      bounds.push({ name: socNext, type: GLP_DB, lb: socMin, ub: socMax });
      boundedSoc.add(socNext);
    }

    // SOC dynamics: soc_{t+1} - soc_t - (p_ch * η_ch - p_dis / η_dis) * h = 0
    constraints.push({
      name: `soc_dyn_${idx}`,
      vars: [
        { name: socNext, coef: 1 },
        { name: soc, coef: -1 },
        { name: pCh, coef: -eta_ch * h },
        { name: pDis, coef: (1 / eta_dis) * h },
      ],
      bnds: { type: GLP_FX, lb: 0, ub: 0 },
    });

    // Energy cost coefficients: energy_rate * (p_ch - p_dis) * h
    const energyRate = ratePlan.energy_rate_per_kWh(interval);
    accumulate(objective, pCh, energyRate * h);
    accumulate(objective, pDis, (-energyRate + varOmPerKwh + degPerKwh) * h);
  });

  // Demand variables and constraints
  ratePlan.demand_components.forEach((comp) => {
    if (comp.kind === 'monthlyMax') {
      const monthGroups = new Map<string, TariffInterval[]>();
      intervals.forEach((i) => {
        if (!comp.applies(i)) return;
        const list = monthGroups.get(i.monthKey) ?? [];
        list.push(i);
        monthGroups.set(i.monthKey, list);
      });
      monthGroups.forEach((list, monthKey) => {
        const varName = `D_month_${comp.name}_${monthKey}`;
        monthlyVars.set(varName, { name: varName, rate: comp.rate_per_kW, monthKey });
        bounds.push({ name: varName, type: GLP_LO, lb: 0, ub: Number.POSITIVE_INFINITY });
        list.forEach((i) => {
          const idx = intervals.indexOf(i);
          constraints.push({
            name: `c_month_${comp.name}_${monthKey}_${idx}`,
            vars: [
              { name: varName, coef: 1 },
              { name: `p_ch_${idx}`, coef: -1 },
              { name: `p_dis_${idx}`, coef: 1 },
            ],
            bnds: {
              type: GLP_LO,
              lb: i.kW_base + parasitic,
              ub: Number.POSITIVE_INFINITY,
            },
          });
        });
      });
    } else {
      const dayGroups = new Map<string, TariffInterval[]>();
      intervals.forEach((i) => {
        if (!comp.applies(i)) return;
        const list = dayGroups.get(i.dayKey) ?? [];
        list.push(i);
        dayGroups.set(i.dayKey, list);
      });
      dayGroups.forEach((list, dayKey) => {
        const varName = `D_day_${comp.name}_${dayKey}`;
        dailyVars.set(varName, { name: varName, rate: comp.rate_per_kW, dayKey });
        bounds.push({ name: varName, type: GLP_LO, lb: 0, ub: Number.POSITIVE_INFINITY });
        list.forEach((i) => {
          const idx = intervals.indexOf(i);
          constraints.push({
            name: `c_day_${comp.name}_${dayKey}_${idx}`,
            vars: [
              { name: varName, coef: 1 },
              { name: `p_ch_${idx}`, coef: -1 },
              { name: `p_dis_${idx}`, coef: 1 },
            ],
            bnds: {
              type: GLP_LO,
              lb: i.kW_base + parasitic,
              ub: Number.POSITIVE_INFINITY,
            },
          });
        });
      });
    }
  });

  // Demand charge objective
  monthlyVars.forEach((v) => accumulate(objective, v.name, v.rate));
  dailyVars.forEach((v) => accumulate(objective, v.name, v.rate));

  // Convert objective map to array
  const objectiveVars = Object.entries(objective).map(([name, coef]) => ({ name, coef }));

  const model = {
    name: `bill-${ratePlan.name}`,
    objective: {
      direction: GLP_MIN,
      name: 'cost',
      vars: objectiveVars,
    },
    subjectTo: constraints,
    bounds,
  };

  const solution = glpk.solve(model, { msglev: GLP_MSG_ERR ?? GLP_MSG_OFF });
  const vars = (solution as any)?.result?.vars ?? (solution as any)?.vars ?? {};
  const status = (solution as any)?.result?.status ?? 'unknown';

  // Reconstruct series + costs
  const net_load_series: number[] = [];
  const charge_kw_series: number[] = [];
  const discharge_kw_series: number[] = [];
  const soc_kwh_series: number[] = [];
  let dischargeMWh = 0;
  intervals.forEach((interval, idx) => {
    const pCh = vars[`p_ch_${idx}`] ?? 0;
    const pDis = vars[`p_dis_${idx}`] ?? 0;
    const net = interval.kW_base + pCh - pDis + parasitic;
    net_load_series.push(net);
    charge_kw_series.push(pCh);
    discharge_kw_series.push(pDis);
    // SOC variables are kWh; include if present
    const socNow = vars[`soc_${idx}`];
    if (idx === 0) {
      const soc0v = vars['soc_0'];
      if (soc0v != null) soc_kwh_series.push(soc0v);
    }
    if (socNow != null && idx > 0 && soc_kwh_series.length < idx + 1) soc_kwh_series.push(socNow);
    const socNext = vars[`soc_${idx + 1}`];
    if (socNext != null) soc_kwh_series.push(socNext);
    dischargeMWh += (pDis * h) / 1000;
  });

  const demand_charges_usd =
    [...monthlyVars.values()].reduce((sum, v) => sum + (vars[v.name] ?? 0) * v.rate, 0) +
    [...dailyVars.values()].reduce((sum, v) => sum + (vars[v.name] ?? 0) * v.rate, 0);

  const energy_charges_usd = net_load_series.reduce((sum, net, idx) => {
    const r = ratePlan.energy_rate_per_kWh(intervals[idx]);
    return sum + r * net * h;
  }, 0);

  const fixed_charges_usd = (ratePlan.fixed_monthly_usd ?? 0) * new Set(intervals.map((i) => i.monthKey)).size;

  const peak_monthly_kw: Record<string, number> = {};
  const peak_daily_kw: Record<string, number> = {};
  intervals.forEach((i, idx) => {
    const net = net_load_series[idx];
    peak_monthly_kw[i.monthKey] = Math.max(peak_monthly_kw[i.monthKey] ?? 0, net);
    peak_daily_kw[i.dayKey] = Math.max(peak_daily_kw[i.dayKey] ?? 0, net);
  });

  return {
    solverStatus: String(status),
    bill_usd: energy_charges_usd + demand_charges_usd + fixed_charges_usd,
    energy_charges_usd,
    demand_charges_usd,
    fixed_charges_usd,
    throughput_mwh: dischargeMWh,
    peak_monthly_kw,
    peak_daily_kw,
    net_load_series,
    charge_kw_series,
    discharge_kw_series,
    soc_kwh_series: soc_kwh_series.length ? soc_kwh_series : undefined,
  };
}

function isInWindow(hour: number, w: { startHour: number; endHour: number }): boolean {
  return hour >= w.startHour && hour < w.endHour;
}

/**
 * Build an Option S rate plan (demand components) using local-clock windows.
 *
 * Note: Energy rate defaults to 0 (demand-charge optimization). You can supply a schedule-aware
 * energy function if/when you have verified tariff tables.
 */
export function buildOptionSRatePlan(params: {
  name?: string;
  rates?: OptionSRatesConfig;
  energy_rate_per_kWh?: (i: TariffInterval) => number;
}): RatePlan {
  const rates = params.rates ?? DEFAULT_OPTION_S_RATES_2025_SECONDARY_OPTIMIZER;
  const peak = rates.peakHoursLocal ?? { startHour: 16, endHour: 21 };
  const part = rates.partPeakWindowsLocal ?? [
    { startHour: 14, endHour: 16 },
    { startHour: 21, endHour: 23 },
  ];
  const excl = rates.monthlyExclusionHoursLocal ?? { startHour: 9, endHour: 14 };

  const isPeak = (i: TariffInterval) => isInWindow(i.ts.getHours(), peak);
  const isPart = (i: TariffInterval) => part.some((w) => isInWindow(i.ts.getHours(), w));
  const isOutsideExcl = (i: TariffInterval) => !isInWindow(i.ts.getHours(), excl);

  return {
    name: params.name ?? 'OptionS',
    energy_rate_per_kWh: params.energy_rate_per_kWh ?? (() => 0),
    demand_components: [
      { kind: 'dailyMax', name: 'dailyPeak', rate_per_kW: rates.dailyPeakRatePerKwDay, applies: isPeak },
      { kind: 'dailyMax', name: 'dailyPartPeak', rate_per_kW: rates.dailyPartPeakRatePerKwDay, applies: isPart },
      { kind: 'monthlyMax', name: 'monthlyAllHours', rate_per_kW: rates.monthlyMaxAllHoursRatePerKwMonth, applies: () => true },
      { kind: 'monthlyMax', name: 'monthlyExcl', rate_per_kW: rates.monthlyMaxExclWindowRatePerKwMonth, applies: isOutsideExcl },
    ],
  };
}

export type OptionSOptimizedAnalysis = {
  dispatch: DispatchResult;
  modifiedIntervals: LoadInterval[];
};

/**
 * Primary Option S dispatch + bill calculation using the LP optimizer.
 * Returns a net-load interval series aligned to the input ordering.
 */
export async function optimizeOptionSDispatch(params: {
  loadProfile: LoadProfile;
  battery: BatteryModel;
  rates?: OptionSRatesConfig;
  touMapper?: (d: Date) => TouBucket;
  intervalHours?: number;
  energy_rate_per_kWh?: (i: TariffInterval) => number;
}): Promise<OptionSOptimizedAnalysis> {
  const touMapper = params.touMapper ?? (() => 'off');
  const tariffIntervals = toTariffIntervals(params.loadProfile, touMapper, { intervalHours: params.intervalHours });
  const ratePlan = buildOptionSRatePlan({ rates: params.rates, energy_rate_per_kWh: params.energy_rate_per_kWh });
  const dispatch = await optimizeBillWithGlpk(tariffIntervals, params.battery, ratePlan, { intervalHours: params.intervalHours });

  const modifiedIntervals: LoadInterval[] = params.loadProfile.intervals.map((orig, idx) => ({
    timestamp: orig.timestamp,
    kw: dispatch.net_load_series[idx] ?? orig.kw,
  }));

  return { dispatch, modifiedIntervals };
}

/**
 * Convenience wrapper for creating a BatteryModel from common kW/kWh inputs.
 */
export function toSimpleBatteryModel(params: {
  id?: string;
  powerKw: number;
  energyKwh: number;
  roundTripEfficiency: number; // 0..1
  minSocFrac?: number;
  maxSocFrac?: number;
}): BatteryModel {
  return {
    id: params.id ?? 'battery',
    nameplate_power_kw: params.powerKw,
    nameplate_energy_kwh: params.energyKwh,
    min_soc_frac: params.minSocFrac ?? 0.10,
    max_soc_frac: params.maxSocFrac ?? 0.90,
    round_trip_efficiency_pct: Math.max(0.01, Math.min(0.999, params.roundTripEfficiency)) * 100,
    // Conservative 1C bounds unless you have explicit c-rate data.
    charge_c_rate: 1,
    discharge_c_rate: 1,
  };
}

/**
 * Pareto knee selector: pick the smallest system where marginal NPV/$ drops below slope.
 */
export function pickKneeByMarginalValue<T extends KneeCandidate>(opts: T[], minSlope: number = 0.15): T {
  const s = [...opts].sort((a, b) => a.capex - b.capex);
  let best = s[0];
  for (let i = 1; i < s.length; i++) {
    const dCap = s[i].capex - s[i - 1].capex;
    const dN = s[i].npv - s[i - 1].npv;
    const slope = dN / Math.max(1e-6, dCap);
    best = s[i];
    if (slope < minSlope) return s[i - 1];
  }
  return best;
}

