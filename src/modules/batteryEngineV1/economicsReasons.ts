export const StorageEconomicsReasonCodesV1 = {
  STORAGE_ECON_V1_MISSING_DISPATCH: 'storage.econ.v1.missing_dispatch',
  STORAGE_ECON_V1_MISSING_TARIFF_PRICES: 'storage.econ.v1.missing_tariff_prices',
  STORAGE_ECON_V1_MISSING_DEMAND_DETERMINANTS: 'storage.econ.v1.missing_demand_determinants',
  STORAGE_ECON_V1_CAPEX_DEFAULTS_USED: 'storage.econ.v1.capex_defaults_used',
  STORAGE_ECON_V1_NET_SAVINGS_NON_POSITIVE: 'storage.econ.v1.net_savings_non_positive',
  STORAGE_ECON_V1_INSUFFICIENT_INPUTS: 'storage.econ.v1.insufficient_inputs',
  STORAGE_ECON_V1_DISCOUNT_RATE_DEFAULT_USED: 'storage.econ.v1.discount_rate_default_used',
  /** Legacy adapter warning: storageEconomicsV1 is now derived from batteryEconomicsV1. */
  STORAGE_ECON_V1_DEPRECATED_USE_BATTERY_ECONOMICS_V1: 'storage.econ.deprecated_use_batteryEconomicsV1',
} as const;

export const IncentivesStubReasonCodesV1 = {
  INCENTIVES_V1_PROGRAM_UNKNOWN: 'incentives.v1.program_unknown',
  INCENTIVES_V1_NEED_CUSTOMER_CLASSIFICATION: 'incentives.v1.need_customer_classification',
  INCENTIVES_V1_NEED_TECHNOLOGY_DETAILS: 'incentives.v1.need_technology_details',
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

