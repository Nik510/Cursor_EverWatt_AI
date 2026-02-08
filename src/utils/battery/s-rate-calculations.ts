/**
 * S Rate (Option S) Specific Calculations
 * 
 * PG&E Option S is a DIFFERENT schedule (e.g., B-19S), with demand charges that
 * include DAILY demand components (and in many versions, a reduced MONTHLY component).
 * This utility provides functions to calculate costs under S rate and
 * simulate battery dispatch with S rate constraints.
 */

import type { LoadInterval } from '../../modules/battery/types';

/**
 * Legacy: A single daily demand charge rate for 2025.
 *
 * IMPORTANT:
 * Option S is not a single "all-day daily max" rate in the general case.
 * It is typically defined over Peak / Part-Peak windows and may include a reduced
 * monthly demand component. We keep this for backward compatibility, but prefer
 * `calculateOptionSDemandCharges(...)`.
 */
export const S_RATE_DAILY_RATE_2025 = 1.61; // $/kW/day

export type OptionSVoltageLevel = 'secondary' | 'primary' | 'transmission';

export type OptionSRates = {
  /** Daily demand charge for Peak window ($/kW-day). */
  dailyPeakRatePerKwDay: number;
  /** Daily demand charge for Part-Peak window ($/kW-day). */
  dailyPartPeakRatePerKwDay: number;
  /**
   * Monthly demand charge for maximum demand across ALL hours ($/kW-month).
   * Some Option S versions include this component.
   */
  monthlyMaxAllHoursRatePerKwMonth: number;
  /**
   * Monthly demand charge for maximum demand excluding a midday window ($/kW-month).
   * The exclusion window varies by schedule; see `monthlyExclusionHoursLocal`.
   */
  monthlyMaxExclWindowRatePerKwMonth: number;
  /** Hours [start,end) excluded from the "excl-window" monthly max (local clock). Default 9:00–14:00. */
  monthlyExclusionHoursLocal?: { startHour: number; endHour: number };
  /** Peak hours [start,end) (local clock). Default 16:00–21:00. */
  peakHoursLocal?: { startHour: number; endHour: number };
  /** Part-peak windows (local clock). Default 14:00–16:00 and 21:00–23:00. */
  partPeakWindowsLocal?: Array<{ startHour: number; endHour: number }>;
};

/**
 * Default Option S rates (2025) for SECONDARY voltage.
 *
 * NOTE: These values should be verified/updated against the official PG&E tariff
 * for the specific Option S schedule in use (e.g., B-19S, E-19S, B-20S).
 *
 * We intentionally keep this as a single, overridable config so we can swap in
 * schedule-accurate tables later.
 */
export const DEFAULT_OPTION_S_RATES_2025_SECONDARY: OptionSRates = {
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

function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function isInWindow(hour: number, w: { startHour: number; endHour: number }): boolean {
  return hour >= w.startHour && hour < w.endHour;
}

/**
 * Calculate Option S demand charges with schedule-aware components.
 *
 * Output:
 * - daily: per-day Peak/Part-Peak maxima and charges
 * - monthly: per-month demand charges (daily accumulations + monthly components)
 */
export function calculateOptionSDemandCharges(
  intervalData: LoadInterval[],
  rates: OptionSRates = DEFAULT_OPTION_S_RATES_2025_SECONDARY
): {
  daily: Array<{
    date: string;
    peakKw: number;
    partPeakKw: number;
    dailyCharge: number;
  }>;
  monthly: Array<{
    month: string;
    dailyDemandCharge: number;
    monthlyMaxAllHoursKw: number;
    monthlyMaxExclWindowKw: number;
    monthlyDemandCharge: number;
    totalDemandCharge: number;
  }>;
  totalInData: number;
} {
  const peakWindow = rates.peakHoursLocal ?? { startHour: 16, endHour: 21 };
  const partPeakWindows = rates.partPeakWindowsLocal ?? [
    { startHour: 14, endHour: 16 },
    { startHour: 21, endHour: 23 },
  ];
  const exclusion = rates.monthlyExclusionHoursLocal ?? { startHour: 9, endHour: 14 };

  // Track day maxima by window
  const byDay = new Map<string, { peakKw: number; partPeakKw: number }>();
  // Track month maxima for monthly components
  const byMonthMaxAll = new Map<string, number>();
  const byMonthMaxExcl = new Map<string, number>();

  for (const interval of intervalData) {
    const ts = interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp);
    const hour = ts.getHours();
    const dk = dateKeyLocal(ts);
    const mk = monthKeyLocal(ts);

    const cur = byDay.get(dk) ?? { peakKw: 0, partPeakKw: 0 };
    if (isInWindow(hour, peakWindow)) {
      cur.peakKw = Math.max(cur.peakKw, interval.kw);
    }
    if (partPeakWindows.some((w) => isInWindow(hour, w))) {
      cur.partPeakKw = Math.max(cur.partPeakKw, interval.kw);
    }
    byDay.set(dk, cur);

    byMonthMaxAll.set(mk, Math.max(byMonthMaxAll.get(mk) || 0, interval.kw));
    if (!isInWindow(hour, exclusion)) {
      byMonthMaxExcl.set(mk, Math.max(byMonthMaxExcl.get(mk) || 0, interval.kw));
    }
  }

  const daily = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      peakKw: v.peakKw,
      partPeakKw: v.partPeakKw,
      dailyCharge: v.peakKw * rates.dailyPeakRatePerKwDay + v.partPeakKw * rates.dailyPartPeakRatePerKwDay,
    }));

  // Aggregate daily charges into months
  const dailyByMonth = new Map<string, number>();
  for (const d of daily) {
    const mk = d.date.slice(0, 7);
    dailyByMonth.set(mk, (dailyByMonth.get(mk) || 0) + d.dailyCharge);
  }

  const months = Array.from(new Set([...byMonthMaxAll.keys(), ...dailyByMonth.keys(), ...byMonthMaxExcl.keys()])).sort();
  const monthly = months.map((mk) => {
    const dailyDemandCharge = dailyByMonth.get(mk) || 0;
    const monthlyMaxAllHoursKw = byMonthMaxAll.get(mk) || 0;
    const monthlyMaxExclWindowKw = byMonthMaxExcl.get(mk) || 0;
    const monthlyDemandCharge =
      monthlyMaxAllHoursKw * rates.monthlyMaxAllHoursRatePerKwMonth +
      monthlyMaxExclWindowKw * rates.monthlyMaxExclWindowRatePerKwMonth;
    const totalDemandCharge = dailyDemandCharge + monthlyDemandCharge;
    return {
      month: mk,
      dailyDemandCharge,
      monthlyMaxAllHoursKw,
      monthlyMaxExclWindowKw,
      monthlyDemandCharge,
      totalDemandCharge,
    };
  });

  const totalInData = monthly.reduce((sum, m) => sum + m.totalDemandCharge, 0);

  return { daily, monthly, totalInData };
}

/**
 * Calculate daily demand charges for S rate
 * S rate charges based on the maximum demand each day
 */
export function calculateSRateDailyDemandCharges(
  intervalData: LoadInterval[],
  dailyRate: number = S_RATE_DAILY_RATE_2025
): { dailyCharges: Array<{ date: string; peakKw: number; charge: number }>; totalAnnual: number } {
  // Group intervals by day
  const dailyPeaks = new Map<string, number>();
  
  for (const interval of intervalData) {
    const timestamp = interval.timestamp instanceof Date 
      ? interval.timestamp 
      : new Date(interval.timestamp);
    const dateKey = dateKeyLocal(timestamp); // YYYY-MM-DD (local)
    
    const currentPeak = dailyPeaks.get(dateKey) || 0;
    dailyPeaks.set(dateKey, Math.max(currentPeak, interval.kw));
  }
  
  // Calculate daily charges
  const dailyCharges = Array.from(dailyPeaks.entries()).map(([date, peakKw]) => ({
    date,
    peakKw,
    charge: peakKw * dailyRate,
  }));
  
  const totalAnnual = dailyCharges.reduce((sum, d) => sum + d.charge, 0);
  
  return { dailyCharges, totalAnnual };
}

/**
 * Simulate battery dispatch with S rate constraints
 * S rate requires battery to discharge during 4-9pm daily window
 * to maximize daily peak reduction
 */
export function simulateBatteryDispatchWithSRate(
  intervalData: LoadInterval[],
  batteryCapacityKwh: number,
  batteryPowerKw: number,
  roundTripEfficiency: number = 0.90,
  threshold: number,
  rates: OptionSRates = DEFAULT_OPTION_S_RATES_2025_SECONDARY
): {
  modifiedIntervals: LoadInterval[];
  dailyPeaks: Array<{
    date: string;
    /** Max kW observed during Peak window (local). */
    originalPeak: number;
    /** Max kW observed during Peak window (local) after dispatch. */
    newPeak: number;
    reduction: number;
    /** Max kW observed during Part-Peak windows (local). */
    originalPartPeakKw: number;
    newPartPeakKw: number;
  }>;
  totalAnnualCharge: number;
  socHistory: number[];
} {
  const modifiedIntervals: LoadInterval[] = [];
  const dailyPeaks = new Map<
    string,
    { originalPeak: number; newPeak: number; originalPartPeakKw: number; newPartPeakKw: number }
  >();
  const socHistory: number[] = [];
  
  // Battery state
  const minSOC = 0.10;
  const maxSOC = 0.90;
  const usableCapacity = batteryCapacityKwh * 0.90; // 90% DoD
  let soc = maxSOC;
  let storedEnergy = soc * usableCapacity;
  
  const intervalHours = 0.25; // 15 minutes
  const chargeMarginKw = Math.max(10, threshold * 0.05);

  const peakWindow = rates.peakHoursLocal ?? { startHour: 16, endHour: 21 };
  const partPeakWindows = rates.partPeakWindowsLocal ?? [
    { startHour: 14, endHour: 16 },
    { startHour: 21, endHour: 23 },
  ];
  const exclusion = rates.monthlyExclusionHoursLocal ?? { startHour: 9, endHour: 14 };

  const isInWindow = (hour: number, w: { startHour: number; endHour: number }) => hour >= w.startHour && hour < w.endHour;
  const isPartPeak = (hour: number) => partPeakWindows.some((w) => isInWindow(hour, w));

  // Precompute per-day energy requirement for tomorrow (simple look-ahead reserve).
  // This helps avoid “dumping” SOC early and being empty when it matters daily.
  const requiredKwhByDay = new Map<string, number>();
  for (const interval of intervalData) {
    const ts = interval.timestamp instanceof Date ? interval.timestamp : new Date(interval.timestamp);
    const hour = ts.getHours();
    const inChargeWindows = isInWindow(hour, peakWindow) || isPartPeak(hour);
    if (!inChargeWindows) continue;
    if (interval.kw <= threshold) continue;
    const dk = dateKeyLocal(ts);
    requiredKwhByDay.set(dk, (requiredKwhByDay.get(dk) ?? 0) + (interval.kw - threshold) * intervalHours);
  }
  const sortedDays = Array.from(requiredKwhByDay.keys()).sort();
  const nextDayReq = new Map<string, number>();
  for (let i = 0; i < sortedDays.length; i++) {
    const today = sortedDays[i];
    const tomorrow = sortedDays[i + 1];
    nextDayReq.set(today, tomorrow ? (requiredKwhByDay.get(tomorrow) ?? 0) : 0);
  }
  
  // Process intervals
  for (const interval of intervalData) {
    const timestamp = interval.timestamp instanceof Date 
      ? interval.timestamp 
      : new Date(interval.timestamp);
    const dateKey = dateKeyLocal(timestamp);
    const hour = timestamp.getHours();
    
    const demand = interval.kw;
    
    const currentDay =
      dailyPeaks.get(dateKey) || { originalPeak: 0, newPeak: 0, originalPartPeakKw: 0, newPartPeakKw: 0 };

    const inPeak = isInWindow(hour, peakWindow);
    const inPartPeak = isPartPeak(hour);

    // Track original window maxima (Option S uses window maxima, not all-hours daily max)
    if (inPeak) currentDay.originalPeak = Math.max(currentDay.originalPeak, demand);
    if (inPartPeak) currentDay.originalPartPeakKw = Math.max(currentDay.originalPartPeakKw, demand);
    
    // Reserve enough SOC to cover part of tomorrow’s expected window exceedance energy.
    // This is deliberately conservative and keeps the heuristic stable.
    const reserveKwhTomorrow = (nextDayReq.get(dateKey) ?? 0) * 0.8;
    const reserveSocMin = usableCapacity > 0 ? Math.min(maxSOC, Math.max(minSOC, minSOC + reserveKwhTomorrow / usableCapacity)) : minSOC;
    
    let dischargePower = 0;
    let chargePower = 0;
    
    // Discharge during Peak OR Part-Peak windows if demand exceeds threshold.
    // This aligns dispatch with Option S daily charge determinants.
    if ((inPeak || inPartPeak) && demand > threshold && soc > reserveSocMin) {
      const excessDemand = demand - threshold;
      const availableEnergy = (soc - reserveSocMin) * usableCapacity;
      const maxDischargeFromEnergy = availableEnergy / intervalHours;
      
      dischargePower = Math.min(
        batteryPowerKw,
        maxDischargeFromEnergy,
        excessDemand
      );
    }
    
    // Charge strategy (Option S-aware):
    // - Prefer charging during the exclusion window (9-14) and late-night (23-6)
    // - Avoid charging in Peak/Part-Peak windows
    // - Avoid creating a new all-hours monthly maximum: only charge if demand stays below (threshold - margin)
    const isPreferredChargeWindow = isInWindow(hour, exclusion) || hour >= 23 || hour < 6;
    const canChargeByHeadroom = demand < threshold - chargeMarginKw;
    if (!inPeak && !inPartPeak && isPreferredChargeWindow && canChargeByHeadroom && soc < maxSOC) {
      const availableCapacity = (maxSOC - soc) * usableCapacity;
      const maxChargeFromCapacity = availableCapacity / intervalHours;
      
      const headroomKw = (threshold - chargeMarginKw) - demand;
      chargePower = Math.min(
        batteryPowerKw,
        maxChargeFromCapacity,
        headroomKw
      );
    }
    
    // Apply efficiency
    const energyDischarged = dischargePower * intervalHours;
    const energyCharged = chargePower * intervalHours;
    
    // Update battery state
    const oneWayEfficiency = Math.sqrt(roundTripEfficiency);
    const energyRemoved = energyDischarged / oneWayEfficiency;
    const energyAdded = energyCharged * oneWayEfficiency;
    
    storedEnergy = storedEnergy - energyRemoved + energyAdded;
    storedEnergy = Math.max(0, Math.min(usableCapacity, storedEnergy));
    soc = storedEnergy / usableCapacity;
    soc = Math.max(minSOC, Math.min(maxSOC, soc));
    storedEnergy = soc * usableCapacity;
    
    socHistory.push(soc);
    
    // Net demand seen by the meter:
    // - Discharging reduces site demand
    // - Charging increases site demand
    const newDemand = demand - dischargePower + chargePower;

    // Track post-dispatch window maxima
    if (inPeak) currentDay.newPeak = Math.max(currentDay.newPeak, newDemand);
    if (inPartPeak) currentDay.newPartPeakKw = Math.max(currentDay.newPartPeakKw, newDemand);
    dailyPeaks.set(dateKey, currentDay);
    
    modifiedIntervals.push({
      timestamp: interval.timestamp,
      kw: newDemand,
    });
  }
  
  // Calculate daily peaks (for display/diagnostics)
  const dailyCharges = Array.from(dailyPeaks.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, peaks]) => ({
      date,
      originalPeak: peaks.originalPeak,
      newPeak: peaks.newPeak,
      reduction: peaks.originalPeak - peaks.newPeak,
      originalPartPeakKw: peaks.originalPartPeakKw,
      newPartPeakKw: peaks.newPartPeakKw,
    }));
  
  // Calculate total demand charges under Option S schedule (schedule-aware)
  const optionSCost = calculateOptionSDemandCharges(modifiedIntervals, rates);
  const totalAnnualCharge = optionSCost.totalInData;
  
  return {
    modifiedIntervals,
    dailyPeaks: dailyCharges,
    totalAnnualCharge,
    socHistory,
  };
}

/**
 * Compare monthly vs daily demand charge structures
 */
export function compareDemandChargeStructures(
  monthlyPeakKw: number,
  monthlyRate: number, // $/kW/month
  dailyRate: number = S_RATE_DAILY_RATE_2025
): {
  monthlyCharge: number;
  dailyCharge: number;
  difference: number;
  savingsPercent: number;
} {
  const monthlyCharge = monthlyPeakKw * monthlyRate;
  const dailyCharge = monthlyPeakKw * dailyRate * 30; // Approximate 30 days/month
  
  const difference = monthlyCharge - dailyCharge;
  const savingsPercent = monthlyCharge > 0 ? (difference / monthlyCharge) * 100 : 0;
  
  return {
    monthlyCharge,
    dailyCharge,
    difference,
    savingsPercent,
  };
}
