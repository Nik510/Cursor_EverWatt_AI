import type { IntervalIntelligenceV1 } from '../utilityIntelligence/intervalIntelligenceV1/types';

import { candidateDurationHoursLadderV1_2, candidatePowerKwLadderV1_2, sizingHeuristicsV1_2 } from './constants';
import type { BatteryDecisionCandidateV1_2, BatteryDecisionConstraintsV1 } from './types';
import { BatteryDecisionPackReasonCodesV1_2 } from './reasons';

function safeNum(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return n;
}

function stableCandidateId(args: { kw: number; durationH: number }): string {
  return `CAND_${String(Math.round(args.kw))}KW_${String(Math.round(args.durationH))}H`;
}

function normalizeExcludeDurations(xs: unknown): number[] {
  const arr = Array.isArray(xs) ? xs : [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const v of arr) {
    const n = safeNum(v);
    if (n === null) continue;
    const r = Math.round(n * 1e9) / 1e9;
    if (seen.has(r)) continue;
    seen.add(r);
    out.push(r);
  }
  return out.sort((a, b) => a - b);
}

function hardFilterCandidate(c: BatteryDecisionCandidateV1_2, cons: BatteryDecisionConstraintsV1 | null): { ok: boolean; hits: string[] } {
  const hits: string[] = [];
  if (!cons) return { ok: true, hits };

  const maxKw = safeNum(cons.maxKw);
  const minKw = safeNum(cons.minKw);
  const maxKwh = safeNum(cons.maxKwh);
  const minDur = safeNum(cons.minDurationHours);
  const maxDur = safeNum(cons.maxDurationHours);
  const interconn = safeNum(cons.interconnectionLimitKw);

  const excludeDur = normalizeExcludeDurations(cons.excludeDurationsHours);

  const maxKwEffective = (() => {
    const vals = [maxKw, interconn].filter((x): x is number => x !== null && x >= 0);
    return vals.length ? Math.min(...vals) : null;
  })();

  if (maxKwEffective !== null && c.kw > maxKwEffective + 1e-9) hits.push('maxKwEffective');
  if (minKw !== null && c.kw + 1e-9 < Math.max(0, minKw)) hits.push('minKw');
  if (maxKwh !== null && c.kwh > Math.max(0, maxKwh) + 1e-9) hits.push('maxKwh');
  if (minDur !== null && c.durationH + 1e-9 < Math.max(0, minDur)) hits.push('minDurationHours');
  if (maxDur !== null && c.durationH > Math.max(0, maxDur) + 1e-9) hits.push('maxDurationHours');
  if (excludeDur.length && excludeDur.some((h) => Math.abs(h - c.durationH) <= 1e-9)) hits.push('excludeDurationsHours');

  return { ok: hits.length === 0, hits };
}

export function generateCandidatesV1_2(args: {
  intervalInsightsV1: IntervalIntelligenceV1 | null;
  constraints: BatteryDecisionConstraintsV1 | null;
}): {
  candidates: BatteryDecisionCandidateV1_2[];
  warnings: string[];
  missingInfo: string[];
  hardFilter: { before: number; after: number; bindingConstraintIds: string[] };
} {
  const warnings: string[] = [];
  const missingInfo: string[] = [];

  const ii = args.intervalInsightsV1;
  if (!ii) missingInfo.push(BatteryDecisionPackReasonCodesV1_2.PACK_MISSING_INTERVAL_INSIGHTS);

  const peakKw = safeNum((ii as any)?.peakKw);
  const avgKw = safeNum((ii as any)?.avgKw);

  const sitePeakKw = peakKw ?? (avgKw !== null ? Math.max(0, avgKw * 1.5) : null);
  if (sitePeakKw === null || !(sitePeakKw > 0)) {
    missingInfo.push(BatteryDecisionPackReasonCodesV1_2.PACK_MISSING_INTERVALS);
    return { candidates: [], warnings, missingInfo: missingInfo.slice().sort((a, b) => a.localeCompare(b)), hardFilter: { before: 0, after: 0, bindingConstraintIds: [] } };
  }

  const minKw = sitePeakKw * sizingHeuristicsV1_2.minPeakCoveragePct;
  const maxKw = sitePeakKw * sizingHeuristicsV1_2.maxPeakCoveragePct;

  const kwLadder = [...candidatePowerKwLadderV1_2].slice().sort((a, b) => a - b);
  const durLadder = [...candidateDurationHoursLadderV1_2].slice().sort((a, b) => a - b);

  const mk = (kw: number, durationH: number): BatteryDecisionCandidateV1_2 => ({
    id: stableCandidateId({ kw, durationH }),
    kw,
    kwh: kw * durationH,
    durationH,
    chemistryClass: 'LFP_PLACEHOLDER',
  });

  // 1) Base heuristic sizing band.
  const baseFiltered: BatteryDecisionCandidateV1_2[] = [];
  for (const kw of kwLadder) {
    if (!(kw >= minKw - 1e-9 && kw <= maxKw + 1e-9)) continue;
    for (const h of durLadder) baseFiltered.push(mk(kw, h));
  }

  let ladder: BatteryDecisionCandidateV1_2[] = baseFiltered;
  if (ladder.length < 3) {
    // Relax deterministically to guarantee a usable ladder before hard constraints are applied.
    warnings.push(BatteryDecisionPackReasonCodesV1_2.CANDIDATE_FILTER_TOO_STRICT_RELAXED);
    const targetKw = sitePeakKw * 0.3;
    const kwByDistance = kwLadder
      .map((kw) => ({ kw, d: Math.abs(kw - targetKw) }))
      .sort((a, b) => a.d - b.d || a.kw - b.kw)
      .map((x) => x.kw);

    const kwPicked = Array.from(new Set(kwByDistance)).slice(0, 3);
    const relaxed: BatteryDecisionCandidateV1_2[] = [];
    for (const kw of kwPicked) for (const h of durLadder) relaxed.push(mk(kw, h));
    ladder = relaxed;
  }

  // 2) Hard constraints filter (no relaxation beyond explicit constraints).
  const binding = new Set<string>();
  const hardFiltered = ladder.filter((c) => {
    const res = hardFilterCandidate(c, args.constraints);
    for (const hit of res.hits) binding.add(hit);
    return res.ok;
  });

  return {
    candidates: hardFiltered,
    warnings,
    missingInfo: missingInfo.slice().sort((a, b) => a.localeCompare(b)),
    hardFilter: { before: ladder.length, after: hardFiltered.length, bindingConstraintIds: Array.from(binding).sort((a, b) => a.localeCompare(b)) },
  };
}

