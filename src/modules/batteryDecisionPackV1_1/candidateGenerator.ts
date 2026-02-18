import type { IntervalIntelligenceV1 } from '../utilityIntelligence/intervalIntelligenceV1/types';

import { candidateDurationHoursLadderV1_1, candidatePowerKwLadderV1_1, sizingHeuristicsV1_1 } from './constants';
import type { BatteryDecisionCandidateV1_1 } from './types';
import { BatteryDecisionPackReasonCodesV1_1 } from './reasons';

function safeNum(x: unknown): number | null {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return n;
}

function stableCandidateId(args: { kw: number; durationH: number }): string {
  return `CAND_${String(Math.round(args.kw))}KW_${String(Math.round(args.durationH))}H`;
}

export function generateCandidatesV1_1(args: {
  intervalInsightsV1: IntervalIntelligenceV1 | null;
}): { candidates: BatteryDecisionCandidateV1_1[]; warnings: string[]; missingInfo: string[] } {
  const warnings: string[] = [];
  const missingInfo: string[] = [];

  const ii = args.intervalInsightsV1;
  if (!ii) missingInfo.push(BatteryDecisionPackReasonCodesV1_1.PACK_MISSING_INTERVAL_INSIGHTS);

  const peakKw = safeNum((ii as any)?.peakKw);
  const avgKw = safeNum((ii as any)?.avgKw);

  const sitePeakKw = peakKw ?? (avgKw !== null ? Math.max(0, avgKw * 1.5) : null);
  if (sitePeakKw === null || !(sitePeakKw > 0)) {
    missingInfo.push(BatteryDecisionPackReasonCodesV1_1.PACK_MISSING_INTERVALS);
    return { candidates: [], warnings, missingInfo: missingInfo.slice().sort((a, b) => a.localeCompare(b)) };
  }

  const minKw = sitePeakKw * sizingHeuristicsV1_1.minPeakCoveragePct;
  const maxKw = sitePeakKw * sizingHeuristicsV1_1.maxPeakCoveragePct;

  const kwLadder = [...candidatePowerKwLadderV1_1].slice().sort((a, b) => a - b);
  const durLadder = [...candidateDurationHoursLadderV1_1].slice().sort((a, b) => a - b);

  const mk = (kw: number, durationH: number): BatteryDecisionCandidateV1_1 => ({
    id: stableCandidateId({ kw, durationH }),
    kw,
    kwh: kw * durationH,
    durationH,
    chemistryClass: 'LFP_PLACEHOLDER',
  });

  const filtered: BatteryDecisionCandidateV1_1[] = [];
  for (const kw of kwLadder) {
    if (!(kw >= minKw - 1e-9 && kw <= maxKw + 1e-9)) continue;
    for (const h of durLadder) filtered.push(mk(kw, h));
  }

  if (filtered.length >= 3) {
    return { candidates: filtered, warnings, missingInfo: missingInfo.slice().sort((a, b) => a.localeCompare(b)) };
  }

  // Relax deterministically to guarantee at least 3 candidates.
  warnings.push(BatteryDecisionPackReasonCodesV1_1.CANDIDATE_FILTER_TOO_STRICT_RELAXED);
  const targetKw = sitePeakKw * 0.3;
  const kwByDistance = kwLadder
    .map((kw) => ({ kw, d: Math.abs(kw - targetKw) }))
    .sort((a, b) => a.d - b.d || a.kw - b.kw)
    .map((x) => x.kw);

  const kwPicked = Array.from(new Set(kwByDistance)).slice(0, 3);
  const relaxed: BatteryDecisionCandidateV1_1[] = [];
  for (const kw of kwPicked) for (const h of durLadder) relaxed.push(mk(kw, h));

  return {
    candidates: relaxed.slice(0, Math.max(3, relaxed.length)),
    warnings,
    missingInfo: missingInfo.slice().sort((a, b) => a.localeCompare(b)),
  };
}

