import type { UtilityInputs } from '../types';
import type { AnalysisTraceV1, AnalysisTraceV1IntervalGranularity, AnalysisTraceV1SupplyProviderType, AnalysisTraceV1TariffMatchStatus } from './types';
import type { NormalizedIntervalV1 } from '../intervalNormalizationV1/types';

const MS_PER_DAY = 86_400_000;

function safeString(x: unknown): string {
  return String(x ?? '').trim();
}

function safeNumber(x: unknown): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function clamp01(n: number | null): number | null {
  if (n === null) return null;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function uniqSortedBoundedStrings(raw: unknown, max: number): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr) {
    const s = safeString(v);
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= max) break;
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function parseIsoMs(s: unknown): number | null {
  const t = safeString(s);
  if (!t) return null;
  const ms = Date.parse(t);
  return Number.isFinite(ms) ? ms : null;
}

function computeIntervalDaysFromTimestamps(timestampsIso: string[]): number | null {
  let minMs: number | null = null;
  let maxMs: number | null = null;
  for (const ts of timestampsIso) {
    const ms = parseIsoMs(ts);
    if (ms === null) continue;
    if (minMs === null || ms < minMs) minMs = ms;
    if (maxMs === null || ms > maxMs) maxMs = ms;
  }
  if (minMs === null || maxMs === null) return null;
  if (maxMs < minMs) return null;
  const days = (maxMs - minMs) / MS_PER_DAY;
  // keep bounded precision to avoid float noise
  return Math.round(days * 1000) / 1000;
}

function mostCommonIntervalMinutes(points: Array<{ intervalMinutes: number }>): number | null {
  const counts = new Map<number, number>();
  let best: { mins: number; count: number } | null = null;
  for (const p of points.slice(0, 500)) {
    const m = Number((p as any)?.intervalMinutes);
    if (!Number.isFinite(m) || m <= 0) continue;
    const next = (counts.get(m) || 0) + 1;
    counts.set(m, next);
    if (!best || next > best.count || (next === best.count && m < best.mins)) best = { mins: m, count: next };
  }
  return best ? best.mins : null;
}

function toGranularity(mins: number | null): AnalysisTraceV1IntervalGranularity | null {
  if (mins === null) return null;
  if (mins === 15) return '15m';
  if (mins === 60) return '60m';
  if (mins === 1440) return 'daily';
  return 'unknown';
}

function isSupportedCaIouUtility(utilityTerritory: unknown): boolean {
  const u = safeString(utilityTerritory).toUpperCase();
  return u === 'PGE' || u === 'SCE' || u === 'SDGE';
}

function summarizeTopCodes(args: { items: unknown[]; getCode: (x: any) => string; max: number }): string[] {
  const counts: Record<string, number> = {};
  for (const it of args.items || []) {
    const code = safeString(args.getCode(it));
    if (!code) continue;
    counts[code] = (counts[code] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return sorted.slice(0, Math.max(0, args.max)).map(([code]) => code);
}

function extractMissingInfoIds(args: { insights: any; intervalMeta?: any | null }): string[] {
  const out: string[] = [];

  const pushId = (id: unknown) => {
    const s = safeString(id);
    if (s) out.push(s);
  };

  // Primary (utility) missingInfo aggregation.
  const mi1 = Array.isArray(args.insights?.missingInfo) ? (args.insights.missingInfo as any[]) : [];
  for (const it of mi1) pushId((it as any)?.id);

  // Additive: tariff applicability missingInfo is nested under rateFit in current payloads.
  const mi2 = Array.isArray(args.insights?.rateFit?.tariffApplicability?.missingInfo) ? (args.insights.rateFit.tariffApplicability.missingInfo as any[]) : [];
  for (const it of mi2) pushId((it as any)?.id);

  // Additive: interval intake meta missingInfo (when available).
  const mi3 = Array.isArray((args.intervalMeta as any)?.missingInfo) ? (((args.intervalMeta as any).missingInfo as any[]) || []) : [];
  for (const it of mi3) pushId((it as any)?.id);

  // Deterministic dedupe (case-insensitive) + stable sort.
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const id of out) {
    const k = id.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(id);
  }
  return dedup.sort((a, b) => a.localeCompare(b));
}

function extractRatchetHistoryFlag(insights: any): boolean | null {
  const lineItems: any[] = [];
  try {
    const econ = insights?.batteryEconomicsV1;
    if (econ && econ.audit && Array.isArray(econ.audit.lineItems)) lineItems.push(...econ.audit.lineItems);
  } catch {
    // ignore
  }
  try {
    const pack = insights?.batteryDecisionPackV1_2;
    if (pack && pack.audit && Array.isArray(pack.audit.lineItems)) lineItems.push(...pack.audit.lineItems);
  } catch {
    // ignore
  }

  let sawRatchetSignal = false;
  let sawHistMissing = false;
  for (const li of lineItems) {
    const qs: any[] = Array.isArray((li as any)?.quantities) ? ((li as any).quantities as any[]) : [];
    for (const q of qs) {
      const id = safeString((q as any)?.id);
      if (id === 'ratchetHistoryMaxKw' || id === 'ratchetFloorPct' || id === 'ratchetDemandKw') sawRatchetSignal = true;
      if (id !== 'ratchetHistoryMaxKw') continue;
      const v = safeNumber((q as any)?.value);
      if (v !== null) return true;
      sawHistMissing = true;
    }
  }
  if (sawRatchetSignal && sawHistMissing) return false;
  return null;
}

function computeTariffMatchStatus(args: { inputs: UtilityInputs; insights: any }): AnalysisTraceV1TariffMatchStatus {
  const match = args.insights?.billPdfTariffLibraryMatch ?? null;
  const resolvedRateCode = safeString(match?.resolved?.rateCode) || null;
  const candidates = Array.isArray(match?.candidates) ? (match.candidates as any[]) : [];
  const hasCandidates = candidates.some((c) => safeString((c as any)?.rateCode));

  if (match) {
    if (resolvedRateCode) return 'FOUND';
    const candCount = candidates.filter((c) => safeString((c as any)?.rateCode)).length;
    if (candCount >= 1) return candCount >= 2 ? 'AMBIGUOUS' : 'AMBIGUOUS';
    if (!hasCandidates) return 'NOT_FOUND';
  }

  // If the utility territory isn't currently supported by the CA tariff library matchers,
  // surface that explicitly when we also lack a bill-PDF match path.
  if (!isSupportedCaIouUtility(args.inputs.utilityTerritory) && !safeString(args.inputs.currentRate?.rateCode)) return 'UNSUPPORTED';

  // Otherwise we just don't know (could be user override or default selection).
  return 'UNKNOWN';
}

function computeSupplyProviderType(insights: any): { providerType: AnalysisTraceV1SupplyProviderType | null; confidence: number | null } {
  const erc = insights?.effectiveRateContextV1 ?? null;
  const genProviderType = safeString(erc?.generation?.providerType).toUpperCase();
  const providerTypeFromErc: AnalysisTraceV1SupplyProviderType | null =
    genProviderType === 'CCA' ? 'CCA' : genProviderType === 'DA' ? 'DA' : null;

  const supplyType = safeString(insights?.supplyStructure?.supplyType);
  const providerTypeFromSupply: AnalysisTraceV1SupplyProviderType | null =
    supplyType === 'CCA' ? 'CCA' : supplyType === 'DA' ? 'DA' : supplyType === 'bundled' || supplyType === 'unknown' ? 'NONE' : null;

  const providerType: AnalysisTraceV1SupplyProviderType = providerTypeFromErc ?? providerTypeFromSupply ?? 'NONE';

  const conf =
    safeNumber(erc?.generation?.confidence) ??
    safeNumber(insights?.supplyStructure?.confidence) ??
    null;

  return { providerType, confidence: clamp01(conf) };
}

function sortSkipped(items: Array<{ module: string; reasonCode: string }>): Array<{ module: string; reasonCode: string }> {
  return items
    .slice()
    .map((x) => ({ module: safeString(x.module), reasonCode: safeString(x.reasonCode) }))
    .filter((x) => x.module && x.reasonCode)
    .sort((a, b) => a.module.localeCompare(b.module) || a.reasonCode.localeCompare(b.reasonCode));
}

export function buildAnalysisTraceV1(args: {
  nowIso: string;
  inputs: UtilityInputs;
  intervalKwSeries?: Array<{ timestampIso: string; kw: number }> | null;
  intervalPointsV1?: Array<{ timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number; temperatureF?: number }> | null;
  /** Optional canonical normalized interval (when available). */
  normalizedIntervalV1?: NormalizedIntervalV1 | null;
  /** Optional interval meta snapshot (only when available). */
  intervalMetaV1?: any | null;
  /** Utility analysis insights object (already computed). */
  insights: any;
}): AnalysisTraceV1 {
  const generatedAtIso = safeString(args.nowIso) || new Date().toISOString();
  const intervalKw = Array.isArray(args.intervalKwSeries) ? args.intervalKwSeries : [];
  const intervalPts = Array.isArray(args.intervalPointsV1) ? args.intervalPointsV1 : [];
  const normalized = args.normalizedIntervalV1 && typeof args.normalizedIntervalV1 === 'object' ? (args.normalizedIntervalV1 as NormalizedIntervalV1) : null;
  const hasInterval = intervalPts.length > 0 || intervalKw.length > 0 || Boolean(normalized && normalized.seriesKw && normalized.seriesKw.length);

  const intervalMinutes =
    intervalPts.length
      ? mostCommonIntervalMinutes(intervalPts as any)
      : Number.isFinite(Number((normalized as any)?.granularityMinutes)) && Number((normalized as any).granularityMinutes) > 0
        ? Math.round(Number((normalized as any).granularityMinutes))
        : null;
  const intervalGranularity = hasInterval ? toGranularity(intervalMinutes) ?? 'unknown' : null;

  const intervalDays = (() => {
    const meta = args.intervalMetaV1;
    const startIso = safeString(meta?.range?.startIso);
    const endIso = safeString(meta?.range?.endIso);
    const startMs = parseIsoMs(startIso);
    const endMs = parseIsoMs(endIso);
    if (startMs !== null && endMs !== null && endMs >= startMs) return Math.round(((endMs - startMs) / MS_PER_DAY) * 1000) / 1000;

    const iiDays = safeNumber(args.insights?.intervalIntelligenceV1?.coverageDays);
    if (iiDays !== null && iiDays >= 0) return Math.round(iiDays * 1000) / 1000;

    const normalizedDays = safeNumber((normalized as any)?.coverage?.days);
    if (normalizedDays !== null && normalizedDays >= 0) return Math.round(normalizedDays * 1000) / 1000;

    const ts = intervalPts.length
      ? intervalPts.map((p) => safeString((p as any)?.timestampIso)).filter(Boolean)
      : intervalKw.map((p) => safeString((p as any)?.timestampIso)).filter(Boolean);
    return ts.length ? computeIntervalDaysFromTimestamps(ts) : null;
  })();

  const hasBillText = Boolean(safeString((args.inputs as any)?.billPdfText));
  const billMonths = (() => {
    const monthly = Array.isArray((args.inputs as any)?.billingSummary?.monthly) ? ((args.inputs as any).billingSummary.monthly as any[]) : [];
    if (monthly.length) return monthly.length;
    const records = Array.isArray((args.inputs as any)?.billingRecords) ? ((args.inputs as any).billingRecords as any[]) : [];
    return records.length ? records.length : null;
  })();

  const weatherCoverage = (() => {
    const wr = args.insights?.weatherRegressionV1 ?? null;
    const days = safeNumber(wr?.coverageDays);
    if (days !== null && days > 0) return { hasWeatherDaily: true, weatherDays: Math.round(days) };
    const anyTemp = intervalPts.some((p: any) => Number.isFinite(Number(p?.temperatureF)));
    return { hasWeatherDaily: anyTemp, weatherDays: null as number | null };
  })();

  const tariffMatchStatus: AnalysisTraceV1TariffMatchStatus = computeTariffMatchStatus({ inputs: args.inputs, insights: args.insights });

  const supply = computeSupplyProviderType(args.insights);

  const missingInfoIds = extractMissingInfoIds({ insights: args.insights, intervalMeta: args.intervalMetaV1 });
  const engineWarnings = Array.isArray(args.insights?.engineWarnings) ? (args.insights.engineWarnings as any[]) : [];

  // ---- Modules (bounded, deterministic) ----
  const ranModulesRaw: string[] = [];
  const skippedModulesRaw: Array<{ module: string; reasonCode: string }> = [];

  // High-signal workflow modules (these are executed by orchestration).
  ranModulesRaw.push(
    'workflows/runUtilityWorkflow',
    'utilityIntelligence/analyzeUtility',
    'utilityIntelligence/toInboxSuggestions',
    'batteryIntelligence/shouldEvaluateBattery',
    'batteryIntelligence/selectBatteryCandidatesV1',
    'batteryIntelligence/toBatteryRecommendationsV1',
  );

  // Gated / output-present modules (inferred deterministically from inputs + stored outputs).
  if (hasBillText) ranModulesRaw.push('utilityIntelligence/billPdf/extractBillPdfTariffHintsV1');
  else skippedModulesRaw.push({ module: 'utilityIntelligence/billPdf/extractBillPdfTariffHintsV1', reasonCode: 'NO_BILL_PDF_TEXT' });

  if (args.insights?.billPdfTariffLibraryMatch) ranModulesRaw.push('utilityIntelligence/billPdf/matchBillTariffToLibraryV1');
  else if (hasBillText) skippedModulesRaw.push({ module: 'utilityIntelligence/billPdf/matchBillTariffToLibraryV1', reasonCode: 'NO_RATE_SCHEDULE_TEXT_OR_SNAPSHOT' });
  else skippedModulesRaw.push({ module: 'utilityIntelligence/billPdf/matchBillTariffToLibraryV1', reasonCode: 'NO_BILL_PDF_TEXT' });

  if (args.insights?.tariffLibrary) ranModulesRaw.push('tariffLibrary/metadataLookupV0');
  else if (!safeString(args.inputs.currentRate?.rateCode)) skippedModulesRaw.push({ module: 'tariffLibrary/metadataLookupV0', reasonCode: 'NO_CURRENT_RATE' });
  else if (!isSupportedCaIouUtility(args.inputs.currentRate?.utility ?? args.inputs.utilityTerritory))
    skippedModulesRaw.push({ module: 'tariffLibrary/metadataLookupV0', reasonCode: 'UNSUPPORTED_UTILITY' });

  if (args.insights?.intervalIntelligenceV1) ranModulesRaw.push('utilityIntelligence/intervalIntelligenceV1');
  else if (intervalPts.length) skippedModulesRaw.push({ module: 'utilityIntelligence/intervalIntelligenceV1', reasonCode: 'OUTPUT_ABSENT' });
  else skippedModulesRaw.push({ module: 'utilityIntelligence/intervalIntelligenceV1', reasonCode: 'NO_INTERVAL_POINTS_V1' });

  if (args.insights?.weatherRegressionV1) ranModulesRaw.push('utilityIntelligence/weatherRegressionV1');
  else if (intervalPts.length && intervalPts.some((p: any) => Number.isFinite(Number(p?.temperatureF))))
    skippedModulesRaw.push({ module: 'utilityIntelligence/weatherRegressionV1', reasonCode: 'OUTPUT_ABSENT' });
  else if (intervalPts.length) skippedModulesRaw.push({ module: 'utilityIntelligence/weatherRegressionV1', reasonCode: 'NO_TEMPERATURE_IN_INTERVALS' });
  else skippedModulesRaw.push({ module: 'utilityIntelligence/weatherRegressionV1', reasonCode: 'NO_INTERVAL_POINTS_V1' });

  if (args.insights?.determinantsPackSummary) ranModulesRaw.push('determinants/packV1');
  else skippedModulesRaw.push({ module: 'determinants/packV1', reasonCode: hasInterval ? 'OUTPUT_ABSENT' : 'NO_INTERVAL' });

  if (args.insights?.billSimV2) ranModulesRaw.push('billingEngineV2/billSimV2');
  else skippedModulesRaw.push({ module: 'billingEngineV2/billSimV2', reasonCode: args.insights?.determinantsPackSummary ? 'OUTPUT_ABSENT' : 'MISSING_DETERMINANTS' });

  if (args.insights?.batteryEconomicsV1) ranModulesRaw.push('batteryEconomicsV1/evaluateBatteryEconomicsV1');
  else skippedModulesRaw.push({ module: 'batteryEconomicsV1/evaluateBatteryEconomicsV1', reasonCode: 'OUTPUT_ABSENT' });

  if (args.insights?.batteryDecisionPackV1) ranModulesRaw.push('batteryEconomicsV1/decisionPackV1');
  else skippedModulesRaw.push({ module: 'batteryEconomicsV1/decisionPackV1', reasonCode: 'OUTPUT_ABSENT' });

  if (args.insights?.batteryDecisionPackV1_2) ranModulesRaw.push('batteryDecisionPackV1_2/buildBatteryDecisionPackV1_2');
  else skippedModulesRaw.push({ module: 'batteryDecisionPackV1_2/buildBatteryDecisionPackV1_2', reasonCode: 'OUTPUT_ABSENT' });

  const ranModules = uniqSortedBoundedStrings(ranModulesRaw, 80);
  const skippedModules = sortSkipped(skippedModulesRaw).slice(0, 80);

  // ---- Provenance ----
  const erc = args.insights?.effectiveRateContextV1 ?? null;
  const provenance: AnalysisTraceV1['provenance'] = {
    generationEnergySnapshotId: safeString(erc?.generation?.snapshotId) || null,
    addersSnapshotId: safeString(erc?.generation?.generationAddersSnapshotId) || null,
    exitFeesSnapshotId: safeString(erc?.generation?.exitFeesSnapshotId) || null,
    tariffSnapshotId:
      safeString(args.insights?.tariffLibrary?.snapshotVersionTag) ||
      safeString((args.inputs as any)?.tariffOverrideV1?.snapshotId) ||
      null,
  };

  // ---- Warnings summary ----
  const topEngineWarningCodes = summarizeTopCodes({ items: engineWarnings, getCode: (w) => (w as any)?.code, max: 10 });
  const topMissingInfoCodes = summarizeTopCodes({ items: missingInfoIds, getCode: (id) => id, max: 10 });

  return {
    generatedAtIso,
    ranModules,
    skippedModules,
    coverage: {
      hasInterval,
      intervalGranularity,
      intervalDays,
      hasBillText,
      billMonths,
      hasWeatherDaily: weatherCoverage.hasWeatherDaily,
      weatherDays: weatherCoverage.weatherDays,
      tariffMatchStatus,
      supplyProviderType: supply.providerType,
      supplyConfidence: supply.confidence,
      hasRatchetHistory: extractRatchetHistoryFlag(args.insights),
    },
    warningsSummary: {
      engineWarningsCount: engineWarnings.length,
      topEngineWarningCodes,
      missingInfoCount: missingInfoIds.length,
      topMissingInfoCodes,
    },
    provenance,
  };
}

