export const AuditDrawerV1WarningIds = {
  MISSING_ENGINE_VERSIONS: 'auditDrawerV1.missing.engineVersions',
  MISSING_EFFECTIVE_RATE_CONTEXT: 'auditDrawerV1.missing.effectiveRateContextV1',
  MISSING_BATTERY_ECONOMICS: 'auditDrawerV1.missing.batteryEconomicsV1',
  MISSING_STORAGE_OPPORTUNITY_PACK: 'auditDrawerV1.missing.storageOpportunityPackV1',
  MISSING_INTERVAL_EVIDENCE: 'auditDrawerV1.missing.intervalEvidence',
  DA_GENERATION_MISSING: 'auditDrawerV1.generation.da_missing',
  CCA_GENERATION_MISSING: 'auditDrawerV1.generation.cca_missing',
} as const;

export const AuditDrawerV1MissingInfoIds = {
  BATTERY_ECONOMICS_MISSING: 'batteryEconomicsV1.missing',
  STORAGE_OPPORTUNITY_PACK_MISSING: 'storageOpportunityPackV1.missing',
  EFFECTIVE_RATE_CONTEXT_MISSING: 'effectiveRateContextV1.missing',
  INTERVAL_META_MISSING: 'intervalElectricMetaV1.missing',
  BILLING_EVIDENCE_MISSING: 'billingEvidence.missing',
  GENERATION_RATES_MISSING: 'generationRates.missing',
} as const;

