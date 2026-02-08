import { getZonedParts } from '../billingEngineV1/time/zonedTime';
import { mapTou } from '../billingEngineV1/tou/mapTou';
import { resolvePgeSimRateForCode } from '../billingEngineV1/rates/pge_catalog_v1';
import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';
import type { BillingCycleV1, EvidenceItemV1, IntervalSeriesPointV1 } from './types';

export type ComputedIntervalV1 = {
  timestampIso: string;
  intervalMinutes: number | null;
  kw: number | null;
  kwh: number | null;
  evidence: EvidenceItemV1[];
  because: string[];
  missingInfo: MissingInfoItemV0[];
  confidence: number; // 0..1
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function parseIsoMs(s: string): number | null {
  const ms = new Date(String(s || '').trim()).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function percentile(nums: number[], p: number): number | null {
  const xs = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!xs.length) return null;
  const idx = Math.min(xs.length - 1, Math.max(0, Math.floor((p / 100) * (xs.length - 1))));
  return xs[idx];
}

/**
 * Compute kW/kWh for an interval point with deterministic rules.
 *
 * Accepts either kW or kWh. If kWh is provided, only 15/30-minute conversions are supported in v1.
 */
export function computeIntervalKw(args: { point: IntervalSeriesPointV1; seriesIntervalMinutes?: number | null }): ComputedIntervalV1 {
  const p = args.point;
  const evidence: EvidenceItemV1[] = [];
  const because: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];

  const intervalMinutesRaw = p.intervalMinutes ?? args.seriesIntervalMinutes ?? null;
  const intervalMinutes = Number.isFinite(Number(intervalMinutesRaw)) ? Number(intervalMinutesRaw) : null;

  const kwIn = Number((p as any).kw ?? (p as any).kW);
  const kwhIn = Number((p as any).kwh ?? (p as any).kWh);

  if (Number.isFinite(kwIn) && kwIn >= 0) {
    evidence.push({ kind: 'intervalCalc', pointer: { source: 'intervalSeries', key: 'kw', value: kwIn } });
    because.push('Used interval kW as measured power.');
    if (intervalMinutes && intervalMinutes > 0) {
      const kwh = kwIn * (intervalMinutes / 60);
      evidence.push({ kind: 'intervalCalc', pointer: { source: 'intervalSeries', key: 'intervalMinutes', value: intervalMinutes } });
      because.push(`Derived interval kWh from kW using intervalMinutes=${intervalMinutes}.`);
      return {
        timestampIso: String(p.timestampIso || ''),
        intervalMinutes,
        kw: kwIn,
        kwh,
        evidence,
        because,
        missingInfo,
        confidence: 0.9,
      };
    }

    missingInfo.push({
      id: 'determinants.intervalMinutes.missing',
      category: 'tariff',
      severity: 'warning',
      description: 'Interval minutes is missing; cannot derive kWh from kW deterministically.',
    });
    return {
      timestampIso: String(p.timestampIso || ''),
      intervalMinutes: null,
      kw: kwIn,
      kwh: null,
      evidence,
      because: [...because, 'kWh not computed due to missing intervalMinutes.'],
      missingInfo,
      confidence: 0.7,
    };
  }

  if (Number.isFinite(kwhIn) && kwhIn >= 0) {
    evidence.push({ kind: 'intervalCalc', pointer: { source: 'intervalSeries', key: 'kwh', value: kwhIn } });
    if (intervalMinutes === 15 || intervalMinutes === 30) {
      const mult = 60 / intervalMinutes;
      const kw = kwhIn * mult;
      evidence.push({ kind: 'intervalCalc', pointer: { source: 'intervalSeries', key: 'intervalMinutes', value: intervalMinutes } });
      because.push(`Converted interval kWh to kW using kW = kWh * ${mult} (intervalMinutes=${intervalMinutes}).`);
      return {
        timestampIso: String(p.timestampIso || ''),
        intervalMinutes,
        kw,
        kwh: kwhIn,
        evidence,
        because,
        missingInfo,
        confidence: 0.85,
      };
    }

    missingInfo.push({
      id: 'determinants.intervalMinutes.unsupported',
      category: 'tariff',
      severity: 'warning',
      description: 'Interval minutes is missing or unsupported for kWh→kW conversion (supported: 15, 30).',
    });
    return {
      timestampIso: String(p.timestampIso || ''),
      intervalMinutes: intervalMinutes,
      kw: null,
      kwh: kwhIn,
      evidence,
      because: ['kWh present but cannot convert to kW without supported intervalMinutes (15/30).'],
      missingInfo,
      confidence: 0.55,
    };
  }

  missingInfo.push({
    id: 'determinants.interval.point.missing',
    category: 'tariff',
    severity: 'warning',
    description: 'Interval point is missing both kW and kWh; cannot compute demand determinants.',
  });

  return {
    timestampIso: String(p.timestampIso || ''),
    intervalMinutes,
    kw: null,
    kwh: null,
    evidence,
    because: ['Interval point missing kW/kWh; skipped.'],
    missingInfo,
    confidence: 0.25,
  };
}

export type AssignedIntervalsV1 = Array<{ cycle: BillingCycleV1; intervals: IntervalSeriesPointV1[] }>;

/**
 * Assign interval points to billing cycles using strict inclusion: start <= ts < end.
 *
 * Determinism:
 * - Uses UTC epoch timestamps for comparisons.
 * - BillingCycleV1 start/end are interpreted as instants.
 */
export function assignIntervalsToBillingCycles(args: {
  intervals: IntervalSeriesPointV1[];
  cycles: BillingCycleV1[];
}): {
  assigned: AssignedIntervalsV1;
  missingInfo: MissingInfoItemV0[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];

  const cycles = (args.cycles || [])
    .map((c) => ({ c, startMs: parseIsoMs(c.startIso), endMs: parseIsoMs(c.endIso) }))
    .filter((x) => x.startMs !== null && x.endMs !== null && x.startMs < x.endMs) as Array<{ c: BillingCycleV1; startMs: number; endMs: number }>;

  if (!cycles.length) {
    missingInfo.push({
      id: 'determinants.billingCycles.missing',
      category: 'tariff',
      severity: 'blocking',
      description: 'Billing cycles are missing/invalid; cannot align intervals to cycles.',
    });
    return { assigned: [], missingInfo, warnings };
  }

  const buckets = new Map<string, IntervalSeriesPointV1[]>();
  for (const { c } of cycles) buckets.set(c.label, []);

  let skipped = 0;
  for (const it of args.intervals || []) {
    if (it?.isValid === false) continue;
    const tsMs = parseIsoMs(String(it.timestampIso || ''));
    if (tsMs === null) {
      skipped++;
      continue;
    }
    let placed = false;
    for (const cy of cycles) {
      if (tsMs >= cy.startMs && tsMs < cy.endMs) {
        buckets.get(cy.c.label)!.push(it);
        placed = true;
        break;
      }
    }
    if (!placed) skipped++;
  }

  if (skipped > 0) warnings.push(`Skipped ${skipped} interval points not assignable to any billing cycle (timestamp parse or out of range).`);

  const assigned: AssignedIntervalsV1 = cycles.map(({ c }) => ({ cycle: c, intervals: buckets.get(c.label) || [] }));
  return { assigned, missingInfo, warnings };
}

export type CycleDemandDeterminantsV1 = {
  kwhTotal: number | null;
  kWMax: number | null;
  kWMaxByTouPeriod?: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', number>>;
  kwhByTouPeriod?: Partial<Record<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak', number>>;
  touLabelsObserved?: string[];
  unusedTouBuckets?: Array<'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak'>;
  kwhTouIntervalCount?: number;
  kwhTouCoveragePct?: number | null;
  maxTimestampIso?: string;
  intervalMinutes: number | null;
  intervalCount: number;
  expectedIntervalCount: number | null;
  coveragePct: number | null;
  confidence: number;
  because: string[];
  evidence: EvidenceItemV1[];
  missingInfo: MissingInfoItemV0[];
  warnings: string[];
};

export function computeCycleDemandDeterminants(args: {
  cycle: BillingCycleV1;
  intervals: IntervalSeriesPointV1[];
  seriesIntervalMinutes?: number | null;
  touContext?: { utility: string; rateCode: string } | null;
}): CycleDemandDeterminantsV1 {
  const because: string[] = [];
  const evidence: EvidenceItemV1[] = [];
  const missingInfo: MissingInfoItemV0[] = [];
  const warnings: string[] = [];

  // Demand-window cross-check: when both kWh and provided kW exist, verify kW≈kWh*(60/intervalMinutes).
  // Aggregate mismatchPct per cycle.
  const crossCheck = (() => {
    let comparable = 0;
    let mismatched = 0;
    for (const p of args.intervals || []) {
      const mins = Number((p as any).intervalMinutes ?? args.seriesIntervalMinutes ?? NaN);
      const kwh = Number((p as any).kwh ?? (p as any).kWh);
      const kw = Number((p as any).kw ?? (p as any).kW);
      if (!Number.isFinite(mins) || mins <= 0) continue;
      if (!Number.isFinite(kwh) || !Number.isFinite(kw)) continue;
      comparable++;
      const expectedKw = kwh * (60 / mins);
      const rel = expectedKw > 0 ? Math.abs((kw - expectedKw) / expectedKw) : Math.abs(kw - expectedKw);
      if (rel > 0.02) mismatched++;
    }
    const mismatchPct = comparable > 0 ? mismatched / comparable : 0;
    return { comparable, mismatched, mismatchPct };
  })();

  const computed = (args.intervals || []).map((p) => computeIntervalKw({ point: p, seriesIntervalMinutes: args.seriesIntervalMinutes ?? null }));
  for (const c of computed) {
    evidence.push(...c.evidence);
    missingInfo.push(...c.missingInfo);
  }

  const kwVals = computed.map((c) => c.kw).filter((n): n is number => Number.isFinite(n));
  const kwhVals = computed.map((c) => c.kwh).filter((n): n is number => Number.isFinite(n));

  const intervalMinutes = (() => {
    const mins = computed.map((c) => c.intervalMinutes).filter((m): m is number => Number.isFinite(m as any) && Number(m) > 0);
    if (!mins.length) return null;
    const first = mins[0];
    const same = mins.every((x) => x === first);
    if (!same) warnings.push('Multiple intervalMinutes values observed within cycle; using first for expected interval count and coverage.');
    return first;
  })();

  const kwhTotal = kwhVals.length ? kwhVals.reduce((s, x) => s + x, 0) : null;
  const kWMax = kwVals.length ? Math.max(...kwVals) : null;
  const maxIdx = kWMax === null ? -1 : computed.findIndex((c) => c.kw === kWMax);
  const maxTimestampIso = maxIdx >= 0 ? computed[maxIdx]?.timestampIso : undefined;
  const intervalTimestamps = (args.intervals || [])
    .map((p) => String(p.timestampIso || '').trim())
    .filter((ts) => ts && Number.isFinite(parseIsoMs(ts)))
    .sort();
  const firstIntervalTs = intervalTimestamps.length ? intervalTimestamps[0] : null;
  const lastIntervalTs = intervalTimestamps.length ? intervalTimestamps[intervalTimestamps.length - 1] : null;

  if (kwhTotal !== null) because.push(`Computed kWhTotal=${kwhTotal.toFixed(3)} from ${kwhVals.length} interval(s).`);
  else because.push('kWhTotal unavailable (kWh not derivable for intervals).');

  if (kWMax !== null) {
    because.push(`Computed kWMax=${kWMax.toFixed(3)} from ${kwVals.length} interval(s).`);
    if (maxTimestampIso) evidence.push({ kind: 'intervalCalc', pointer: { source: 'intervalSeries', key: 'kWMax.determinantTimestampIso', value: maxTimestampIso } });
  } else {
    because.push('kWMax unavailable (kW not derivable for intervals).');
  }

  // Optional TOU bucket maxima using deterministic TOU labeling.
  const touDerived = (() => {
    const ctx = args.touContext;
    if (!ctx) return undefined;
    const rate = ctx.utility === 'PGE' ? resolvePgeSimRateForCode(ctx.rateCode) : null;
    if (!rate) {
      missingInfo.push({
        id: 'determinants.tou.labeling.unavailable',
        category: 'tariff',
        severity: 'info',
        description: 'TOU labeling unavailable (missing rate schedule metadata); computed only global kWMax.',
      });
      return undefined;
    }

    // Build minimal normalized intervals for TOU mapper.
    const norm = computed
      .map((c) => ({
        ts: c.timestampIso,
        kw: c.kw ?? NaN,
        kwhForInterval: c.kwh ?? NaN,
        isValid: (c.kw !== null && Number.isFinite(c.kw)) || (c.kwh !== null && Number.isFinite(c.kwh)),
      }))
      .filter((x) => x.isValid && x.ts);

    if (!norm.length) return undefined;
    const mapped = mapTou({ intervals: norm as any, rate, timezoneOverride: args.cycle.timezone });

    function canonicalKey(touLabel: string): 'onPeak' | 'partialPeak' | 'offPeak' | 'superOffPeak' | null {
      const l = String(touLabel || '').trim().toUpperCase();
      if (l === 'PEAK' || l === 'ON_PEAK' || l === 'ONPEAK') return 'onPeak';
      if (l === 'PARTIAL_PEAK' || l === 'PART_PEAK' || l === 'PARTIALPEAK') return 'partialPeak';
      if (l === 'OFF_PEAK' || l === 'OFFPEAK') return 'offPeak';
      if (l === 'SUPER_OFF_PEAK' || l === 'SUPEROFFPEAK') return 'superOffPeak';
      return null;
    }

    const best: Record<string, { kw: number; ts: string; touLabel: string }> = {};
    const kwhByBucket: Record<string, number> = {};
    const observedTouLabels = new Set<string>();
    const observedCanonical = new Set<string>();
    let energyIntervals = 0;
    for (const iv of mapped.intervals as any[]) {
      const rawLabel = String(iv?.touLabel || '').trim();
      if (rawLabel) observedTouLabels.add(rawLabel);
      const k = canonicalKey(rawLabel);
      if (!k) continue;
      const kw = Number(iv.kw);
      if (!Number.isFinite(kw)) continue;
      observedCanonical.add(k);
      const cur = best[k];
      if (!cur || kw > cur.kw) {
        best[k] = { kw, ts: String(iv.ts || ''), touLabel: rawLabel };
      }

      const kwh = Number(iv.kwhForInterval);
      if (Number.isFinite(kwh)) {
        energyIntervals++;
        kwhByBucket[k] = (kwhByBucket[k] || 0) + kwh;
      }
    }

    const outDemand: any = {};
    const canonicalBuckets = ['onPeak', 'partialPeak', 'offPeak', 'superOffPeak'] as const;
    for (const k of canonicalBuckets) {
      const b = best[k];
      if (!b) continue;
      outDemand[k] = b.kw;
      evidence.push({ kind: 'intervalCalc', pointer: { source: 'intervalSeries', key: `kWMaxByTouPeriod.${k}.kw`, value: b.kw, snippet: `touLabel=${b.touLabel}` } });
      evidence.push({ kind: 'intervalCalc', pointer: { source: 'intervalSeries', key: `kWMaxByTouPeriod.${k}.timestampIso`, value: b.ts } });
      evidence.push({ kind: 'intervalCalc', pointer: { source: 'intervalSeries', key: `kWMaxByTouPeriod.${k}.touLabel`, value: b.touLabel } });
    }

    if (!Object.keys(outDemand).length) {
      missingInfo.push({
        id: 'determinants.tou.labeling.unmapped',
        category: 'tariff',
        severity: 'info',
        description: 'TOU labeling produced no canonical buckets (unmapped); computed only global kWMax.',
      });
      return undefined;
    }

    because.push('Computed TOU max-demand buckets from interval TOU labeling (deterministic mapTou).');
    const missingBuckets = canonicalBuckets.filter((k) => !observedCanonical.has(k));
    if (missingBuckets.length) {
      const observedList = Array.from(observedTouLabels).sort().join(', ') || 'none';
      const missingList = missingBuckets.join(', ');
      because.push(`TOU labels observed: ${observedList}. Unused canonical buckets: ${missingList}.`);
      evidence.push({ kind: 'intervalCalc', pointer: { source: 'intervalSeries', key: 'touLabelsObserved', value: observedList } });
      evidence.push({ kind: 'intervalCalc', pointer: { source: 'intervalSeries', key: 'touCanonicalBucketsUnused', value: missingList } });
    }

    const outEnergy: any = {};
    for (const k of canonicalBuckets) {
      const v = kwhByBucket[k];
      if (!Number.isFinite(v) || v <= 0) continue;
      outEnergy[k] = v;
      evidence.push({ kind: 'intervalCalc', pointer: { source: 'intervalSeries', key: `kwhByTouPeriod.${k}`, value: v } });
    }

    return {
      kWMaxByTouPeriod: outDemand as any,
      kwhByTouPeriod: Object.keys(outEnergy).length ? (outEnergy as any) : undefined,
      touLabelsObserved: Array.from(observedTouLabels).sort(),
      unusedTouBuckets: missingBuckets,
      kwhTouIntervalCount: energyIntervals,
    };
  })();

  const startMs = parseIsoMs(args.cycle.startIso);
  const endMs = parseIsoMs(args.cycle.endIso);
  const expectedIntervalCount =
    intervalMinutes && startMs !== null && endMs !== null ? Math.max(0, Math.round((endMs - startMs) / (intervalMinutes * 60_000))) : null;
  const intervalCount = kwVals.length || (args.intervals || []).length;
  const coveragePct = expectedIntervalCount && expectedIntervalCount > 0 ? Math.min(1, intervalCount / expectedIntervalCount) : null;

  const kwhTouCoveragePct =
    touDerived && typeof touDerived.kwhTouIntervalCount === 'number' && expectedIntervalCount && expectedIntervalCount > 0
      ? Math.min(1, touDerived.kwhTouIntervalCount / expectedIntervalCount)
      : null;
  if (kwhTouCoveragePct !== null) {
    evidence.push({ kind: 'intervalCalc', pointer: { source: 'intervalSeries', key: 'kwhByTouPeriod.coveragePct', value: kwhTouCoveragePct } });
  }

  if (coveragePct !== null) {
    because.push(`coveragePct≈${coveragePct.toFixed(3)} (observed=${intervalCount}, expected≈${expectedIntervalCount}).`);
    if (coveragePct < 0.9) warnings.push('Interval coverage is below 90%; demand determinants may be unreliable.');
  } else {
    missingInfo.push({
      id: 'determinants.coverage.unknown',
      category: 'tariff',
      severity: 'info',
      description: 'Coverage percent is unknown (missing cycle boundary timestamps or intervalMinutes).',
    });
  }

  // Outlier detection (simple heuristic)
  const p95 = percentile(kwVals, 95);
  if (kWMax !== null && p95 !== null && p95 > 0 && kWMax > p95 * 1.8) {
    warnings.push('Possible spike: max demand is far above the 95th percentile (check for data artifacts or one-off events).');
  }

  // Confidence aggregation
  let confidence = 0.8;
  if (intervalMinutes === null) confidence -= 0.25;
  if (kWMax === null) confidence -= 0.25;
  if (coveragePct !== null && coveragePct < 0.9) confidence -= 0.2;
  if (warnings.some((w) => w.toLowerCase().includes('spike'))) confidence -= 0.1;
  if (crossCheck.comparable > 0) {
    evidence.push({ kind: 'intervalCalc', pointer: { source: 'intervalSeries', key: 'demandCrossCheck.comparablePoints', value: crossCheck.comparable } });
    evidence.push({ kind: 'intervalCalc', pointer: { source: 'intervalSeries', key: 'demandCrossCheck.mismatchPct', value: crossCheck.mismatchPct } });
    because.push(
      `Demand cross-check: compared provided kW vs kWh*(60/intervalMinutes) for ${crossCheck.comparable} point(s); mismatchPct≈${(crossCheck.mismatchPct * 100).toFixed(1)}% (threshold 2% pointwise).`,
    );
    if (crossCheck.mismatchPct > 0.1) {
      warnings.push('Interval demand mismatch vs provided Peak Demand; verify intervalMinutes/timezone/DST.');
      missingInfo.push({
        id: `determinants.intervalDemand.mismatch.${args.cycle.label}`,
        category: 'tariff',
        severity: 'warning',
        description: 'Interval demand mismatch vs provided Peak Demand; verify intervalMinutes/timezone/DST.',
      });
      confidence -= 0.12;
    }
  }
  confidence = clamp01(confidence);

  // Deterministic audit breadcrumb for cycle identity in timezone
  const parts = getZonedParts(new Date(parseIsoMs(args.cycle.endIso) || 0), args.cycle.timezone);
  if (parts) because.push(`Cycle labeled ${args.cycle.label} (end local ${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}).`);

  return {
    kwhTotal,
    kWMax,
    ...(touDerived?.kWMaxByTouPeriod ? { kWMaxByTouPeriod: touDerived.kWMaxByTouPeriod } : {}),
    ...(touDerived?.kwhByTouPeriod ? { kwhByTouPeriod: touDerived.kwhByTouPeriod } : {}),
    ...(touDerived?.touLabelsObserved ? { touLabelsObserved: touDerived.touLabelsObserved } : {}),
    ...(touDerived?.unusedTouBuckets ? { unusedTouBuckets: touDerived.unusedTouBuckets } : {}),
    ...(typeof touDerived?.kwhTouIntervalCount === 'number' ? { kwhTouIntervalCount: touDerived.kwhTouIntervalCount } : {}),
    ...(touDerived ? { kwhTouCoveragePct } : {}),
    maxTimestampIso,
    intervalMinutes,
    intervalCount,
    expectedIntervalCount,
    coveragePct,
    firstIntervalTs,
    lastIntervalTs,
    confidence,
    because,
    evidence,
    missingInfo,
    warnings,
  };
}

