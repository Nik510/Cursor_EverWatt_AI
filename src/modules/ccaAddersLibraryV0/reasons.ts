export const CcaAddersLibraryReasonCodesV0 = {
  /** Seed library warning: adders may be provisional placeholders. */
  CCA_ADDERS_V0_PROVISIONAL: 'ccaAdders.v0.provisional',
  /** Lookup failed to find an adders snapshot (deterministic miss). */
  CCA_ADDERS_V0_MISSING: 'ccaAdders.v0.missing',
  /** Snapshot exists but some fields are missing/derived or inconsistent. */
  CCA_ADDERS_V0_PARTIAL: 'ccaAdders.v0.partial',
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

