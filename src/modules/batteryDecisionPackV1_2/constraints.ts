import type { BatteryEconomicsOutputsV1 } from '../batteryEconomicsV1/types';

import { gatesV1_2, sizingHeuristicsV1_2 } from './constants';
import { BatteryDecisionPackReasonCodesV1_2, uniqSorted } from './reasons';
import type { BatteryDecisionCandidateV1_2 } from './types';

function numOrNull(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export function applyGatesV1_2(args: {
  candidate: BatteryDecisionCandidateV1_2;
  economics: BatteryEconomicsOutputsV1 | null;
  sitePeakKw: number | null;
}): { accepted: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (args.candidate.durationH < gatesV1_2.minDurationH) reasons.push(BatteryDecisionPackReasonCodesV1_2.REJECT_DURATION_TOO_SHORT);

  const peak = numOrNull(args.sitePeakKw);
  if (peak !== null && peak > 0) {
    const pct = args.candidate.kw / peak;
    if (pct + 1e-12 < sizingHeuristicsV1_2.minPeakCoveragePct || pct - 1e-12 > sizingHeuristicsV1_2.maxPeakCoveragePct) {
      reasons.push('battery.decision_pack.v1_2.reject.peak_coverage_out_of_band');
    }
  }

  const econ = args.economics;
  if (!econ) {
    reasons.push(BatteryDecisionPackReasonCodesV1_2.REJECT_MISSING_ECONOMICS);
    return { accepted: false, reasons: uniqSorted(reasons) };
  }

  const pb = numOrNull(econ.cashflow?.simplePaybackYears);
  if (pb === null) reasons.push(BatteryDecisionPackReasonCodesV1_2.REJECT_MISSING_ECONOMICS);
  else if (pb > gatesV1_2.maxPaybackYears) reasons.push(BatteryDecisionPackReasonCodesV1_2.REJECT_PAYBACK_TOO_LONG);

  const npv = numOrNull(econ.cashflow?.npvUsd);
  if (npv === null) reasons.push(BatteryDecisionPackReasonCodesV1_2.REJECT_MISSING_ECONOMICS);
  else if (npv < gatesV1_2.minNpvLiteUsd) reasons.push(BatteryDecisionPackReasonCodesV1_2.REJECT_NPV_TOO_LOW);

  const netAnnual = (() => {
    const s = numOrNull(econ.savingsAnnual?.totalUsd);
    const o = numOrNull(econ.opexAnnual?.totalUsd);
    if (s === null || o === null) return null;
    return s - o;
  })();
  if (netAnnual === null) reasons.push(BatteryDecisionPackReasonCodesV1_2.REJECT_MISSING_ECONOMICS);
  else if (netAnnual < gatesV1_2.minNetAnnualUsd) reasons.push(BatteryDecisionPackReasonCodesV1_2.REJECT_NET_ANNUAL_NON_POSITIVE);

  return { accepted: reasons.length === 0, reasons: uniqSorted(reasons) };
}

