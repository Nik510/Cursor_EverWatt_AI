import type { UtilityInputs } from '../types';
import type { NormalizedIntervalV1 } from '../intervalNormalizationV1/types';
import type { NormalizedInputsV1 } from './types';

function safeString(x: unknown): string {
  return String(x ?? '').trim();
}

function safeNumber(x: unknown): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/**
 * Build the shared canonical input pack for analyzeUtility v1.
 *
 * Important: this must be a consolidation of already-derived fields only
 * (snapshot-gated; no behavior changes).
 */
export function buildNormalizedInputsV1(args: {
  inputs: UtilityInputs;
  nowIso: string;
  normalizedIntervalV1: NormalizedIntervalV1 | null;
  hasWeatherDaily: boolean;
  overlapDays: number | null;
}): NormalizedInputsV1 {
  const hasBillText = Boolean(safeString((args.inputs as any)?.billPdfText));
  const billMonths = (() => {
    const monthly = Array.isArray((args.inputs as any)?.billingSummary?.monthly) ? ((args.inputs as any).billingSummary.monthly as any[]) : [];
    if (monthly.length) return monthly.length;
    const records = Array.isArray((args.inputs as any)?.billingRecords) ? ((args.inputs as any).billingRecords as any[]) : [];
    return records.length ? records.length : null;
  })();

  const granularityMinutes = safeNumber((args.normalizedIntervalV1 as any)?.granularityMinutes);
  const intervalDays = safeNumber((args.normalizedIntervalV1 as any)?.coverage?.days);
  const hasInterval = Boolean(args.normalizedIntervalV1 && Array.isArray((args.normalizedIntervalV1 as any)?.seriesKw) && (args.normalizedIntervalV1 as any).seriesKw.length);

  return {
    nowIso: safeString(args.nowIso) || new Date().toISOString(),
    normalizedIntervalV1: args.normalizedIntervalV1,
    hasInterval,
    intervalDays,
    granularityMinutes,
    hasBillText,
    billMonths,
    hasWeatherDaily: Boolean(args.hasWeatherDaily),
    overlapDays: args.overlapDays ?? null,
    currentRateCode: safeString((args.inputs as any)?.currentRate?.rateCode) || null,
    currentRateSelectionSource: ((args.inputs as any)?.currentRateSelectionSource as any) ?? null,
    tariffOverrideV1: ((args.inputs as any)?.tariffOverrideV1 as any) ?? null,
  };
}

