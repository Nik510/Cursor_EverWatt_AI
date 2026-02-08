import type { UtilityInputs } from '../utilityIntelligence/types';
import type { ProgramCatalogEntry, ProgramMatchResult } from './types';
import { computeDrOperationalFitV1 } from './dr/operationalFit';

import pgeCatalogJson from './catalogs/pge_programs_v1.json';

type CatalogPayload = { version: string; lastUpdated: string; entries: ProgramCatalogEntry[] };
const PGE_CATALOG = pgeCatalogJson as unknown as CatalogPayload;

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

function normNaics(s: string | undefined | null): string {
  return String(s || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^0-9]+/g, '');
}

function prefixMatch(naics: string, prefixes: string[] | undefined): boolean {
  const n = normNaics(naics);
  if (!n) return false;
  const ps = Array.isArray(prefixes) ? prefixes.map((p) => normNaics(p)).filter(Boolean) : [];
  if (!ps.length) return true; // no include list => treat as not restricting
  return ps.some((p) => n.startsWith(p));
}

function prefixExcluded(naics: string, prefixes: string[] | undefined): boolean {
  const n = normNaics(naics);
  if (!n) return false;
  const ps = Array.isArray(prefixes) ? prefixes.map((p) => normNaics(p)).filter(Boolean) : [];
  if (!ps.length) return false;
  return ps.some((p) => n.startsWith(p));
}

function hasSegment(inputs: UtilityInputs, entry: ProgramCatalogEntry): boolean {
  const segs = Array.isArray(entry.customerSegments) ? entry.customerSegments.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean) : [];
  if (!segs.length) return true;
  const ct = String(inputs.customerType || '').trim().toLowerCase();
  return ct ? segs.includes(ct) : false;
}

export function matchPrograms(args: {
  inputs: UtilityInputs;
  derived: {
    peakKw?: number;
    provenPeakKw?: number;
    monthlyKwh?: number;
    provenMonthlyKwh?: number;
    provenAnnualKwhEstimate?: { annualKwhEstimate: number; monthsUsed: number; confidence: number; because: string[] };
    annualKwh?: number;
    scheduleBucket?: '24_7' | 'business_hours' | 'mixed' | 'unknown';
    loadShiftScore?: number;
    hasIntervalData?: boolean;
    hasAdvancedMetering?: boolean;
    intervalKw?: Array<{ timestampIso: string; kw: number }>;
    timezone?: string;
    provenTouExposureSummary?: { peakEnergyPct: number; offPeakEnergyPct: number; month: string; timezone: string; rateIdUsed: string };
  };
  catalog?: ProgramCatalogEntry[];
}): ProgramMatchResult[] {
  const territory = normTerritory(args.inputs.utilityTerritory);
  const catalog = args.catalog || (territory === 'PGE' || territory === 'PG&E' ? PGE_CATALOG.entries : []);

  const out: ProgramMatchResult[] = [];
  for (const entry of catalog) {
    const because: string[] = [];
    const requiredInputsMissing: string[] = [];
    const flags: string[] = [];

    // Territory match required
    const entryTerr = normTerritory(entry.utilityTerritory);
    if (!territory || territory !== entryTerr) {
      out.push({
        programId: entry.programId,
        matchStatus: 'unlikely',
        score: 0,
        because: [`Territory mismatch (entry=${entryTerr || '(missing)'} vs site=${territory || '(missing)'}).`],
        requiredInputsMissing: territory ? [] : ['Utility territory required to match programs.'],
        flags: ['territory_mismatch'],
      });
      continue;
    }

    because.push(`Territory matched: ${territory}.`);

    // Customer segment gating (if provided)
    if (Array.isArray(entry.customerSegments) && entry.customerSegments.length) {
      const ok = hasSegment(args.inputs, entry);
      if (!String(args.inputs.customerType || '').trim()) {
        requiredInputsMissing.push('Customer type required for this program (segment-gated).');
      } else if (!ok) {
        because.push(`Customer type '${args.inputs.customerType}' not in program segments [${entry.customerSegments.join(', ')}].`);
        flags.push('segment_mismatch');
      } else {
        because.push(`Customer type '${args.inputs.customerType}' matches program segments.`);
      }
    }

    // NAICS include/exclude prefix rules
    const naics = normNaics(args.inputs.naicsCode);
    const hasNaicsRules = (Array.isArray(entry.naicsInclude) && entry.naicsInclude.length) || (Array.isArray(entry.naicsExclude) && entry.naicsExclude.length);
    if (hasNaicsRules) {
      if (!naics) {
        requiredInputsMissing.push('NAICS code required for this program.');
      } else {
        const excluded = prefixExcluded(naics, entry.naicsExclude);
        if (excluded) {
          because.push(`NAICS ${naics} excluded by naicsExclude prefixes.`);
          flags.push('naics_excluded');
        } else if (!prefixMatch(naics, entry.naicsInclude)) {
          because.push(`NAICS ${naics} not included by naicsInclude prefixes.`);
          flags.push('naics_not_included');
        } else {
          because.push(`NAICS ${naics} matches include/exclude rules.`);
        }
      }
    }

    // Thresholds
    if (typeof entry.eligibility.minPeakKw === 'number') {
      const pk = Number.isFinite(args.derived.provenPeakKw ?? NaN) ? args.derived.provenPeakKw : args.derived.peakKw;
      if (!Number.isFinite(pk ?? NaN)) {
        requiredInputsMissing.push('Peak kW required for this program (minPeakKw gate).');
      } else if ((pk as number) < entry.eligibility.minPeakKw) {
        because.push(
          `Peak kW ${Number(pk).toFixed(1)} < minPeakKw ${entry.eligibility.minPeakKw} (${Number.isFinite(args.derived.provenPeakKw ?? NaN) ? 'proven' : 'derived'}).`
        );
        flags.push('below_minPeakKw');
      } else {
        because.push(
          `Peak kW ${Number(pk).toFixed(1)} meets minPeakKw ${entry.eligibility.minPeakKw} (${Number.isFinite(args.derived.provenPeakKw ?? NaN) ? 'proven' : 'derived'}).`
        );
      }
    }

    if (typeof entry.eligibility.minMonthlyKwh === 'number') {
      const mk = Number.isFinite(args.derived.provenMonthlyKwh ?? NaN) ? args.derived.provenMonthlyKwh : args.derived.monthlyKwh;
      if (!Number.isFinite(mk ?? NaN)) {
        requiredInputsMissing.push('Monthly kWh required for this program (minMonthlyKwh gate).');
      } else if ((mk as number) < entry.eligibility.minMonthlyKwh) {
        because.push(
          `Monthly kWh ${Number(mk).toFixed(0)} < minMonthlyKwh ${entry.eligibility.minMonthlyKwh} (${Number.isFinite(args.derived.provenMonthlyKwh ?? NaN) ? 'proven' : 'derived'}).`
        );
        flags.push('below_minMonthlyKwh');
      } else {
        because.push(
          `Monthly kWh ${Number(mk).toFixed(0)} meets minMonthlyKwh ${entry.eligibility.minMonthlyKwh} (${Number.isFinite(args.derived.provenMonthlyKwh ?? NaN) ? 'proven' : 'derived'}).`
        );
      }
    }

    if (typeof entry.eligibility.minAnnualKwh === 'number') {
      const est = args.derived.provenAnnualKwhEstimate;
      const ak = Number.isFinite(est?.annualKwhEstimate ?? NaN) ? Number(est!.annualKwhEstimate) : args.derived.annualKwh;
      const usedEstimate = Number.isFinite(est?.annualKwhEstimate ?? NaN);

      if (!Number.isFinite(ak ?? NaN)) {
        requiredInputsMissing.push('Annual kWh required for this program (minAnnualKwh gate).');
      } else {
        if (usedEstimate && est) {
          because.push(
            `Annual kWh estimated as ${Number(ak).toFixed(0)} using ${est.monthsUsed} month(s) (confidence ${Number(est.confidence).toFixed(2)}).`
          );
        }

        if ((ak as number) < entry.eligibility.minAnnualKwh) {
          because.push(`Annual kWh ${Number(ak).toFixed(0)} < minAnnualKwh ${entry.eligibility.minAnnualKwh}${usedEstimate ? ' (estimated)' : ''}.`);
          flags.push('below_minAnnualKwh');
        } else {
          because.push(`Annual kWh ${Number(ak).toFixed(0)} meets minAnnualKwh ${entry.eligibility.minAnnualKwh}${usedEstimate ? ' (estimated)' : ''}.`);
        }
      }
    }

    // Interval data requirement enforcement
    if (entry.eligibility.requiresIntervalData) {
      if (args.derived.hasIntervalData !== true) {
        requiredInputsMissing.push('Interval data required for this program.');
        flags.push('interval_required');
      } else {
        because.push('Interval data present (required).');
      }
    }

    if (entry.eligibility.requiresAdvancedMetering) {
      if (args.derived.hasAdvancedMetering !== true) {
        requiredInputsMissing.push('Advanced metering (AMI) required for this program.');
        flags.push('ami_required');
      } else {
        because.push('Advanced metering present (required).');
      }
    }

    // Score: start from base and add deterministic boosts
    let score = 0.25;
    if (entry.category === 'DEMAND_RESPONSE') score += 0.1;
    if (Number.isFinite(args.derived.loadShiftScore ?? NaN) && entry.category === 'DEMAND_RESPONSE') {
      score += 0.25 * clamp01(Number(args.derived.loadShiftScore));
      because.push('Load shifting score used to rank DR-like programs (v1 heuristic).');
    }

    // NEW: Operational fit for DR programs (additive; does not change eligibility gates).
    let drFit: ReturnType<typeof computeDrOperationalFitV1> | null = null;
    if (entry.category === 'DEMAND_RESPONSE') {
      drFit = computeDrOperationalFitV1({
        intervalKw: args.derived.intervalKw || null,
        loadShiftScore: args.derived.loadShiftScore,
        scheduleBucket: args.derived.scheduleBucket,
      });
      because.push(`Operational fit score (DR): ${drFit.drFitScore.toFixed(2)}.`);
      because.push(...drFit.because.slice(0, 4));
      // Slightly adjust ranking using operational fit.
      score = clamp01(score * (0.85 + 0.3 * drFit.drFitScore));
    }
    if (flags.includes('below_minPeakKw') || flags.includes('below_minMonthlyKwh') || flags.includes('below_minAnnualKwh')) score *= 0.2;
    if (flags.includes('naics_excluded') || flags.includes('naics_not_included') || flags.includes('segment_mismatch')) score *= 0.15;
    if (requiredInputsMissing.length) score *= 0.55;

    score = clamp01(score);

    const hardFail = flags.some((f) => ['naics_excluded', 'naics_not_included', 'segment_mismatch', 'below_minPeakKw', 'below_minMonthlyKwh', 'below_minAnnualKwh', 'territory_mismatch'].includes(f));

    let matchStatus: ProgramMatchResult['matchStatus'] = 'unknown';
    if (hardFail) matchStatus = 'unlikely';
    else if (requiredInputsMissing.length) matchStatus = 'unknown';
    else matchStatus = score >= 0.55 ? 'eligible' : 'likely_eligible';

    out.push({
      programId: entry.programId,
      matchStatus,
      score,
      because: because.length ? because : ['No rationale computed (unexpected).'],
      requiredInputsMissing: [...new Set(requiredInputsMissing)],
      ...(flags.length ? { flags } : {}),
      ...(drFit
        ? {
            drFitScore: drFit.drFitScore,
            drWhyNow: drFit.whyNow,
            drWhyNotNow: drFit.whyNotNow,
            drNextStepsChecklist: drFit.nextStepsChecklist,
          }
        : {}),
    });
  }

  return out.sort((a, b) => b.score - a.score);
}

export function getDefaultCatalogForTerritory(utilityTerritory: string | undefined | null): ProgramCatalogEntry[] {
  const t = normTerritory(utilityTerritory);
  if (t === 'PGE' || t === 'PG&E') return PGE_CATALOG.entries;
  return [];
}

