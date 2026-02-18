export const CcaTariffLibraryReasonCodesV0 = {
  /**
   * Interpretation warning: these snapshots are ENERGY ONLY and explicitly exclude exit fees/PCIA/NBCs/etc.
   * Must be emitted whenever these generation rates are used in downstream economics/dispatch.
   */
  CCA_V0_ENERGY_ONLY_NO_EXIT_FEES: 'cca.v0.energy_only_no_exit_fees',
  /** Seed library warning: rates may be provisional placeholders intended to avoid IOU delivery fallbacks. */
  CCA_V0_MANUAL_SEED_PROVISIONAL: 'cca.v0.manual_seed_provisional',
  /** Lookup failed to find a snapshot (deterministic miss). */
  CCA_V0_SNAPSHOT_MISSING: 'cca.v0.snapshot_missing',
  /** Invalid/unsupported IOU utility for this library. */
  CCA_V0_IOU_UNSUPPORTED: 'cca.v0.iou_unsupported',
  /** CCA id unsupported by v0 registry. */
  CCA_V0_CCA_UNSUPPORTED: 'cca.v0.cca_unsupported',
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

