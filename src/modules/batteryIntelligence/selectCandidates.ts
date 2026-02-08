import type { BatteryLibraryItemV1 } from '../batteryLibrary/types';
import type { UtilityInsights } from '../utilityIntelligence/types';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function uniq(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr) {
    const s = String(v || '').trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

export type BatteryCandidateResult = {
  sku: string;
  vendor: string;
  fitScore: number; // 0..1
  disqualifiers: string[];
  because: string[];
};

export type BatteryCandidateSelectionOutput = {
  requiredInputsMissing: string[];
  sizing: {
    targetPowerKw?: number;
    targetDurationHours?: number;
    targetEnergyKwh?: number;
    method: 'heuristic_v1';
    because: string[];
  };
  rankedCandidates: BatteryCandidateResult[];
  explain: string[];
};

function scoreMatchRatio(target: number, actual: number): number {
  if (!Number.isFinite(target) || target <= 0) return 0;
  if (!Number.isFinite(actual) || actual <= 0) return 0;
  // Prefer slightly above target, penalize too small more than too big.
  const ratio = actual / target;
  if (ratio < 1) return clamp01(ratio); // linear penalty
  // above target: soft penalty with diminishing effect
  return clamp01(1 / (1 + 0.25 * (ratio - 1)));
}

/**
 * Deterministic candidate selection (v1).
 *
 * Uses UtilityInsights (load shape + load shifting windows) to compute a rough sizing target:
 * - targetPowerKw: fraction of (peak - baseload)
 * - targetDurationHours: inferred from candidate shift windows (fallback 2.5h)
 * - targetEnergyKwh: targetPowerKw * duration
 */
export function selectBatteryCandidatesV1(args: {
  insights: UtilityInsights;
  library: BatteryLibraryItemV1[];
  constraints?: { criticalOperations?: boolean; canCurtail?: boolean; hasGenerator?: boolean; hasBms?: boolean };
  topN?: number;
}): BatteryCandidateSelectionOutput {
  const topN = typeof args.topN === 'number' && args.topN > 0 ? Math.floor(args.topN) : 10;

  const requiredInputsMissing: string[] = [];
  const explain: string[] = [];
  const sizingBecause: string[] = [];

  const peak = args.insights.inferredLoadShape?.peakKw;
  const base = args.insights.inferredLoadShape?.baseloadKw;
  const peakiness = args.insights.inferredLoadShape?.peakinessIndex;
  const shift = args.insights.loadShiftingFeasibility;
  const detSummary: any = (args.insights as any)?.determinantsPackSummary || null;

  if (!Number.isFinite(peak ?? NaN)) requiredInputsMissing.push('Interval-derived peak kW required to size battery power.');
  if (!Number.isFinite(base ?? NaN)) requiredInputsMissing.push('Interval-derived baseload kW required to size battery power.');
  if (!Number.isFinite(peakiness ?? NaN)) requiredInputsMissing.push('Interval-derived peakinessIndex required to interpret peak shaving potential.');
  if (!Number.isFinite(shift?.score ?? NaN)) requiredInputsMissing.push('Load shifting feasibility score required to interpret peak windows.');

  if (requiredInputsMissing.length) {
    return {
      requiredInputsMissing: uniq(requiredInputsMissing),
      sizing: { method: 'heuristic_v1', because: ['Insufficient utility insights to size battery candidates.'] },
      rankedCandidates: [],
      explain: ['Candidate selection skipped due to missing inputs.'],
    };
  }

  const delta = Math.max(0, Number(peak) - Number(base));
  const targetPowerKw = Math.max(10, delta * 0.3); // v1: target shaving fraction (30%), min 10kW to avoid degenerate

  // Duration from candidate windows (hours)
  const durations = (shift?.candidateShiftWindows || [])
    .map((w) => Math.max(0, Number(w.endHour) - Number(w.startHour)))
    .filter((h) => Number.isFinite(h) && h > 0);
  const targetDurationHours = durations.length ? Math.min(4, Math.max(1.5, Math.max(...durations))) : 2.5;
  const targetEnergyKwh = targetPowerKw * targetDurationHours;

  sizingBecause.push(`Computed targetPowerKw as 30% of (peak-baseload): 0.30×${delta.toFixed(1)}kW ≈ ${targetPowerKw.toFixed(1)}kW.`);
  sizingBecause.push(`Computed targetDurationHours from candidate shift windows (fallback 2.5h): ${targetDurationHours.toFixed(1)}h.`);
  sizingBecause.push(`Computed targetEnergyKwh = targetPowerKw×duration ≈ ${targetEnergyKwh.toFixed(1)}kWh.`);
  if (detSummary && Array.isArray(detSummary?.meters) && detSummary.meters.length) {
    const m0 = detSummary.meters[0];
    const c0 = Array.isArray(m0?.last12Cycles) && m0.last12Cycles.length ? m0.last12Cycles[0] : null;
    if (c0) {
      const cov = Number(c0.coveragePct);
      sizingBecause.push(
        `Determinants context (latest cycle ${String(c0.cycleLabel || '')}): kWMax=${Number.isFinite(c0.kWMax) ? Number(c0.kWMax).toFixed(1) : 'n/a'} coverage=${Number.isFinite(cov) ? (cov * 100).toFixed(0) + '%' : 'n/a'}.`,
      );
    }
  }
  explain.push(`Sizing method=heuristic_v1 (no savings claims).`);

  const ranked: BatteryCandidateResult[] = [];
  for (const item of args.library || []) {
    const disq: string[] = [];
    const because: string[] = [];

    // Basic feasibility
    if (!Number.isFinite(item.kw) || item.kw <= 0) disq.push('invalid_library_kw');
    if (!Number.isFinite(item.kwh) || item.kwh <= 0) disq.push('invalid_library_kwh');
    if (!Number.isFinite(item.roundTripEfficiency) || item.roundTripEfficiency <= 0 || item.roundTripEfficiency > 1) disq.push('invalid_roundTripEfficiency');
    if (!Number.isFinite(item.maxC) || item.maxC <= 0) disq.push('invalid_maxC');
    if (!Number.isFinite(item.minSoc) || !Number.isFinite(item.maxSoc) || item.minSoc >= item.maxSoc) disq.push('invalid_soc_bounds');

    // C-rate feasibility: required power relative to energy
    const requiredC = item.kwh > 0 ? targetPowerKw / item.kwh : Infinity;
    if (Number.isFinite(requiredC) && requiredC > item.maxC + 1e-9) {
      disq.push(`c_rate_exceeded(requiredC=${requiredC.toFixed(2)}>maxC=${item.maxC.toFixed(2)})`);
    }

    // Power/energy capacity: allow some under-sizing but mark disqualifier when far below
    if (item.kw + 1e-9 < targetPowerKw * 0.75) disq.push('insufficient_power_kw');
    if (item.kwh + 1e-9 < targetEnergyKwh * 0.6) disq.push('insufficient_energy_kwh');

    // Constraint-aware flags (no hard disqualifier unless explicitly required)
    if (item.constraints?.requiresUtilityReview) because.push('Library notes: candidate may require utility review/interconnection screening.');
    if (args.constraints?.criticalOperations === true) {
      const tags = Array.isArray(item.useCaseTags) ? item.useCaseTags : [];
      const supportsBackup = tags.includes('backup') || tags.includes('resiliency');
      if (!supportsBackup) because.push('Critical operations flagged; prefer candidates with backup/resiliency tags (not a hard disqualifier).');
    }

    const powerScore = scoreMatchRatio(targetPowerKw, item.kw);
    const energyScore = scoreMatchRatio(targetEnergyKwh, item.kwh);
    const effScore = clamp01((item.roundTripEfficiency - 0.8) / 0.2);
    const reviewPenalty = item.constraints?.requiresUtilityReview ? 0.92 : 1;

    let fitScore = clamp01(0.45 * powerScore + 0.35 * energyScore + 0.2 * effScore);
    fitScore *= reviewPenalty;

    because.push(`Power match score=${powerScore.toFixed(2)} (target≈${targetPowerKw.toFixed(1)}kW, item=${item.kw.toFixed(1)}kW).`);
    because.push(`Energy match score=${energyScore.toFixed(2)} (target≈${targetEnergyKwh.toFixed(1)}kWh, item=${item.kwh.toFixed(1)}kWh).`);
    because.push(`Efficiency score=${effScore.toFixed(2)} (RTE=${item.roundTripEfficiency.toFixed(2)}).`);
    if (durations.length) because.push(`Peak window duration inferred from load shifting windows (hours=${durations.map((d) => d.toFixed(1)).join(',')}).`);

    // If any hard disqualifiers about invalid library, zero score
    const hardInvalid = disq.some((d) => d.startsWith('invalid_'));
    if (hardInvalid) fitScore = 0;

    ranked.push({
      sku: item.sku,
      vendor: item.vendor,
      fitScore,
      disqualifiers: uniq(disq),
      because: uniq(because),
    });
  }

  // Deterministic ordering: score desc, then fewer disqualifiers, then sku
  ranked.sort((a, b) => {
    if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
    if (a.disqualifiers.length !== b.disqualifiers.length) return a.disqualifiers.length - b.disqualifiers.length;
    return String(a.sku).localeCompare(String(b.sku));
  });

  const top = ranked.slice(0, topN);
  explain.push(`Ranked ${ranked.length} library items; returning topN=${topN}.`);

  return {
    requiredInputsMissing: [],
    sizing: {
      targetPowerKw,
      targetDurationHours,
      targetEnergyKwh,
      method: 'heuristic_v1',
      because: sizingBecause,
    },
    rankedCandidates: top,
    explain,
  };
}

