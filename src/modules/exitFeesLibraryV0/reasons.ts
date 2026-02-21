export const ExitFeesLibraryReasonCodesV0 = {
  /** Lookup failed to find any matching snapshot (deterministic miss). */
  EXIT_FEES_V0_MISSING: 'exitFees.v0.missing',
  /** Snapshot exists but one or more expected fields are missing/invalid. */
  EXIT_FEES_V0_PARTIAL: 'exitFees.v0.partial',
  /** Seed library warning: snapshot is a provisional/manual seed (v0). */
  EXIT_FEES_V0_PROVISIONAL_SEED: 'exitFees.v0.provisional_seed',
  /** PCIA vintage breakdown exists but no vintage was supplied; default used. */
  EXIT_FEES_V0_VINTAGE_UNKNOWN_DEFAULT_USED: 'exitFees.v0.vintage_unknown_default_used',
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

