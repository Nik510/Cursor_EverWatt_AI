import type { AnalysisRunV1 } from './types';

export type DiffCategoryIdV1 =
  | 'rate_and_supply'
  | 'interval'
  | 'weather_determinants'
  | 'battery'
  | 'programs'
  | 'warnings';

export type DiffHighlightItemV1 = {
  label: string;
  before: string;
  after: string;
};

export type DiffChangedPathDetailedV1 = {
  category: DiffCategoryIdV1;
  path: string;
  beforePreview: string;
  afterPreview: string;
};

export type DiffCategorySummaryV1 = {
  category: DiffCategoryIdV1;
  changedPaths: string[]; // max 25, sorted
  highlights: DiffHighlightItemV1[]; // max 10
};

export type DiffSummaryV1 = {
  runA: { runId: string; createdAtIso: string };
  runB: { runId: string; createdAtIso: string };
  changedSections: DiffCategoryIdV1[];
  categories: DiffCategorySummaryV1[];
  changedPathsDetailed?: DiffChangedPathDetailedV1[]; // max 25
};

function stableJsonKey(v: unknown): string {
  const seen = new WeakSet<object>();
  const norm = (x: any): any => {
    if (x === null || typeof x !== 'object') return x;
    if (seen.has(x)) return '[Circular]';
    seen.add(x);
    if (Array.isArray(x)) return x.map(norm);
    const out: Record<string, any> = {};
    for (const k of Object.keys(x).sort()) out[k] = norm(x[k]);
    return out;
  };
  try {
    return JSON.stringify(norm(v));
  } catch {
    return JSON.stringify(String(v));
  }
}

function safeGet(root: any, path: Array<string | number>): unknown {
  let cur: any = root;
  for (const seg of path) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof seg === 'number') {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[seg];
      continue;
    }
    if (typeof cur !== 'object') return undefined;
    cur = cur[seg];
  }
  return cur;
}

function jsonPointer(path: Array<string | number>): string {
  const esc = (s: string) => s.replace(/~/g, '~0').replace(/\//g, '~1');
  return '/' + path.map((p) => (typeof p === 'number' ? String(p) : esc(String(p)))).join('/');
}

function boundedString(v: unknown, maxLen = 220): string {
  const s =
    v === null
      ? 'null'
      : v === undefined
        ? 'undefined'
        : typeof v === 'string'
          ? v
          : typeof v === 'number' || typeof v === 'boolean'
            ? String(v)
            : stableJsonKey(v);
  const clean = s.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, Math.max(0, maxLen - 14)) + ' …(truncated)';
}

function summarizeAlternatives(v: any): string {
  const alts = Array.isArray(v) ? v : [];
  const top = alts.slice(0, 4).map((a: any) => ({
    utility: String(a?.utility || ''),
    rateCode: String(a?.rateCode || ''),
    status: String(a?.status || ''),
    estimatedDeltaDollars: Number.isFinite(Number(a?.estimatedDeltaDollars)) ? Number(a.estimatedDeltaDollars) : null,
  }));
  return stableJsonKey(top);
}

function summarizeProgramMatches(v: any): string {
  const matches = Array.isArray(v) ? v : [];
  const top = matches.slice(0, 5).map((m: any) => ({
    programId: String(m?.programId || ''),
    matchStatus: String(m?.matchStatus || ''),
    score: Number.isFinite(Number(m?.score)) ? Number(m.score) : null,
  }));
  return stableJsonKey(top);
}

function summarizeBatteryCandidates(v: any): string {
  const cands = Array.isArray(v) ? v : [];
  const top = cands.slice(0, 3).map((c: any) => ({
    vendor: String(c?.vendor || ''),
    sku: String(c?.sku || ''),
    fitScore: Number.isFinite(Number(c?.fitScore)) ? Number(c.fitScore) : null,
    disqCount: Array.isArray(c?.disqualifiers) ? c.disqualifiers.length : 0,
  }));
  return stableJsonKey(top);
}

function comparePaths(args: { a: any; b: any; paths: Array<{ label?: string; path: Array<string | number> }> }): {
  changedPaths: string[];
  highlights: DiffHighlightItemV1[];
  changedItems: Array<{ ptr: string; label?: string; before: unknown; after: unknown }>;
} {
  const changed: Array<{ ptr: string; label?: string; before: unknown; after: unknown }> = [];
  for (const p of args.paths) {
    const before = safeGet(args.a, p.path);
    const after = safeGet(args.b, p.path);
    if (stableJsonKey(before) === stableJsonKey(after)) continue;
    changed.push({ ptr: jsonPointer(p.path), label: p.label, before, after });
  }
  const changedPaths = changed
    .map((c) => c.ptr)
    .slice()
    .sort((x, y) => x.localeCompare(y))
    .slice(0, 25);

  const highlights: DiffHighlightItemV1[] = [];
  // Deterministic highlight ordering: in the order of `paths` definition.
  for (const p of args.paths) {
    if (highlights.length >= 10) break;
    const ptr = jsonPointer(p.path);
    const item = changed.find((c) => c.ptr === ptr);
    if (!item) continue;
    highlights.push({
      label: p.label || ptr,
      before: boundedString(item.before),
      after: boundedString(item.after),
    });
  }

  return { changedPaths, highlights, changedItems: changed };
}

export function buildDiffSummaryV1(args: { runA: AnalysisRunV1; runB: AnalysisRunV1 }): DiffSummaryV1 {
  const a = (args.runA?.snapshot as any)?.reportJson ?? {};
  const b = (args.runB?.snapshot as any)?.reportJson ?? {};

  const categories: DiffCategorySummaryV1[] = [];
  const changedSections: DiffCategoryIdV1[] = [];
  const changedPathsDetailed: DiffChangedPathDetailedV1[] = [];

  const fixedOrder: Array<{ category: DiffCategoryIdV1; paths: Array<{ label?: string; path: Array<string | number> }> }> = [
    {
      category: 'rate_and_supply',
      paths: [
        { label: 'territory', path: ['summary', 'json', 'building', 'territory'] },
        { label: 'currentRateCode', path: ['summary', 'json', 'building', 'currentRateCode'] },
        { label: 'rateFit.status', path: ['summary', 'json', 'rateFit', 'status'] },
        { label: 'rateFit.confidence', path: ['summary', 'json', 'rateFit', 'confidence'] },
        { label: 'supplyStructure.supplyType', path: ['workflow', 'utility', 'insights', 'supplyStructure', 'supplyType'] },
        { label: 'supplyStructure.confidence', path: ['workflow', 'utility', 'insights', 'supplyStructure', 'confidence'] },
        // Derived summaries (stored as pseudo-paths under diff-only namespace)
        { label: 'rateFit.topAlternatives', path: ['__diff', 'rateFitTopAlternativesV1'] },
      ],
    },
    {
      category: 'interval',
      paths: [
        { label: 'coverage.hasInterval', path: ['analysisTraceV1', 'coverage', 'hasInterval'] },
        { label: 'coverage.intervalGranularity', path: ['analysisTraceV1', 'coverage', 'intervalGranularity'] },
        { label: 'coverage.intervalDays', path: ['analysisTraceV1', 'coverage', 'intervalDays'] },
        { label: 'telemetry.intervalElectric.present', path: ['telemetry', 'intervalElectricV1', 'present'] },
        { label: 'telemetry.intervalElectric.pointCount', path: ['telemetry', 'intervalElectricV1', 'pointCount'] },
        { label: 'telemetry.intervalElectric.warningCount', path: ['telemetry', 'intervalElectricV1', 'warningCount'] },
      ],
    },
    {
      category: 'weather_determinants',
      paths: [
        { label: 'weatherRegression.present', path: ['__diff', 'weatherRegressionPresentV1'] },
        { label: 'weatherRegression.r2', path: ['weatherRegressionV1', 'r2'] },
        { label: 'weatherRegression.coolingSlope', path: ['weatherRegressionV1', 'coolingSlope'] },
        { label: 'weatherRegression.heatingSlope', path: ['weatherRegressionV1', 'heatingSlope'] },
        { label: 'intervalInsights.present', path: ['__diff', 'intervalInsightsPresentV1'] },
        { label: 'versionTags', path: ['workflow', 'utility', 'insights', 'versionTags'] },
        { label: 'determinants.rulesVersionTag', path: ['workflow', 'utility', 'insights', 'determinantsPackSummary', 'rulesVersionTag'] },
        { label: 'determinants.warningsCount', path: ['__diff', 'determinantsWarningsCountV1'] },
      ],
    },
    {
      category: 'battery',
      paths: [
        { label: 'battery.gate.status', path: ['summary', 'json', 'battery', 'gate', 'status'] },
        { label: 'battery.topCandidates', path: ['__diff', 'batteryTopCandidatesV1'] },
        { label: 'storageOpportunityPack.present', path: ['__diff', 'storageOpportunityPackPresentV1'] },
        { label: 'batteryEconomics.present', path: ['__diff', 'batteryEconomicsPresentV1'] },
      ],
    },
    {
      category: 'programs',
      paths: [
        { label: 'programs.matchesCount', path: ['__diff', 'programMatchesCountV1'] },
        { label: 'programs.topMatches', path: ['__diff', 'programTopMatchesV1'] },
      ],
    },
    {
      category: 'warnings',
      paths: [
        { label: 'warnings.engineWarningsCount', path: ['analysisTraceV1', 'warningsSummary', 'engineWarningsCount'] },
        { label: 'warnings.topEngineWarningCodes', path: ['analysisTraceV1', 'warningsSummary', 'topEngineWarningCodes'] },
        { label: 'warnings.missingInfoCount', path: ['analysisTraceV1', 'warningsSummary', 'missingInfoCount'] },
        { label: 'warnings.topMissingInfoCodes', path: ['analysisTraceV1', 'warningsSummary', 'topMissingInfoCodes'] },
        { label: 'missingInputsChecklist.length', path: ['__diff', 'missingInputsChecklistCountV1'] },
      ],
    },
  ];

  const withDerived = (report: any): any => {
    const rfAlts = safeGet(report, ['summary', 'json', 'rateFit', 'alternatives']);
    const progMatches = safeGet(report, ['summary', 'json', 'programs', 'matches']);
    const battCandidates = safeGet(report, ['summary', 'json', 'battery', 'topCandidates']);
    const missingChecklist = safeGet(report, ['summary', 'json', 'missingInputsChecklist']);
    const determinantsWarnings = safeGet(report, ['workflow', 'utility', 'insights', 'determinantsPackSummary', 'warnings']);
    return {
      ...report,
      __diff: {
        rateFitTopAlternativesV1: summarizeAlternatives(rfAlts as any),
        programMatchesCountV1: Array.isArray(progMatches) ? progMatches.length : 0,
        programTopMatchesV1: summarizeProgramMatches(progMatches as any),
        batteryTopCandidatesV1: summarizeBatteryCandidates(battCandidates as any),
        missingInputsChecklistCountV1: Array.isArray(missingChecklist) ? missingChecklist.length : 0,
        weatherRegressionPresentV1: Boolean(report?.weatherRegressionV1),
        intervalInsightsPresentV1: Boolean(report?.intervalInsightsV1),
        storageOpportunityPackPresentV1: Boolean(report?.storageOpportunityPackV1),
        batteryEconomicsPresentV1: Boolean(report?.batteryEconomicsV1),
        determinantsWarningsCountV1: Array.isArray(determinantsWarnings) ? determinantsWarnings.length : 0,
      },
    };
  };

  const aa = withDerived(a);
  const bb = withDerived(b);

  for (const cat of fixedOrder) {
    const { changedPaths, highlights, changedItems } = comparePaths({ a: aa, b: bb, paths: cat.paths });
    if (changedPaths.length) changedSections.push(cat.category);
    categories.push({ category: cat.category, changedPaths, highlights });

    if (changedPathsDetailed.length < 25 && changedPaths.length) {
      for (const ptr of changedPaths) {
        if (changedPathsDetailed.length >= 25) break;
        const item = changedItems.find((c) => c.ptr === ptr);
        if (!item) continue;
        changedPathsDetailed.push({
          category: cat.category,
          path: ptr,
          beforePreview: boundedString(item.before, 200),
          afterPreview: boundedString(item.after, 200),
        });
      }
    }
  }

  return {
    runA: { runId: String(args.runA.runId), createdAtIso: String(args.runA.createdAtIso) },
    runB: { runId: String(args.runB.runId), createdAtIso: String(args.runB.createdAtIso) },
    changedSections,
    categories,
    ...(changedPathsDetailed.length ? { changedPathsDetailed } : {}),
  };
}

