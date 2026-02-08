import type { ComprehensiveBillRecord } from '../../utils/utility-data-types';
import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';

export type DemandSourceV1 = 'billingRecords' | 'intervals' | 'unknown';

export type IntervalEnergyPointV1 = {
  timestampIso: string;
  /** kWh for this interval (required for kWh->kW conversion path) */
  kwh: number;
  /** Interval duration minutes (15 or 30). If missing, demand cannot be computed from kWh deterministically. */
  resolutionMinutes?: number;
};

export type IntervalKwPointV1 = {
  timestampIso: string;
  kw: number;
};

export type ExtractMaxDemandKwResultV1 = {
  valueKw: number | null;
  source: DemandSourceV1;
  because: string[];
  confidence: number; // 0..1
  missingInfo: MissingInfoItemV0[];
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function maxFinite(nums: number[]): number | null {
  const xs = nums.filter((n) => Number.isFinite(n));
  if (!xs.length) return null;
  return Math.max(...xs);
}

function normalizeBillingDemandKw(n: unknown): number | null {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
}

/**
 * Extract a deterministic max demand kW from the best available sources.
 *
 * Priority:
 * - billingRecords measured demand (maxMaxDemandKw)
 * - interval kW series (max kw)
 * - interval kWh series with known resolution (15 or 30 min): kW = kWh * (60/resolutionMinutes)
 */
export function extractMaxDemandKw(
  billingRecords: ComprehensiveBillRecord[] | null | undefined,
  opts?: {
    intervalKw?: IntervalKwPointV1[] | null;
    intervalKwh?: IntervalEnergyPointV1[] | null;
    /**
     * Optional hint for expected interval length; used only if individual points don't include resolutionMinutes.
     * If not provided, resolution must be present on kWh points to compute demand.
     */
    intervalResolutionMinutes?: number;
    /** Optional: treat fewer than this many intervals as low-confidence. */
    minIntervalsForHighConfidence?: number;
  },
): ExtractMaxDemandKwResultV1 {
  const because: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];

  // 1) Billing record demand
  const billRows = Array.isArray(billingRecords) ? billingRecords : [];
  const billingDemand = maxFinite(billRows.map((r) => normalizeBillingDemandKw((r as any)?.maxMaxDemandKw)).filter((n): n is number => n !== null));
  if (billingDemand !== null) {
    because.push('Used measured demand from billing records (maxMaxDemandKw).');
    because.push(`maxDemandKwObserved=${billingDemand.toFixed(2)} kW (billingRecords).`);
    return { valueKw: billingDemand, source: 'billingRecords', because, confidence: 0.88, missingInfo };
  }

  // 2) Interval kW demand
  const intervalKw = Array.isArray(opts?.intervalKw) ? opts?.intervalKw : [];
  const kwMax = maxFinite(intervalKw.map((p) => Number(p.kw)));
  if (kwMax !== null) {
    const n = intervalKw.length;
    const minN = Number(opts?.minIntervalsForHighConfidence ?? 1000);
    const conf = clamp01(0.78 - (n < minN ? 0.18 : 0));
    because.push('Billing-record demand unavailable; used max kW from interval kW series.');
    because.push(`maxDemandKwObserved=${kwMax.toFixed(2)} kW (intervals). intervals=${n}.`);
    if (n < minN) because.push('Interval count is low; confidence reduced.');
    return { valueKw: kwMax, source: 'intervals', because, confidence: conf, missingInfo };
  }

  // 3) Interval kWh -> kW conversion
  const intervalKwh = Array.isArray(opts?.intervalKwh) ? opts?.intervalKwh : [];
  const hintedRes = Number(opts?.intervalResolutionMinutes);
  const supportedHint = hintedRes === 15 || hintedRes === 30 ? hintedRes : null;

  const converted: number[] = [];
  let usedResolution: number | null = null;
  for (const p of intervalKwh) {
    const kwh = Number(p.kwh);
    if (!Number.isFinite(kwh) || kwh < 0) continue;
    const res = (p.resolutionMinutes === 15 || p.resolutionMinutes === 30 ? p.resolutionMinutes : null) ?? supportedHint;
    if (!res) continue;
    usedResolution = res;
    converted.push(kwh * (60 / res));
  }

  const convMax = maxFinite(converted);
  if (convMax !== null && usedResolution) {
    const n = intervalKwh.length;
    const minN = Number(opts?.minIntervalsForHighConfidence ?? 1000);
    const conf = clamp01(0.72 - (n < minN ? 0.18 : 0));
    because.push('Billing-record demand unavailable; computed demand from interval kWh and resolution.');
    because.push(`kW = kWh * ${60 / usedResolution} (resolution=${usedResolution}min).`);
    because.push(`maxDemandKwObserved=${convMax.toFixed(2)} kW (intervals). intervals=${n}.`);
    if (n < minN) because.push('Interval count is low; confidence reduced.');
    return { valueKw: convMax, source: 'intervals', because, confidence: conf, missingInfo };
  }

  // Missing/unknown
  because.push('Unable to determine max demand kW from billing records or intervals.');
  if (intervalKwh.length > 0) {
    missingInfo.push({
      id: 'tariff.applicability.intervalResolution.missing',
      category: 'tariff',
      severity: 'warning',
      description: 'Interval granularity is missing (15-min vs 30-min); cannot compute kW from interval kWh deterministically.',
    });
  } else {
    missingInfo.push({
      id: 'tariff.applicability.demand.missing',
      category: 'tariff',
      severity: 'warning',
      description: 'Max demand (kW) is missing. Provide billing records with measured demand or interval data.',
    });
  }

  return { valueKw: null, source: 'unknown', because, confidence: 0.25, missingInfo };
}

