import type { UtilityInputs, UtilityInsights } from '../types';
import { normalizeIntervals } from '../../billingEngineV1/interval/normalizeIntervals';
import { mapTou } from '../../billingEngineV1/tou/mapTou';
import { getZonedParts } from '../../billingEngineV1/time/zonedTime';
import { PGE_SIM_B19_LIKE, resolvePgeSimRateForCode } from '../../billingEngineV1/rates/pge_catalog_v1';

export type IntervalKwPoint = { timestampIso: string; kw: number };

function normTerritory(s: string | undefined | null): string {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function computeProvenMetricsV1(args: {
  inputs: UtilityInputs;
  intervalKw: IntervalKwPoint[] | null;
}): Pick<UtilityInsights, 'provenPeakKw' | 'provenMonthlyKwh' | 'provenTouExposureSummary'> & { warnings: string[] } {
  const warnings: string[] = [];
  if (!args.intervalKw || !args.intervalKw.length) return { warnings };

  const territory = normTerritory(args.inputs.utilityTerritory);
  const tz =
    territory === 'PGE' || territory === 'PG&E'
      ? 'America/Los_Angeles'
      : // fallback: prefer explicit rate timezone later; otherwise deterministic UTC
        'UTC';

  const norm = normalizeIntervals({ intervals: args.intervalKw as any, inputUnit: 'kW', timezone: tz });
  warnings.push(...norm.warnings);
  const valid = norm.intervals.filter((x) => x.isValid);
  if (!valid.length) return { warnings };

  // Group by local month (YYYY-MM) for a proven "monthly" view.
  const monthAgg = new Map<string, { kwh: number; peakKw: number; startMs: number; endMs: number }>();
  for (const iv of valid) {
    const d = new Date(iv.ts);
    const parts = getZonedParts(d, tz);
    if (!parts) continue;
    const monthKey = `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}`;
    const rec = monthAgg.get(monthKey) || { kwh: 0, peakKw: 0, startMs: Number.POSITIVE_INFINITY, endMs: 0 };
    rec.kwh += iv.kwhForInterval;
    rec.peakKw = Math.max(rec.peakKw, iv.kw);
    const ms = d.getTime();
    rec.startMs = Math.min(rec.startMs, ms);
    rec.endMs = Math.max(rec.endMs, ms);
    monthAgg.set(monthKey, rec);
  }

  const months = Array.from(monthAgg.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const latest = months[months.length - 1];
  if (!latest) return { warnings };
  const [month, agg] = latest;

  const provenMonthlyKwh = round2(agg.kwh);
  const provenPeakKw = round2(agg.peakKw);

  // TOU exposure (peak vs off-peak) using the best available PG&E sim TOU structure.
  let provenTouExposureSummary: UtilityInsights['provenTouExposureSummary'] | undefined;
  if (territory === 'PGE' || territory === 'PG&E') {
    const rate =
      resolvePgeSimRateForCode(args.inputs.currentRate?.rateCode || '') ||
      resolvePgeSimRateForCode(args.inputs.currentRate?.utility || '') ||
      PGE_SIM_B19_LIKE;

    const mapped = mapTou({ intervals: norm.intervals, rate, timezoneOverride: rate.timezone || tz });
    warnings.push(...mapped.audit.warnings);

    let peakKwh = 0;
    let offPeakKwh = 0;
    let totalKwh = 0;
    for (const iv of mapped.intervals) {
      if (!iv.isValid) continue;
      const ms = new Date(iv.ts).getTime();
      if (ms < agg.startMs || ms > agg.endMs) continue;
      totalKwh += iv.kwhForInterval;
      if (String(iv.touLabel || '') === 'PEAK') peakKwh += iv.kwhForInterval;
      else offPeakKwh += iv.kwhForInterval;
    }
    if (totalKwh > 0) {
      provenTouExposureSummary = {
        month,
        timezone: rate.timezone || tz,
        rateIdUsed: rate.rateId,
        peakEnergyPct: clamp01(peakKwh / totalKwh),
        offPeakEnergyPct: clamp01(offPeakKwh / totalKwh),
        peakKwh: round2(peakKwh),
        offPeakKwh: round2(offPeakKwh),
      };
    }
  }

  return { provenPeakKw, provenMonthlyKwh, provenTouExposureSummary, warnings };
}

