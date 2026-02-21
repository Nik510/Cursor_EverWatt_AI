import type { BatteryEconomicsOutputsV1 } from '../batteryEconomicsV1/types';
import { safeNum } from '../batteryEconomicsV1/helpers';

import { constraintsV1_1, sizingHeuristicsV1_1 } from './constants';
import { BatteryDecisionPackReasonCodesV1_1, uniqSorted } from './reasons';
import type { BatteryDecisionCandidateV1_1 } from './types';

export function applyConstraintsV1_1(args: {
  candidate: BatteryDecisionCandidateV1_1;
  economics: BatteryEconomicsOutputsV1 | null;
  sitePeakKw: number | null;
}): { accepted: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (args.candidate.durationH < constraintsV1_1.minDurationH) reasons.push(BatteryDecisionPackReasonCodesV1_1.REJECT_DURATION_TOO_SHORT);

  const peak = safeNum(args.sitePeakKw);
  if (peak !== null && peak > 0) {
    const pct = args.candidate.kw / peak;
    if (pct + 1e-12 < sizingHeuristicsV1_1.minPeakCoveragePct || pct - 1e-12 > sizingHeuristicsV1_1.maxPeakCoveragePct) {
      reasons.push('battery.decision_pack.v1_1.reject.peak_coverage_out_of_band');
    }
  }

  const econ = args.economics;
  if (!econ) {
    reasons.push(BatteryDecisionPackReasonCodesV1_1.REJECT_MISSING_ECONOMICS);
    return { accepted: false, reasons: uniqSorted(reasons) };
  }

  const pb = safeNum(econ.cashflow?.simplePaybackYears);
  if (pb === null) reasons.push(BatteryDecisionPackReasonCodesV1_1.REJECT_MISSING_ECONOMICS);
  else if (pb > constraintsV1_1.maxPaybackYears) reasons.push(BatteryDecisionPackReasonCodesV1_1.REJECT_PAYBACK_TOO_LONG);

  const npv = safeNum(econ.cashflow?.npvUsd);
  if (npv === null) reasons.push(BatteryDecisionPackReasonCodesV1_1.REJECT_MISSING_ECONOMICS);
  else if (npv < constraintsV1_1.minNpvLiteUsd) reasons.push(BatteryDecisionPackReasonCodesV1_1.REJECT_NPV_TOO_LOW);

  const netAnnual = (() => {
    const s = safeNum(econ.savingsAnnual?.totalUsd);
    const o = safeNum(econ.opexAnnual?.totalUsd);
    if (s === null || o === null) return null;
    return s - o;
  })();
  if (netAnnual === null) reasons.push(BatteryDecisionPackReasonCodesV1_1.REJECT_MISSING_ECONOMICS);
  else if (netAnnual < constraintsV1_1.minNetAnnualUsd) reasons.push(BatteryDecisionPackReasonCodesV1_1.REJECT_NET_ANNUAL_NON_POSITIVE);

  return { accepted: reasons.length === 0, reasons: uniqSorted(reasons) };
}

