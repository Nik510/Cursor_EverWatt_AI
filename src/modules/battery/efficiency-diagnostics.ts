import type { BatterySpec, LoadInterval, LoadProfile, SimulationResult, BatteryEfficiencyDiagnostic, LimitingFactor } from './types';
import { detectPeakEvents } from './logic';

type IntervalHoursOpts = {
  /** Interval length in hours (default 0.25 for 15-min data). */
  intervalHours?: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function safeNum(n: unknown, fallback = 0): number {
  const x = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function monthKey(ts: Date | string): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  if (!Number.isFinite(d.getTime())) return 'invalid';
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function dayKey(ts: Date | string): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  if (!Number.isFinite(d.getTime())) return 'invalid';
  return d.toISOString().slice(0, 10);
}

function getUsableCapacityKwh(battery: BatterySpec): {
  usableCapacityKwh: number;
  minSoc: number;
  maxSoc: number;
} {
  const minSoc = battery.min_soc ?? 0.1;
  const maxSoc = battery.max_soc ?? 0.9;
  const dod = battery.depth_of_discharge ?? 0.9;
  return {
    usableCapacityKwh: battery.capacity_kwh * dod,
    minSoc,
    maxSoc,
  };
}

function buildAfterKwSeries(loadProfile: LoadProfile, sim: SimulationResult): number[] {
  if (Array.isArray(sim.new_intervals_kw) && sim.new_intervals_kw.length > 0) return sim.new_intervals_kw;
  const final = sim.final_load_profile?.intervals ?? [];
  if (final.length > 0) return final.map((i) => i.kw);
  // Fallback: no-op (should be rare)
  return loadProfile.intervals.map((i) => i.kw);
}

function inferDischargeChargeKw(beforeKw: number, afterKw: number): { dischargeKw: number; chargeKw: number } {
  const delta = beforeKw - afterKw;
  return {
    dischargeKw: Math.max(0, delta),
    chargeKw: Math.max(0, -delta),
  };
}

function severityFromShare(share: number): 'critical' | 'moderate' | 'minor' {
  if (share >= 0.35) return 'critical';
  if (share >= 0.15) return 'moderate';
  return 'minor';
}

function mkFactor(
  factor: LimitingFactor['factor'],
  share: number,
  impactKw: number,
  recommendation: string,
  description: string
): LimitingFactor {
  const severity = severityFromShare(share);
  return {
    factor,
    severity,
    description,
    impactKw: safeNum(impactKw, 0),
    recommendation,
  };
}

/**
 * Battery “why it worked / why it didn’t” diagnostic for a single simulation run.
 *
 * The guiding idea:
 * - Compute what *could* have been shaved (excess above threshold)
 * - Compute what *was* shaved (before - after)
 * - Attribute misses to physical constraints (power vs energy/SOC) and operational constraints (charging opportunity)
 */
export function analyzeBatteryEfficiency(params: {
  loadProfile: LoadProfile;
  battery: BatterySpec;
  simulationResult: SimulationResult;
  thresholdKw: number;
  demandRatePerKwMonth?: number;
  opts?: IntervalHoursOpts;
}): BatteryEfficiencyDiagnostic {
  const { loadProfile, battery, simulationResult, thresholdKw, demandRatePerKwMonth, opts } = params;
  const intervalHours = opts?.intervalHours ?? 0.25;
  const intervals = loadProfile.intervals;
  const afterKw = buildAfterKwSeries(loadProfile, simulationResult);
  const socHistory = Array.isArray(simulationResult.battery_soc_history) ? simulationResult.battery_soc_history : [];

  const { usableCapacityKwh: usableCapKwh, minSoc, maxSoc } = getUsableCapacityKwh(battery);
  const peakBefore = intervals.length ? Math.max(...intervals.map((i) => i.kw)) : 0;
  const peakAfter = afterKw.length ? Math.max(...afterKw) : 0;

  // Core energy accounting
  let excessEnergyKwh = 0; // energy above threshold in baseline series
  let shavedEnergyKwh = 0; // energy shaved by dispatch (baseline - after), only when baseline is above threshold
  let dischargedEnergyKwh = 0; // energy delivered to meter (derived from shaved kW)
  let chargedEnergyKwh = 0; // energy drawn from meter for charging (derived from after > before)
  let dischargeTimeHours = 0;
  let chargeTimeHours = 0;
  let powerUtilizationPeakKw = 0;

  // Miss attribution buckets (energy basis)
  let missedEnergyPowerLimitKwh = 0;
  let missedEnergyCapacityLimitKwh = 0;
  let missedEnergySocLimitKwh = 0;

  // For charging opportunity analysis
  let chargingHeadroomHours = 0;
  let chargingPossibleKwh = 0;
  let chargingOccurredKwh = 0;

  // Charging in the current dispatch engine is limited by a margin below threshold
  const chargeMarginKw = Math.max(10, thresholdKw * 0.05);

  for (let idx = 0; idx < intervals.length; idx++) {
    const before = intervals[idx]?.kw ?? 0;
    const after = afterKw[idx] ?? before;
    const { dischargeKw, chargeKw } = inferDischargeChargeKw(before, after);
    powerUtilizationPeakKw = Math.max(powerUtilizationPeakKw, dischargeKw, chargeKw);

    // Excess above threshold and shaved accounting
    if (before > thresholdKw) {
      const excessKw = before - thresholdKw;
      excessEnergyKwh += excessKw * intervalHours;

      const shavedKw = Math.min(excessKw, dischargeKw); // discharge during peak (no simultaneous charge expected)
      shavedEnergyKwh += shavedKw * intervalHours;
    }

    // Discharge/charge totals (meter-side)
    if (dischargeKw > 0) {
      dischargedEnergyKwh += dischargeKw * intervalHours;
      dischargeTimeHours += intervalHours;
    }
    if (chargeKw > 0) {
      chargedEnergyKwh += chargeKw * intervalHours;
      chargeTimeHours += intervalHours;
      chargingOccurredKwh += chargeKw * intervalHours;
    }

    // Miss attribution: if before > threshold and after still above threshold, some shave was missed.
    if (before > thresholdKw) {
      const requiredReductionKw = before - thresholdKw;
      const actualReductionKw = dischargeKw; // due to no charge during peak in our engine
      const missedKw = Math.max(0, requiredReductionKw - actualReductionKw);
      if (missedKw > 0) {
        const socBefore = idx === 0 ? maxSoc : safeNum(socHistory[idx - 1], maxSoc);
        const availableEnergyKwh = Math.max(0, (socBefore - minSoc) * usableCapKwh);
        const maxFromEnergyKw = intervalHours > 0 ? availableEnergyKwh / intervalHours : 0;
        const maxFromPowerKw = battery.max_power_kw;
        const binding = Math.min(maxFromEnergyKw, maxFromPowerKw);

        // Attribute energy miss to the binding constraint.
        const missedKwh = missedKw * intervalHours;
        if (binding <= 0.001 || socBefore <= minSoc + 1e-3) {
          missedEnergySocLimitKwh += missedKwh;
        } else if (maxFromPowerKw + 1e-6 < maxFromEnergyKw) {
          missedEnergyPowerLimitKwh += missedKwh;
        } else {
          missedEnergyCapacityLimitKwh += missedKwh;
        }
      }
    }

    // Charging opportunity: count periods with headroom below (threshold - margin) and SOC not max.
    const socNow = safeNum(socHistory[idx], maxSoc);
    if (socNow < maxSoc - 1e-3 && before < thresholdKw - chargeMarginKw) {
      chargingHeadroomHours += intervalHours;
      // Very rough: the dispatch can charge up to min(max_power, remainingCapacity/Δt, headroom)
      const remainingCapKwh = Math.max(0, (maxSoc - socNow) * usableCapKwh);
      const maxChargeFromCapKw = intervalHours > 0 ? remainingCapKwh / intervalHours : 0;
      const headroomKw = (thresholdKw - chargeMarginKw) - before;
      const possibleChargeKw = Math.min(battery.max_power_kw, maxChargeFromCapKw, headroomKw);
      chargingPossibleKwh += Math.max(0, possibleChargeKw) * intervalHours;
    }
  }

  const captureRate = excessEnergyKwh > 0 ? shavedEnergyKwh / excessEnergyKwh : 0;
  const energyUtilization = usableCapKwh > 0 ? Math.min(1, dischargedEnergyKwh / usableCapKwh) : 0;
  const timeUtilization = intervals.length > 0 ? (dischargeTimeHours + chargeTimeHours) / (intervals.length * intervalHours) : 0;
  const achievedRoundTrip = chargedEnergyKwh > 0 ? dischargedEnergyKwh / chargedEnergyKwh : null;

  // Event analysis (for “what kind of peaks do you have?”)
  const peakEvents = detectPeakEvents(loadProfile, thresholdKw, intervalHours);
  const eventCountsByMonth = new Map<string, number>();
  const eventsEnergyByMonth = new Map<string, number>();
  const eventsCapturedEnergyByMonth = new Map<string, number>();

  // Build an index over intervals for per-event captured energy
  const tsArr = intervals.map((i) => (i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp)));

  const calcEventCapturedEnergy = (start: Date, end: Date): { excessKwh: number; capturedKwh: number } => {
    let excessKwh = 0;
    let capturedKwh = 0;
    for (let idx = 0; idx < intervals.length; idx++) {
      const ts = tsArr[idx];
      if (!(ts >= start && ts <= end)) continue;
      const before = intervals[idx]?.kw ?? 0;
      const after = afterKw[idx] ?? before;
      const { dischargeKw } = inferDischargeChargeKw(before, after);
      if (before > thresholdKw) {
        const excessKw = before - thresholdKw;
        excessKwh += excessKw * intervalHours;
        capturedKwh += Math.min(excessKw, dischargeKw) * intervalHours;
      }
    }
    return { excessKwh, capturedKwh };
  };

  let longestEvent: BatteryEfficiencyDiagnostic['peakEventAnalysis']['longestEvent'] = null;
  let mostSevereEvent: BatteryEfficiencyDiagnostic['peakEventAnalysis']['mostSevereEvent'] = null;
  let avgDuration = 0;
  let avgExcessKw = 0;

  for (const e of peakEvents) {
    const start = e.start instanceof Date ? e.start : new Date(e.start);
    const end = e.end instanceof Date ? e.end : new Date(e.end);
    const mk = monthKey(start);

    eventCountsByMonth.set(mk, (eventCountsByMonth.get(mk) ?? 0) + 1);
    eventsEnergyByMonth.set(mk, (eventsEnergyByMonth.get(mk) ?? 0) + e.totalExcessKwh);

    const { capturedKwh } = calcEventCapturedEnergy(start, end);
    eventsCapturedEnergyByMonth.set(mk, (eventsCapturedEnergyByMonth.get(mk) ?? 0) + capturedKwh);

    avgDuration += e.durationHours;
    avgExcessKw += e.durationHours > 0 ? e.totalExcessKwh / e.durationHours : 0;

    if (!longestEvent || e.durationHours > longestEvent.durationHours) {
      longestEvent = { ...e, captureRate: e.totalExcessKwh > 0 ? capturedKwh / e.totalExcessKwh : 0 };
    }
    if (!mostSevereEvent || e.totalExcessKwh > mostSevereEvent.totalExcessKwh) {
      mostSevereEvent = { ...e, captureRate: e.totalExcessKwh > 0 ? capturedKwh / e.totalExcessKwh : 0 };
    }
  }

  const totalEvents = peakEvents.length;
  if (totalEvents > 0) {
    avgDuration /= totalEvents;
    avgExcessKw /= totalEvents;
  }

  // Limiting factors: normalize share over missed energy (excess - shaved)
  const missedEnergyTotalKwh = Math.max(0, excessEnergyKwh - shavedEnergyKwh);
  const sharePower = missedEnergyTotalKwh > 0 ? missedEnergyPowerLimitKwh / missedEnergyTotalKwh : 0;
  const shareCap = missedEnergyTotalKwh > 0 ? missedEnergyCapacityLimitKwh / missedEnergyTotalKwh : 0;
  const shareSoc = missedEnergyTotalKwh > 0 ? missedEnergySocLimitKwh / missedEnergyTotalKwh : 0;

  const limitingFactors: LimitingFactor[] = [];
  if (missedEnergyPowerLimitKwh > 0.05) {
    limitingFactors.push(
      mkFactor(
        'power_limit',
        sharePower,
        // Convert kWh miss to rough kW impact using average missed interval power
        intervalHours > 0 ? missedEnergyPowerLimitKwh / intervalHours / Math.max(1, intervals.length * 0.05) : 0,
        'Increase battery power (kW) or reduce instantaneous peak by staging large loads.',
        'Battery frequently hit its kW limit during peak intervals (insufficient discharge power).'
      )
    );
  }
  if (missedEnergyCapacityLimitKwh > 0.05) {
    limitingFactors.push(
      mkFactor(
        'capacity_limit',
        shareCap,
        intervalHours > 0 ? missedEnergyCapacityLimitKwh / intervalHours / Math.max(1, intervals.length * 0.05) : 0,
        'Increase battery energy (kWh) or reduce peak event duration via load shifting.',
        'Battery had discharge power available but not enough stored energy across longer peak events.'
      )
    );
  }
  if (missedEnergySocLimitKwh > 0.05) {
    limitingFactors.push(
      mkFactor(
        'soc_limit',
        shareSoc,
        intervalHours > 0 ? missedEnergySocLimitKwh / intervalHours / Math.max(1, intervals.length * 0.05) : 0,
        'Ensure charging opportunities exist before peaks (or raise target cap/threshold). Consider shifting pre-peak loads down.',
        'Battery reached minimum SOC when demand exceeded the target, leaving little energy to shave the billing determinant.'
      )
    );
  }

  // Charging opportunity factor: low “possible charging” actually realized indicates a schedule mismatch.
  // This is a heuristic: it becomes important when SOC-limited misses exist.
  const chargingEffectiveness = chargingPossibleKwh > 0 ? chargingOccurredKwh / chargingPossibleKwh : null;
  if ((missedEnergySocLimitKwh > 0.05 || missedEnergyCapacityLimitKwh > 0.05) && chargingEffectiveness !== null && chargingEffectiveness < 0.5) {
    limitingFactors.push(
      mkFactor(
        'charging_opportunity',
        0.2, // heuristic share; we don’t have a clean decomposition yet
        0,
        'Adjust charging windows (prefer low-demand hours). If load never drops low enough, pair storage with operational load shifting.',
        'The site may not have enough low-demand headroom to reliably recharge the battery before the next peak.'
      )
    );
  }

  if (achievedRoundTrip !== null && achievedRoundTrip < (battery.round_trip_efficiency ?? 0.9) * 0.8) {
    limitingFactors.push(
      mkFactor(
        'efficiency_loss',
        0.1,
        0,
        'Verify efficiency assumptions and check for frequent shallow cycling driven by the threshold; consider tuning dispatch to reduce churn.',
        'Observed energy-out vs energy-in implies higher losses than expected (may be driven by churny charge/discharge behavior).'
      )
    );
  }

  limitingFactors.sort((a, b) => {
    const sevScore = (s: LimitingFactor['severity']) => (s === 'critical' ? 3 : s === 'moderate' ? 2 : 1);
    return sevScore(b.severity) - sevScore(a.severity);
  });

  // Usage pattern insights (simple but actionable)
  const avgDemand = intervals.length ? intervals.reduce((sum, i) => sum + i.kw, 0) / intervals.length : 0;
  const loadFactor = peakBefore > 0 ? avgDemand / peakBefore : 0;

  const weekday = { count: 0, peak: 0, avg: 0 };
  const weekend = { count: 0, peak: 0, avg: 0 };
  for (let idx = 0; idx < intervals.length; idx++) {
    const ts = tsArr[idx];
    const d = intervals[idx]?.kw ?? 0;
    const day = ts.getDay(); // 0=Sun
    const bucket = day === 0 || day === 6 ? weekend : weekday;
    bucket.count += 1;
    bucket.peak = Math.max(bucket.peak, d);
    bucket.avg += d;
  }
  if (weekday.count > 0) weekday.avg /= weekday.count;
  if (weekend.count > 0) weekend.avg /= weekend.count;

  // Improvement opportunities: convert “missed energy” into rough $/yr potential.
  // We only estimate the incremental demand-charge savings potential as:
  // (additional kW-month reduction) * demandRate, where kW-month reduction is approximated from the monthly peak delta.
  // Here we use a conservative heuristic: additionalPeakReductionKwPotential = peakAfter - threshold (if still above).
  const additionalPeakReductionKwPotential = Math.max(0, peakAfter - thresholdKw);
  const annualSavingsPotential =
    demandRatePerKwMonth && demandRatePerKwMonth > 0
      ? additionalPeakReductionKwPotential * demandRatePerKwMonth * 12
      : null;

  const improvementOpportunities: BatteryEfficiencyDiagnostic['improvementOpportunities'] = [];
  if (additionalPeakReductionKwPotential > 0.1) {
    const top = limitingFactors[0]?.factor;
    if (top === 'power_limit') {
      improvementOpportunities.push({
        opportunity: 'Increase battery power (kW) or stage high-load equipment to flatten instantaneous peaks.',
        potentialSavingsIncrease: annualSavingsPotential ?? 0,
        difficulty: 'medium',
        description: 'Your billing determinant is still above the target after dispatch; the primary limiting factor suggests a kW bottleneck.',
      });
    } else if (top === 'capacity_limit' || top === 'soc_limit') {
      improvementOpportunities.push({
        opportunity: 'Increase battery energy (kWh) or ensure reliable pre-peak charging headroom (load shifting).',
        potentialSavingsIncrease: annualSavingsPotential ?? 0,
        difficulty: 'medium',
        description: 'The battery appears energy-limited across longer peak events; extending duration coverage can move the monthly peak.',
      });
    } else {
      improvementOpportunities.push({
        opportunity: 'Tune dispatch target and charging strategy; pair storage with operational peak management.',
        potentialSavingsIncrease: annualSavingsPotential ?? 0,
        difficulty: 'easy',
        description: 'There is remaining peak above target; changes in operations or dispatch settings may unlock more value.',
      });
    }
  }

  // Build per-month stats arrays aligned to observed months
  const months = Array.from(new Set(intervals.map((i) => monthKey(i.timestamp)))).filter((m) => m !== 'invalid').sort();
  const eventsPerMonth = months.map((m) => eventCountsByMonth.get(m) ?? 0);
  const capturedByMonth = months.map((m) => eventsCapturedEnergyByMonth.get(m) ?? 0);
  const excessByMonth = months.map((m) => eventsEnergyByMonth.get(m) ?? 0);

  // “empty at peak” heuristic: how often do we hit min SOC on days with any peak event?
  const minSocByDay = new Map<string, number>();
  for (let idx = 0; idx < intervals.length; idx++) {
    const dk = dayKey(intervals[idx].timestamp);
    const soc = safeNum(socHistory[idx], maxSoc);
    minSocByDay.set(dk, Math.min(minSocByDay.get(dk) ?? 1, soc));
  }
  const daysWithEvents = new Set(peakEvents.map((e) => dayKey(e.start)));
  let emptyDays = 0;
  for (const dk of daysWithEvents) {
    const minDaySoc = minSocByDay.get(dk);
    if (minDaySoc != null && minDaySoc <= minSoc + 0.01) emptyDays += 1;
  }
  const emptyAtPeakRate = daysWithEvents.size > 0 ? emptyDays / daysWithEvents.size : 0;

  return {
    captureRate: clamp(captureRate, 0, 1),
    utilizationRate: clamp(energyUtilization, 0, 1),
    powerAdequacy:
      missedEnergyPowerLimitKwh > missedEnergyCapacityLimitKwh && missedEnergyPowerLimitKwh > missedEnergySocLimitKwh
        ? 'undersized'
        : powerUtilizationPeakKw < battery.max_power_kw * 0.4
          ? 'oversized'
          : 'sufficient',
    capacityAdequacy:
      missedEnergyCapacityLimitKwh > missedEnergyPowerLimitKwh && missedEnergyCapacityLimitKwh > missedEnergySocLimitKwh
        ? 'undersized'
        : dischargedEnergyKwh < usableCapKwh * 0.2
          ? 'oversized'
          : 'sufficient',
    peakEventAnalysis: {
      totalEvents,
      averageDurationHours: avgDuration,
      averageExcessKw: avgExcessKw,
      longestEvent,
      mostSevereEvent,
      eventsPerMonth,
      excessEnergyKwhPerMonth: excessByMonth,
      capturedEnergyKwhPerMonth: capturedByMonth,
    },
    limitingFactors,
    usagePatternInsights: {
      loadFactor,
      peakinessScore: clamp((1 - loadFactor) * 100, 0, 100),
      emptyAtPeakRate,
      weeklyPattern: {
        weekdayPeakKw: weekday.peak,
        weekendPeakKw: weekend.peak,
        weekdayAvgKw: weekday.avg,
        weekendAvgKw: weekend.avg,
      },
    },
    kpis: {
      peakBeforeKw: peakBefore,
      peakAfterKw: peakAfter,
      thresholdKw,
      excessEnergyKwh,
      shavedEnergyKwh,
      dischargedEnergyKwh,
      chargedEnergyKwh,
      achievedRoundTripEfficiency: achievedRoundTrip,
      timeUtilization: clamp(timeUtilization, 0, 1),
      chargingHeadroomHours,
      chargingPossibleKwh,
      chargingEffectiveness,
    },
    improvementOpportunities,
  };
}


