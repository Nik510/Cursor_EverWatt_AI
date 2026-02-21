export type MissingInfoSeverityV0 = 'info' | 'warning' | 'blocking';
export type MissingInfoCategoryV0 = 'tariff' | 'billing' | 'interval' | 'supply' | 'territory' | 'program';

export type MissingInfoItemV0 = {
  id: string;
  category: MissingInfoCategoryV0;
  severity: MissingInfoSeverityV0;
  description: string;
  meterKey?: string;
  billingCycleLabel?: string;
  details?: Record<string, unknown>;
  evidence?: Array<{ kind: string; value: unknown }>;
};

