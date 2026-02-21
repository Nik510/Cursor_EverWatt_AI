import path from 'path';
import { existsSync } from 'fs';
import { tmpdir } from 'os';

import type { EngineWarning, UtilityInputs, UtilityInsights, UtilityRecommendation } from '../types';
import { getUtilityMissingInputs } from '../missingInputs';
import { analyzeLoadShape, type IntervalKwPoint as IntervalKwPoint1 } from '../interval/analyzeLoadShape';
import { evaluateLoadShiftPotential } from '../interval/loadShiftPotential';
import { estimateAnnualKwh } from '../interval/annualize';
import { computeProvenMetricsV1 } from '../interval/provenMetrics';
import { analyzeSupplyStructure } from '../supply/analyzeSupplyStructure';
import { detectSupplyStructureV1 } from '../../supplyStructureAnalyzerV1/detectSupplyStructureV1';
import { SupplyStructureAnalyzerReasonCodesV1 } from '../../supplyStructureAnalyzerV1/reasons';
import { extractBillPdfTariffHintsV1 } from '../billPdf/extractBillPdfTariffHintsV1';
import { extractBillPdfTouUsageV1 } from '../billPdf/extractBillPdfTouUsageV1';
import { analyzeBillIntelligenceV1 } from '../billPdf/analyzeBillIntelligenceV1';
import { analyzeBillIntelligenceIntervalInsightsV1 } from '../billIntelligence/intervalInsightsV1';
import { analyzeBillIntelligenceWeatherCorrelationV1 } from '../billIntelligence/weatherCorrelationV1';
import { analyzeIntervalIntelligenceV1 } from '../intervalIntelligenceV1/analyzeIntervalIntelligenceV1';
import { buildDailyUsageAndWeatherSeriesFromIntervalPointsV1, regressUsageVsWeatherV1 } from '../weatherRegressionV1/regressUsageVsWeatherV1';
import type { MissingInfoItemV0 } from '../missingInfo/types';
import { runWeatherRegressionV1, type IntervalKwPointWithTemp } from '../weather/regression';
import type { WeatherProvider } from '../weather/provider';
import { evaluateRateFit, type IntervalKwPoint as IntervalKwPoint2 } from '../rates/evaluateRateFit';
import { evaluateOptionSRelevance } from '../storage/evaluateOptionS';
import { isSnapshotStale } from '../../tariffLibrary';
import { loadLatestSnapshot } from '../../tariffLibrary/storage';
import { evaluateTariffApplicabilityV1 } from '../../tariffApplicability/evaluateTariffApplicability';
import { buildDeterminantsPackV1 } from '../../determinants/buildDeterminantsPack';
import { simulateBillSimV2 } from '../../billingEngineV2/simulateBillV2';
import { applyTariffBusinessCanonV1 } from '../../tariffLibrary/businessCanonV1';
import { applyTariffEffectiveStatusV1 } from '../../tariffLibrary/effectiveStatusV1';
import { applyTariffReadinessVNext } from '../../tariffLibrary/readinessVNext';
import { applyTariffSegmentV1 } from '../../tariffLibrary/segmentV1';
import { analyzeLoadAttributionV1 } from '../../loadAttribution/analyzeLoadAttribution';
import { computeBehaviorInsights } from '../behavior/computeBehaviorInsights';
import { computeBehaviorInsightsV2 } from '../behaviorV2/computeBehaviorInsightsV2';
import { computeBehaviorInsightsV3 } from '../behaviorV3/computeBehaviorInsightsV3';

import { normalizeIntervalInputsV1 } from '../intervalNormalizationV1/normalizeIntervalInputsV1.node';
import type { NormalizedIntervalV1 } from '../intervalNormalizationV1/types';

import { getDefaultCatalogForTerritory, matchPrograms } from '../../programIntelligence/matchPrograms';
import { programMatchesToRecommendations } from '../../programIntelligence/toRecommendations';
import type { BatteryDecisionConstraintsV1 } from '../../batteryDecisionPackV1_2/types';
import type { TariffPriceSignalsV1 } from '../../batteryEngineV1/types';
import { buildGenerationTouEnergySignalsV0, getCcaGenerationSnapshotV0 } from '../../ccaTariffLibraryV0/getCcaGenerationSnapshotV0';
import { matchCcaFromSsaV0 } from '../../ccaTariffLibraryV0/matchCcaFromSsaV0';
import { CcaTariffLibraryReasonCodesV0 } from '../../ccaTariffLibraryV0/reasons';
import { getCcaAddersSnapshotV0 } from '../../ccaAddersLibraryV0/getCcaAddersSnapshotV0';
import { CcaAddersLibraryReasonCodesV0 } from '../../ccaAddersLibraryV0/reasons';
import { computeAddersPerKwhTotal } from '../../ccaAddersLibraryV0/computeAddersPerKwhTotal';
import { getExitFeesSnapshotV0 } from '../../exitFeesLibraryV0/getExitFeesSnapshotV0';

import { loadProjectForOrg } from '../../project/projectRepository';
import { readIntervalData } from '../../../utils/excel-reader';
import { BillTariffLibraryMatchWarningCodesV1, matchBillTariffToLibraryV1 } from '../../tariffLibrary/matching/matchBillTariffToLibraryV1';
import { loadLatestGasSnapshot } from '../../tariffLibraryGas/storage';
import type { AnalyzeUtilityStepNameV1, StepTraceV1 } from '../stepTraceV1';

import type { NormalizedInputsV1 } from './types';
import { stepNormalize } from './steps/stepNormalize';
import { stepSupplyStructure } from './steps/stepSupplyStructure';
import { stepTariffRateContext } from './steps/stepTariffRateContext';
import { stepDeterminants } from './steps/stepDeterminants';
import { stepIntervalIntelligence } from './steps/stepIntervalIntelligence';
import { stepWeatherRegression } from './steps/stepWeatherRegression';
import { stepProgramIntelligence } from './steps/stepProgramIntelligence';
import { stepBatteryOpportunity } from './steps/stepBatteryOpportunity';
import { stepBatteryDecision } from './steps/stepBatteryDecision';
import { stepRecommendationsAssembly } from './steps/stepRecommendationsAssembly';
import { stepMissingInfoAssembly } from './steps/stepMissingInfoAssembly';

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

export type AnalyzeUtilityDeps = {
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

export async function analyzeUtilityV1(inputs: UtilityInputs, deps?: AnalyzeUtilityDeps): Promise<{
  insights: UtilityInsights;
  recommendations: UtilityRecommendation[];
}> {
  // ---- This function is an implementation copy of the prior `analyzeUtility` (v1).
  // It is intentionally kept behavior-identical and snapshot-gated.
  const nowIso = String(deps?.nowIso || new Date().toISOString());
  const engineWarnings: EngineWarning[] = [];
  const warn = (w: EngineWarning) => engineWarnings.push(w);
  const idFactory = deps?.idFactory || makeEphemeralIdFactory({ prefix: 'utilReco', seed: nowIso });
  const stepTraceV1 = deps?.stepTraceV1 ?? null;
  const beginStep = (name: AnalyzeUtilityStepNameV1) => stepTraceV1?.beginStep(name);
  const endStep = (name: AnalyzeUtilityStepNameV1, opts?: { skipped?: boolean; reasonCode?: string }) => stepTraceV1?.endStep(name, opts);

  let normalizedInputs: NormalizedInputsV1 = {
    nowIso,
    normalizedIntervalV1: null,
    hasInterval: false,
    intervalDays: null,
    granularityMinutes: null,
    hasBillText: Boolean(String(inputs.billPdfText || '').trim()),
    billMonths: Array.isArray(inputs.billingSummary?.monthly) ? inputs.billingSummary!.monthly.length : Array.isArray(inputs.billingRecords) ? inputs.billingRecords.length : null,
    hasWeatherDaily: false,
    overlapDays: null,
    currentRateCode: String(inputs.currentRate?.rateCode || '').trim() || null,
    currentRateSelectionSource: inputs.currentRateSelectionSource ?? null,
    tariffOverrideV1: inputs.tariffOverrideV1 ?? null,
  };

  const state: any = {
    normalizedInputs,
    insights: {} as UtilityInsights,
    recommendations: [] as UtilityRecommendation[],
    missingInfo: [] as any[],
    requiredInputsMissing: [] as string[],
  };

  const normalizeDelta = await stepNormalize({
    state,
    normalizedInputs,
    ctx: { inputs, deps, nowIso, idFactory, stepTraceV1, warn, beginStep, endStep },
  });
  normalizedInputs = normalizeDelta.normalizedInputs || normalizedInputs;
  state.normalizedInputs = normalizedInputs;

  const normalizedFromCanonicalPoints: NormalizedIntervalV1 | null = normalizeDelta.normalizedFromCanonicalPoints ?? null;
  const projectTelemetry = normalizeDelta.projectTelemetry ?? null;
  const intervalKwRaw: any[] | null = normalizeDelta.intervalKwRaw ?? null;
  const normalizedInterval: NormalizedIntervalV1 | null = normalizeDelta.normalizedInterval ?? null;
  const intervalKwSeries: IntervalKwPoint[] = Array.isArray(normalizeDelta.intervalKwSeries) ? (normalizeDelta.intervalKwSeries as any) : [];
  const storageEconomicsOverridesV1 = normalizeDelta.storageEconomicsOverridesV1 ?? null;
  const batteryDecisionConstraintsV1 = normalizeDelta.batteryDecisionConstraintsV1 ?? null;
  state.intervalKwRaw = intervalKwRaw;
  state.intervalKwSeries = intervalKwSeries;

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

  state.loadShape = loadShape;
  state.schedule = schedule;
  state.loadShift = loadShift;
  state.intervalKwSeries = intervalKwSeries;
  const programDelta = stepProgramIntelligence({
    state,
    normalizedInputs,
    ctx: { inputs, deps, nowIso, idFactory, stepTraceV1, warn, beginStep, endStep },
  });
  const proven = programDelta.proven;
  const tz = programDelta.tz;
  const billTou = programDelta.billTou;
  const annualEstimate = programDelta.annualEstimate;
  const programs: UtilityInsights['programs'] = programDelta.programs;
  const matches = programDelta.matches;
  const programRecs = programDelta.programRecs;

  const supplyDelta = stepSupplyStructure({
    state,
    normalizedInputs,
    ctx: { inputs, deps, nowIso, idFactory, stepTraceV1, warn, beginStep, endStep },
  });
  const supplyStructure = supplyDelta.supplyStructure;
  const billPdfTariffTruth = supplyDelta.billPdfTariffTruth;
  const ssaV1 = supplyDelta.ssaV1;
  state.billPdfTariffTruth = billPdfTariffTruth;
  state.ssaV1 = ssaV1;

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

  state.tz = tz;
  const intervalIntelDelta = stepIntervalIntelligence({
    state,
    normalizedInputs,
    ctx: { inputs, deps, nowIso, idFactory, stepTraceV1, warn, beginStep, endStep },
  });
  const intervalIntelligenceV1 = intervalIntelDelta.intervalIntelligenceV1;

  const weatherRegDelta = stepWeatherRegression({
    state,
    normalizedInputs,
    ctx: { inputs, deps, nowIso, idFactory, stepTraceV1, warn, beginStep, endStep },
  });
  const weatherRegressionV1 = weatherRegDelta.weatherRegressionV1;

  const tariffDelta = await stepTariffRateContext({
    state,
    normalizedInputs,
    ctx: { inputs, deps, nowIso, idFactory, stepTraceV1, warn, beginStep, endStep },
  });
  const billTariffCommodity: 'electric' | 'gas' = tariffDelta.billTariffCommodity;
  const billTariffUtilityKey = tariffDelta.billTariffUtilityKey;
  const billPdfTariffLibraryMatchRaw = tariffDelta.billPdfTariffLibraryMatchRaw;
  const billPdfTariffLibraryMatch = tariffDelta.billPdfTariffLibraryMatch;
  const tariffLibrary = tariffDelta.tariffLibrary;
  const effectiveRateContextV1 = tariffDelta.effectiveRateContextV1;
  const composedTariffPriceSignalsV1: TariffPriceSignalsV1 | null = tariffDelta.composedTariffPriceSignalsV1;

  state.tariffLibrary = tariffLibrary;
  state.supplyStructure = supplyStructure;
  state.intervalKwSeries = intervalKwSeries;
  state.intervalKwRaw = intervalKwRaw;
  state.tz = tz;
  state.billTou = billTou;

  const determinantsDelta = stepDeterminants({
    state,
    normalizedInputs,
    ctx: { inputs, deps, nowIso, idFactory, stepTraceV1, warn, beginStep, endStep },
  });
  const tariffApplicability = determinantsDelta.tariffApplicability;
  const determinantsPack = determinantsDelta.determinantsPack;
  const determinantsPackSummary = determinantsDelta.determinantsPackSummary;

  state.engineWarnings = engineWarnings;
  state.missingGlobal = missingGlobal;
  state.weather = weather;
  state.rateFit = rateFit;
  state.optionS = optionS;
  state.loadAttribution = loadAttribution;
  state.billIntelligenceV1 = billIntelligenceV1;
  state.intervalIntelligenceV1 = intervalIntelligenceV1;
  state.weatherRegressionV1 = weatherRegressionV1;

  state.billTariffCommodity = billTariffCommodity;
  state.billTariffUtilityKey = billTariffUtilityKey;
  state.billPdfTariffLibraryMatchRaw = billPdfTariffLibraryMatchRaw;
  state.billPdfTariffLibraryMatch = billPdfTariffLibraryMatch;
  state.effectiveRateContextV1 = effectiveRateContextV1;
  state.composedTariffPriceSignalsV1 = composedTariffPriceSignalsV1;

  state.tariffApplicability = tariffApplicability;
  state.determinantsPack = determinantsPack;
  state.determinantsPackSummary = determinantsPackSummary;
  state.storageEconomicsOverridesV1 = storageEconomicsOverridesV1;
  state.batteryDecisionConstraintsV1 = batteryDecisionConstraintsV1;

  state.proven = proven;
  state.annualEstimate = annualEstimate;
  state.programs = programs;
  state.matches = matches;
  state.programRecs = programRecs;

  const batteryOppDelta = await stepBatteryOpportunity({
    state,
    normalizedInputs,
    ctx: { inputs, deps, nowIso, idFactory, stepTraceV1, warn, beginStep, endStep },
  });
  const storageOpportunityPackV1 = batteryOppDelta.storageOpportunityPackV1;
  state.storageOpportunityPackV1 = storageOpportunityPackV1;

  const batteryDecisionDelta = await stepBatteryDecision({
    state,
    normalizedInputs,
    ctx: { inputs, deps, nowIso, idFactory, stepTraceV1, warn, beginStep, endStep },
  });
  const batteryEconomicsV1 = batteryDecisionDelta.batteryEconomicsV1;
  const batteryDecisionPackV1 = batteryDecisionDelta.batteryDecisionPackV1;
  const batteryDecisionPackV1_2 = batteryDecisionDelta.batteryDecisionPackV1_2;
  state.batteryEconomicsV1 = batteryEconomicsV1;
  state.batteryDecisionPackV1 = batteryDecisionPackV1;
  state.batteryDecisionPackV1_2 = batteryDecisionPackV1_2;

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

  state.behaviorInsights = behaviorInsights;
  state.behaviorInsightsV2 = behaviorInsightsV2;
  state.behaviorInsightsV3 = behaviorInsightsV3;
  state.billSimV2 = billSimV2;

  const recoDelta = await stepRecommendationsAssembly({
    state,
    normalizedInputs,
    ctx: { inputs, deps, nowIso, idFactory, stepTraceV1, warn, beginStep, endStep },
  });
  state.insights = recoDelta.insights;
  state.recommendations = recoDelta.recommendations;

  const missingDelta = await stepMissingInfoAssembly({
    state,
    normalizedInputs,
    ctx: { inputs, deps, nowIso, idFactory, stepTraceV1, warn, beginStep, endStep },
  });
  state.missingInfo = Array.isArray(missingDelta.missingInfo) ? missingDelta.missingInfo : [];
  state.requiredInputsMissing = Array.isArray(missingDelta.requiredInputsMissing) ? missingDelta.requiredInputsMissing : [];

  return { insights: state.insights, recommendations: state.recommendations };
}

