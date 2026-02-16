export const BillTariffLibraryMatchWarningCodesV1 = {
  BILL_TARIFF_AMBIGUOUS: 'BILL_TARIFF_AMBIGUOUS',
  BILL_TARIFF_NOT_FOUND_IN_LIBRARY: 'BILL_TARIFF_NOT_FOUND_IN_LIBRARY',
  BILL_TARIFF_MATCH_NEEDS_SNAPSHOT_SELECTION: 'BILL_TARIFF_MATCH_NEEDS_SNAPSHOT_SELECTION',
} as const;

export type BillTariffLibraryMatchWarningCodeV1 =
  (typeof BillTariffLibraryMatchWarningCodesV1)[keyof typeof BillTariffLibraryMatchWarningCodesV1];

export type BillTariffLibraryMatchTypeV1 = 'EXACT' | 'NORMALIZED';

export type BillTariffLibraryMatchResultV1 = {
  snapshotId?: string;
  snapshotCapturedAt?: string;
  resolved?: {
    rateCode: string;
    matchType: BillTariffLibraryMatchTypeV1;
    evidence: {
      source: 'bill_pdf';
      rateScheduleText: string;
      normalizedWanted: string;
      normalizedMatched: string;
    };
    sourceUrl?: string;
    sourceTitle?: string;
  };
  candidates?: Array<{
    rateCode: string;
    snapshotId?: string;
    score: number;
    reason: string;
    sourceUrl?: string;
    sourceTitle?: string;
  }>;
  warnings?: BillTariffLibraryMatchWarningCodeV1[];
};

function normUpper(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/_/g, '-');
}

function collapseKey(raw: unknown): string {
  // Collapse spaces + hyphens to compare equivalent forms (e.g. TOU_GS_3 == TOU-GS-3).
  return normUpper(raw).replace(/[\s\-]/g, '');
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function matchBillTariffToLibraryV1(args: {
  utilityId?: string | null;
  commodity: 'electric' | 'gas';
  rateScheduleText?: string | null;
  snapshot:
    | null
    | undefined
    | {
        versionTag: string;
        capturedAt: string;
        rates: Array<{ rateCode: string; sourceUrl: string; sourceTitle?: string }>;
      };
}): BillTariffLibraryMatchResultV1 {
  const wantedRaw = String(args.rateScheduleText || '').trim();
  const snap = args.snapshot || null;

  if (!wantedRaw) {
    return {
      ...(snap ? { snapshotId: snap.versionTag, snapshotCapturedAt: snap.capturedAt } : {}),
      warnings: [BillTariffLibraryMatchWarningCodesV1.BILL_TARIFF_NOT_FOUND_IN_LIBRARY],
      candidates: [],
    };
  }

  if (!snap) {
    return {
      warnings: [BillTariffLibraryMatchWarningCodesV1.BILL_TARIFF_MATCH_NEEDS_SNAPSHOT_SELECTION],
    };
  }

  const wanted = normUpper(wantedRaw);
  const wantedCollapsed = collapseKey(wantedRaw);

  const rates = Array.isArray(snap.rates) ? snap.rates : [];
  const exactMatches = rates.filter((r) => normUpper(r.rateCode) === wanted);
  if (exactMatches.length === 1) {
    const r = exactMatches[0];
    return {
      snapshotId: snap.versionTag,
      snapshotCapturedAt: snap.capturedAt,
      resolved: {
        rateCode: r.rateCode,
        matchType: 'EXACT',
        evidence: {
          source: 'bill_pdf',
          rateScheduleText: wantedRaw,
          normalizedWanted: wanted,
          normalizedMatched: normUpper(r.rateCode),
        },
        sourceUrl: r.sourceUrl,
        sourceTitle: r.sourceTitle,
      },
    };
  }
  if (exactMatches.length > 1) {
    const candidates = exactMatches.slice(0, 3).map((r, idx) => ({
      rateCode: r.rateCode,
      snapshotId: snap.versionTag,
      score: clamp01(0.98 - idx * 0.01),
      reason: `Multiple EXACT matches for wanted=\"${wanted}\" (unexpected duplicate rateCode entries).`,
      sourceUrl: r.sourceUrl,
      sourceTitle: r.sourceTitle,
    }));
    return {
      snapshotId: snap.versionTag,
      snapshotCapturedAt: snap.capturedAt,
      candidates,
      warnings: [BillTariffLibraryMatchWarningCodesV1.BILL_TARIFF_AMBIGUOUS],
    };
  }

  const normalizedMatches = rates.filter((r) => collapseKey(r.rateCode) === wantedCollapsed);
  if (normalizedMatches.length === 1) {
    const r = normalizedMatches[0];
    return {
      snapshotId: snap.versionTag,
      snapshotCapturedAt: snap.capturedAt,
      resolved: {
        rateCode: r.rateCode,
        matchType: 'NORMALIZED',
        evidence: {
          source: 'bill_pdf',
          rateScheduleText: wantedRaw,
          normalizedWanted: wantedCollapsed,
          normalizedMatched: collapseKey(r.rateCode),
        },
        sourceUrl: r.sourceUrl,
        sourceTitle: r.sourceTitle,
      },
    };
  }
  if (normalizedMatches.length > 1) {
    const candidates = normalizedMatches.slice(0, 3).map((r, idx) => ({
      rateCode: r.rateCode,
      snapshotId: snap.versionTag,
      score: clamp01(0.92 - idx * 0.01),
      reason: `Multiple NORMALIZED matches for wantedCollapsed=\"${wantedCollapsed}\" (ambiguous).`,
      sourceUrl: r.sourceUrl,
      sourceTitle: r.sourceTitle,
    }));
    return {
      snapshotId: snap.versionTag,
      snapshotCapturedAt: snap.capturedAt,
      candidates,
      warnings: [BillTariffLibraryMatchWarningCodesV1.BILL_TARIFF_AMBIGUOUS],
    };
  }

  // Candidate search (strong only): prefix/contains in collapsed form.
  const scored = rates
    .map((r) => {
      const rc = String(r.rateCode || '').trim();
      const rcNorm = normUpper(rc);
      const rcCollapsed = collapseKey(rc);

      let score = 0;
      let reason = '';

      if (rcCollapsed.startsWith(wantedCollapsed) && wantedCollapsed.length >= 3) {
        score = 0.78 + Math.min(0.2, wantedCollapsed.length / Math.max(6, rcCollapsed.length));
        reason = `Collapsed rateCode startsWith wanted (${rcNorm} startsWith ${wanted}).`;
      } else if (wantedCollapsed.startsWith(rcCollapsed) && rcCollapsed.length >= 3) {
        score = 0.72 + Math.min(0.15, rcCollapsed.length / Math.max(6, wantedCollapsed.length));
        reason = `Wanted appears more specific; wantedCollapsed startsWith rateCodeCollapsed (${wanted} startsWith ${rcNorm}).`;
      } else if (rcCollapsed.includes(wantedCollapsed) && wantedCollapsed.length >= 4) {
        score = 0.62 + Math.min(0.15, wantedCollapsed.length / Math.max(10, rcCollapsed.length));
        reason = `Collapsed rateCode contains wanted (${rcNorm} contains ${wanted}).`;
      } else if (wantedCollapsed.includes(rcCollapsed) && rcCollapsed.length >= 4) {
        score = 0.58 + Math.min(0.12, rcCollapsed.length / Math.max(10, wantedCollapsed.length));
        reason = `WantedCollapsed contains rateCodeCollapsed (${wanted} contains ${rcNorm}).`;
      }

      return score > 0
        ? {
            rateCode: r.rateCode,
            snapshotId: snap.versionTag,
            score: clamp01(score),
            reason,
            sourceUrl: r.sourceUrl,
            sourceTitle: r.sourceTitle,
          }
        : null;
    })
    .filter(Boolean) as NonNullable<BillTariffLibraryMatchResultV1['candidates']>[number][];

  scored.sort((a, b) => b.score - a.score || String(a.rateCode).localeCompare(String(b.rateCode)));
  const candidates = scored.slice(0, 3);

  if (!candidates.length) {
    return {
      snapshotId: snap.versionTag,
      snapshotCapturedAt: snap.capturedAt,
      candidates: [],
      warnings: [BillTariffLibraryMatchWarningCodesV1.BILL_TARIFF_NOT_FOUND_IN_LIBRARY],
    };
  }

  return {
    snapshotId: snap.versionTag,
    snapshotCapturedAt: snap.capturedAt,
    candidates,
    warnings: [BillTariffLibraryMatchWarningCodesV1.BILL_TARIFF_AMBIGUOUS],
  };
}

