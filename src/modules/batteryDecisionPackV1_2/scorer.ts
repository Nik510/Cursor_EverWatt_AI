import type { BatteryEconomicsOutputsV1 } from '../batteryEconomicsV1/types';
import { roundTo } from '../batteryEconomicsV1/helpers';

import type { BatteryDecisionCandidateV1_2 } from './types';

function numOrNull(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/**
 * Stable scoring (deterministic).
 *
 * Note: v1.2 intentionally reuses the v1.1 scoring shape to keep fixture drift small.
 * Any tuning should be a version bump.
 */
const scoreWeightsV1_2 = {
  npvLiteUsd: 1 / 50_000,
  netAnnualUsd: 1 / 10_000,
  paybackYears: -0.35,
  capexUsd: -1 / 500_000,
  warningPenalty: -0.05,
} as const;

export function scoreCandidateV1_2(args: {
  candidate: BatteryDecisionCandidateV1_2;
  economics: BatteryEconomicsOutputsV1;
  extraWarnings?: string[];
}): { score: number; components: Record<string, number> } {
  const out = args.economics;
  const warnCount = Array.from(new Set([...(out.warnings || []), ...(args.extraWarnings || [])].map((w) => String(w || '').trim()).filter(Boolean))).length;
  const warnPenalty = scoreWeightsV1_2.warningPenalty * Math.min(10, warnCount);

  const npv = numOrNull(out.cashflow?.npvUsd);
  const netAnnual = (() => {
    const s = numOrNull(out.savingsAnnual?.totalUsd);
    const o = numOrNull(out.opexAnnual?.totalUsd);
    if (s === null || o === null) return null;
    return s - o;
  })();
  const payback = numOrNull(out.cashflow?.simplePaybackYears);
  const capex = numOrNull(out.capex?.totalUsd);

  const components = {
    npvLite: (npv ?? -200_000) * scoreWeightsV1_2.npvLiteUsd,
    netAnnual: (netAnnual ?? -10_000) * scoreWeightsV1_2.netAnnualUsd,
    payback: (payback ?? 30) * scoreWeightsV1_2.paybackYears,
    capex: (capex ?? 0) * scoreWeightsV1_2.capexUsd,
    warningPenalty: warnPenalty,
  };

  const scoreRaw = components.npvLite + components.netAnnual + components.payback + components.capex + components.warningPenalty;
  return { score: roundTo(scoreRaw, 6), components };
}

