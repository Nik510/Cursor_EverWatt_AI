import type { ConfidenceTierV1 } from './types';
import { safeNum } from './helpers';
import { BatteryEconomicsReasonCodesV1, uniqSorted } from './reasons';

export type SizingSearchConstraintsV1 = {
  /**
   * Upper bound on battery power relative to site peak.
   * Default: 0.8 * sitePeakKw when sitePeakKw is known.
   */
  maxKwFromPeakPct?: number | null;
  /** Default: 1 hour (kWh >= kW * minHours). */
  minHours?: number | null;
  /** Default: 6 hours (kWh <= kW * maxHours). */
  maxHours?: number | null;
  /** Override search grid for kW. Default: [50, 100, 150, 200]. */
  kwValues?: number[] | null;
  /** Override search grid for kWh. Default: [100, 200, 300, 400, 600, 800]. */
  kwhValues?: number[] | null;
};

export type SizingSearchCandidateV1 = {
  powerKw: number;
  energyKwh: number;
  hoursAtPower: number; // energyKwh / powerKw
};

export type SizingSearchScoreKeyV1 = {
  /** Primary sort key (descending). */
  npvLiteUsd: number | null;
  /** Secondary sort key (ascending). */
  simplePaybackYears: number | null;
};

export type SizingSearchResultV1<TScore extends SizingSearchScoreKeyV1> = {
  confidenceTier: ConfidenceTierV1;
  constraintsUsed: Required<Pick<SizingSearchConstraintsV1, 'maxKwFromPeakPct' | 'minHours' | 'maxHours'>> & {
    kwValues: number[];
    kwhValues: number[];
  };
  allCandidates: SizingSearchCandidateV1[];
  scored: Array<{ candidate: SizingSearchCandidateV1; score: TScore }>;
  top3: Array<{ candidate: SizingSearchCandidateV1; score: TScore }>;
  warnings: string[];
  missingInfo: string[];
};

function uniqSortedNums(xs: number[]): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const raw of xs || []) {
    const n = Math.round(Number(raw) * 1e9) / 1e9;
    if (!Number.isFinite(n) || n <= 0) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out.sort((a, b) => a - b);
}

function makeCandidates(args: {
  sitePeakKw: number | null;
  constraints: Required<Pick<SizingSearchConstraintsV1, 'maxKwFromPeakPct' | 'minHours' | 'maxHours'>> & {
    kwValues: number[];
    kwhValues: number[];
  };
}): { candidates: SizingSearchCandidateV1[]; warnings: string[]; missingInfo: string[]; confidenceTier: ConfidenceTierV1 } {
  const warnings: string[] = [];
  const missingInfo: string[] = [];

  const peakKw = safeNum(args.sitePeakKw);
  const hasPeak = peakKw !== null && peakKw > 0;

  const maxKw = hasPeak ? Math.max(0, args.constraints.maxKwFromPeakPct * peakKw!) : null;
  if (!hasPeak) {
    missingInfo.push(BatteryEconomicsReasonCodesV1.BATTERY_DECISION_SITE_PEAK_KW_UNKNOWN);
    warnings.push(BatteryEconomicsReasonCodesV1.BATTERY_DECISION_SIZING_SEARCH_CONSERVATIVE_DEFAULTS);
  }

  const kwGrid = (() => {
    const base = args.constraints.kwValues;
    const filtered = base.filter((kw) => {
      if (!Number.isFinite(kw) || kw <= 0) return false;
      if (maxKw === null) return true;
      return kw <= maxKw + 1e-9;
    });
    if (filtered.length) return filtered;
    // If peak is known but maxKw filtered everything out, keep the smallest option to avoid empty search.
    return base.length ? [base[0]] : [];
  })();

  const kwhGrid = args.constraints.kwhValues;
  const minHours = Math.max(0, args.constraints.minHours);
  const maxHours = Math.max(minHours, args.constraints.maxHours);

  const candidates: SizingSearchCandidateV1[] = [];
  for (const kw of kwGrid) {
    for (const kwh of kwhGrid) {
      const hours = kwh / kw;
      if (!(hours >= minHours - 1e-9 && hours <= maxHours + 1e-9)) continue;
      candidates.push({ powerKw: kw, energyKwh: kwh, hoursAtPower: hours });
    }
  }

  // Deterministic ordering: (kW asc, kWh asc).
  candidates.sort((a, b) => a.powerKw - b.powerKw || a.energyKwh - b.energyKwh);

  // Peak unknown: confidence lowered but still usable for conservative exploration.
  const confidenceTier: ConfidenceTierV1 = hasPeak ? 'MEDIUM' : 'LOW';

  return { candidates, warnings: uniqSorted(warnings), missingInfo: uniqSorted(missingInfo), confidenceTier };
}

/**
 * Deterministic grid search over kW/kWh combos.
 * Produces top 3 by (NPV-lite desc) then (payback asc), with stable tie-breakers.
 */
export function sizingSearchV1<TScore extends SizingSearchScoreKeyV1>(args: {
  sitePeakKw: number | null;
  constraints?: SizingSearchConstraintsV1 | null;
  /**
   * If true and peak is unknown, restricts to the lower end of default grids.
   * This is intended to keep outputs conservative + deterministic when key determinants are missing.
   */
  conservativeWhenPeakUnknown?: boolean;
  scoreCandidate: (candidate: SizingSearchCandidateV1) => TScore;
}): SizingSearchResultV1<TScore> {
  const cIn = args.constraints || null;

  const defaults = {
    maxKwFromPeakPct: 0.8,
    minHours: 1,
    maxHours: 6,
    kwValues: [50, 100, 150, 200],
    kwhValues: [100, 200, 300, 400, 600, 800],
  } as const;

  const conservative = Boolean(args.conservativeWhenPeakUnknown);
  const hasPeak = safeNum(args.sitePeakKw) !== null && Number(args.sitePeakKw) > 0;

  const kwValues = uniqSortedNums(
    Array.isArray(cIn?.kwValues) && cIn!.kwValues!.length
      ? cIn!.kwValues!
      : conservative && !hasPeak
        ? [50, 100]
        : defaults.kwValues,
  );
  const kwhValues = uniqSortedNums(
    Array.isArray(cIn?.kwhValues) && cIn!.kwhValues!.length
      ? cIn!.kwhValues!
      : conservative && !hasPeak
        ? [100, 200, 300]
        : defaults.kwhValues,
  );

  const constraintsUsed = {
    maxKwFromPeakPct: safeNum(cIn?.maxKwFromPeakPct) ?? defaults.maxKwFromPeakPct,
    minHours: safeNum(cIn?.minHours) ?? defaults.minHours,
    maxHours: safeNum(cIn?.maxHours) ?? defaults.maxHours,
    kwValues,
    kwhValues,
  };

  const base = makeCandidates({
    sitePeakKw: args.sitePeakKw,
    constraints: constraintsUsed,
  });

  const scored = base.candidates.map((candidate) => ({ candidate, score: args.scoreCandidate(candidate) }));

  // Sort: (NPV desc) then (payback asc) then (kW asc) then (kWh asc).
  scored.sort((a, b) => {
    const an = safeNum(a.score.npvLiteUsd);
    const bn = safeNum(b.score.npvLiteUsd);
    if (an === null && bn !== null) return 1;
    if (an !== null && bn === null) return -1;
    if (an !== null && bn !== null && an !== bn) return bn - an;

    const ap = safeNum(a.score.simplePaybackYears);
    const bp = safeNum(b.score.simplePaybackYears);
    if (ap === null && bp !== null) return 1;
    if (ap !== null && bp === null) return -1;
    if (ap !== null && bp !== null && ap !== bp) return ap - bp;

    return a.candidate.powerKw - b.candidate.powerKw || a.candidate.energyKwh - b.candidate.energyKwh;
  });

  return {
    confidenceTier: base.confidenceTier,
    constraintsUsed,
    allCandidates: base.candidates,
    scored,
    top3: scored.slice(0, 3),
    warnings: base.warnings,
    missingInfo: base.missingInfo,
  };
}

