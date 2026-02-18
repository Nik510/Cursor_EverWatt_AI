export const SupplyStructureAnalyzerReasonCodesV1 = {
  SUPPLY_V1_UTILITY_UNKNOWN: 'supply.v1.utility_unknown',
  SUPPLY_V1_LSE_UNDETECTED: 'supply.v1.lse_undetected',
  SUPPLY_V1_LSE_AMBIGUOUS: 'supply.v1.lse_ambiguous',
  SUPPLY_V1_LSE_UNSUPPORTED: 'supply.v1.lse_unsupported',
  SUPPLY_V1_LSE_SUPPORTED_BUT_GENERATION_RATES_MISSING: 'supply.v1.lse_supported_but_generation_rates_missing',
  SUPPLY_V1_CONFIDENCE_LOW: 'supply.v1.confidence_low',
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

