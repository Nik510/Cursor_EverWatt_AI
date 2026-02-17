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
  // Collapse all non-alphanumerics to compare equivalent forms (e.g. TOU_GS_3 == TOU-GS-3 == "TOU GS 3").
  return normUpper(raw).replace(/[^A-Z0-9]/g, '');
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeRateScheduleWanted(raw: unknown): { wantedRaw: string; token: string; normalized: string; collapsed: string } {
  const wantedRaw = String(raw ?? '').trim();
  const upper = normUpper(wantedRaw);

  // Strip common bill label prefixes when the entire field is passed through (e.g. "Rate Schedule: E-19").
  const cleaned = upper.replace(/^\s*(RATE\s*SCHEDULE(?:\s*CODE)?|RATE|SCHEDULE|TARIFF)\s*[:\-]\s*/i, '').trim();

  // Extract the first plausible code-like token from the string.
  // Examples:
  // - "Schedule E-19" -> "E-19"
  // - "Rate: A10" -> "A10"
  // - "TOU GS 3" -> "TOU GS 3" (then normalized to "TOU-GS-3")
  const tokenRe = /\b([A-Z]{1,6}(?:[ \-_][A-Z0-9]{1,10}){0,4}|[A-Z]{1,3}[ \-_]?\d{1,3}[A-Z0-9]{0,6})\b/g;
  let token = '';
  // Prefer a token that contains at least one digit (most rate codes do; avoids matching "RATE SCHEDULE").
  for (const text of [cleaned, upper]) {
    tokenRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((m = tokenRe.exec(text))) {
      const cand = String(m[1] || '').trim();
      if (!cand) continue;
      if (/\d/.test(cand)) {
        token = cand;
        break;
      }
    }
    if (token) break;
  }
  if (!token) token = cleaned || upper;

  let normalized = token
    .trim()
    .toUpperCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-') // collapse spaces to dashes
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  // Insert dash between leading letters and digits when absent (A10 -> A-10, E19 -> E-19, B19S -> B-19S).
  if (!normalized.includes('-')) {
    const m2 = /^([A-Z]{1,3})(\d{1,3})([A-Z0-9]{0,6})$/.exec(normalized.replace(/-/g, ''));
    if (m2) normalized = `${m2[1]}-${m2[2]}${m2[3] || ''}`;
  }

  const collapsed = collapseKey(normalized);
  return { wantedRaw, token, normalized, collapsed };
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
  const wantedNorm = normalizeRateScheduleWanted(args.rateScheduleText || '');
  const wantedRaw = wantedNorm.wantedRaw;
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

  const wanted = wantedNorm.normalized;
  const wantedCollapsed = wantedNorm.collapsed;

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

