import type { UtilityInsights, UtilityInputs } from '../types';
import { isAlreadyOnOptionS } from '../../../utils/rates/s-rate-eligibility';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normTerritory(s: string | undefined | null): string {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function normRateCode(s: string | undefined | null): string {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '-');
}

export function evaluateOptionSRelevance(args: {
  inputs: UtilityInputs;
  loadShape?: UtilityInsights['inferredLoadShape'];
  loadShiftScore?: number;
}): UtilityInsights['optionSRelevance'] {
  const territory = normTerritory(args.inputs.utilityTerritory);
  const currentRate = normRateCode(args.inputs.currentRate?.rateCode);
  const because: string[] = [];
  const requiredInputsMissing: string[] = [];

  if (!territory) {
    requiredInputsMissing.push('Utility territory required to determine Option S relevance.');
    return { status: 'unknown', confidence: 0, because: ['Utility territory missing.'], requiredInputsMissing };
  }

  // Catalog-driven: v1 only supports PG&E Option S relevance.
  if (territory !== 'PGE' && territory !== 'PG&E') {
    return {
      status: 'unknown',
      confidence: 0.1,
      because: ['Option S relevance rules are territory-specific; v1 supports PG&E only.', `territory=${territory}`],
      requiredInputsMissing: ['Territory-specific Option S rules not configured for this territory.'],
    };
  }

  if (currentRate && isAlreadyOnOptionS(currentRate)) {
    return {
      status: 'not_relevant',
      confidence: 1,
      because: ['Customer appears to already be on an Option S schedule (no “switch” evaluation needed).'],
      requiredInputsMissing: [],
    };
  }

  const peakiness = args.loadShape?.peakinessIndex;
  const loadFactor = args.loadShape?.loadFactor;
  const peakKw = args.loadShape?.peakKw;

  if (!Number.isFinite(peakiness ?? NaN)) requiredInputsMissing.push('Interval-derived peakinessIndex required to evaluate Option S relevance.');
  if (!Number.isFinite(loadFactor ?? NaN)) requiredInputsMissing.push('Interval-derived loadFactor required to evaluate Option S relevance.');
  if (!Number.isFinite(peakKw ?? NaN)) requiredInputsMissing.push('Interval-derived peak kW required to evaluate Option S relevance.');

  const hasDemandKnown = args.inputs.meterMeta?.hasDemandChargesKnown;
  if (hasDemandKnown !== true && hasDemandKnown !== false) {
    requiredInputsMissing.push('Demand charge presence (meterMeta.hasDemandChargesKnown) required to interpret Option S relevance.');
  }

  if (requiredInputsMissing.length) {
    because.push('Insufficient inputs to determine Option S relevance deterministically.');
    because.push('Provide interval kW data and demand charge presence to evaluate daily-demand structures.');
    return { status: 'unknown', confidence: 0.15, because, requiredInputsMissing };
  }

  const p = Number(peakiness);
  const lf = Number(loadFactor);
  const ls = Number.isFinite(args.loadShiftScore ?? NaN) ? Number(args.loadShiftScore) : 0;

  // Heuristic relevance (v1): sharp peaks and low load factor imply daily max/demand structure could be material.
  let score = 0.0;
  score += clamp01((p - 1.6) / 2.5) * 0.55;
  score += clamp01((0.65 - lf) / 0.65) * 0.35;
  score += clamp01(ls) * 0.1;

  score = clamp01(score);
  because.push(`Computed relevance score=${score.toFixed(2)} from peakinessIndex≈${p.toFixed(2)} and loadFactor≈${lf.toFixed(2)} (v1 heuristic).`);
  because.push('Option S is a tariff structure change; v1 does not perform dispatch modeling here.');

  if (score >= 0.6) {
    because.push('Profile appears peaky; Option S may be worth evaluating if storage/riders are feasible.');
    return { status: 'relevant', confidence: 0.65, because, requiredInputsMissing: [] };
  }
  if (score <= 0.3) {
    because.push('Profile appears relatively flat; Option S is less likely to help without strong daily peak drivers.');
    return { status: 'not_relevant', confidence: 0.6, because, requiredInputsMissing: [] };
  }

  return { status: 'unknown', confidence: 0.4, because: [...because, 'Borderline profile; requires rate-specific bill evaluation to conclude.'], requiredInputsMissing: [] };
}

