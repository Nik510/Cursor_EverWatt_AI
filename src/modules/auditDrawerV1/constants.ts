export const auditDrawerV1VersionTag = 'audit_drawer_v1.0' as const;

export const AUDIT_DRAWER_V1_LIMITS = {
  summaryLinesMax: 6,
  lineItemsMax: 50,
  sourcesMax: 10,
  warningsMax: 200,
  missingInfoMax: 200,
} as const;

export const AUDIT_DRAWER_V1_EXPLAINER_IDS = {
  batteryEconomicsTotal: 'battery_economics_total',
  energyArbitrageSavings: 'energy_arbitrage_savings',
  demandSavings: 'demand_savings',
  ccaGenerationPricing: 'cca_generation_pricing',
  daGenerationMissing: 'da_generation_missing',
  tariffMatchAndRateFit: 'tariff_match_and_rate_fit',
  intervalDataQuality: 'interval_data_quality',
} as const;

