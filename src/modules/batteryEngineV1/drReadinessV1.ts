import { getZonedParts } from '../billingEngineV1/time/zonedTime';
import { defaultBatteryEngineConfigV1 } from './constants';
import { BatteryOpportunityReasonCodesV1, uniqSortedReasonCodes } from './reasons';
import type {
  BatteryEngineConfigV1,
  ConfidenceTierV1,
  DrEventWindowV1,
  DrReadinessV1,
  EvaluateStorageOpportunityPackV1Args,
  IntervalPointV1,
  ScalarEstimateV1,
  TariffPriceSignalsV1,
} from './types';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return NaN;
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

function quantileDeterministic(sortedAsc: number[], p01: number): number | null {
  const xs = sortedAsc.filter((n) => Number.isFinite(n));
  if (!xs.length) return null;
  const p = Math.max(0, Math.min(1, p01));
  const idx = Math.floor(p * (xs.length - 1));
  return xs[Math.max(0, Math.min(xs.length - 1, idx))];
}

function kwFromIntervalPoint(p: IntervalPointV1): number | null {
  const kW = Number((p as any)?.kW);
  if (Number.isFinite(kW)) return kW;
  const kWh = Number((p as any)?.kWh);
  const mins = Number((p as any)?.intervalMinutes);
  if (Number.isFinite(kWh) && Number.isFinite(mins) && mins > 0) return kWh * (60 / mins);
  return null;
}

function dateKey(parts: { year: number; month: number; day: number }): string {
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function mkScalar(value: number | null, method: string): ScalarEstimateV1 {
  const v = Number(value);
  if (!Number.isFinite(v)) return { value: null, method };
  return { value: roundTo(v, 6), method };
}

function confidenceTierFrom(args: { coverageDays: number; variabilityScore: number | null }): ConfidenceTierV1 {
  const d = Math.max(0, Math.floor(Number(args.coverageDays) || 0));
  const v = Number(args.variabilityScore);
  if (d < 7) return 'NONE';
  if (d >= 30 && Number.isFinite(v) && v >= 0.3) return 'HIGH';
  if (d >= 14) return 'MEDIUM';
  return 'LOW';
}

export function drReadinessV1(args: {
  intervalInsightsV1: EvaluateStorageOpportunityPackV1Args['intervalInsightsV1'];
  intervalPointsV1?: EvaluateStorageOpportunityPackV1Args['intervalPointsV1'];
  tariffPriceSignalsV1?: EvaluateStorageOpportunityPackV1Args['tariffPriceSignalsV1'];
  config?: Partial<BatteryEngineConfigV1>;
}): DrReadinessV1 {
  const cfg: BatteryEngineConfigV1 = { ...defaultBatteryEngineConfigV1, ...(args.config || {}) } as any;

  const warnings: string[] = [];
  const missingInfo: string[] = [];

  const intervalInsights = args.intervalInsightsV1;
  const tariff = args.tariffPriceSignalsV1 as TariffPriceSignalsV1 | null | undefined;
  const tz = String((tariff as any)?.timezone || (intervalInsights as any)?.timezoneUsed || '').trim();
  if (!tz) missingInfo.push(BatteryOpportunityReasonCodesV1.DR_V1_TIMEZONE_UNKNOWN);

  const coverageDays = Number((intervalInsights as any)?.coverageDays);
  const hasCoverage = Number.isFinite(coverageDays) && coverageDays > 0;

  const points = Array.isArray(args.intervalPointsV1) ? args.intervalPointsV1 : [];
  const baseloadKw = Number((intervalInsights as any)?.baseloadKw);
  const base = Number.isFinite(baseloadKw) ? baseloadKw : null;

  const topDaysCount = Math.max(1, Math.min(30, Math.floor(Number(cfg.drTopEventDays) || 10)));
  const durationHours = Math.max(1, Math.min(6, Math.floor(Number(cfg.drWindowDurationHours) || 2)));

  const daily: Array<{ dateIso: string; peakKw: number; peakHour: number; avgKw: number; shedPotentialKw: number }> = [];
  if (points.length && tz) {
    const byDay = new Map<string, { sumKw: number; n: number; peakKw: number; peakHour: number; tieTs: string }>();
    for (const p of points) {
      const ts = String((p as any)?.timestampIso || '').trim();
      const ms = Date.parse(ts);
      if (!Number.isFinite(ms)) continue;
      const parts = getZonedParts(new Date(ms), tz);
      if (!parts) continue;
      const kw = kwFromIntervalPoint(p);
      if (!Number.isFinite(Number(kw))) continue;
      const dk = dateKey(parts);
      const ex = byDay.get(dk) || { sumKw: 0, n: 0, peakKw: Number.NEGATIVE_INFINITY, peakHour: 0, tieTs: '' };
      ex.sumKw += kw!;
      ex.n += 1;
      if (kw! > ex.peakKw || (kw === ex.peakKw && ts < ex.tieTs)) {
        ex.peakKw = kw!;
        ex.peakHour = parts.hour;
        ex.tieTs = ts;
      }
      byDay.set(dk, ex);
    }
    for (const [dk, v] of byDay.entries()) {
      if (!Number.isFinite(v.peakKw) || v.peakKw === Number.NEGATIVE_INFINITY || v.n <= 0) continue;
      const avgKw = v.sumKw / v.n;
      const shed = base !== null ? Math.max(0, v.peakKw - base) : Math.max(0, v.peakKw);
      daily.push({ dateIso: dk, peakKw: v.peakKw, peakHour: v.peakHour, avgKw, shedPotentialKw: shed });
    }
  }

  if (!daily.length) {
    warnings.push(BatteryOpportunityReasonCodesV1.DR_V1_INSUFFICIENT_COVERAGE);
  }

  const shedVals = daily.map((d) => d.shedPotentialKw).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  const p25 = quantileDeterministic(shedVals, 0.25);
  const p75 = quantileDeterministic(shedVals, 0.75);

  const variabilityScore = (() => {
    if (!shedVals.length) return null;
    const mean = shedVals.reduce((s, x) => s + x, 0) / shedVals.length;
    if (!(mean > 0)) return 0;
    const var0 = shedVals.reduce((s, x) => s + (x - mean) ** 2, 0) / shedVals.length;
    const std = Math.sqrt(Math.max(0, var0));
    // Coefficient of variation, normalized/clamped to 0..1.
    return clamp01(std / mean);
  })();

  const variabilityScalar = mkScalar(variabilityScore, 'dr_variability_cv_v1');

  const confTier = confidenceTierFrom({
    coverageDays: hasCoverage ? coverageDays : daily.length,
    variabilityScore,
  });

  if ((hasCoverage ? coverageDays : daily.length) < 7) warnings.push(BatteryOpportunityReasonCodesV1.DR_V1_INSUFFICIENT_COVERAGE);
  if (Number.isFinite(Number(variabilityScore)) && Number(variabilityScore) < 0.15 && (hasCoverage ? coverageDays : daily.length) >= 7) {
    warnings.push(BatteryOpportunityReasonCodesV1.DR_V1_LOW_VARIABILITY);
  }

  const topEventWindows: DrEventWindowV1[] = daily
    .slice()
    .sort((a, b) => b.shedPotentialKw - a.shedPotentialKw || a.dateIso.localeCompare(b.dateIso) || a.peakHour - b.peakHour)
    .slice(0, topDaysCount)
    .map((d) => {
      // Center the window around the daily peak hour (deterministic).
      const start = Math.max(0, Math.min(24 - durationHours, d.peakHour - Math.floor(durationHours / 2)));
      return {
        dateIso: d.dateIso,
        startHourLocal: start,
        durationHours,
        peakKw: roundTo(d.peakKw, 6),
        avgKw: roundTo(d.avgKw, 6),
        baseloadKw: base !== null ? roundTo(base, 6) : null,
        shedPotentialKw: mkScalar(d.shedPotentialKw, 'dr_shed_potential_kw_v1'),
      };
    })
    .slice(0, 10);

  return {
    eventCandidateDefinition: {
      topDaysCount,
      windowDurationHours: durationHours,
      basis: 'DAILY_PEAK_KW_V1',
      method: 'dr_event_candidates_daily_peak_v1',
    },
    topEventWindows,
    typicalShedPotentialKwRange: [p25 !== null ? roundTo(p25, 6) : null, p75 !== null ? roundTo(p75, 6) : null],
    variabilityScore: variabilityScalar,
    confidenceTier: confTier,
    warnings: uniqSortedReasonCodes(warnings),
    missingInfo: uniqSortedReasonCodes(missingInfo),
  };
}

