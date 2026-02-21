export { analyzeUtilityV1 as analyzeUtility } from './analyzeUtilityV1';
export type { AnalyzeUtilityDeps } from './analyzeUtilityV1';

import path from 'path';
import { existsSync } from 'fs';
import { tmpdir } from 'os';

import type { EngineWarning, UtilityInputs, UtilityInsights, UtilityRecommendation } from './types';
import { getUtilityMissingInputs } from './missingInputs';
import { analyzeLoadShape, type IntervalKwPoint as IntervalKwPoint1 } from './interval/analyzeLoadShape';
import { evaluateLoadShiftPotential } from './interval/loadShiftPotential';
import { estimateAnnualKwh } from './interval/annualize';
import { computeProvenMetricsV1 } from './interval/provenMetrics';
import { analyzeSupplyStructure } from './supply/analyzeSupplyStructure';
import { detectSupplyStructureV1 } from '../supplyStructureAnalyzerV1/detectSupplyStructureV1';
import { SupplyStructureAnalyzerReasonCodesV1 } from '../supplyStructureAnalyzerV1/reasons';
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

import { normalizeIntervalInputsV1 } from './intervalNormalizationV1/normalizeIntervalInputsV1.node';
import type { NormalizedIntervalV1 } from './intervalNormalizationV1/types';

import { getDefaultCatalogForTerritory, matchPrograms } from '../programIntelligence/matchPrograms';
import { programMatchesToRecommendations } from '../programIntelligence/toRecommendations';
import { evaluateStorageOpportunityPackV1 } from '../batteryEngineV1/evaluateBatteryOpportunityV1';
import { evaluateBatteryEconomicsV1 } from '../batteryEconomicsV1/evaluateBatteryEconomicsV1';
import { buildBatteryDecisionPackV1 } from '../batteryEconomicsV1/decisionPackV1';
import { buildBatteryDecisionPackV1_2 } from '../batteryDecisionPackV1_2/buildBatteryDecisionPackV1_2';
import type { BatteryDecisionConstraintsV1 } from '../batteryDecisionPackV1_2/types';
import type { TariffPriceSignalsV1 } from '../batteryEngineV1/types';
import { buildGenerationTouEnergySignalsV0, getCcaGenerationSnapshotV0 } from '../ccaTariffLibraryV0/getCcaGenerationSnapshotV0';
import { matchCcaFromSsaV0 } from '../ccaTariffLibraryV0/matchCcaFromSsaV0';
import { CcaTariffLibraryReasonCodesV0 } from '../ccaTariffLibraryV0/reasons';
import { getCcaAddersSnapshotV0 } from '../ccaAddersLibraryV0/getCcaAddersSnapshotV0';
import { CcaAddersLibraryReasonCodesV0 } from '../ccaAddersLibraryV0/reasons';
import { computeAddersPerKwhTotal } from '../ccaAddersLibraryV0/computeAddersPerKwhTotal';
import { getExitFeesSnapshotV0 } from '../exitFeesLibraryV0/getExitFeesSnapshotV0';

import { loadProjectForOrg } from '../project/projectRepository';
import { readIntervalData } from '../../utils/excel-reader';
import { BillTariffLibraryMatchWarningCodesV1, matchBillTariffToLibraryV1 } from '../tariffLibrary/matching/matchBillTariffToLibraryV1';
import { loadLatestGasSnapshot } from '../tariffLibraryGas/storage';
import type { AnalyzeUtilityStepNameV1, StepTraceV1 } from './stepTraceV1';

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

function exceptionName(e: unknown): string {
  if (e && typeof e === 'object' && 'name' in e) return String((e as any).name || 'Error');
  if (typeof e === 'string') return 'Error';
  return String(e === null ? 'null' : typeof e);
}

const DEFAULT_ALLOWLIST_ROOTS = [path.join(tmpdir(), 'everwatt-uploads'), path.join(process.cwd(), 'samples')];

function resolveAllowlistedPath(rawPath: string, allowRoots = DEFAULT_ALLOWLIST_ROOTS): string | null {
  const fp = String(rawPath || '').trim();
  if (!fp) return null;
  const abs = path.resolve(path.isAbsolute(fp) ? fp : path.join(process.cwd(), fp));
  for (const rootRaw of allowRoots) {
    const root = path.resolve(String(rootRaw || ''));
    if (!root) continue;
    if (abs === root) return abs;
    if (abs.startsWith(root + path.sep)) return abs;
  }
  return null;
}

function makeEphemeralIdFactory(args: { prefix: string; seed: string }): () => string {
  const prefix = String(args.prefix || 'id').trim() || 'id';
  const seed =
    String(args.seed || '')
      .trim()
      .replace(/[^0-9A-Za-z]/g, '')
      .slice(0, 24) || 'seed';
  let i = 0;
  return () => `${prefix}_${seed}_${++i}`;
}

async function tryLoadIntervalKwFromProject(inputs: UtilityInputs, warn?: (w: EngineWarning) => void): Promise<IntervalKwPoint[] | null> {
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
      const abs = resolveAllowlistedPath(fp);
      if (!abs) {
        warn?.({
          code: 'UIE_INTERVAL_FILE_PATH_REJECTED',
          module: 'utilityIntelligence/analyzeUtility',
          operation: 'tryLoadIntervalKwFromProject',
          exceptionName: 'PathNotAllowed',
          contextKey: 'intervalFilePath',
        });
      } else if (existsSync(abs)) {
        try {
          const data = readIntervalData(abs);
          const out: IntervalKwPoint[] = data
            .map((d) => ({
              timestampIso: d.timestamp instanceof Date ? d.timestamp.toISOString() : new Date(d.timestamp as any).toISOString(),
              kw: Number((d as any).demand),
              temperatureF: Number((d as any).temperatureF ?? (d as any).avgTemperature ?? (d as any).temperature),
            }))
            .filter((r) => r.timestampIso && Number.isFinite(r.kw));
          if (out.length) return out;
        } catch (e) {
          warn?.({
            code: 'UIE_INTERVAL_FILE_READ_FAILED',
            module: 'utilityIntelligence/analyzeUtility',
            operation: 'readIntervalData',
            exceptionName: exceptionName(e),
            contextKey: 'intervalFilePath',
          });
        }
      }
    }

    return null;
  } catch (e) {
    warn?.({
      code: 'UIE_INTERVAL_LOAD_FROM_PROJECT_FAILED',
      module: 'utilityIntelligence/analyzeUtility',
      operation: 'tryLoadIntervalKwFromProject',
      exceptionName: exceptionName(e),
      contextKey: 'projectTelemetry',
    });
    return null;
  }
}

async function tryLoadProjectTelemetry(inputs: UtilityInputs, warn?: (w: EngineWarning) => void): Promise<any | null> {
  try {
    if (!inputs.orgId || !inputs.projectId) return null;
    const project = await loadProjectForOrg(inputs.orgId, inputs.projectId);
    const telemetry: any = (project as any)?.telemetry || null;
    return telemetry && typeof telemetry === 'object' ? telemetry : null;
  } catch (e) {
    warn?.({
      code: 'UIE_PROJECT_TELEMETRY_LOAD_FAILED',
      module: 'utilityIntelligence/analyzeUtility',
      operation: 'tryLoadProjectTelemetry',
      exceptionName: exceptionName(e),
      contextKey: 'projectTelemetry',
    });
    return null;
  }
}

function intervalKwFromProjectTelemetry(telemetry: any, warn?: (w: EngineWarning) => void): IntervalKwPoint[] | null {
  try {
    if (!telemetry || typeof telemetry !== 'object') return null;

    const series = (telemetry as any).intervalKwSeries;
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

    const fp = String((telemetry as any).intervalFilePath || '').trim();
    if (fp) {
      const abs = resolveAllowlistedPath(fp);
      if (!abs) {
        warn?.({
          code: 'UIE_INTERVAL_FILE_PATH_REJECTED',
          module: 'utilityIntelligence/analyzeUtility',
          operation: 'intervalKwFromProjectTelemetry',
          exceptionName: 'PathNotAllowed',
          contextKey: 'intervalFilePath',
        });
      } else if (existsSync(abs)) {
        try {
          const data = readIntervalData(abs);
          const out: IntervalKwPoint[] = data
            .map((d) => ({
              timestampIso: d.timestamp instanceof Date ? d.timestamp.toISOString() : new Date(d.timestamp as any).toISOString(),
              kw: Number((d as any).demand),
              temperatureF: Number((d as any).temperatureF ?? (d as any).avgTemperature ?? (d as any).temperature),
            }))
            .filter((r) => r.timestampIso && Number.isFinite(r.kw));
          if (out.length) return out;
        } catch (e) {
          warn?.({
            code: 'UIE_INTERVAL_FILE_READ_FAILED',
            module: 'utilityIntelligence/analyzeUtility',
            operation: 'readIntervalData',
            exceptionName: exceptionName(e),
            contextKey: 'intervalFilePath',
          });
        }
      }
    }

    return null;
  } catch (e) {
    warn?.({
      code: 'UIE_INTERVAL_FROM_TELEMETRY_FAILED',
      module: 'utilityIntelligence/analyzeUtility',
      operation: 'intervalKwFromProjectTelemetry',
      exceptionName: exceptionName(e),
      contextKey: 'projectTelemetry',
    });
    return null;
  }
}

type AnalyzeUtilityDepsLegacy = {
  intervalKwSeries?: IntervalKwPoint[] | null;
  /** Canonical interval points (kWh/kW/temperatureF) from PG&E exports or other sources. */
  intervalPointsV1?: Array<{ timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number; temperatureF?: number }> | null;
  /**
   * Optional deterministic tariff price signals (TOU windows + demand charge) for battery/storage engines.
   * This must be provided by fixtures/operators; analyzeUtility does not infer or guess prices.
   */
  tariffPriceSignalsV1?: TariffPriceSignalsV1 | null;
  /** Optional tariff snapshot id/version tag for audit trail. */
  tariffSnapshotId?: string | null;
  /** Optional operator-provided deterministic economics overrides (capex/opex assumptions). */
  storageEconomicsOverridesV1?: any | null;
  /** Optional PCIA vintage key (when known) to select vintage-specific PCIA deterministically (no fetches). */
  pciaVintageKey?: string | null;
  /** Optional battery decision constraints (v1). When omitted, may be read from project.telemetry when available. */
  batteryDecisionConstraintsV1?: BatteryDecisionConstraintsV1 | null;
  weatherProvider?: WeatherProvider;
  nowIso?: string;
  idFactory?: () => string;
  /** Optional request-scoped step trace recorder (deterministic). */
  stepTraceV1?: StepTraceV1 | null;
};

/**
 * Orchestrator (v1): deterministic insights + inbox-only recommendations.
 *
 * Note: v1 is best-effort; it may accept interval series from deps (fixtures/telemetry adapters),
 * or attempt to load from project records when available.
 */
async function analyzeUtilityLegacy(inputs: UtilityInputs, deps?: AnalyzeUtilityDepsLegacy): Promise<{
  insights: UtilityInsights;
  recommendations: UtilityRecommendation[];
}> {
  const nowIso = String(deps?.nowIso || new Date().toISOString());
  const engineWarnings: EngineWarning[] = [];
  const warn = (w: EngineWarning) => engineWarnings.push(w);
  const idFactory = deps?.idFactory || makeEphemeralIdFactory({ prefix: 'utilReco', seed: nowIso });
  const stepTraceV1 = deps?.stepTraceV1 ?? null;
  const beginStep = (name: AnalyzeUtilityStepNameV1) => stepTraceV1?.beginStep(name);
  const endStep = (name: AnalyzeUtilityStepNameV1, opts?: { skipped?: boolean; reasonCode?: string }) => stepTraceV1?.endStep(name, opts);

  const depsHasIntervalKwSeries = Array.isArray(deps?.intervalKwSeries) ? deps?.intervalKwSeries : null;
  const depsHasEconomicsOverrides = deps && Object.prototype.hasOwnProperty.call(deps, 'storageEconomicsOverridesV1');
  const depsHasBatteryDecisionConstraints = deps && Object.prototype.hasOwnProperty.call(deps, 'batteryDecisionConstraintsV1');

  const intervalResolutionMinutesHint =
    inputs.intervalDataRef?.resolution === '15min'
      ? 15
      : inputs.intervalDataRef?.resolution === 'hourly'
        ? 60
        : inputs.intervalDataRef?.resolution === 'daily'
          ? 1440
          : null;

  beginStep('normalizeIntervalInputsV1');
  const normalizedFromCanonicalPoints: NormalizedIntervalV1 | null = normalizeIntervalInputsV1({
    intervalPointsV1: Array.isArray(deps?.intervalPointsV1) ? deps?.intervalPointsV1 : null,
    resolutionMinutesHint: intervalResolutionMinutesHint,
  });

  const needProjectTelemetry =
    Boolean((!normalizedFromCanonicalPoints || !normalizedFromCanonicalPoints.seriesKw.length) && !depsHasIntervalKwSeries) ||
    !depsHasEconomicsOverrides ||
    !depsHasBatteryDecisionConstraints;
  const projectTelemetry = needProjectTelemetry ? await tryLoadProjectTelemetry(inputs, warn) : null;

  const intervalKwRaw: any[] | null =
    (normalizedFromCanonicalPoints && normalizedFromCanonicalPoints.seriesKw.length
      ? normalizedFromCanonicalPoints.seriesKw.map((p) => ({ timestampIso: p.tsIso, kw: p.kw }))
      : null) ??
    (depsHasIntervalKwSeries ?? intervalKwFromProjectTelemetry(projectTelemetry, warn) ?? (projectTelemetry ? null : await tryLoadIntervalKwFromProject(inputs, warn)));

  const normalizedInterval: NormalizedIntervalV1 | null =
    normalizedFromCanonicalPoints ??
    normalizeIntervalInputsV1({
      intervalKwSeries: Array.isArray(intervalKwRaw) ? (intervalKwRaw as any) : null,
      resolutionMinutesHint: intervalResolutionMinutesHint,
    });

  const intervalKwSeries: IntervalKwPoint[] = normalizedInterval ? normalizedInterval.seriesKw.map((p) => ({ timestampIso: p.tsIso, kw: p.kw })) : [];
  endStep('normalizeIntervalInputsV1');

  const storageEconomicsOverridesV1 = depsHasEconomicsOverrides
    ? (deps as any).storageEconomicsOverridesV1 || null
    : (projectTelemetry as any)?.storageEconomicsOverridesV1 || null;

  const batteryDecisionConstraintsV1 = depsHasBatteryDecisionConstraints
    ? ((deps as any).batteryDecisionConstraintsV1 || null)
    : ((projectTelemetry as any)?.batteryDecisionConstraintsV1 || null);

  const missingGlobal = getUtilityMissingInputs(inputs);

  // Interval analytics
  const loadShape = analyzeLoadShape({ intervalKw: intervalKwSeries.length ? intervalKwSeries : undefined });
  const schedule = inferScheduleBucket({ metrics: loadShape.metrics, intervalPoints: intervalKwSeries.length || 0 });
  const loadShift = evaluateLoadShiftPotential({
    intervalKw: intervalKwSeries.length ? intervalKwSeries : undefined,
    loadShape: loadShape.metrics,
    constraints: inputs.constraints,
  });

  // Weather sensitivity (optional provider)
  const weather = await (async () => {
    try {
      return await runWeatherRegressionV1({
        inputs,
        intervalKw: intervalKwSeries.map((r) => ({ timestampIso: r.timestampIso, kw: r.kw } satisfies IntervalKwPointWithTemp)),
        provider: deps?.weatherProvider,
      });
    } catch (e) {
      warn({
        code: 'UIE_WEATHER_REGRESSION_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'runWeatherRegressionV1',
        exceptionName: exceptionName(e),
        contextKey: 'weatherRegressionV1',
      });
      return {
        available: false,
        method: 'regression_v1' as const,
        reasons: ['Weather regression failed (best-effort).'],
        requiredInputsMissing: ['Weather regression failed; see engineWarnings.'],
      };
    }
  })();

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
        : Array.isArray(intervalKwRaw)
          ? (intervalKwRaw as any[]).map((p) => ({ timestampIso: String((p as any)?.timestampIso || ''), kw: Number((p as any)?.kw), temperatureF: Number((p as any)?.temperatureF) }))
          : [];
      if (!ptsAll.length) return undefined;
      return analyzeLoadAttributionV1({
        points: ptsAll.map((p) => ({ timestampIso: String(p?.timestampIso || ''), kw: Number(p?.kw), temperatureF: Number(p?.temperatureF) })),
        minPoints: 1000,
        minTempStddevF: 3,
      });
    } catch (e) {
      warn({
        code: 'UIE_LOAD_ATTRIBUTION_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'analyzeLoadAttributionV1',
        exceptionName: exceptionName(e),
        contextKey: 'loadAttribution',
      });
      return undefined;
    }
  })();

  // Rate fit
  const rateFit = evaluateRateFit({
    inputs,
    scheduleBucket: schedule.scheduleBucket,
    loadShape: loadShape.metrics,
    intervalKw: intervalKwSeries.length ? intervalKwSeries : undefined,
  });

  // Option S relevance
  const optionS = evaluateOptionSRelevance({
    inputs,
    loadShape: loadShape.metrics,
    loadShiftScore: loadShift.score,
  });

  // Program intelligence (deterministic catalog matching)
  beginStep('programIntelligenceV1');
  const proven = computeProvenMetricsV1({ inputs, intervalKw: intervalKwSeries.length ? intervalKwSeries : null });
  const tz =
    String(proven.provenTouExposureSummary?.timezone || '').trim() ||
    (normText(inputs.utilityTerritory).includes('pge') ? 'America/Los_Angeles' : 'UTC');
  const billTou = (() => {
    try {
      return extractBillPdfTouUsageV1({ billPdfText: inputs.billPdfText || null, timezone: tz });
    } catch (e) {
      warn({
        code: 'UIE_BILL_PDF_TOU_EXTRACT_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'extractBillPdfTouUsageV1',
        exceptionName: exceptionName(e),
        contextKey: 'billPdfTou',
      });
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
      hasIntervalData: Boolean(intervalKwSeries.length),
      hasAdvancedMetering: Boolean(intervalKwSeries.length),
      intervalKw: intervalKwSeries.length ? intervalKwSeries : undefined,
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

  // Deterministic ordering for output-only (does not affect which matches are turned into recommendations above).
  const matchesSortedForOutput = matches
    .slice()
    .sort((a: any, b: any) => {
      const rank = (s: any): number => {
        const x = String(s ?? '');
        if (x === 'eligible') return 0;
        if (x === 'likely_eligible') return 1;
        if (x === 'unknown') return 2;
        return 3; // unlikely / other
      };
      const ra = rank((a as any)?.matchStatus);
      const rb = rank((b as any)?.matchStatus);
      if (ra !== rb) return ra - rb;
      const sa = Number((a as any)?.score);
      const sb = Number((b as any)?.score);
      if (Number.isFinite(sa) && Number.isFinite(sb) && sa !== sb) return sb - sa;
      return String((a as any)?.programId || '').localeCompare(String((b as any)?.programId || ''));
    });

  const programs: UtilityInsights['programs'] = {
    matches: matchesSortedForOutput as any,
    topRecommendations: programRecs.slice(0, 5),
  };
  endStep('programIntelligenceV1');

  const supplyStructure = analyzeSupplyStructure({
    inputs,
    billingRecords: inputs.billingRecords || null,
    billPdfText: inputs.billPdfText || null,
  });

  const billPdfTariffTruth = extractBillPdfTariffHintsV1(inputs.billPdfText || null);

  beginStep('supplyStructureAnalyzerV1_2');
  const ssaV1 = (() => {
    try {
      return detectSupplyStructureV1({
        billPdfText: inputs.billPdfText || null,
        billHints: {
          utilityHint: (billPdfTariffTruth as any)?.utilityHint ?? null,
          rateScheduleText: (billPdfTariffTruth as any)?.rateScheduleText ?? null,
        },
      });
    } catch (e) {
      warn({
        code: 'UIE_SUPPLY_STRUCTURE_DETECT_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'detectSupplyStructureV1',
        exceptionName: exceptionName(e),
        contextKey: 'supplyStructureAnalyzerV1',
      });
      return null;
    }
  })();
  endStep('supplyStructureAnalyzerV1_2');

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
    beginStep('intervalIntelligenceV1');
    try {
      const pts = Array.isArray(deps?.intervalPointsV1) ? (deps?.intervalPointsV1 as any[]) : null;
      if (!pts || !pts.length) {
        endStep('intervalIntelligenceV1', { skipped: true, reasonCode: 'NO_INTERVAL_POINTS_V1' });
        return undefined;
      }
      const out = analyzeIntervalIntelligenceV1({
        points: pts as any,
        timezoneHint: tz,
        topPeakEventsCount: 7,
      }).intervalIntelligenceV1;
      endStep('intervalIntelligenceV1');
      return out;
    } catch (e) {
      warn({
        code: 'UIE_INTERVAL_INTELLIGENCE_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'analyzeIntervalIntelligenceV1',
        exceptionName: exceptionName(e),
        contextKey: 'intervalIntelligenceV1',
      });
      endStep('intervalIntelligenceV1');
      return undefined;
    }
  })();

  const weatherRegressionV1 = (() => {
    beginStep('weatherRegressionV1');
    try {
      const pts = Array.isArray(deps?.intervalPointsV1) ? (deps?.intervalPointsV1 as any[]) : null;
      if (!pts || !pts.length) {
        endStep('weatherRegressionV1', { skipped: true, reasonCode: 'NO_INTERVAL_POINTS_V1' });
        return undefined;
      }
      const anyTemp = pts.some((p) => Number.isFinite(Number((p as any)?.temperatureF)));
      if (!anyTemp) {
        endStep('weatherRegressionV1', { skipped: true, reasonCode: 'NO_TEMPERATURE_IN_INTERVALS' });
        return undefined;
      }
      const daily = buildDailyUsageAndWeatherSeriesFromIntervalPointsV1({ points: pts as any, timezoneHint: tz });
      const out = regressUsageVsWeatherV1({
        usageByDay: daily.usageByDay,
        weatherByDay: daily.weatherByDay,
        hddBaseF: 65,
        cddBaseF: 65,
        minOverlapDays: 10,
        timezoneHint: tz,
      }).weatherRegressionV1;
      endStep('weatherRegressionV1');
      return out;
    } catch (e) {
      warn({
        code: 'UIE_WEATHER_REGRESSION_V1_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'regressUsageVsWeatherV1',
        exceptionName: exceptionName(e),
        contextKey: 'weatherRegressionV1',
      });
      endStep('weatherRegressionV1');
      return undefined;
    }
  })();

  beginStep('tariffMatchAndRateContext');
  const billTariffCommodity: 'electric' | 'gas' =
    String(inputs.serviceType || '').toLowerCase() === 'gas' ? 'gas' : 'electric';

  const billTariffUtilityKey =
    mapBillUtilityHintToLibraryUtility({ utilityHint: (billPdfTariffTruth as any)?.utilityHint, commodity: billTariffCommodity }) ||
    asCaIouUtility(inputs.utilityTerritory) ||
    null;

  const billTariffSnapshot =
    billTariffUtilityKey && billTariffCommodity === 'electric'
      ? await loadLatestSnapshot(billTariffUtilityKey as any).catch((e) => {
          warn({
            code: 'UIE_TARIFF_SNAPSHOT_LOAD_FAILED',
            module: 'utilityIntelligence/analyzeUtility',
            operation: 'loadLatestSnapshot',
            exceptionName: exceptionName(e),
            contextKey: 'tariffLibrarySnapshot',
          });
          return null;
        })
      : billTariffUtilityKey && billTariffCommodity === 'gas'
        ? await loadLatestGasSnapshot(billTariffUtilityKey as any).catch((e) => {
            warn({
              code: 'UIE_GAS_TARIFF_SNAPSHOT_LOAD_FAILED',
              module: 'utilityIntelligence/analyzeUtility',
              operation: 'loadLatestGasSnapshot',
              exceptionName: exceptionName(e),
              contextKey: 'tariffLibrarySnapshot',
            });
            return null;
          })
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
    } catch (e) {
      warn({
        code: 'UIE_TARIFF_LIBRARY_METADATA_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'tariffLibraryMetadata',
        exceptionName: exceptionName(e),
        contextKey: 'tariffLibrary',
      });
      return undefined;
    }
  })();

  const effectiveRateContextV1 = (() => {
    try {
      const iouUtility = String(inputs.currentRate?.utility || inputs.utilityTerritory || '').trim() || 'unknown';
      const rateCode = String(inputs.currentRate?.rateCode || '').trim() || null;
      const snapshotId = String((tariffLibrary as any)?.snapshotVersionTag || '').trim() || null;
      const providerType = ssaV1?.providerType === 'CCA' ? ('CCA' as const) : ssaV1?.providerType === 'DA' ? ('DA' as const) : null;
      const lseName = ssaV1?.providerType === 'CCA' ? (ssaV1?.lseName ?? null) : null;
      const daProviderName = ssaV1?.providerType === 'DA' ? (ssaV1?.daProviderName ?? null) : null;
      const ssaConfidence = Number.isFinite(Number(ssaV1?.confidence)) ? Number(ssaV1?.confidence) : null;
      const ssaEvidence = (ssaV1 as any)?.evidence && typeof (ssaV1 as any).evidence === 'object' ? ((ssaV1 as any).evidence as any) : null;

      const extraMissing: any[] = [];
      const extraWarnings: string[] = [];

      const dedupMissingInfoById = (items: any[]): any[] => {
        const out: any[] = [];
        const seen = new Set<string>();
        for (const it of items || []) {
          const id = String(it?.id || '').trim();
          if (!id) continue;
          const k = id.toLowerCase();
          if (seen.has(k)) continue;
          seen.add(k);
          out.push(it);
        }
        return out;
      };

      const billPeriodStartYmd = (() => {
        try {
          const bills: any[] = Array.isArray(inputs.billingRecords) ? (inputs.billingRecords as any[]) : [];
          if (bills.length) {
            const sorted = bills
              .map((b) => ({ b, t: b?.billEndDate ? new Date(b.billEndDate as any).getTime() : 0 }))
              .sort((a, b) => a.t - b.t);
            const latest: any = sorted[sorted.length - 1]?.b || null;
            const start = latest?.billStartDate ? new Date(latest.billStartDate as any) : null;
            const iso = start && Number.isFinite(start.getTime()) ? start.toISOString() : '';
            return iso ? iso.slice(0, 10) : null;
          }
          const m = Array.isArray(inputs.billingSummary?.monthly) ? (inputs.billingSummary!.monthly as any[]) : [];
          if (m.length) {
            const sorted = m
              .map((r) => ({
                start: String((r as any)?.start || '').trim(),
                end: String((r as any)?.end || '').trim(),
              }))
              .filter((r) => r.start)
              .sort((a, b) => a.end.localeCompare(b.end) || a.start.localeCompare(b.start));
            const latest = sorted[sorted.length - 1];
            const s = String(latest?.start || '').trim();
            return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
          }
          return null;
        } catch (e) {
          warn({
            code: 'UIE_BILL_PERIOD_DERIVE_FAILED',
            module: 'utilityIntelligence/analyzeUtility',
            operation: 'deriveBillPeriodStartYmd',
            exceptionName: exceptionName(e),
            contextKey: 'billPeriod',
          });
          return null;
        }
      })();

      const iouForGen = (() => {
        const u = (ssaV1 as any)?.iouUtility;
        return asCaIouUtility(u) || asCaIouUtility(inputs.currentRate?.utility ?? inputs.utilityTerritory);
      })();

      const gen = (() => {
        if (providerType !== 'CCA' || !lseName) return null;
        const m = matchCcaFromSsaV0({ lseName });
        if (!m.ok) return null;
        if (!iouForGen) return null;
        const snap = getCcaGenerationSnapshotV0({ iouUtility: iouForGen, ccaId: m.ccaId, billPeriodStartYmd: billPeriodStartYmd ?? null });
        if (!snap.ok || !snap.snapshot) return null;
        const sig = buildGenerationTouEnergySignalsV0({ snapshot: snap.snapshot, upstreamWarnings: snap.warnings });

        const pciaVintageKey = String((deps as any)?.pciaVintageKey || '').trim() || null;

        const addersLookup = getCcaAddersSnapshotV0({
          iouUtility: iouForGen,
          ccaId: m.ccaId,
          billPeriodStartYmd: billPeriodStartYmd ?? null,
        });
        const addersSnap = addersLookup.ok ? addersLookup.snapshot : null;

        const exitFeesLookup = getExitFeesSnapshotV0({
          iou: iouForGen,
          effectiveYmd: billPeriodStartYmd ?? null,
          providerType,
          pciaVintageKey,
        });
        const exitFeesSnap = exitFeesLookup.ok ? exitFeesLookup.snapshot : null;
        const nbcPerKwhTotal = exitFeesLookup.selectedCharges.nbcPerKwhTotal;
        const pciaPerKwhApplied = exitFeesLookup.selectedCharges.pciaPerKwhApplied;
        const otherExitFeesPerKwhTotal = exitFeesLookup.selectedCharges.otherExitFeesPerKwhTotal;
        const exitFeesPerKwhTotal = exitFeesLookup.selectedCharges.exitFeesPerKwhTotal;

        const addersUsed = (() => {
          if (!addersSnap) return { addersPerKwhTotal: null as number | null, warnings: [] as string[] };
          const charges: any = (addersSnap as any)?.charges || null;
          const computed = computeAddersPerKwhTotal({ snapshot: { charges }, pciaVintageKey });
          const hasExitFees = Boolean(exitFeesSnap && String((exitFeesSnap as any)?.snapshotId || '').trim());

          // If exit fees exist, treat exitFees as authoritative for NBC/PCIA; only apply non-overlapping CCA adders.
          if (hasExitFees) {
            const other = Number((charges as any)?.otherPerKwhTotal);
            const otherOk = Number.isFinite(other) ? other : 0;
            const indiff = Number((charges as any)?.indifferenceAdjustmentPerKwh);
            const indiffOk = Number.isFinite(indiff) ? indiff : 0;
            const isCompleteBundle = (addersSnap as any)?.isCompleteBundle === true;

            // v0.1 rule: default to "other only"; if explicitly flagged complete bundle, include indifference adjustment too.
            const addersNonExitFees = Math.round((otherOk + (isCompleteBundle ? indiffOk : 0)) * 1e9) / 1e9;

            const overlapDetected = Boolean(
              Number.isFinite(Number((charges as any)?.nbcPerKwhTotal)) ||
                Number.isFinite(Number((charges as any)?.pciaPerKwhDefault)) ||
                ((charges as any)?.pciaPerKwhByVintageKey && typeof (charges as any).pciaPerKwhByVintageKey === 'object' && Object.keys((charges as any).pciaPerKwhByVintageKey).length) ||
                (Array.isArray((addersSnap as any)?.addersBreakdown) &&
                  (addersSnap as any).addersBreakdown.some((it: any) => String(it?.id || '').toLowerCase().includes('pcia') || String(it?.id || '').toLowerCase().includes('nbc'))),
            );

            const warnings = [
              ...(computed.warnings || []),
              ...(overlapDetected ? (['generation.v1.adders_overlap_deduped'] as string[]) : []),
            ];

            return { addersPerKwhTotal: addersNonExitFees, warnings };
          }

          return { addersPerKwhTotal: computed.addersPerKwhTotal, warnings: computed.warnings || [] };
        })();

        const generationAllInTouEnergyPrices =
          addersUsed.addersPerKwhTotal !== null
            ? (sig.generationTouEnergyPrices || []).map((w) => ({
                periodId: String((w as any)?.periodId || '').trim(),
                startHourLocal: Number((w as any)?.startHourLocal),
                endHourLocalExclusive: Number((w as any)?.endHourLocalExclusive),
                days: (w as any)?.days === 'weekday' || (w as any)?.days === 'weekend' ? (w as any).days : 'all',
                pricePerKwh: Math.round((Number((w as any)?.pricePerKwh) + Number(addersUsed.addersPerKwhTotal || 0)) * 1e9) / 1e9,
              }))
            : null;

        const generationAllInWithExitFeesTouPrices =
          exitFeesPerKwhTotal !== null && generationAllInTouEnergyPrices && generationAllInTouEnergyPrices.length
            ? generationAllInTouEnergyPrices.map((w) => ({
                periodId: String((w as any)?.periodId || '').trim(),
                startHourLocal: Number((w as any)?.startHourLocal),
                endHourLocalExclusive: Number((w as any)?.endHourLocalExclusive),
                days: (w as any)?.days === 'weekday' || (w as any)?.days === 'weekend' ? (w as any).days : 'all',
                pricePerKwh: Math.round((Number((w as any)?.pricePerKwh) + exitFeesPerKwhTotal) * 1e9) / 1e9,
              }))
            : null;

        const warnings = (() => {
          const base = [
            ...(sig.warnings || []),
            ...(addersLookup.warnings || []),
            ...(addersUsed.warnings || []),
            ...(exitFeesLookup.warnings || []),
          ];
          if (addersUsed.addersPerKwhTotal !== null && generationAllInTouEnergyPrices && generationAllInTouEnergyPrices.length) return base;
          return [CcaTariffLibraryReasonCodesV0.CCA_V0_ENERGY_ONLY_NO_EXIT_FEES, ...base, CcaAddersLibraryReasonCodesV0.CCA_ADDERS_V0_MISSING];
        })();

        return {
          generation: {
            providerType,
            lseName,
            daProviderName: null,
            confidence: ssaConfidence,
            evidence: ssaEvidence,
            rateCode: sig.generationRateCode,
            snapshotId: sig.generationSnapshotId,
            generationTouEnergyPrices: sig.generationTouEnergyPrices,
            generationEnergyTouPrices: sig.generationTouEnergyPrices,
            generationAddersPerKwhTotal: addersUsed.addersPerKwhTotal,
            generationAddersSnapshotId: addersSnap ? String((addersSnap as any)?.snapshotId || '').trim() || null : null,
            generationAddersAcquisitionMethodUsed: addersSnap ? (String((addersSnap as any)?.acquisitionMethodUsed || '').trim() === 'MANUAL_SEED_V0' ? 'MANUAL_SEED_V0' : null) : null,
            generationAllInTouEnergyPrices: generationAllInTouEnergyPrices,
            exitFeesSnapshotId: exitFeesSnap ? String((exitFeesSnap as any)?.snapshotId || '').trim() || null : null,
            nbcPerKwhTotal,
            pciaPerKwhApplied,
            otherExitFeesPerKwhTotal,
            generationAllInWithExitFeesTouPrices,
            exitFeesWarnings: exitFeesLookup.warnings || [],
          },
          warnings,
        };
      })();

      // Exit fees warnings-first: if supply is CCA/DA and IOU is known, surface selector warnings even when generation rates are missing.
      if ((providerType === 'DA' || providerType === 'CCA') && iouForGen && (providerType === 'DA' || !gen)) {
        const pciaVintageKey = String((deps as any)?.pciaVintageKey || '').trim() || null;
        const exitFeesLookup = getExitFeesSnapshotV0({
          iou: iouForGen,
          effectiveYmd: billPeriodStartYmd ?? null,
          providerType: providerType as any,
          pciaVintageKey,
        });
        extraWarnings.push(...(exitFeesLookup.warnings || []));
      }

      if (providerType === 'DA') {
        extraWarnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_DA_DETECTED_GENERATION_RATES_MISSING);
        extraMissing.push({
          id: SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_DA_DETECTED_GENERATION_RATES_MISSING,
          category: 'tariff',
          severity: 'warning',
          description: 'Direct Access (DA) supply detected, but generation tariff/rates are not yet available in this repository; using IOU delivery context only.',
        });
      }

      if (providerType === 'DA' && ssaConfidence !== null && ssaConfidence < 0.95) {
        extraWarnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LOW_CONFIDENCE);
        extraMissing.push({
          id: SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LOW_CONFIDENCE,
          category: 'tariff',
          severity: 'warning',
          description: `Supply provider detection confidence is below threshold (confidence=${ssaConfidence.toFixed(3)} < 0.95).`,
        });
      }

      // If CCA is detected but generation rates are missing, surface missingInfo deterministically.
      if (providerType === 'CCA' && lseName && !gen) {
        extraWarnings.push(SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_SUPPORTED_BUT_GENERATION_RATES_MISSING);
        extraMissing.push({
          id: SupplyStructureAnalyzerReasonCodesV1.SUPPLY_V1_LSE_SUPPORTED_BUT_GENERATION_RATES_MISSING,
          category: 'tariff',
          severity: 'warning',
          description: 'CCA detected, but generation tariff/rates are not available in this repository; using IOU delivery context only.',
        });
      }

      return {
        iou: { utility: iouUtility, rateCode, snapshotId },
        generation: gen
          ? (gen.generation as any)
          : (() => {
              const baseGen: any = {
                providerType,
                lseName,
                daProviderName,
                confidence: ssaConfidence,
                evidence: ssaEvidence,
                rateCode: null,
                snapshotId: null,
              };
              // v0: even when DA generation rates are missing, attach deterministic exit fees when possible.
              if ((providerType === 'DA' || providerType === 'CCA') && iouForGen) {
                const pciaVintageKey = String((deps as any)?.pciaVintageKey || '').trim() || null;
                const exitFeesLookup = getExitFeesSnapshotV0({
                  iou: iouForGen,
                  effectiveYmd: billPeriodStartYmd ?? null,
                  providerType: providerType as any,
                  pciaVintageKey,
                });
                const exitFeesSnap = exitFeesLookup.ok ? exitFeesLookup.snapshot : null;
                baseGen.exitFeesSnapshotId = exitFeesSnap ? String((exitFeesSnap as any)?.snapshotId || '').trim() || null : null;
                baseGen.nbcPerKwhTotal = exitFeesLookup.selectedCharges.nbcPerKwhTotal;
                baseGen.pciaPerKwhApplied = exitFeesLookup.selectedCharges.pciaPerKwhApplied;
                baseGen.otherExitFeesPerKwhTotal = exitFeesLookup.selectedCharges.otherExitFeesPerKwhTotal;
                baseGen.exitFeesWarnings = exitFeesLookup.warnings || [];
              }
              return baseGen;
            })(),
        method: 'ssa_v1' as const,
        warnings: Array.from(
          new Set([...(Array.isArray(ssaV1?.warnings) ? ssaV1!.warnings : []), ...extraWarnings, ...(gen ? gen.warnings : [])]),
        ).sort((a, b) => a.localeCompare(b)),
        missingInfo: dedupMissingInfoById([...(Array.isArray(ssaV1?.missingInfo) ? ssaV1!.missingInfo : []), ...extraMissing]).sort(
          (a: any, b: any) => String(a?.id || '').localeCompare(String(b?.id || '')),
        ),
      };
    } catch (e) {
      warn({
        code: 'UIE_EFFECTIVE_RATE_CONTEXT_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'effectiveRateContextV1',
        exceptionName: exceptionName(e),
        contextKey: 'effectiveRateContextV1',
      });
      return undefined;
    }
  })();

  const composedTariffPriceSignalsV1: TariffPriceSignalsV1 | null = (() => {
    try {
      const base = (deps?.tariffPriceSignalsV1 as any) || null;
      if (!base || typeof base !== 'object') return null;
      const gen = (effectiveRateContextV1 as any)?.generation || null;
      const genWins = Array.isArray(gen?.generationTouEnergyPrices) ? (gen.generationTouEnergyPrices as any[]) : [];
      const merged: any = {
        ...(base as any),
        // Always carry supply context for downstream engines (even when generation rates are missing).
        supplyProviderType: gen?.providerType === 'CCA' || gen?.providerType === 'DA' ? gen.providerType : null,
        supplyLseName: String(gen?.lseName || '').trim() || null,
        generationSnapshotId: String(gen?.snapshotId || '').trim() || null,
        generationRateCode: String(gen?.rateCode || '').trim() || null,
        // Generation price windows are additive when present; otherwise downstream engines can emit "fallback used" warnings.
        generationTouEnergyPrices: genWins.length ? genWins : ((base as any)?.generationTouEnergyPrices ?? null),
        generationAllInTouEnergyPrices: Array.isArray(gen?.generationAllInTouEnergyPrices)
          ? ((gen.generationAllInTouEnergyPrices as any[]) || [])
          : ((base as any)?.generationAllInTouEnergyPrices ?? null),
        generationAllInWithExitFeesTouPrices: Array.isArray(gen?.generationAllInWithExitFeesTouPrices)
          ? ((gen.generationAllInWithExitFeesTouPrices as any[]) || [])
          : ((base as any)?.generationAllInWithExitFeesTouPrices ?? null),
        generationAddersPerKwhTotal: Number.isFinite(Number((gen as any)?.generationAddersPerKwhTotal)) ? Number((gen as any).generationAddersPerKwhTotal) : null,
        generationAddersSnapshotId: String((gen as any)?.generationAddersSnapshotId || '').trim() || null,
        exitFeesSnapshotId: String((gen as any)?.exitFeesSnapshotId || '').trim() || null,
        nbcPerKwhTotal: Number.isFinite(Number((gen as any)?.nbcPerKwhTotal)) ? Number((gen as any).nbcPerKwhTotal) : null,
        pciaPerKwhApplied: Number.isFinite(Number((gen as any)?.pciaPerKwhApplied)) ? Number((gen as any).pciaPerKwhApplied) : null,
        otherExitFeesPerKwhTotal: Number.isFinite(Number((gen as any)?.otherExitFeesPerKwhTotal)) ? Number((gen as any).otherExitFeesPerKwhTotal) : null,
        exitFeesPerKwhTotal:
          Number.isFinite(Number((gen as any)?.nbcPerKwhTotal)) &&
          Number.isFinite(Number((gen as any)?.pciaPerKwhApplied)) &&
          Number.isFinite(Number((gen as any)?.otherExitFeesPerKwhTotal))
            ? Number((gen as any).nbcPerKwhTotal) + Number((gen as any).pciaPerKwhApplied) + Number((gen as any).otherExitFeesPerKwhTotal)
            : null,
      };
      return merged as any;
    } catch (e) {
      warn({
        code: 'UIE_TARIFF_PRICE_SIGNALS_COMPOSE_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'composeTariffPriceSignalsV1',
        exceptionName: exceptionName(e),
        contextKey: 'tariffPriceSignalsV1',
      });
      return (deps?.tariffPriceSignalsV1 as any) || null;
    }
  })();
  endStep('tariffMatchAndRateContext');

  beginStep('determinantsPackV1');
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
        intervalKwSeries: intervalKwSeries,
        intervalResolutionMinutes: intervalResolutionMinutes ?? undefined,
      });
    } catch (e) {
      warn({
        code: 'UIE_TARIFF_APPLICABILITY_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'evaluateTariffApplicabilityV1',
        exceptionName: exceptionName(e),
        contextKey: 'tariffApplicability',
      });
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
        intervalSeries: canonicalPoints || intervalKwRaw
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
                  : intervalKwSeries,
                intervalMinutes: canonicalPoints ? undefined : (intervalMinutes ?? undefined),
                timezone: tz,
                source: canonicalPoints ? 'workflow:intervalPointsV1' : 'utilityIntelligence:intervalKwSeries',
              },
            ]
          : null,
      });
    } catch (e) {
      warn({
        code: 'UIE_DETERMINANTS_PACK_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'buildDeterminantsPackV1',
        exceptionName: exceptionName(e),
        contextKey: 'determinantsPack',
      });
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
    } catch (e) {
      warn({
        code: 'UIE_DETERMINANTS_PACK_SUMMARY_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'determinantsPackSummary',
        exceptionName: exceptionName(e),
        contextKey: 'determinantsPackSummary',
      });
      return undefined;
    }
  })();
  {
    const hasRateCode = Boolean(String(inputs.currentRate?.rateCode || '').trim());
    if (!hasRateCode) endStep('determinantsPackV1', { skipped: true, reasonCode: 'NO_CURRENT_RATE_CODE' });
    else endStep('determinantsPackV1');
  }

  // Storage Opportunity Pack v1 (battery + dispatch + DR readiness): always attach (warnings-first).
  beginStep('batteryOpportunityPackV1');
  const storageOpportunityPackV1 = (() => {
    try {
      const det0: any = (determinantsPackSummary as any)?.meters?.[0]?.last12Cycles?.[0] || null;
      const determinantsV1 = det0
        ? {
            billingDemandKw: Number.isFinite(Number(det0?.billingDemandKw)) ? Number(det0.billingDemandKw) : null,
            ratchetDemandKw: Number.isFinite(Number(det0?.ratchetDemandKw)) ? Number(det0.ratchetDemandKw) : null,
            billingDemandMethod: String(det0?.billingDemandMethod || '').trim() || null,
          }
        : null;

      return evaluateStorageOpportunityPackV1({
        intervalInsightsV1: (intervalIntelligenceV1 as any) || null,
        intervalPointsV1: Array.isArray(deps?.intervalPointsV1) ? (deps?.intervalPointsV1 as any) : null,
        // Tariff price signals are not inferred here (no guessing); fixture tests can supply them directly to the engine.
        tariffPriceSignalsV1: (composedTariffPriceSignalsV1 as any) || null,
        determinantsV1,
        storageEconomicsOverridesV1,
        customerType: String((inputs as any)?.customerType || '').trim() || null,
        config: {
          rte: 0.9,
          maxCyclesPerDay: 1,
          dispatchDaysPerYear: 260,
          demandWindowStrategy: 'WINDOW_AROUND_DAILY_PEAK_V1',
        },
      });
    } catch (e) {
      warn({
        code: 'UIE_STORAGE_OPPORTUNITY_PACK_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'evaluateStorageOpportunityPackV1',
        exceptionName: exceptionName(e),
        contextKey: 'storageOpportunityPackV1',
      });
      // Last-resort deterministic fallback (do not throw from analyzeUtility).
      return evaluateStorageOpportunityPackV1({
        intervalInsightsV1: null,
        intervalPointsV1: null,
        tariffPriceSignalsV1: null,
        determinantsV1: null,
      });
    }
  })();
  endStep('batteryOpportunityPackV1');

  // Battery Economics v1: always attach (warnings-first). No tariff/cost guessing in analyzeUtility.
  const batteryEconomicsV1 = (() => {
    try {
      const cfg0: any = (storageOpportunityPackV1 as any)?.batteryOpportunityV1?.recommendedBatteryConfigs?.[0] || null;
      const hy: any =
        (storageOpportunityPackV1 as any)?.dispatchSimulationV1?.strategyResults?.find((r: any) => String(r?.strategyId || '') === 'HYBRID_V1') ||
        (storageOpportunityPackV1 as any)?.dispatchSimulationV1?.strategyResults?.[0] ||
        null;
      const peakReductionMin = hy?.estimatedPeakKwReduction && typeof hy.estimatedPeakKwReduction === 'object' ? Number((hy.estimatedPeakKwReduction as any).min) : null;
      const shiftedKwhAnnual = hy?.estimatedShiftedKwhAnnual && typeof hy.estimatedShiftedKwhAnnual === 'object' ? Number((hy.estimatedShiftedKwhAnnual as any).value) : null;

      const det0: any = (determinantsPackSummary as any)?.meters?.[0]?.last12Cycles?.[0] || null;

      return evaluateBatteryEconomicsV1({
        battery: cfg0
          ? {
              powerKw: Number(cfg0?.powerKw),
              energyKwh: Number(cfg0?.energyKwh),
              roundTripEff: Number(cfg0?.rte),
              usableFraction: null,
              degradationPctYr: null,
            }
          : null,
        costs: null,
        tariffs: null,
        determinants: det0
          ? {
              ratchetDemandKw: Number.isFinite(Number(det0?.ratchetDemandKw)) ? Number(det0.ratchetDemandKw) : null,
              billingDemandKw: Number.isFinite(Number(det0?.billingDemandKw)) ? Number(det0.billingDemandKw) : null,
              billingDemandMethod: String(det0?.billingDemandMethod || '').trim() || null,
              ratchetHistoryMaxKw: Number.isFinite(Number(det0?.ratchetHistoryMaxKw)) ? Number(det0.ratchetHistoryMaxKw) : null,
              ratchetFloorPct: Number.isFinite(Number(det0?.ratchetFloorPct)) ? Number(det0.ratchetFloorPct) : null,
            }
          : null,
        dispatch: {
          shiftedKwhAnnual: Number.isFinite(shiftedKwhAnnual) ? shiftedKwhAnnual : null,
          peakReductionKwAssumed: Number.isFinite(peakReductionMin) ? peakReductionMin : null,
        },
        dr: null,
        finance: null,
      });
    } catch (e) {
      warn({
        code: 'UIE_BATTERY_ECONOMICS_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'evaluateBatteryEconomicsV1',
        exceptionName: exceptionName(e),
        contextKey: 'batteryEconomicsV1',
      });
      return evaluateBatteryEconomicsV1(null);
    }
  })();

  // Battery Decision Pack v1 (sizing search + deterministic economics): always attach (warnings-first).
  const batteryDecisionPackV1 = (() => {
    try {
      const det0: any = (determinantsPackSummary as any)?.meters?.[0]?.last12Cycles?.[0] || null;
      const determinantsV1 = det0
        ? {
            billingDemandKw: Number.isFinite(Number(det0?.billingDemandKw)) ? Number(det0.billingDemandKw) : null,
            ratchetDemandKw: Number.isFinite(Number(det0?.ratchetDemandKw)) ? Number(det0.ratchetDemandKw) : null,
            billingDemandMethod: String(det0?.billingDemandMethod || '').trim() || null,
            ratchetHistoryMaxKw: Number.isFinite(Number(det0?.ratchetHistoryMaxKw)) ? Number(det0.ratchetHistoryMaxKw) : null,
            ratchetFloorPct: Number.isFinite(Number(det0?.ratchetFloorPct)) ? Number(det0.ratchetFloorPct) : null,
          }
        : null;

      return buildBatteryDecisionPackV1({
        intervalPointsV1: Array.isArray(deps?.intervalPointsV1) ? (deps?.intervalPointsV1 as any) : null,
        intervalInsightsV1: (intervalIntelligenceV1 as any) || null,
        tariffPriceSignalsV1: (composedTariffPriceSignalsV1 as any) || null,
        tariffSnapshotId: String(deps?.tariffSnapshotId || '').trim() || null,
        determinantsV1,
        drReadinessV1: (storageOpportunityPackV1 as any)?.drReadinessV1 || null,
        drAnnualValueUsd: null,
        costs: null,
        finance: null,
        versionTags: {
          determinantsVersionTag: String((determinantsPack as any)?.determinantsVersionTag || (determinantsPack as any)?.rulesVersionTag || 'determinants_v1'),
          touLabelerVersionTag: String((determinantsPack as any)?.touLabelerVersionTag || 'tou_v1'),
        },
      });
    } catch (e) {
      warn({
        code: 'UIE_BATTERY_DECISION_PACK_V1_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'buildBatteryDecisionPackV1',
        exceptionName: exceptionName(e),
        contextKey: 'batteryDecisionPackV1',
      });
      return buildBatteryDecisionPackV1({
        intervalPointsV1: null,
        intervalInsightsV1: null,
        tariffPriceSignalsV1: null,
        tariffSnapshotId: null,
        determinantsV1: null,
        drReadinessV1: null,
        drAnnualValueUsd: null,
        costs: null,
        finance: null,
        versionTags: null,
      });
    }
  })();

  // Battery Decision Pack v1.2 (decision-quality: constraints + sensitivity + deterministic narrative): always attach (warnings-first).
  beginStep('batteryDecisionPackV1_2');
  const batteryDecisionPackV1_2 = (() => {
    try {
      const det0: any = (determinantsPackSummary as any)?.meters?.[0]?.last12Cycles?.[0] || null;
      const determinantsV1 = det0
        ? {
            billingDemandKw: Number.isFinite(Number(det0?.billingDemandKw)) ? Number(det0.billingDemandKw) : null,
            ratchetDemandKw: Number.isFinite(Number(det0?.ratchetDemandKw)) ? Number(det0.ratchetDemandKw) : null,
            billingDemandMethod: String(det0?.billingDemandMethod || '').trim() || null,
            ratchetHistoryMaxKw: Number.isFinite(Number(det0?.ratchetHistoryMaxKw)) ? Number(det0.ratchetHistoryMaxKw) : null,
            ratchetFloorPct: Number.isFinite(Number(det0?.ratchetFloorPct)) ? Number(det0.ratchetFloorPct) : null,
          }
        : null;

      const detCycles =
        Array.isArray((determinantsPackSummary as any)?.meters?.[0]?.last12Cycles) && (determinantsPackSummary as any).meters[0].last12Cycles.length
          ? ((determinantsPackSummary as any).meters[0].last12Cycles as any[]).map((c: any) => ({
              cycleLabel: String(c?.cycleLabel || '').trim() || 'cycle',
              startIso: String(c?.startIso || '').trim(),
              endIso: String(c?.endIso || '').trim(),
            }))
          : null;

      return buildBatteryDecisionPackV1_2({
        utility: asCaIouUtility(inputs.currentRate?.utility ?? inputs.utilityTerritory) || String(inputs.currentRate?.utility || inputs.utilityTerritory || '').trim() || null,
        rate: String(inputs.currentRate?.rateCode || '').trim() || null,
        intervalPointsV1: Array.isArray(deps?.intervalPointsV1) ? (deps?.intervalPointsV1 as any) : null,
        intervalInsightsV1: (intervalIntelligenceV1 as any) || null,
        tariffPriceSignalsV1: (composedTariffPriceSignalsV1 as any) || null,
        tariffSnapshotId: String(deps?.tariffSnapshotId || '').trim() || null,
        determinantsV1,
        determinantsCycles: detCycles,
        drReadinessV1: (storageOpportunityPackV1 as any)?.drReadinessV1 || null,
        drAnnualValueUsd: null,
        batteryDecisionConstraintsV1: (batteryDecisionConstraintsV1 as any) || null,
      });
    } catch (e) {
      warn({
        code: 'UIE_BATTERY_DECISION_PACK_V1_2_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'buildBatteryDecisionPackV1_2',
        exceptionName: exceptionName(e),
        contextKey: 'batteryDecisionPackV1_2',
      });
      return buildBatteryDecisionPackV1_2({
        utility: null,
        rate: null,
        intervalPointsV1: null,
        intervalInsightsV1: null,
        tariffPriceSignalsV1: null,
        tariffSnapshotId: null,
        determinantsV1: null,
        determinantsCycles: null,
        drReadinessV1: null,
        drAnnualValueUsd: null,
        batteryDecisionConstraintsV1: null,
      });
    }
  })();
  endStep('batteryDecisionPackV1_2');

  const behaviorInsights = (() => {
    try {
      return computeBehaviorInsights({
        billingRecords: inputs.billingRecords || null,
        determinantsPack,
        intervalPointsV1: Array.isArray(deps?.intervalPointsV1) ? deps?.intervalPointsV1 : null,
        loadAttribution: loadAttribution || null,
      });
    } catch (e) {
      warn({
        code: 'UIE_BEHAVIOR_INSIGHTS_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'computeBehaviorInsights',
        exceptionName: exceptionName(e),
        contextKey: 'behaviorInsights',
      });
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
    } catch (e) {
      warn({
        code: 'UIE_BEHAVIOR_INSIGHTS_V2_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'computeBehaviorInsightsV2',
        exceptionName: exceptionName(e),
        contextKey: 'behaviorInsightsV2',
      });
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
    } catch (e) {
      warn({
        code: 'UIE_BEHAVIOR_INSIGHTS_V3_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'computeBehaviorInsightsV3',
        exceptionName: exceptionName(e),
        contextKey: 'behaviorInsightsV3',
      });
      return undefined;
    }
  })();

  const billSimV2 = (() => {
    try {
      if (!determinantsPack) return undefined;
      const md = (tariffLibrary as any)?.rateMetadata || null;
      return simulateBillSimV2({ determinantsPack, tariffMetadata: md });
    } catch (e) {
      warn({
        code: 'UIE_BILL_SIM_V2_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'simulateBillSimV2',
        exceptionName: exceptionName(e),
        contextKey: 'billSimV2',
      });
      return undefined;
    }
  })();

  beginStep('missingInfoAssembly');
  const missingInfo: MissingInfoItemV0[] = (() => {
    const sortMissingInfo = (a: any, b: any): number => {
      const sevRank = (s: any): number => {
        const x = String(s ?? '').toLowerCase();
        if (x === 'blocking') return 0;
        if (x === 'warning') return 1;
        return 2;
      };
      const ra = sevRank(a?.severity);
      const rb = sevRank(b?.severity);
      if (ra !== rb) return ra - rb;
      const ida = String(a?.id ?? '');
      const idb = String(b?.id ?? '');
      if (ida !== idb) return ida.localeCompare(idb);
      return String(a?.description ?? '').localeCompare(String(b?.description ?? ''));
    };

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

    const hasIntervals = Boolean((deps?.intervalPointsV1 && deps.intervalPointsV1.length) || intervalKwSeries.length);
    if (!hasIntervals) {
      items.push({
        id: 'interval.intervalElectricV1.missing',
        category: 'billing',
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
    if ((deps?.intervalPointsV1 && deps.intervalPointsV1.length) || (Array.isArray(intervalKwRaw) && intervalKwRaw.length)) {
      const anyTemp = (Array.isArray(deps?.intervalPointsV1) ? deps?.intervalPointsV1 : (intervalKwRaw as any[])).some((p: any) =>
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

    // Supply Structure Analyzer v1 missingInfo (additive)
    if (effectiveRateContextV1 && Array.isArray((effectiveRateContextV1 as any).missingInfo) && (effectiveRateContextV1 as any).missingInfo.length) {
      const seen = new Set(items.map((x) => String(x.id || '')));
      for (const it of (effectiveRateContextV1 as any).missingInfo) {
        const id = String((it as any)?.id || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push(it as any);
      }
    }

    // Deterministic ordering to reduce snapshot noise (content is unchanged).
    return items.slice().sort(sortMissingInfo);
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
  endStep('missingInfoAssembly');

  // Recommendations: inbox-only suggestions (do not auto-apply).
  beginStep('recommendationsAssembly');
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
    ...(engineWarnings.length ? { engineWarnings } : {}),
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
    ...(effectiveRateContextV1 ? { effectiveRateContextV1 } : {}),
    ...(billPdfTariffTruth ? { billPdfTariffTruth } : {}),
    ...(billPdfTariffLibraryMatch ? { billPdfTariffLibraryMatch } : {}),
    ...(tariffLibrary ? { tariffLibrary } : {}),
    ...(tariffApplicability ? { tariffApplicability } : {}),
    ...(determinantsPackSummary ? { determinantsPackSummary } : {}),
    ...(billSimV2 ? { billSimV2 } : {}),
    ...(billIntelligenceV1 ? { billIntelligenceV1 } : {}),
    ...(intervalIntelligenceV1 ? { intervalIntelligenceV1 } : {}),
    storageOpportunityPackV1,
    batteryEconomicsV1,
    batteryDecisionPackV1,
    batteryDecisionPackV1_2,
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
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.confidence - a.confidence ||
        normText(a.recommendationType).localeCompare(normText(b.recommendationType)) ||
        String(a.recommendationId || '').localeCompare(String(b.recommendationId || '')),
    );
  endStep('recommendationsAssembly');

  return { insights, recommendations };
}

