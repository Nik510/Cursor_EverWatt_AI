import type { Project } from '../project/types';
import type { MeasureType } from '../measures/types';
import { matchPlaybooks, playbookAlignmentForMeasure } from '../playbooks/registry';
import type { BatteryLibraryItemV1 } from '../batteryLibrary/types';
import { readComprehensiveIntervalData } from '../../utils/utility-data-reader';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normText(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 _/-]+/g, '')
    .trim();
}

export type BatteryCalcConstraintsV1 = {
  /** Optional: force only these vendors */
  vendorAllowList?: string[];
  /** Optional: exclude these vendors */
  vendorBlockList?: string[];
  /** Optional: exclude chemistries (e.g., ["NMC"]) */
  chemistryBlockList?: string[];
  /** Optional: if true, require "backup" tag */
  requireBackup?: boolean;
  /** Optional: bounds for total battery size */
  minKw?: number;
  maxKw?: number;
  minKwh?: number;
  maxKwh?: number;
  /** Optional: constrain footprint */
  maxFootprintAreaSqft?: number;
};

export type BatteryTelemetryRefsV1 = {
  /**
   * Meter identifier used for filtering interval data (typically Service Agreement ID).
   * This is treated as an opaque string; we match it against interval rows.
   */
  meterId?: string;
  /**
   * Optional interval file path (CSV/XLSX supported by the utility data reader).
   * If omitted, no file is read.
   */
  intervalFilePath?: string;
  /**
   * Optional pre-parsed interval kW series. If provided, it is used instead of reading a file.
   */
  intervalKwSeries?: Array<{ timestampIso: string; kw: number }>;
};

export type BatteryCandidateResultV1 = {
  candidate: BatteryLibraryItemV1;
  fitScore: number; // 0..1
  disqualifiers: string[];
  explain: string[];
};

export type SelectBatteryCandidatesResultV1 = {
  rankedCandidates: BatteryCandidateResultV1[];
  requiredInputsMissing: string[];
  explain: string[];
  playbook: { alignment: 'preferred' | 'neutral' | 'discouraged'; rationale: string | null; playbookId: string | null };
};

type IntervalSummary = {
  peakKw: number;
  p95Kw: number;
  avgKw: number;
  count: number;
};

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1))));
  return sorted[idx] ?? 0;
}

function summarizeIntervals(series: Array<{ kw: number }>): IntervalSummary {
  const vals = series.map((r) => Number(r.kw)).filter((n) => Number.isFinite(n) && n >= 0);
  if (!vals.length) return { peakKw: 0, p95Kw: 0, avgKw: 0, count: 0 };
  const sorted = [...vals].sort((a, b) => a - b);
  const peakKw = sorted[sorted.length - 1] || 0;
  const p95Kw = percentile(sorted, 0.95);
  const avgKw = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { peakKw, p95Kw, avgKw, count: vals.length };
}

function loadIntervalSeriesKw(args: BatteryTelemetryRefsV1): { series: Array<{ timestampIso: string; kw: number }>; warnings: string[] } {
  const warnings: string[] = [];

  if (Array.isArray(args.intervalKwSeries) && args.intervalKwSeries.length) {
    return { series: args.intervalKwSeries, warnings };
  }

  if (!args.intervalFilePath) {
    return { series: [], warnings };
  }

  try {
    const summary = readComprehensiveIntervalData(args.intervalFilePath);
    const meterId = String(args.meterId || '').trim();
    const all = Array.isArray(summary?.allIntervals) ? summary.allIntervals : [];
    const filtered = meterId ? all.filter((r) => String((r as any)?.serviceAgreement || '').trim() === meterId) : all;
    if (meterId && filtered.length === 0) warnings.push(`No interval rows matched meterId=${meterId} (serviceAgreement).`);
    const series = filtered
      .map((r) => ({ timestampIso: (r as any).startDateTime?.toISOString?.() || '', kw: Number((r as any).peakDemand || 0) }))
      .filter((r) => r.timestampIso && Number.isFinite(r.kw));
    return { series, warnings };
  } catch (e: any) {
    warnings.push(`Failed to read interval file: ${String(e?.message || e)}`);
    return { series: [], warnings };
  }
}

function cRate(candidate: BatteryLibraryItemV1): number {
  const kw = Number(candidate.kw);
  const kwh = Number(candidate.kwh);
  if (!Number.isFinite(kw) || !Number.isFinite(kwh) || kwh <= 0) return Infinity;
  return kw / kwh;
}

function within(n: number, min: number | undefined, max: number | undefined): boolean {
  if (!Number.isFinite(n)) return false;
  if (typeof min === 'number' && n < min) return false;
  if (typeof max === 'number' && n > max) return false;
  return true;
}

function scoreRatio(actual: number, target: number): number {
  if (!Number.isFinite(actual) || !Number.isFinite(target) || target <= 0) return 0;
  // Perfect at 1.0; penalize symmetrically as ratio drifts.
  const r = actual / target;
  const logErr = Math.abs(Math.log(Math.max(1e-9, r)));
  // 0 at ~e^2 (~7.4x off), 1 at perfect.
  return clamp01(1 - logErr / 2);
}

/**
 * Deterministic Battery Candidate Selection (v1)
 *
 * - Screens for feasibility + constraints.
 * - Ranks by fit to observed (or provided) peak demand characteristics.
 * - Does NOT claim savings (selection only).
 */
export function selectBatteryCandidatesV1(args: {
  project: Project;
  libraryItems: BatteryLibraryItemV1[];
  telemetry?: BatteryTelemetryRefsV1;
  constraints?: BatteryCalcConstraintsV1;
}): SelectBatteryCandidatesResultV1 {
  const requiredInputsMissing: string[] = [];
  const explain: string[] = [];
  const constraints = args.constraints || {};

  const measureType: MeasureType = 'BATTERY_PEAK_SHAVE';
  const playbookMatches = matchPlaybooks(args.project);
  const playbook = playbookAlignmentForMeasure({ matches: playbookMatches, measureType });

  const intervalLoad = loadIntervalSeriesKw(args.telemetry || {});
  for (const w of intervalLoad.warnings) explain.push(`telemetry: ${w}`);

  if (intervalLoad.series.length === 0) {
    requiredInputsMissing.push('utility interval electricity data (15-min or hourly)');
    explain.push('Missing interval kW demand series; candidate selection is conservative (defaults only).');
  }

  const sum = summarizeIntervals(intervalLoad.series);
  const targetKw = sum.peakKw > 0 ? Math.max(20, Math.min(500, sum.p95Kw * 0.35)) : 50;
  const targetHours = 2;
  const targetKwh = targetKw * targetHours;

  explain.push(`batteryCalcV1: peakKw=${sum.peakKw.toFixed(1)} p95Kw=${sum.p95Kw.toFixed(1)} avgKw=${sum.avgKw.toFixed(1)} n=${sum.count}`);
  explain.push('batteryCalcV1: demand screening uses interval kW determinants (not kWh totals).');
  explain.push(`batteryCalcV1: targetKw≈${targetKw.toFixed(0)} targetDurationHr=${targetHours} targetKwh≈${targetKwh.toFixed(0)}`);
  explain.push(`playbook: alignment=${playbook.alignment}${playbook.playbookId ? ` id=${playbook.playbookId}` : ''}${playbook.rationale ? ` rationale="${playbook.rationale}"` : ''}`);

  const vendorAllow = new Set((constraints.vendorAllowList || []).map((v) => normText(v)).filter(Boolean));
  const vendorBlock = new Set((constraints.vendorBlockList || []).map((v) => normText(v)).filter(Boolean));
  const chemBlock = new Set((constraints.chemistryBlockList || []).map((v) => normText(v)).filter(Boolean));

  const ranked: BatteryCandidateResultV1[] = (Array.isArray(args.libraryItems) ? args.libraryItems : []).map((c) => {
    const disqualifiers: string[] = [];
    const because: string[] = [];

    const vendorKey = normText(c.vendor);
    if (vendorAllow.size && !vendorAllow.has(vendorKey)) disqualifiers.push('vendor not in allow list');
    if (vendorBlock.has(vendorKey)) disqualifiers.push('vendor blocked');
    if (chemBlock.has(normText(c.chemistry))) disqualifiers.push(`chemistry blocked: ${c.chemistry}`);

    if (constraints.requireBackup) {
      const hasBackup = Array.isArray(c.useCaseTags) && c.useCaseTags.includes('backup');
      if (!hasBackup) disqualifiers.push('backup required but candidate not tagged for backup');
    }

    if (!within(c.kw, constraints.minKw, constraints.maxKw)) disqualifiers.push('kW outside constraints');
    if (!within(c.kwh, constraints.minKwh, constraints.maxKwh)) disqualifiers.push('kWh outside constraints');

    const area = Number((c as any)?.footprint?.areaSqft);
    if (typeof constraints.maxFootprintAreaSqft === 'number' && Number.isFinite(area) && area > constraints.maxFootprintAreaSqft) {
      disqualifiers.push('footprint exceeds max area constraint');
    }

    const eff = Number(c.roundTripEfficiency);
    if (!Number.isFinite(eff) || eff <= 0.5 || eff > 1) disqualifiers.push('roundTripEfficiency invalid');

    const crate = cRate(c);
    if (!Number.isFinite(crate) || crate <= 0) disqualifiers.push('invalid C-rate (kw/kwh)');
    if (Number.isFinite(crate) && Number.isFinite(c.maxC) && crate > c.maxC + 1e-6) disqualifiers.push(`C-rate too high for maxC (crate=${crate.toFixed(2)} > ${c.maxC.toFixed(2)})`);

    // Fit scoring (selection only): power + energy fit to target, small penalty for interconnection uncertainty.
    const kwFit = scoreRatio(c.kw, targetKw);
    const kwhFit = scoreRatio(c.kwh, targetKwh);
    const effFit = clamp01((eff - 0.75) / 0.25); // 0 at 0.75, 1 at 1.00
    const interconnectPenalty = c.interconnectionNotes ? 0.05 : 0;
    const utilityReviewPenalty = c.constraints?.requiresUtilityReview ? 0.05 : 0;

    const baseFit = clamp01(0.5 * kwFit + 0.4 * kwhFit + 0.1 * effFit);
    const fitScore = clamp01(baseFit - interconnectPenalty - utilityReviewPenalty);

    because.push(`fit: kwFit=${kwFit.toFixed(2)} kwhFit=${kwhFit.toFixed(2)} effFit=${effFit.toFixed(2)}`);
    because.push(`candidate: ${c.vendor} ${c.sku} ${c.kw}kW/${c.kwh}kWh rte=${(c.roundTripEfficiency * 100).toFixed(0)}% chemistry=${c.chemistry}`);
    if (c.interconnectionNotes) because.push(`interconnection: ${String(c.interconnectionNotes).slice(0, 180)}`);
    if (c.constraints?.requiresUtilityReview) because.push('interconnection: utility review likely required (flagged by library)');

    return { candidate: c, fitScore, disqualifiers, explain: because };
  });

  const filtered = ranked
    .filter((r) => r.disqualifiers.length === 0)
    .sort((a, b) => {
      if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
      const av = `${a.candidate.vendor} ${a.candidate.sku}`.toLowerCase();
      const bv = `${b.candidate.vendor} ${b.candidate.sku}`.toLowerCase();
      return av.localeCompare(bv);
    });

  if (filtered.length === 0) {
    explain.push('No candidates passed feasibility screens; returning top scored (disqualified) candidates for inspection.');
    // Still provide deterministic ordering for debugging.
    return {
      rankedCandidates: ranked
        .sort((a, b) => b.fitScore - a.fitScore || `${a.candidate.vendor} ${a.candidate.sku}`.localeCompare(`${b.candidate.vendor} ${b.candidate.sku}`))
        .slice(0, 10),
      requiredInputsMissing: [...new Set(requiredInputsMissing)],
      explain,
      playbook: playbook,
    };
  }

  return {
    rankedCandidates: filtered.slice(0, 15),
    requiredInputsMissing: [...new Set(requiredInputsMissing)],
    explain,
    playbook: playbook,
  };
}

