import type { NormalizedIntervalV1 } from '../utilityIntelligence/intervalNormalizationV1/types';
import type { TruthSnapshotV1 } from './types';
import { buildHourlyObservationsV1, buildWeatherDaysFromIntervalPointsV1, computeBaselineV1 } from './baselineV1';
import { computeChangepointsV1 } from './changepointsV1';
import { computeResidualMapsV1 } from './residualMapsV1';
import { computeAnomalyLedgerV1 } from './anomalyLedgerV1';
import { computeTruthConfidenceV1 } from './confidenceV1';

function uniqSorted(xs: string[], max: number): string[] {
  const set = new Set<string>();
  for (const x of xs) {
    const s = String(x || '').trim();
    if (!s) continue;
    set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, max);
}

function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return NaN;
  const p = 10 ** decimals;
  const out = Math.round(n * p) / p;
  return Object.is(out, -0) ? 0 : out;
}

export function runTruthEngineV1(args: {
  generatedAtIso: string;
  normalizedIntervalV1: NormalizedIntervalV1 | null;
  intervalPointsV1?:
    | Array<{ timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number; temperatureF?: number }>
    | null;
  hasBillText: boolean;
  billingMonthly?: Array<{ start: string; end: string; kWh?: number; kW?: number; dollars?: number }> | null;
}): TruthSnapshotV1 {
  const generatedAtIso = String(args.generatedAtIso || '').trim() || new Date().toISOString();
  const hasInterval = Boolean(args.normalizedIntervalV1 && args.normalizedIntervalV1.seriesKw && args.normalizedIntervalV1.seriesKw.length);
  const intervalDays = args.normalizedIntervalV1?.coverage?.days ?? null;
  const granularityMinutes = args.normalizedIntervalV1?.granularityMinutes ?? null;

  const weather = (() => {
    const pts = Array.isArray(args.intervalPointsV1) ? args.intervalPointsV1 : null;
    if (!pts || !pts.length) return { hasWeatherDaily: false, weatherDays: null as number | null };
    const anyTemp = pts.some((p) => Number.isFinite(Number((p as any)?.temperatureF)));
    if (!anyTemp) return { hasWeatherDaily: false, weatherDays: null as number | null };
    const built = buildWeatherDaysFromIntervalPointsV1({
      intervalPointsV1: pts.map((p) => ({ timestampIso: p.timestampIso, temperatureF: (p as any)?.temperatureF })) as any,
      timezoneHint: args.normalizedIntervalV1?.timezone ?? null,
      hddBaseF: 65,
      cddBaseF: 65,
    });
    return { hasWeatherDaily: built.weatherDays.length > 0, weatherDays: built.weatherDays.length };
  })();

  const baseline = computeBaselineV1({
    generatedAtIso,
    normalizedIntervalV1: args.normalizedIntervalV1,
    intervalPointsV1: (Array.isArray(args.intervalPointsV1) ? args.intervalPointsV1 : null) as any,
    hasBillText: Boolean(args.hasBillText),
    billingMonthly: (Array.isArray(args.billingMonthly) ? args.billingMonthly : null) as any,
  });

  const hourly = (() => {
    if (!hasInterval || !args.normalizedIntervalV1) return [];
    return buildHourlyObservationsV1({ normalizedIntervalV1: args.normalizedIntervalV1 }).hourly;
  })();

  const residualMapsV1 = computeResidualMapsV1({
    hourly,
    expectedKwForObs: baseline.expectedKwForObs,
    maxPeakHours: 10,
  });

  const changepointsOut = computeChangepointsV1({ hourly, maxChangepoints: 20 });

  const anomalyOut = computeAnomalyLedgerV1({
    hourly,
    expectedKwForObs: baseline.expectedKwForObs,
    maxItems: 50,
  });

  const baselineR2 = typeof (baseline.fitQuality as any)?.r2 === 'number' && Number.isFinite((baseline.fitQuality as any).r2) ? Number((baseline.fitQuality as any).r2) : null;
  const truthConf = computeTruthConfidenceV1({
    hasInterval,
    intervalDays,
    granularityMinutes,
    hasWeatherDaily: weather.hasWeatherDaily,
    weatherDays: weather.weatherDays,
    hasBillText: Boolean(args.hasBillText),
    baselineTier: baseline.fitQuality.tier,
    baselineR2,
    baselineWarnings: baseline.warnings,
  });

  const truthWarnings = uniqSorted(
    [
      ...baseline.warnings,
      ...changepointsOut.warnings,
      ...anomalyOut.warnings,
      ...truthConf.warnings,
      ...(hasInterval && intervalDays !== null && intervalDays < 7 ? ['truth.coverage.interval_coverage_very_short'] : []),
    ],
    160,
  );

  const expectedSeriesSummaryV1: TruthSnapshotV1['expectedSeriesSummaryV1'] = (() => {
    if (baseline.modelKind === 'BILLS_MONTHLY_V1') {
      return {
        kind: 'MONTHLY_KWH',
        timezoneUsed: baseline.timezoneUsed,
        sampleCount: Array.isArray(baseline.expectedMonthlyKwhSummary) ? baseline.expectedMonthlyKwhSummary.length : 0,
        expectedMonthlyKwh: (baseline.expectedMonthlyKwhSummary || []).slice(0, 24).map((m) => ({ ...m, expectedKwh: roundTo(m.expectedKwh, 3) })),
        notes: (baseline.notes || []).slice(0, 60),
      };
    }
    if (baseline.modelKind === 'INTERVAL_WEATHER_HOURLY_REGRESSION_V1' || baseline.modelKind === 'INTERVAL_PROFILE_SEASONAL_V1') {
      const prof = baseline.expectedKwByHourSummary;
      return {
        kind: 'HOURLY_PROFILE',
        timezoneUsed: baseline.timezoneUsed,
        sampleCount: hourly.length,
        ...(prof?.all ? { expectedKwByHour: prof.all.slice(0, 24).map((x) => roundTo(x, 6)) } : {}),
        ...(prof?.weekday ? { expectedKwByHourWeekday: prof.weekday.slice(0, 24).map((x) => roundTo(x, 6)) } : {}),
        ...(prof?.weekend ? { expectedKwByHourWeekend: prof.weekend.slice(0, 24).map((x) => roundTo(x, 6)) } : {}),
        notes: (baseline.notes || []).slice(0, 60),
      };
    }
    return { kind: 'NONE', timezoneUsed: baseline.timezoneUsed, sampleCount: 0, notes: (baseline.notes || []).slice(0, 60) };
  })();

  const snapshot: TruthSnapshotV1 = {
    schemaVersion: 'truthSnapshotV1',
    generatedAtIso,
    coverage: {
      hasInterval,
      intervalDays: intervalDays !== null && Number.isFinite(Number(intervalDays)) ? Number(intervalDays) : null,
      granularityMinutes: granularityMinutes !== null && Number.isFinite(Number(granularityMinutes)) ? Number(granularityMinutes) : null,
      hasWeatherDaily: weather.hasWeatherDaily,
      weatherDays: weather.weatherDays,
      hasBillText: Boolean(args.hasBillText),
    },
    baselineModelV1: {
      modelKind: baseline.modelKind,
      params: baseline.params,
      fitQuality: baseline.fitQuality,
      notes: (baseline.notes || []).slice(0, 80),
    },
    expectedSeriesSummaryV1,
    residualMapsV1,
    changepointsV1: changepointsOut.changepoints.slice(0, 20),
    anomalyLedgerV1: anomalyOut.anomalies.slice(0, 50),
    truthWarnings,
    truthConfidence: { tier: truthConf.tier, reasons: truthConf.reasons.slice(0, 120) },
  };

  return snapshot;
}

