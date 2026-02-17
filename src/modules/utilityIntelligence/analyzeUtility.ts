import { randomUUID } from 'crypto';
import path from 'path';
import { existsSync } from 'fs';

import type { UtilityInputs, UtilityInsights, UtilityRecommendation } from './types';
import { getUtilityMissingInputs } from './missingInputs';
import { analyzeLoadShape, type IntervalKwPoint as IntervalKwPoint1 } from './interval/analyzeLoadShape';
import { evaluateLoadShiftPotential } from './interval/loadShiftPotential';
import { estimateAnnualKwh } from './interval/annualize';
import { computeProvenMetricsV1 } from './interval/provenMetrics';
import { analyzeSupplyStructure } from './supply/analyzeSupplyStructure';
import { extractBillPdfTariffHintsV1 } from './billPdf/extractBillPdfTariffHintsV1';
import { extractBillPdfTouUsageV1 } from './billPdf/extractBillPdfTouUsageV1';
import { analyzeBillIntelligenceV1 } from './billPdf/analyzeBillIntelligenceV1';
import { analyzeBillIntelligenceIntervalInsightsV1 } from './billIntelligence/intervalInsightsV1';
import { analyzeBillIntelligenceWeatherCorrelationV1 } from './billIntelligence/weatherCorrelationV1';
import { analyzeIntervalIntelligenceV1 } from './intervalIntelligenceV1/analyzeIntervalIntelligenceV1';
import { buildDailyUsageAndWeatherSeriesFromIntervalPointsV1, regressUsageVsWeatherV1 } from './weatherRegressionV1/regressUsageVsWeatherV1';
import type { MissingInfoItemV0 } from './missingInfo/types';
import { runWeatherRegressionV1, type IntervalKwPointWithTemp } from './weather/regression';
import type { WeatherProvider } from './weather/provider';
import { evaluateRateFit, type IntervalKwPoint as IntervalKwPoint2 } from './rates/evaluateRateFit';
import { evaluateOptionSRelevance } from './storage/evaluateOptionS';
import { isSnapshotStale } from '../tariffLibrary';
import { loadLatestSnapshot } from '../tariffLibrary/storage';
import { evaluateTariffApplicabilityV1 } from '../tariffApplicability/evaluateTariffApplicability';
import { buildDeterminantsPackV1 } from '../determinants/buildDeterminantsPack';
import { simulateBillSimV2 } from '../billingEngineV2/simulateBillV2';
import { applyTariffBusinessCanonV1 } from '../tariffLibrary/businessCanonV1';
import { applyTariffEffectiveStatusV1 } from '../tariffLibrary/effectiveStatusV1';
import { applyTariffReadinessVNext } from '../tariffLibrary/readinessVNext';
import { applyTariffSegmentV1 } from '../tariffLibrary/segmentV1';
import { analyzeLoadAttributionV1 } from '../loadAttribution/analyzeLoadAttribution';
import { computeBehaviorInsights } from './behavior/computeBehaviorInsights';
import { computeBehaviorInsightsV2 } from './behaviorV2/computeBehaviorInsightsV2';
import { computeBehaviorInsightsV3 } from './behaviorV3/computeBehaviorInsightsV3';

import { getDefaultCatalogForTerritory, matchPrograms } from '../programIntelligence/matchPrograms';
import { programMatchesToRecommendations } from '../programIntelligence/toRecommendations';

import { loadProjectForOrg } from '../project/projectRepository';
import { readIntervalData } from '../../utils/excel-reader';
import { BillTariffLibraryMatchWarningCodesV1, matchBillTariffToLibraryV1 } from '../tariffLibrary/matching/matchBillTariffToLibraryV1';
import { loadLatestGasSnapshot } from '../tariffLibraryGas/storage';

type IntervalKwPoint = IntervalKwPoint1 & IntervalKwPoint2;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normText(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function uniq(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const k = String(x || '').trim();
    if (!k) continue;
    const nk = k.toLowerCase();
    if (seen.has(nk)) continue;
    seen.add(nk);
    out.push(k);
  }
  return out;
}

function mergeBillIntelWarnings(base: Array<{ code: any; reason: string }>, add: Array<{ code: any; reason: string }>): void {
  const seen = new Set(base.map((w) => `${String(w.code)}|${String(w.reason)}`.toLowerCase()));
  for (const w of add) {
    const k = `${String(w.code)}|${String(w.reason)}`.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    base.push(w as any);
  }
}

function asCaIouUtility(raw: unknown): 'PGE' | 'SCE' | 'SDGE' | null {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (s === 'PGE' || s === 'PG&E' || s === 'PACIFICGASANDELECTRIC' || s === 'PACIFICGASELECTRIC') return 'PGE';
  if (s === 'SCE' || s === 'SOUTHERNCALIFORNIAEDISON') return 'SCE';
  if (s === 'SDGE' || s === 'SDG&E' || s === 'SANDIEGOGASANDELECTRIC') return 'SDGE';
  return null;
}

function mapBillUtilityHintToLibraryUtility(args: { utilityHint?: string | null; commodity: 'electric' | 'gas' }): string | null {
  const h = String(args.utilityHint || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  // From bill extractor returns: PG&E, SCE, SDG&E, SoCalGas
  if (args.commodity === 'electric') {
    if (h.includes('PGE') || h.includes('PACIFICGAS')) return 'PGE';
    if (h === 'SCE' || h.includes('SOUTHERNCALIFORNIAEDISON')) return 'SCE';
    if (h.includes('SDGE') || h.includes('SANDIEGOGAS')) return 'SDGE';
    return null;
  }
  // gas
  if (h.includes('PGE') || h.includes('PACIFICGAS')) return 'PGE';
  if (h.includes('SDGE') || h.includes('SANDIEGOGAS')) return 'SDGE';
  if (h.includes('SOCALGAS') || h.includes('SOUTHERNCALIFORNIAGAS')) return 'SOCALGAS';
  return null;
}

function normRateCode(raw: unknown): string {
  const s = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const m = /^([A-Z]{1,3})-?(\d{1,3})([A-Z]?)$/.exec(s);
  if (m) return `${m[1]}-${m[2]}${m[3] || ''}`;
  return s;
}

function inferScheduleBucket(args: { metrics: UtilityInsights['inferredLoadShape']; intervalPoints: number }): UtilityInsights['operatingPatternInference'] {
  const reasons: string[] = [];
  const p10 = args.metrics.baseloadKw;
  const p95 = args.metrics.peakKw;
  const nightDay = args.metrics.nightDayRatio;
  const ww = args.metrics.weekdayWeekendDelta;

  if (!Number.isFinite(nightDay ?? NaN) || !Number.isFinite(ww ?? NaN) || !Number.isFinite(p10 ?? NaN) || !Number.isFinite(p95 ?? NaN)) {
    return { scheduleBucket: 'unknown', confidence: 0.15, reasons: ['Insufficient load shape metrics to infer operating schedule.'] };
  }

  const nd = Number(nightDay);
  const wwd = Number(ww);

  if (nd >= 0.85 && Math.abs(wwd) <= 0.08) {
    reasons.push(`nightDayRatio≈${nd.toFixed(2)} suggests high overnight load relative to daytime.`);
    reasons.push(`weekdayWeekendDelta≈${wwd.toFixed(2)} suggests similar usage on weekends.`);
    return { scheduleBucket: '24_7', confidence: 0.75, reasons };
  }

  if (nd <= 0.65 && wwd >= 0.08) {
    reasons.push(`nightDayRatio≈${nd.toFixed(2)} suggests lower overnight load vs daytime.`);
    reasons.push(`weekdayWeekendDelta≈${wwd.toFixed(2)} suggests higher weekday usage than weekends.`);
    return { scheduleBucket: 'business_hours', confidence: 0.7, reasons };
  }

  reasons.push('Metrics suggest mixed operating behavior (neither clearly 24/7 nor strictly business-hours).');
  return { scheduleBucket: 'mixed', confidence: 0.55, reasons };
}

async function tryLoadIntervalKwFromProject(inputs: UtilityInputs): Promise<IntervalKwPoint[] | null> {
  try {
    if (!inputs.orgId || !inputs.projectId) return null;
    const project = await loadProjectForOrg(inputs.orgId, inputs.projectId);
    if (!project) return null;

    const telemetry: any = (project as any)?.telemetry || {};
    const series = telemetry.intervalKwSeries;
    if (Array.isArray(series) && series.length) {
      const out: IntervalKwPoint[] = series
        .map((r: any) => ({
          timestampIso: String(r?.timestampIso || r?.timestamp || '').trim(),
          kw: Number(r?.kw),
          temperatureF: Number((r as any)?.temperatureF ?? (r as any)?.tempF ?? (r as any)?.temperature),
        }))
        .filter((r: any) => r.timestampIso && Number.isFinite(r.kw));
      if (out.length) return out;
    }

    const fp = String(telemetry.intervalFilePath || '').trim();
    if (fp) {
      const abs = path.isAbsolute(fp) ? fp : path.join(process.cwd(), fp);
      if (existsSync(abs)) {
        const data = readIntervalData(abs);
        const out: IntervalKwPoint[] = data
          .map((d) => ({
            timestampIso: d.timestamp instanceof Date ? d.timestamp.toISOString() : new Date(d.timestamp as any).toISOString(),
            kw: Number((d as any).demand),
            temperatureF: Number((d as any).temperatureF ?? (d as any).avgTemperature ?? (d as any).temperature),
          }))
          .filter((r) => r.timestampIso && Number.isFinite(r.kw));
        if (out.length) return out;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export type AnalyzeUtilityDeps = {
  intervalKwSeries?: IntervalKwPoint[] | null;
  /** Canonical interval points (kWh/kW/temperatureF) from PG&E exports or other sources. */
  intervalPointsV1?: Array<{ timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number; temperatureF?: number }> | null;
  weatherProvider?: WeatherProvider;
  nowIso?: string;
  idFactory?: () => string;
};

/**
 * Orchestrator (v1): deterministic insights + inbox-only recommendations.
 *
 * Note: v1 is best-effort; it may accept interval series from deps (fixtures/telemetry adapters),
 * or attempt to load from project records when available.
 */
export async function analyzeUtility(inputs: UtilityInputs, deps?: AnalyzeUtilityDeps): Promise<{
  insights: UtilityInsights;
  recommendations: UtilityRecommendation[];
}> {
  const nowIso = deps?.nowIso || new Date('2026-01-01T00:00:00.000Z').toISOString();
  const idFactory = deps?.idFactory || (() => randomUUID());

  const intervalFromCanonical =
    Array.isArray(deps?.intervalPointsV1) && deps?.intervalPointsV1.length
      ? deps?.intervalPointsV1
          .map((p) => {
            const ts = String((p as any)?.timestampIso || '').trim();
            const mins = Number((p as any)?.intervalMinutes);
            const kW = Number((p as any)?.kW);
            const kWh = Number((p as any)?.kWh);
            const derived = !Number.isFinite(kW) && Number.isFinite(kWh) && Number.isFinite(mins) && mins > 0 ? kWh * (60 / mins) : NaN;
            const kw = Number.isFinite(kW) ? kW : derived;
            const temperatureF = Number((p as any)?.temperatureF);
            return { timestampIso: ts, kw, ...(Number.isFinite(temperatureF) ? { temperatureF } : {}) };
          })
          .filter((p) => p.timestampIso && Number.isFinite((p as any).kw))
      : null;

  const intervalKw: IntervalKwPoint[] | null =
    (intervalFromCanonical && intervalFromCanonical.length ? (intervalFromCanonical as any) : null) ??
    ((Array.isArray(deps?.intervalKwSeries) ? deps?.intervalKwSeries : null) ?? (await tryLoadIntervalKwFromProject(inputs)));

  const missingGlobal = getUtilityMissingInputs(inputs);

  // Interval analytics
  const loadShape = analyzeLoadShape({ intervalKw: intervalKw || undefined });
  const schedule = inferScheduleBucket({ metrics: loadShape.metrics, intervalPoints: intervalKw?.length || 0 });
  const loadShift = evaluateLoadShiftPotential({ intervalKw: intervalKw || undefined, loadShape: loadShape.metrics, constraints: inputs.constraints });

  // Weather sensitivity (optional provider)
  const weather = await runWeatherRegressionV1({
    inputs,
    intervalKw: (intervalKw || []).map((r) => ({ timestampIso: r.timestampIso, kw: r.kw } satisfies IntervalKwPointWithTemp)),
    provider: deps?.weatherProvider,
  });

  const loadAttribution = (() => {
    try {
      const ptsAll: any[] = Array.isArray(deps?.intervalPointsV1) && deps?.intervalPointsV1.length
        ? deps?.intervalPointsV1.map((p) => {
            const ts = String((p as any)?.timestampIso || '').trim();
            const mins = Number((p as any)?.intervalMinutes);
            const kW = Number((p as any)?.kW);
            const kWh = Number((p as any)?.kWh);
            const derived = !Number.isFinite(kW) && Number.isFinite(kWh) && Number.isFinite(mins) && mins > 0 ? kWh * (60 / mins) : NaN;
            const kw = Number.isFinite(kW) ? kW : derived;
            return { timestampIso: ts, kw, temperatureF: Number((p as any)?.temperatureF) };
          })
        : Array.isArray(intervalKw)
          ? (intervalKw as any[]).map((p) => ({ timestampIso: String((p as any)?.timestampIso || ''), kw: Number((p as any)?.kw), temperatureF: Number((p as any)?.temperatureF) }))
          : [];
      if (!ptsAll.length) return undefined;
      const withTemp = ptsAll.filter((p) => Number.isFinite(Number(p?.temperatureF)));
      const coverage = ptsAll.length ? withTemp.length / ptsAll.length : 0;
      return analyzeLoadAttributionV1({
        points: ptsAll.map((p) => ({ timestampIso: String(p?.timestampIso || ''), kw: Number(p?.kw), temperatureF: Number(p?.temperatureF) })),
        minPoints: 1000,
        minTempStddevF: 3,
      });
    } catch {
      return undefined;
    }
  })();

  // Rate fit
  const rateFit = evaluateRateFit({
    inputs,
    scheduleBucket: schedule.scheduleBucket,
    loadShape: loadShape.metrics,
    intervalKw: intervalKw || undefined,
  });

  // Option S relevance
  const optionS = evaluateOptionSRelevance({
    inputs,
    loadShape: loadShape.metrics,
    loadShiftScore: loadShift.score,
  });

  // Program intelligence (deterministic catalog matching)
  const proven = computeProvenMetricsV1({ inputs, intervalKw: intervalKw || null });
  const tz =
    String(proven.provenTouExposureSummary?.timezone || '').trim() ||
    (normText(inputs.utilityTerritory).includes('pge') ? 'America/Los_Angeles' : 'UTC');
  const billTou = (() => {
    try {
      return extractBillPdfTouUsageV1({ billPdfText: inputs.billPdfText || null, timezone: tz });
    } catch {
      return null;
    }
  })();
  const monthlyKwh = (() => {
    const m = inputs.billingSummary?.monthly || [];
    const vals = m.map((x) => Number(x.kWh)).filter((n) => Number.isFinite(n) && n >= 0);
    if (!vals.length) return undefined;
    // v1: mean monthly kWh over provided months
    return vals.reduce((s, x) => s + x, 0) / vals.length;
  })();

  const annualEstimate = (() => {
    const m = inputs.billingSummary?.monthly || [];
    const monthVals = m.map((x) => Number(x.kWh)).filter((n) => Number.isFinite(n) && n >= 0);
    return (
      estimateAnnualKwh({
        monthlyKwhValues: monthVals,
        monthlyKwhScalar: Number.isFinite(proven.provenMonthlyKwh ?? NaN) ? proven.provenMonthlyKwh : monthlyKwh,
      }) || undefined
    );
  })();
  const annualKwh = (() => {
    const m = inputs.billingSummary?.monthly || [];
    const vals = m.map((x) => Number(x.kWh)).filter((n) => Number.isFinite(n) && n >= 0);
    if (!vals.length) return undefined;
    const sum = vals.reduce((s, x) => s + x, 0);
    // If fewer than 12 months, do not extrapolate in v1 (conservative).
    return vals.length >= 12 ? sum : undefined;
  })();

  const catalog = getDefaultCatalogForTerritory(inputs.utilityTerritory);
  const matches = matchPrograms({
    inputs,
    derived: {
      peakKw: loadShape.metrics.peakKw,
      provenPeakKw: proven.provenPeakKw,
      monthlyKwh,
      provenMonthlyKwh: proven.provenMonthlyKwh,
      provenAnnualKwhEstimate: annualEstimate,
      annualKwh,
      scheduleBucket: schedule.scheduleBucket,
      loadShiftScore: loadShift.score,
      hasIntervalData: Boolean(intervalKw && intervalKw.length),
      hasAdvancedMetering: Boolean(intervalKw && intervalKw.length),
      intervalKw: intervalKw || undefined,
      timezone: proven.provenTouExposureSummary?.timezone || (normText(inputs.utilityTerritory).includes('pge') ? 'America/Los_Angeles' : 'UTC'),
      provenTouExposureSummary: proven.provenTouExposureSummary,
    },
    catalog,
  });

  const programRecs = programMatchesToRecommendations({
    inputs,
    matches: matches.filter((m) => m.matchStatus !== 'unlikely').slice(0, 6),
    catalog,
    nowIso,
    idFactory,
  });

  const programs: UtilityInsights['programs'] = {
    matches,
    topRecommendations: programRecs.slice(0, 5),
  };

  const supplyStructure = analyzeSupplyStructure({
    inputs,
    billingRecords: inputs.billingRecords || null,
    billPdfText: inputs.billPdfText || null,
  });

  const billPdfTariffTruth = extractBillPdfTariffHintsV1(inputs.billPdfText || null);

  const billIntelligenceV1 = analyzeBillIntelligenceV1({
    billPdfText: inputs.billPdfText || null,
    billPdfTariffTruth,
  });

  // Bill Intelligence v1 – Interval + Weather insights (warnings-first, deterministic).
  {
    const explicitPeakKwFromBill = Number.isFinite(Number((billIntelligenceV1 as any)?.extractedFacts?.peakKw?.value))
      ? Number((billIntelligenceV1 as any).extractedFacts.peakKw.value)
      : null;

    const intervalRes = analyzeBillIntelligenceIntervalInsightsV1({
      intervalPointsV1: Array.isArray(deps?.intervalPointsV1) ? deps?.intervalPointsV1 : null,
      explicitPeakKwFromBill,
    });
    (billIntelligenceV1 as any).intervalInsightsV1 = intervalRes.intervalInsightsV1;
    mergeBillIntelWarnings((billIntelligenceV1 as any).warnings, intervalRes.warnings);

    const weatherRes = analyzeBillIntelligenceWeatherCorrelationV1({
      intervalPointsV1: Array.isArray(deps?.intervalPointsV1) ? deps?.intervalPointsV1 : null,
    });
    (billIntelligenceV1 as any).weatherCorrelationV1 = weatherRes.weatherCorrelationV1;
    mergeBillIntelWarnings((billIntelligenceV1 as any).warnings, weatherRes.warnings);
  }

  // Interval Intelligence v1 – Product-grade interval-derived outputs (warnings-first, deterministic).
  const intervalIntelligenceV1 = (() => {
    try {
      const pts = Array.isArray(deps?.intervalPointsV1) ? (deps?.intervalPointsV1 as any[]) : null;
      if (!pts || !pts.length) return undefined;
      return analyzeIntervalIntelligenceV1({
        points: pts as any,
        timezoneHint: tz,
        topPeakEventsCount: 7,
      }).intervalIntelligenceV1;
    } catch {
      return undefined;
    }
  })();

  const weatherRegressionV1 = (() => {
    try {
      const pts = Array.isArray(deps?.intervalPointsV1) ? (deps?.intervalPointsV1 as any[]) : null;
      if (!pts || !pts.length) return undefined;
      const anyTemp = pts.some((p) => Number.isFinite(Number((p as any)?.temperatureF)));
      if (!anyTemp) return undefined;
      const daily = buildDailyUsageAndWeatherSeriesFromIntervalPointsV1({ points: pts as any, timezoneHint: tz });
      return regressUsageVsWeatherV1({
        usageByDay: daily.usageByDay,
        weatherByDay: daily.weatherByDay,
        hddBaseF: 65,
        cddBaseF: 65,
        minOverlapDays: 10,
        timezoneHint: tz,
      }).weatherRegressionV1;
    } catch {
      return undefined;
    }
  })();

  const billTariffCommodity: 'electric' | 'gas' =
    String(inputs.serviceType || '').toLowerCase() === 'gas' ? 'gas' : 'electric';

  const billTariffUtilityKey =
    mapBillUtilityHintToLibraryUtility({ utilityHint: (billPdfTariffTruth as any)?.utilityHint, commodity: billTariffCommodity }) ||
    asCaIouUtility(inputs.utilityTerritory) ||
    null;

  const billTariffSnapshot =
    billTariffUtilityKey && billTariffCommodity === 'electric'
      ? await loadLatestSnapshot(billTariffUtilityKey as any).catch(() => null)
      : billTariffUtilityKey && billTariffCommodity === 'gas'
        ? await loadLatestGasSnapshot(billTariffUtilityKey as any).catch(() => null)
        : null;

  const billPdfTariffLibraryMatchRaw = matchBillTariffToLibraryV1({
    utilityId: billTariffUtilityKey,
    commodity: billTariffCommodity,
    rateScheduleText: (billPdfTariffTruth as any)?.rateScheduleText || null,
    snapshot: billTariffSnapshot
      ? {
          versionTag: String((billTariffSnapshot as any).versionTag),
          capturedAt: String((billTariffSnapshot as any).capturedAt),
          rates: Array.isArray((billTariffSnapshot as any).rates) ? (billTariffSnapshot as any).rates : [],
        }
      : null,
  });

  const billPdfTariffLibraryMatch =
    billPdfTariffTruth && (billPdfTariffTruth as any)?.rateScheduleText
      ? {
          commodity: billTariffCommodity,
          utilityId: billTariffUtilityKey || undefined,
          snapshotVersionTag: billPdfTariffLibraryMatchRaw.snapshotId,
          snapshotCapturedAt: billPdfTariffLibraryMatchRaw.snapshotCapturedAt,
          ...(billPdfTariffLibraryMatchRaw.resolved
            ? { resolved: { rateCode: billPdfTariffLibraryMatchRaw.resolved.rateCode, matchType: billPdfTariffLibraryMatchRaw.resolved.matchType, sourceUrl: billPdfTariffLibraryMatchRaw.resolved.sourceUrl, sourceTitle: billPdfTariffLibraryMatchRaw.resolved.sourceTitle } }
            : {}),
          ...(Array.isArray(billPdfTariffLibraryMatchRaw.candidates) && billPdfTariffLibraryMatchRaw.candidates.length
            ? {
                candidates: billPdfTariffLibraryMatchRaw.candidates.map((c) => ({
                  rateCode: c.rateCode,
                  score: c.score,
                  reason: c.reason,
                  sourceUrl: c.sourceUrl,
                  sourceTitle: c.sourceTitle,
                })),
              }
            : {}),
          ...(Array.isArray(billPdfTariffLibraryMatchRaw.warnings) && billPdfTariffLibraryMatchRaw.warnings.length ? { warnings: billPdfTariffLibraryMatchRaw.warnings } : {}),
        }
      : null;

  // CA Tariff Library v0 (metadata only)
  const tariffLibrary = await (async () => {
    try {
      const rateCode = String(inputs.currentRate?.rateCode || '').trim();
      if (!rateCode) return undefined;
      const u = asCaIouUtility(inputs.currentRate?.utility ?? inputs.utilityTerritory);
      if (!u) return undefined;

      const snap = await loadLatestSnapshot(u);
      if (!snap) return undefined;

      const want = normRateCode(rateCode);
      const raw = (snap.rates || []).find((r) => normRateCode(r.rateCode) === want) || null;
      const md = raw ? applyTariffEffectiveStatusV1(applyTariffBusinessCanonV1(applyTariffReadinessVNext(applyTariffSegmentV1(raw as any)))) : null;
      const isStale = isSnapshotStale(snap.capturedAt, nowIso, 14);
      const changeSummary = snap.diffFromPrevious
        ? { addedRateCodes: snap.diffFromPrevious.addedRateCodes, removedRateCodes: snap.diffFromPrevious.removedRateCodes }
        : undefined;

      return {
        snapshotVersionTag: snap.versionTag,
        snapshotCapturedAt: snap.capturedAt,
        lastUpdatedAt: snap.capturedAt,
        isStale,
        ...(changeSummary ? { changeSummary } : {}),
        rateMetadata: md,
      };
    } catch {
      return undefined;
    }
  })();

  const tariffApplicability = (() => {
    try {
      const rateCode = String(inputs.currentRate?.rateCode || '').trim();
      if (!rateCode) return undefined;
      const u = asCaIouUtility(inputs.currentRate?.utility ?? inputs.utilityTerritory);
      if (!u) return undefined;

      const intervalResolutionMinutes =
        inputs.intervalDataRef?.resolution === '15min' ? 15 : inputs.intervalDataRef?.resolution === 'hourly' ? 60 : inputs.intervalDataRef?.resolution === 'daily' ? 1440 : undefined;

      return evaluateTariffApplicabilityV1({
        utility: u,
        rateCode,
        billingRecords: inputs.billingRecords || null,
        billPdfText: inputs.billPdfText || null,
        meterVoltageText: String(inputs.meterMeta?.voltage || '').trim() || null,
        tariffMetadata: (tariffLibrary as any)?.rateMetadata || null,
        supplyType: (supplyStructure as any)?.supplyType,
        territoryId: null,
        intervalKwSeries: (intervalKw || []).map((r) => ({ timestampIso: r.timestampIso, kw: r.kw })),
        intervalResolutionMinutes: intervalResolutionMinutes === 15 || intervalResolutionMinutes === 30 ? intervalResolutionMinutes : undefined,
      });
    } catch {
      return undefined;
    }
  })();

  const determinantsPack = (() => {
    try {
      const rateCode = String(inputs.currentRate?.rateCode || '').trim();
      const u = asCaIouUtility(inputs.currentRate?.utility ?? inputs.utilityTerritory) || String(inputs.currentRate?.utility || inputs.utilityTerritory || '').trim() || 'unknown';
      if (!rateCode) return null;

      const intervalMinutes =
        inputs.intervalDataRef?.resolution === '15min'
          ? 15
          : inputs.intervalDataRef?.resolution === 'hourly'
            ? 60
            : inputs.intervalDataRef?.resolution === 'daily'
              ? 1440
              : null;

      const meterIdGuess = (() => {
        const br0: any = Array.isArray(inputs.billingRecords) && inputs.billingRecords.length ? inputs.billingRecords[0] : null;
        return String(br0?.saId || br0?.meterNumber || 'site').trim() || 'site';
      })();

      const canonicalPoints = Array.isArray(deps?.intervalPointsV1) && deps?.intervalPointsV1.length ? deps?.intervalPointsV1 : null;
      const billTouCycleLabel = billTou && String((billTou as any).cycleLabel || '').trim() && String((billTou as any).cycleLabel || '').trim() !== 'unknown'
        ? String((billTou as any).cycleLabel || '').trim()
        : null;
      const observedTouEnergyByMeterAndCycle =
        billTouCycleLabel && (billTou as any)?.observedTouEnergy?.values && Object.keys((billTou as any).observedTouEnergy.values).length
          ? {
              [meterIdGuess]: {
                [billTouCycleLabel]: {
                  values: (billTou as any).observedTouEnergy.values,
                  fields: (billTou as any).observedTouEnergy.fields,
                },
              },
            }
          : undefined;
      const observedTouDemandByMeterAndCycle =
        billTouCycleLabel && (billTou as any)?.observedTouDemand?.values && Object.keys((billTou as any).observedTouDemand.values).length
          ? {
              [meterIdGuess]: {
                [billTouCycleLabel]: {
                  values: (billTou as any).observedTouDemand.values,
                  fields: (billTou as any).observedTouDemand.fields,
                },
              },
            }
          : undefined;
      return buildDeterminantsPackV1({
        utility: String(u),
        rateCode,
        supplyType: (supplyStructure as any)?.supplyType,
        timezone: tz,
        billingRecords: inputs.billingRecords || null,
        billPdfText: inputs.billPdfText || null,
        ...(observedTouEnergyByMeterAndCycle ? { observedTouEnergyByMeterAndCycle } : {}),
        ...(observedTouDemandByMeterAndCycle ? { observedTouDemandByMeterAndCycle } : {}),
        intervalSeries: canonicalPoints || intervalKw
          ? [
              {
                meterId: meterIdGuess,
                points: canonicalPoints
                  ? canonicalPoints.map((p) => ({
                      timestampIso: String((p as any)?.timestampIso || '').trim(),
                      intervalMinutes: Number((p as any)?.intervalMinutes),
                      ...(Number.isFinite(Number((p as any)?.kWh)) ? { kWh: Number((p as any).kWh) } : {}),
                      ...(Number.isFinite(Number((p as any)?.kW)) ? { kW: Number((p as any).kW) } : {}),
                      ...(Number.isFinite(Number((p as any)?.temperatureF)) ? { temperatureF: Number((p as any).temperatureF) } : {}),
                    }))
                  : (intervalKw || []).map((r) => ({ timestampIso: r.timestampIso, kw: r.kw })),
                intervalMinutes: canonicalPoints ? undefined : (intervalMinutes ?? undefined),
                timezone: tz,
                source: canonicalPoints ? 'workflow:intervalPointsV1' : 'utilityIntelligence:intervalKwSeries',
              },
            ]
          : null,
      });
    } catch {
      return null;
    }
  })();

  const determinantsPackSummary = (() => {
    try {
      if (!determinantsPack) return undefined;
      const meters = determinantsPack.meters.map((m) => {
        const cycles = [...(m.cycles || [])]
          .slice()
          .sort((a, b) => (new Date(b.cycle.endIso).getTime() || 0) - (new Date(a.cycle.endIso).getTime() || 0))
          .slice(0, 12)
          .map((c) => ({
            cycleLabel: c.cycle.label,
            startIso: c.cycle.startIso,
            endIso: c.cycle.endIso,
            kwhTotal: c.energy.kwhTotal,
            kWMax: c.demand.kWMax,
            ...(c.demand.kWMaxByTouPeriod ? { kWMaxByTouPeriod: c.demand.kWMaxByTouPeriod as any } : {}),
            billingDemandKw: c.demand.billingDemandKw ?? null,
            ratchetDemandKw: (c.demand as any).ratchetDemandKw ?? null,
            ratchetHistoryMaxKw: (c.demand as any).ratchetHistoryMaxKw ?? null,
            ratchetFloorPct: (c.demand as any).ratchetFloorPct ?? null,
            billingDemandMethod: String((c.demand as any).billingDemandMethod || '') || null,
            coveragePct: c.demand.coveragePct ?? null,
            intervalMinutes: c.demand.intervalMinutes ?? null,
          }));
        return {
          meterId: m.meterId,
          last12Cycles: cycles,
          reconciliation: {
            demandMismatchCount: Number((m.reconciliation as any)?.demandMismatchCount || 0),
            kwhMismatchCount: Number((m.reconciliation as any)?.kwhMismatchCount || 0),
            overlapStartIso: (m.reconciliation as any)?.overlapStartIso ?? null,
            overlapEndExclusiveIso: (m.reconciliation as any)?.overlapEndExclusiveIso ?? null,
            reconciledCycleCount: Number((m.reconciliation as any)?.reconciledCycleCount || 0),
            skippedCycleCountByReason: (m.reconciliation as any)?.skippedCycleCountByReason || { no_usage: 0, out_of_overlap_window: 0, low_interval_coverage: 0 },
            latestReconcilableBillEndDate: (m.reconciliation as any)?.latestReconcilableBillEndDate ?? null,
            earliestReconcilableBillEndDate: (m.reconciliation as any)?.earliestReconcilableBillEndDate ?? null,
          },
        };
      });
      return {
        rulesVersionTag: String(determinantsPack.rulesVersionTag || 'determinants:v1'),
        determinantsVersionTag: String((determinantsPack as any).determinantsVersionTag || 'determinants_v1'),
        touLabelerVersionTag: String((determinantsPack as any).touLabelerVersionTag || 'tou_v1'),
        meters,
        warnings: Array.isArray(determinantsPack.warnings) ? determinantsPack.warnings.slice(0, 6) : [],
      };
    } catch {
      return undefined;
    }
  })();

  const behaviorInsights = (() => {
    try {
      return computeBehaviorInsights({
        billingRecords: inputs.billingRecords || null,
        determinantsPack,
        intervalPointsV1: Array.isArray(deps?.intervalPointsV1) ? deps?.intervalPointsV1 : null,
        loadAttribution: loadAttribution || null,
      });
    } catch {
      return undefined;
    }
  })();

  const behaviorInsightsV2 = (() => {
    try {
      return computeBehaviorInsightsV2({
        determinantsPack: determinantsPack || null,
        intervalPointsV1: Array.isArray(deps?.intervalPointsV1) ? deps?.intervalPointsV1 : null,
        loadAttribution: loadAttribution || null,
        nowIso,
      });
    } catch {
      return undefined;
    }
  })();

  const behaviorInsightsV3 = (() => {
    try {
      return computeBehaviorInsightsV3({
        inputsBillingMonthly: Array.isArray(inputs.billingSummary?.monthly) ? (inputs.billingSummary?.monthly as any) : null,
        determinantsPack: determinantsPack || null,
        nowIso,
      });
    } catch {
      return undefined;
    }
  })();

  const billSimV2 = (() => {
    try {
      if (!determinantsPack) return undefined;
      const md = (tariffLibrary as any)?.rateMetadata || null;
      return simulateBillSimV2({ determinantsPack, tariffMetadata: md });
    } catch {
      return undefined;
    }
  })();

  const missingInfo: MissingInfoItemV0[] = (() => {
    const items: MissingInfoItemV0[] = [];

    const currentRateCode = String(inputs.currentRate?.rateCode || '').trim();
    const currentUtility = asCaIouUtility(inputs.currentRate?.utility ?? inputs.utilityTerritory);

    if (!String(inputs.billPdfText || '').trim()) {
      items.push({
        id: 'billing.billPdfText.missing',
        category: 'tariff',
        severity: 'info',
        description: 'Bill PDF text is missing; bill-based tariff extraction and TOU usage hints are unavailable.',
      });
    } else if (billTou && Array.isArray((billTou as any).warnings) && (billTou as any).warnings.length) {
      const snips = Array.isArray((billTou as any).evidenceSnippets) ? ((billTou as any).evidenceSnippets as any[]) : [];
      const evidence = snips
        .map((s) => String(s || '').trim())
        .filter(Boolean)
        .slice(0, 4)
        .map((s) => ({ kind: 'bill_pdf_snippet', value: s }));
      for (const w of ((billTou as any).warnings as any[]).slice(0, 8)) {
        const code = String((w as any)?.code || '').trim();
        const hint = String((w as any)?.hint || '').trim() || 'Bill PDF TOU extraction warning.';
        if (!code) continue;
        const severity: MissingInfoItemV0['severity'] =
          code === 'BILL_PDF_CYCLE_LABEL_MISSING' || code === 'BILL_PDF_TOU_ENERGY_INCONSISTENT_WITH_TOTAL' ? 'warning' : 'info';
        items.push({
          id: `billing.billPdfTouUsage.${code}`,
          category: 'billing',
          severity,
          description: hint,
          ...(evidence.length ? { evidence } : {}),
          details: { reasonCode: code, source: 'bill_pdf' },
        });
      }
    }

    // Bill->tariff library match ambiguity (operator action required)
    {
      const warnings = Array.isArray((billPdfTariffLibraryMatchRaw as any)?.warnings) ? ((billPdfTariffLibraryMatchRaw as any).warnings as any[]) : [];
      const isAmbiguous = warnings.some((w) => String(w || '') === BillTariffLibraryMatchWarningCodesV1.BILL_TARIFF_AMBIGUOUS);
      if (isAmbiguous) {
        const wanted = String((billPdfTariffTruth as any)?.rateScheduleText || '').trim() || 'Unknown';
        const cands = Array.isArray((billPdfTariffLibraryMatchRaw as any)?.candidates) ? (((billPdfTariffLibraryMatchRaw as any).candidates as any[]) || []) : [];
        const top = cands
          .map((c) => String((c as any)?.rateCode || '').trim())
          .filter(Boolean)
          .slice(0, 3);
        const candidatesText = top.length ? ` Candidates: ${top.join(', ')}.` : '';
        items.push({
          id: `tariff.billPdfTariffLibraryMatch.${BillTariffLibraryMatchWarningCodesV1.BILL_TARIFF_AMBIGUOUS}`,
          category: 'tariff',
          severity: 'warning',
          description: `Bill rate label "${wanted}" matches multiple tariff candidates (ambiguous). Select the correct tariff in the tariff browser or apply an override.${candidatesText}`,
          details: {
            reasonCode: BillTariffLibraryMatchWarningCodesV1.BILL_TARIFF_AMBIGUOUS,
            wantedRateScheduleText: wanted,
            candidates: top,
          },
        });
      }
    }

    const hasIntervals = Boolean((deps?.intervalPointsV1 && deps.intervalPointsV1.length) || (intervalKw && intervalKw.length));
    if (!hasIntervals) {
      items.push({
        id: 'interval.intervalElectricV1.missing',
        category: 'interval',
        severity: 'info',
        description: 'Interval electricity data is missing; interval-derived insights (and some deterministic audit signals) will be unavailable.',
      });
    }

    if (!currentRateCode) {
      items.push({
        id: 'tariff.currentRateCode.missing',
        category: 'tariff',
        severity: 'blocking',
        description: 'Current tariff/rate code is missing; tariff metadata and rate-fit comparisons cannot be audited without it.',
      });
    }

    if (currentUtility && currentRateCode) {
      if (!tariffLibrary || !String((tariffLibrary as any).snapshotVersionTag || '').trim()) {
        items.push({
          id: 'tariff.snapshot.missing',
          category: 'tariff',
          severity: 'warning',
          description: 'Tariff snapshots are not loaded for this utility. Run ingestion to restore versioned tariff metadata.',
        });
      } else {
        if (tariffLibrary?.isStale) {
          items.push({
            id: 'tariff.snapshot.stale',
            category: 'tariff',
            severity: 'warning',
            description: 'Tariff snapshot may be stale (>14 days). Refresh snapshots to ensure current metadata and provenance.',
          });
        }
        if (tariffLibrary?.rateMetadata === null) {
          items.push({
            id: 'tariff.rateMetadata.notFound',
            category: 'tariff',
            severity: 'warning',
            description: `Rate code ${currentRateCode} was not found in the latest tariff snapshot (metadata-only). Verify rate code or refresh snapshots.`,
          });
        }
        if (!tariffApplicability) {
          items.push({
            id: 'tariff.applicability.missing',
            category: 'tariff',
            severity: 'info',
            description: 'Tariff applicability was not evaluated (missing inputs or unsupported utility/rate).',
          });
        } else if (tariffApplicability?.status === 'unknown') {
          items.push({
            id: 'tariff.applicability.unknown',
            category: 'tariff',
            severity: 'info',
            description: 'Tariff applicability is unknown with current inputs; see applicability panel for required missing determinants.',
          });
        }
      }
    }

    if (!supplyStructure) {
      items.push({
        id: 'supply.structure.unknown',
        category: 'supply',
        severity: 'info',
        description: 'Supply structure (bundled vs CCA vs Direct Access) is unknown; tariff interpretation may be incomplete.',
      });
    }

    // If intervals exist but temperature is absent, surface a decision-safety note.
    if ((deps?.intervalPointsV1 && deps.intervalPointsV1.length) || (intervalKw && intervalKw.length)) {
      const anyTemp = (Array.isArray(deps?.intervalPointsV1) ? deps?.intervalPointsV1 : (intervalKw as any[])).some((p: any) =>
        Number.isFinite(Number(p?.temperatureF)),
      );
      if (!anyTemp) {
        items.push({
          id: 'weather.interval.temperature.missing',
          category: 'tariff',
          severity: 'info',
          description: 'Weather data missing in interval export; load attribution unavailable. Include Avg. Temperature in interval export when available.',
        });
      }
    }

    // Bubble up applicability missingInfo into the global decision-safety list (dedup by id).
    if (tariffApplicability && Array.isArray(tariffApplicability.missingInfo) && tariffApplicability.missingInfo.length) {
      const seen = new Set(items.map((x) => String(x.id || '')));
      for (const it of tariffApplicability.missingInfo) {
        const id = String((it as any)?.id || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push(it);
      }
    }

    // Bubble up determinants missingInfo into the global decision-safety list (dedup by id).
    if (determinantsPack && Array.isArray(determinantsPack.missingInfo) && determinantsPack.missingInfo.length) {
      const seen = new Set(items.map((x) => String(x.id || '')));
      for (const it of determinantsPack.missingInfo) {
        const id = String((it as any)?.id || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push(it);
      }
    }

    if (loadAttribution && Array.isArray((loadAttribution as any).missingInfo) && (loadAttribution as any).missingInfo.length) {
      const seen = new Set(items.map((x) => String(x.id || '')));
      for (const it of (loadAttribution as any).missingInfo) {
        const id = String((it as any)?.id || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push(it);
      }
    }

    if (behaviorInsightsV2 && Array.isArray((behaviorInsightsV2 as any).missingInfo) && (behaviorInsightsV2 as any).missingInfo.length) {
      const seen = new Set(items.map((x) => String(x.id || '')));
      for (const it of (behaviorInsightsV2 as any).missingInfo) {
        const id = String((it as any)?.id || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push(it);
      }
    }

    if (behaviorInsightsV3) {
      const seen = new Set(items.map((x) => String(x.id || '')));
      const all = [
        ...((behaviorInsightsV3 as any)?.electric?.missingInfo || []),
        ...((behaviorInsightsV3 as any)?.gas?.missingInfo || []),
      ];
      for (const it of all) {
        const id = String((it as any)?.id || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push(it);
      }
    }

    return items;
  })();

  const requiredInputsMissing = uniq([
    ...missingGlobal,
    ...(loadShape.requiredInputsMissing || []),
    ...(loadShift.requiredInputsMissing || []),
    ...(weather.requiredInputsMissing || []),
    ...(rateFit.alternatives.flatMap((a) => a.requiredInputsMissing || []) || []),
    ...(optionS.requiredInputsMissing || []),
    ...(matches.flatMap((m) => m.requiredInputsMissing || []) || []),
  ]);

  // Recommendations: inbox-only suggestions (do not auto-apply).
  const recos: UtilityRecommendation[] = [];

  // 1) Collect missing rate code if needed
  if (!inputs.currentRate?.rateCode) {
    recos.push({
      recommendationId: idFactory(),
      recommendationType: 'RATE_CHANGE',
      score: 0.9,
      confidence: 0.9,
      because: ['Current rate code is missing; rate fit cannot be evaluated without it.', 'Collect the exact tariff schedule code from the bill/portal.'],
      requiredInputsMissing: ['Current tariff/rate code required to evaluate rate fit.'],
      suggestedMeasure: {
        measureType: 'RATE_CHANGE' as any,
        label: 'Collect current utility rate code',
        tags: ['utility', 'rate_code'],
        parameters: {
          territory: inputs.utilityTerritory ?? null,
          utility: inputs.currentRate?.utility ?? inputs.utilityTerritory ?? null,
        },
      },
    });
  }

  // 2) Rate change alternatives (as evaluation suggestions)
  for (const alt of rateFit.alternatives.slice(0, 5)) {
    const because = [
      'Evaluate alternative rate schedule (inbox-only suggestion; no changes are applied automatically).',
      ...alt.because,
      ...(Number.isFinite(alt.estimatedDeltaDollars ?? NaN)
        ? [`Deterministic delta computed (demand-only model v1): estimatedDeltaDollars=${Number(alt.estimatedDeltaDollars).toFixed(2)}.`]
        : ['Potential improvement; needs additional inputs to compute deterministic savings.']),
    ];
    recos.push({
      recommendationId: idFactory(),
      recommendationType: 'RATE_CHANGE',
      score: clamp01(0.55 + 0.25 * (alt.status === 'candidate' ? 1 : 0)),
      confidence: clamp01(0.35 + 0.35 * (alt.estimatedDeltaConfidence ?? 0)),
      because,
      requiredInputsMissing: uniq([...(alt.requiredInputsMissing || []), ...(inputs.currentRate?.rateCode ? [] : ['Current tariff/rate code required to compare rates.'])]),
      suggestedMeasure: {
        measureType: 'RATE_CHANGE' as any,
        label: `Evaluate rate alternative: ${alt.rateCode}`,
        tags: ['utility', 'rate_change'],
        parameters: {
          territory: inputs.utilityTerritory ?? null,
          currentRate: inputs.currentRate?.rateCode ?? null,
          candidateRate: alt.rateCode,
          utility: alt.utility,
        },
      },
    });
  }

  // 3) Load shifting strategy suggestion when score is material
  if (loadShift.score >= 0.45) {
    recos.push({
      recommendationId: idFactory(),
      recommendationType: 'LOAD_SHIFTING',
      score: clamp01(loadShift.score),
      confidence: clamp01(0.45 + 0.4 * loadShift.score),
      because: [
        'Load shifting appears feasible based on repeatable peak windows (deterministic heuristic v1).',
        ...loadShift.reasons.slice(0, 4),
        ...(loadShift.candidateShiftWindows.length ? [`Candidate windows: ${loadShift.candidateShiftWindows.map((w) => `${w.name}(${w.startHour}-${w.endHour})`).join(', ')}`] : []),
      ],
      requiredInputsMissing: uniq(loadShift.requiredInputsMissing || []),
      suggestedMeasure: {
        measureType: 'LOAD_SHIFTING_STRATEGY' as any,
        label: 'Evaluate load shifting opportunities',
        tags: ['utility', 'load_shifting'],
        parameters: {
          territory: inputs.utilityTerritory ?? null,
          score: loadShift.score,
        },
      },
    });
  }

  // 4) Option S evaluation suggestion when relevant
  if (optionS.status === 'relevant') {
    recos.push({
      recommendationId: idFactory(),
      recommendationType: 'OPTION_S',
      score: 0.65,
      confidence: clamp01(optionS.confidence),
      because: ['Option S / storage rider appears relevant to evaluate (v1 relevance only).', ...optionS.because],
      requiredInputsMissing: uniq(optionS.requiredInputsMissing || []),
      suggestedMeasure: {
        measureType: 'OPTION_S_EVALUATION' as any,
        label: 'Evaluate Option S / storage rider relevance',
        tags: ['utility', 'option_s', 'storage'],
        parameters: {
          territory: inputs.utilityTerritory ?? null,
          currentRate: inputs.currentRate?.rateCode ?? null,
        },
      },
    });
  } else if (optionS.status === 'unknown' && optionS.requiredInputsMissing.length) {
    recos.push({
      recommendationId: idFactory(),
      recommendationType: 'OPTION_S',
      score: 0.35,
      confidence: clamp01(optionS.confidence),
      because: ['Option S relevance cannot be determined with current inputs.', ...optionS.because],
      requiredInputsMissing: uniq(optionS.requiredInputsMissing || []),
      suggestedMeasure: {
        measureType: 'OPTION_S_EVALUATION' as any,
        label: 'Collect inputs to evaluate Option S',
        tags: ['utility', 'option_s', 'missing_inputs'],
        parameters: { territory: inputs.utilityTerritory ?? null },
      },
    });
  }

  // 5) Program/DR recommendations
  for (const pr of programRecs.slice(0, 5)) {
    recos.push(pr);
  }

  const insights: UtilityInsights = {
    inferredLoadShape: loadShape.metrics,
    ...(Number.isFinite(proven.provenPeakKw ?? NaN) ? { provenPeakKw: proven.provenPeakKw } : {}),
    ...(Number.isFinite(proven.provenMonthlyKwh ?? NaN) ? { provenMonthlyKwh: proven.provenMonthlyKwh } : {}),
    ...(annualEstimate ? { provenAnnualKwhEstimate: annualEstimate } : {}),
    ...(proven.provenTouExposureSummary ? { provenTouExposureSummary: proven.provenTouExposureSummary } : {}),
    operatingPatternInference: schedule,
    loadShiftingFeasibility: {
      score: loadShift.score,
      candidateShiftWindows: loadShift.candidateShiftWindows,
      constraintsDetected: loadShift.constraintsDetected,
    },
    weatherSensitivity: {
      available: weather.available,
      coolingSlope: weather.coolingSlope,
      heatingSlope: weather.heatingSlope,
      r2: weather.r2,
      method: 'regression_v1',
      reasons: weather.reasons,
    },
    rateFit,
    optionSRelevance: optionS,
    programs,
    ...(supplyStructure ? { supplyStructure } : {}),
    ...(billPdfTariffTruth ? { billPdfTariffTruth } : {}),
    ...(billPdfTariffLibraryMatch ? { billPdfTariffLibraryMatch } : {}),
    ...(tariffLibrary ? { tariffLibrary } : {}),
    ...(tariffApplicability ? { tariffApplicability } : {}),
    ...(determinantsPackSummary ? { determinantsPackSummary } : {}),
    ...(billSimV2 ? { billSimV2 } : {}),
    ...(billIntelligenceV1 ? { billIntelligenceV1 } : {}),
    ...(intervalIntelligenceV1 ? { intervalIntelligenceV1 } : {}),
    ...(weatherRegressionV1 ? { weatherRegressionV1 } : {}),
    ...(behaviorInsights ? { behaviorInsights } : {}),
    ...(behaviorInsightsV2 ? { behaviorInsightsV2 } : {}),
    ...(behaviorInsightsV3 ? { behaviorInsightsV3 } : {}),
    ...(loadAttribution ? { loadAttribution } : {}),
    versionTags: {
      determinantsVersionTag: String((determinantsPack as any)?.determinantsVersionTag || (determinantsPack as any)?.rulesVersionTag || 'determinants_v1'),
      touLabelerVersionTag: String((determinantsPack as any)?.touLabelerVersionTag || 'tou_v1'),
      loadAttributionVersionTag: String((loadAttribution as any)?.loadAttributionVersionTag || 'cp_v0'),
    },
    ...(missingInfo.length ? { missingInfo } : {}),
    requiredInputsMissing,
  };

  // Ensure every recommendation has requiredInputsMissing + because (non-empty)
  const recommendations = recos
    .map((r) => ({
      ...r,
      score: clamp01(r.score),
      confidence: clamp01(r.confidence),
      because: Array.isArray(r.because) && r.because.length ? r.because : ['No explanation provided (unexpected).'],
      requiredInputsMissing: Array.isArray(r.requiredInputsMissing) ? uniq(r.requiredInputsMissing) : [],
    }))
    // stable ordering
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence || normText(a.recommendationType).localeCompare(normText(b.recommendationType)));

  return { insights, recommendations };
}

