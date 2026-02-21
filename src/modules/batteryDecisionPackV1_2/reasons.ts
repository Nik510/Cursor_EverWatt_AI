export const BatteryDecisionPackReasonCodesV1_2 = {
  // Missing inputs
  PACK_MISSING_INTERVALS: 'battery.decision_pack.v1_2.missing_intervals',
  PACK_MISSING_INTERVAL_INSIGHTS: 'battery.decision_pack.v1_2.missing_interval_insights',
  PACK_MISSING_TARIFF_PRICE_SIGNALS: 'battery.decision_pack.v1_2.missing_tariff_price_signals',
  PACK_MISSING_DEMAND_CHARGE: 'battery.decision_pack.v1_2.missing_demand_charge',
  PACK_MISSING_DETERMINANTS: 'battery.decision_pack.v1_2.missing_determinants',

  // Candidate generation
  CANDIDATE_FILTER_TOO_STRICT_RELAXED: 'battery.decision_pack.v1_2.candidate_filter_relaxed',

  // Constraints / deterministic enforcement (additive; do not rename)
  CONSTRAINTS_NO_CANDIDATES: 'battery.decision.constraints.no_candidates',
  CONSTRAINTS_INTERCONNECTION_LIMIT: 'battery.decision.constraints.interconnection_limit',
  CONSTRAINTS_BACKUP_ONLY_ARBITRAGE_DISABLED: 'battery.decision.constraints.backup_only_arbitrage_disabled',

  // Constraints / gates (decision-safety gates)
  REJECT_DURATION_TOO_SHORT: 'battery.decision_pack.v1_2.reject.duration_too_short',
  REJECT_PAYBACK_TOO_LONG: 'battery.decision_pack.v1_2.reject.payback_too_long',
  REJECT_NPV_TOO_LOW: 'battery.decision_pack.v1_2.reject.npv_too_low',
  REJECT_NET_ANNUAL_NON_POSITIVE: 'battery.decision_pack.v1_2.reject.net_annual_non_positive',
  REJECT_MISSING_ECONOMICS: 'battery.decision_pack.v1_2.reject.missing_economics',

  // Sensitivity
  SENSITIVITY_UNAVAILABLE: 'battery.decision.sensitivity.unavailable',
} as const;

export function uniqSorted(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr || []) {
    const s = String(v || '').trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

