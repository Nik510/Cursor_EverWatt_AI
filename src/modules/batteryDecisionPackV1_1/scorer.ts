import type { BatteryEconomicsOutputsV1 } from '../batteryEconomicsV1/types';
import { safeNum, roundTo } from '../batteryEconomicsV1/helpers';

import { scoreWeightsV1_1 } from './constants';
import type { BatteryDecisionCandidateV1_1 } from './types';

export function scoreCandidateV1_1(args: {
  candidate: BatteryDecisionCandidateV1_1;
  economics: BatteryEconomicsOutputsV1;
  extraWarnings?: string[];
}): { score: number; components: Record<string, number> } {
  const out = args.economics;
  const warnCount = Array.from(new Set([...(out.warnings || []), ...(args.extraWarnings || [])].map((w) => String(w || '').trim()).filter(Boolean))).length;
  const warnPenalty = scoreWeightsV1_1.warningPenalty * Math.min(10, warnCount);

  const npv = safeNum(out.cashflow?.npvUsd);
  const netAnnual = (() => {
    const s = safeNum(out.savingsAnnual?.totalUsd);
    const o = safeNum(out.opexAnnual?.totalUsd);
    if (s === null || o === null) return null;
    return s - o;
  })();
  const payback = safeNum(out.cashflow?.simplePaybackYears);
  const capex = safeNum(out.capex?.totalUsd);

  const components = {
    npvLite: (npv ?? -200_000) * scoreWeightsV1_1.npvLiteUsd,
    netAnnual: (netAnnual ?? -10_000) * scoreWeightsV1_1.netAnnualUsd,
    payback: (payback ?? 30) * scoreWeightsV1_1.paybackYears,
    capex: (capex ?? 0) * scoreWeightsV1_1.capexUsd,
    warningPenalty: warnPenalty,
  };

  const scoreRaw = components.npvLite + components.netAnnual + components.payback + components.capex + components.warningPenalty;
  return { score: roundTo(scoreRaw, 6), components };
}

