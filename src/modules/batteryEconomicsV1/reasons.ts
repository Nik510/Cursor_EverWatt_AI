export const BatteryEconomicsReasonCodesV1 = {
  BATTERY_ECON_MISSING_CAPEX_INPUTS: 'battery.econ.missing_capex_inputs',
  BATTERY_ECON_MISSING_TARIFF_INPUTS: 'battery.econ.missing_tariff_inputs',
  BATTERY_ECON_MISSING_INTERVAL_INPUTS: 'battery.econ.missing_interval_inputs',
  BATTERY_ECON_SAVINGS_UNAVAILABLE_NO_TARIFFENGINE: 'battery.econ.savings_unavailable_no_tariffengine',
  BATTERY_ECON_SAVINGS_UNAVAILABLE_NO_DISPATCH: 'battery.econ.savings_unavailable_no_dispatch',
  BATTERY_ECON_DEMAND_SAVINGS_UNAVAILABLE_MISSING_DETERMINANTS: 'battery.econ.demand_savings_unavailable_missing_determinants',
  BATTERY_ECON_RATCHET_UNAVAILABLE: 'battery.econ.ratchet.unavailable',
  BATTERY_ECON_DR_INELIGIBLE: 'battery.econ.dr.ineligible',
  BATTERY_ECON_FINANCE_MISSING_DISCOUNT_RATE: 'battery.econ.finance_missing_discount_rate',
  BATTERY_ECON_ITC_FLAG_ONLY: 'battery.econ.itc_flag_only',
  BATTERY_ECON_RTE_ASSUMED_DEFAULT: 'battery.econ.rte_assumed_default',
  BATTERY_ECON_DEGRADATION_ASSUMED_DEFAULT: 'battery.econ.degradation_assumed_default',
  BATTERY_ECON_OUT_OF_BOUNDS_INPUTS: 'battery.econ.out_of_bounds_inputs',
  BATTERY_ECON_EXPORT_NOT_SUPPORTED: 'battery.econ.export_not_supported',
  BATTERY_ECON_DR_VALUE_UNKNOWN: 'battery.econ.dr_value_unknown',
  BATTERY_ECON_NET_SAVINGS_NON_POSITIVE: 'battery.econ.net_savings_non_positive',
  BATTERY_ECON_CAPEX_DEFAULTS_USED: 'battery.econ.capex_defaults_used',
  BATTERY_ECON_FINANCE_DEBT_PLACEHOLDER: 'battery.econ.finance_debt_placeholder',
  BATTERY_ECON_FINANCE_DEPRECIATION_FLAG_ONLY: 'battery.econ.depreciation_flag_only',
  BATTERY_ECON_SUPPLY_CCA_GENERATION_RATES_MISSING_FALLBACK: 'battery.econ.supply.cca_generation_rates_missing_fallback',
  BATTERY_ECON_SUPPLY_DA_GENERATION_RATES_MISSING_FALLBACK: 'battery.econ.supply.da_generation_rates_missing_fallback',
  // Decision Pack v1 (batteryDecisionPackV1) reason codes (additive).
  BATTERY_DECISION_MISSING_INTERVAL: 'battery.decision.missing_interval',
  BATTERY_DECISION_SITE_PEAK_KW_UNKNOWN: 'battery.decision.site_peak_kw_unknown',
  BATTERY_DECISION_SIZING_SEARCH_CONSERVATIVE_DEFAULTS: 'battery.decision.sizing_search_conservative_defaults',
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

