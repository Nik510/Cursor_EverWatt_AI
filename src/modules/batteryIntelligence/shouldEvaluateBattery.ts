import type { UtilityInsights } from '../utilityIntelligence/types';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function uniq(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr) {
    const s = String(v || '').trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

export type BatteryFeasibilityGateResult = {
  status: 'recommended' | 'not_recommended' | 'unknown';
  because: string[];
  requiredInputsMissing: string[];
};

/**
 * Deterministic feasibility gate (v1).
 *
 * Purpose:
 * - Decide if battery evaluation is worth running (inbox-only suggestion)
 * - Be conservative: unknown inputs => unknown
 *
 * Notes:
 * - Does NOT compute savings (no claims).
 * - Uses Utility Intelligence Engine outputs (load shape, load shifting, Option S relevance).
 */
export function shouldEvaluateBattery(args: {
  insights: UtilityInsights;
  constraints?: { canCurtail?: boolean; criticalOperations?: boolean; hasGenerator?: boolean; hasBms?: boolean };
}): BatteryFeasibilityGateResult {
  const because: string[] = [];
  const requiredInputsMissing: string[] = [];

  const detSummary: any = (args.insights as any)?.determinantsPackSummary || null;

  const peak = args.insights.inferredLoadShape?.peakKw;
  const base = args.insights.inferredLoadShape?.baseloadKw;
  const peakiness = args.insights.inferredLoadShape?.peakinessIndex;
  const loadFactor = args.insights.inferredLoadShape?.loadFactor;
  const shiftScore = args.insights.loadShiftingFeasibility?.score;
  const optionS = args.insights.optionSRelevance?.status;

  if (!Number.isFinite(peak ?? NaN)) requiredInputsMissing.push('Interval-derived peak kW required to screen battery feasibility.');
  if (!Number.isFinite(base ?? NaN)) requiredInputsMissing.push('Interval-derived baseload kW required to screen battery feasibility.');
  if (!Number.isFinite(peakiness ?? NaN)) requiredInputsMissing.push('Interval-derived peakinessIndex required to screen battery feasibility.');
  if (!Number.isFinite(loadFactor ?? NaN)) requiredInputsMissing.push('Interval-derived loadFactor required to screen battery feasibility.');
  if (!Number.isFinite(shiftScore ?? NaN)) requiredInputsMissing.push('Load shifting feasibility score required to screen battery feasibility.');

  // If key interval-derived inputs are missing, we cannot conclude.
  if (requiredInputsMissing.length) {
    because.push('Insufficient interval-derived inputs to determine whether battery evaluation is worthwhile.');
    because.push('Provide interval kW data (or run Utility Intelligence with interval data) to compute peakiness and peak windows.');
    if (detSummary) because.push('Note: determinants pack is available but does not replace load-shape metrics in the v1 battery gate.');
    return { status: 'unknown', because, requiredInputsMissing: uniq(requiredInputsMissing) };
  }

  const p = Number(peakiness);
  const lf = Number(loadFactor);
  const ss = Number(shiftScore);
  const delta = Math.max(0, Number(peak) - Number(base));

  because.push(`Observed peakKw≈${Number(peak).toFixed(1)} and baseloadKw≈${Number(base).toFixed(1)} (delta≈${delta.toFixed(1)} kW).`);
  because.push(`peakinessIndex≈${p.toFixed(2)}, loadFactor≈${lf.toFixed(2)}, loadShiftingScore≈${ss.toFixed(2)}.`);

  if (detSummary && Array.isArray(detSummary?.meters) && detSummary.meters.length) {
    const m0 = detSummary.meters[0];
    const c0 = Array.isArray(m0?.last12Cycles) && m0.last12Cycles.length ? m0.last12Cycles[0] : null;
    if (c0) {
      const cov = Number(c0.coveragePct);
      because.push(
        `Determinants (latest cycle ${String(c0.cycleLabel || '')}): kWMax=${Number.isFinite(c0.kWMax) ? Number(c0.kWMax).toFixed(1) : 'n/a'} coverage=${Number.isFinite(cov) ? (cov * 100).toFixed(0) + '%' : 'n/a'}.`,
      );
      if (Number.isFinite(cov) && cov < 0.9) because.push('Warning: interval coverage below 90%; peak/demand inference may be unreliable.');
    }
  }

  if (args.constraints?.criticalOperations === true) {
    because.push('Site marked as critical operations; curtailment/dispatch constraints may reduce battery value.');
  }

  // Strong positive signals
  const optionSBoost = optionS === 'relevant' ? 1 : 0;
  const peakySignal = p >= 2.2 || lf <= 0.5;
  const shiftSignal = ss >= 0.45 || optionSBoost === 1;
  const magnitudeSignal = delta >= 30; // v1: meaningful kW delta to shave

  if (peakySignal && shiftSignal && magnitudeSignal) {
    because.push('Profile is sufficiently peaky with repeatable peak windows; battery evaluation is recommended.');
    if (optionSBoost) because.push('Option S relevance is flagged as relevant; evaluate tariff structures alongside storage.');
    return { status: 'recommended', because, requiredInputsMissing: [] };
  }

  // Strong negative signals (flat profile)
  const flatSignal = p <= 1.4 && lf >= 0.65 && ss <= 0.25;
  if (flatSignal || delta < 10) {
    because.push('Profile appears relatively flat / low-shave potential; battery is not recommended for v1 peak shaving screening.');
    return { status: 'not_recommended', because, requiredInputsMissing: [] };
  }

  // Borderline: recommend evaluation if there are any moderate positive signals
  const score = clamp01(0.4 * clamp01((p - 1.4) / 2.0) + 0.35 * clamp01((0.65 - lf) / 0.65) + 0.25 * clamp01(ss));
  because.push(`Borderline profile; evaluation recommended if strategic (screen score≈${score.toFixed(2)}).`);

  return {
    status: score >= 0.35 ? 'recommended' : 'unknown',
    because,
    requiredInputsMissing: [],
  };
}

