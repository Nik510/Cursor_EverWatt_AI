export const BatteryOpportunityReasonCodesV1 = {
  // Battery
  BATTERY_V1_MISSING_INTERVALS: 'battery.v1.missing_intervals',
  BATTERY_V1_INTERVAL_INSIGHTS_MISSING: 'battery.v1.intervalInsights_missing',
  BATTERY_V1_MISSING_TARIFF_PRICES: 'battery.v1.missing_tariff_prices',
  BATTERY_V1_MISSING_DEMAND_DETERMINANTS: 'battery.v1.missing_demand_determinants',
  BATTERY_V1_UNSUPPORTED_TARIFF_CONSTRUCT: 'battery.v1.unsupported_tariff_construct',
  BATTERY_V1_INSUFFICIENT_LOAD_SHAPE: 'battery.v1.insufficient_load_shape',

  // Dispatch
  BATTERY_DISPATCH_V1_MISSING_INTERVAL_POINTS: 'battery.dispatch.v1.missing_interval_points',
  BATTERY_DISPATCH_V1_BUCKET_ONLY_SIMULATION: 'battery.dispatch.v1.bucket_only_simulation',

  // DR
  DR_V1_INSUFFICIENT_COVERAGE: 'dr.v1.insufficient_coverage',
  DR_V1_LOW_VARIABILITY: 'dr.v1.low_variability',
  DR_V1_TIMEZONE_UNKNOWN: 'dr.v1.timezone_unknown',
} as const;

export function uniqSortedReasonCodes(arr: string[]): string[] {
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

