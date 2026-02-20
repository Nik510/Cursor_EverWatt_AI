import type { AnalysisRunV1 } from '../../../analysisRunsV1/types';
import type { DiffSummaryV1 } from '../../../analysisRunsV1/diffV1';

export type ExecutivePackDataQualityTierV1 = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type ExecutiveBatteryFitV1 = 'YES' | 'NO' | 'MAYBE' | 'UNKNOWN';

export type ExecutivePackJsonV1 = {
  schemaVersion: 'executivePackV1';
  generatedAtIso: string;
  /**
   * Provenance header: stable, required fields for downstream gating.
   * Keys are always present; values may be null where explicitly unknown.
   */
  provenanceHeader: {
    runId: string;
    revisionId: string;
    generatedAtIso: string;
    engineVersions: Record<string, string>;
    warningsSummary: {
      engineWarningsCount: number;
      topEngineWarningCodes: string[];
      missingInfoCount: number;
      topMissingInfoCodes: string[];
    };
    wizardOutputHash?: string;
    snapshotIds: {
      tariffSnapshotId: string | null;
      generationEnergySnapshotId: string | null;
      addersSnapshotId: string | null;
      exitFeesSnapshotId: string | null;
    };
  };
  header: {
    title: string;
    projectId: string;
    projectName?: string;
    address?: string;
    utilityTerritory?: string;
    reportId?: string;
  };
  linkage: {
    runId: string;
    revisionId: string;
    wizardOutputHash?: string;
  };
  provenance: {
    engineVersions: Record<string, string>;
    snapshotIds: {
      tariffSnapshotId?: string | null;
      generationEnergySnapshotId?: string | null;
      addersSnapshotId?: string | null;
      exitFeesSnapshotId?: string | null;
    };
    analysisRunCreatedAtIso?: string;
  };
  topFindings: string[];
  kpis: {
    annualKwhEstimate?: { value: number; confidenceTier?: string; source: string } | null;
    baseloadKw?: { value: number; confidenceTier?: string; source: string } | null;
    peakKw?: { value: number; source: string } | null;
  };
  batteryFit: { decision: ExecutiveBatteryFitV1; confidenceTier?: string; tierSource?: string; missingInfoIds: string[] };
  dataQuality: { score0to100?: number | null; tier: ExecutivePackDataQualityTierV1; reasons: string[]; missingInfoIds: string[] };
  savings: {
    status: 'DETERMINISTIC_AVAILABLE' | 'PENDING_INPUTS';
    annualUsd?: { value?: number; min?: number; max?: number; source: string } | null;
    missingInfoIds: string[];
  };
  whatWeNeedToFinalize: { requiredMissingInfo: Array<{ id: string; category?: string; description?: string }>; recommendedMissingInfo: Array<{ id: string; category?: string; description?: string }> };
  nextBestActions: Array<{ actionId: string; type?: string; label?: string; status?: string; apiHint?: unknown }>;
  confidenceAndAssumptions: string[];
  diffSincePreviousRun?: DiffSummaryV1;
  payloadRefs: {
    internalEngineeringReportJsonRef: string;
    analysisRunSnapshotRef: string;
    wizardOutputRef?: string;
  };
};

function stableString(x: unknown, max = 700): string {
  const s = String(x ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, Math.max(0, max - 14)) + ' …(truncated)' : s;
}

function stableEngineVersions(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const k of Object.keys(v).sort((a, b) => a.localeCompare(b))) {
    const val = stableString((v as any)[k], 140);
    if (val) out[k] = val;
  }
  return out;
}

function normalizeWarningsSummary(v: unknown): ExecutivePackJsonV1['provenanceHeader']['warningsSummary'] {
  const ws: any = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const topEngine = Array.isArray(ws?.topEngineWarningCodes) ? (ws.topEngineWarningCodes as any[]).map(String) : [];
  const topMissing = Array.isArray(ws?.topMissingInfoCodes) ? (ws.topMissingInfoCodes as any[]).map(String) : [];
  const clean = (arr: string[]) => Array.from(new Set(arr.map((x) => stableString(x, 120)).filter(Boolean))).sort((a, b) => a.localeCompare(b)).slice(0, 20);
  return {
    engineWarningsCount: Number(ws?.engineWarningsCount) || clean(topEngine).length,
    topEngineWarningCodes: clean(topEngine),
    missingInfoCount: Number(ws?.missingInfoCount) || clean(topMissing).length,
    topMissingInfoCodes: clean(topMissing),
  };
}

function uniqSorted(items: string[], max = 200): string[] {
  const set = new Set<string>();
  for (const it of items) {
    const s = stableString(it, 160);
    if (!s) continue;
    set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, max);
}

function asNumber(x: unknown): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function mapBatteryFit(tierRaw: string): ExecutiveBatteryFitV1 {
  const t = stableString(tierRaw, 60).toUpperCase();
  if (!t) return 'UNKNOWN';
  if (t.includes('DO_NOT_PROCEED') || t.includes('NO') || t.includes('REJECT')) return 'NO';
  if (t.includes('STRONG') && t.includes('YES')) return 'YES';
  if (t.includes('PROCEED') || t.includes('YES') || t.includes('RECOMMEND')) return 'YES';
  if (t.includes('MAYBE') || t.includes('CONSIDER') || t.includes('BORDERLINE')) return 'MAYBE';
  return 'UNKNOWN';
}

function computeDataQualityTier(args: { coverage: any; warningsSummary: any; wizardScore0to100: number | null }): { tier: ExecutivePackDataQualityTierV1; reasons: string[] } {
  const reasons: string[] = [];
  const score = args.wizardScore0to100;
  const hasInterval = Boolean(args.coverage?.hasInterval);
  const days = asNumber(args.coverage?.intervalDays);
  const engineWarningsCount = asNumber(args.warningsSummary?.engineWarningsCount) ?? 0;
  const missingInfoCount = asNumber(args.warningsSummary?.missingInfoCount) ?? 0;

  if (Number.isFinite(Number(score))) reasons.push(`wizardScore=${Math.trunc(Number(score))}/100`);
  reasons.push(`hasInterval=${String(hasInterval)}`);
  if (days !== null) reasons.push(`intervalDays=${String(days)}`);
  reasons.push(`engineWarnings=${String(engineWarningsCount)}`);
  reasons.push(`missingInfo=${String(missingInfoCount)}`);

  // Deterministic mapping (presentation-only).
  if (Number.isFinite(Number(score))) {
    const s = Number(score);
    if (s >= 85) return { tier: 'HIGH', reasons };
    if (s >= 65) return { tier: 'MEDIUM', reasons };
    return { tier: 'LOW', reasons };
  }

  if (!hasInterval) return { tier: 'LOW', reasons };
  if (days !== null && days < 14) return { tier: 'LOW', reasons };
  if (engineWarningsCount > 0) return { tier: 'MEDIUM', reasons };
  if (missingInfoCount > 10) return { tier: 'MEDIUM', reasons };
  return { tier: 'MEDIUM', reasons };
}

function parseWizardTopFindings(wizardOutput: any): string[] {
  const findings: any[] = Array.isArray(wizardOutput?.findings) ? wizardOutput.findings : [];
  const out: string[] = [];
  for (const f of findings) {
    if (out.length >= 5) break;
    const title = stableString(f?.title, 120);
    const bullets = Array.isArray(f?.summaryBullets) ? (f.summaryBullets as any[]).map((x) => stableString(x, 220)).filter(Boolean) : [];
    const head = bullets[0] || '';
    const line = title ? (head ? `${title}: ${head}` : title) : head;
    if (line) out.push(line);
  }
  return uniqSorted(out, 10).slice(0, 5);
}

function extractWizardMissingInfoSummary(wizardOutput: any): {
  required: Array<{ id: string; category?: string; description?: string }>;
  recommended: Array<{ id: string; category?: string; description?: string }>;
} {
  const summary: any = wizardOutput?.missingInfoSummary ?? null;
  const coerce = (arr: any): Array<{ id: string; category?: string; description?: string }> => {
    const a = Array.isArray(arr) ? arr : [];
    const mapped = a
      .filter((x) => x && typeof x === 'object')
      .map((x) => ({
        id: stableString(x?.id, 180),
        category: stableString(x?.category, 60) || undefined,
        description: stableString(x?.description, 300) || undefined,
      }))
      .filter((x) => Boolean(x.id));
    mapped.sort((p, q) => p.id.localeCompare(q.id) || String(p.description || '').localeCompare(String(q.description || '')));
    return mapped.slice(0, 80);
  };
  return {
    required: coerce(summary?.required),
    recommended: coerce(summary?.recommended),
  };
}

function extractWizardNextActions(wizardOutput: any): ExecutivePackJsonV1['nextBestActions'] {
  const steps: any[] = Array.isArray(wizardOutput?.wizardSteps) ? wizardOutput.wizardSteps : [];
  const actions: Array<{ actionId: string; type?: string; label?: string; status?: string; apiHint?: unknown }> = [];
  for (const s of steps) {
    const req = Array.isArray(s?.requiredActions) ? (s.requiredActions as any[]) : [];
    for (const a of req) {
      const actionId = stableString(a?.actionId, 180);
      if (!actionId) continue;
      actions.push({
        actionId,
        ...(stableString(a?.type, 80) ? { type: stableString(a.type, 80) } : {}),
        ...(stableString(a?.label, 220) ? { label: stableString(a.label, 220) } : {}),
        ...(stableString(a?.status, 40) ? { status: stableString(a.status, 40) } : {}),
        ...(a && typeof a === 'object' && Object.prototype.hasOwnProperty.call(a, 'apiHint') ? { apiHint: a.apiHint } : {}),
      });
      if (actions.length >= 200) break;
    }
    if (actions.length >= 200) break;
  }

  // Deterministic ordering: NEEDS_INPUT first, then OPTIONAL, then DONE, then alpha by actionId.
  const rank = (s: any): number => {
    const x = stableString(s, 40).toUpperCase();
    if (x === 'NEEDS_INPUT') return 0;
    if (x === 'BLOCKED') return 1;
    if (x === 'OPTIONAL') return 2;
    if (x === 'DONE') return 3;
    return 9;
  };
  actions.sort((a, b) => rank(a.status) - rank(b.status) || a.actionId.localeCompare(b.actionId));

  const uniq = new Map<string, (typeof actions)[number]>();
  for (const a of actions) {
    if (!uniq.has(a.actionId)) uniq.set(a.actionId, a);
  }
  return Array.from(uniq.values()).slice(0, 40);
}

function extractSavingsDeterministic(reportJson: any): { annualUsd: ExecutivePackJsonV1['savings']['annualUsd']; found: boolean } {
  // Snapshot-only: only surface numbers already computed/stored.
  // Priority: v1.2 decision pack selected economics -> v1 decision pack -> legacy economics ranges.
  const v12 = reportJson?.batteryDecisionPackV1_2 ?? null;
  const selected = v12?.selected ?? null;
  const econSummary = selected?.economicsSummary ?? null;
  const annualTotal = asNumber(econSummary?.annualSavingsTotal);
  if (annualTotal !== null) return { found: true, annualUsd: { value: annualTotal, source: 'reportJson.batteryDecisionPackV1_2.selected.economicsSummary.annualSavingsTotal' } };

  const v1 = reportJson?.batteryDecisionPackV1 ?? null;
  const opts: any[] = Array.isArray(v1?.options) ? v1.options : [];
  const top = opts[0] || null;
  const topSav = asNumber(top?.savingsAnnual?.totalUsd);
  if (topSav !== null) return { found: true, annualUsd: { value: topSav, source: 'reportJson.batteryDecisionPackV1.options[0].savingsAnnual.totalUsd' } };

  const opp = reportJson?.storageOpportunityPackV1 ?? null;
  const bo = opp?.batteryOpportunityV1 ?? null;
  const range = bo?.savingsEstimateAnnual?.total ?? null;
  const min = asNumber(range?.min);
  const max = asNumber(range?.max);
  if (min !== null && max !== null) return { found: true, annualUsd: { min, max, source: 'reportJson.storageOpportunityPackV1.batteryOpportunityV1.savingsEstimateAnnual.total' } };

  const econ = opp?.storageEconomicsV1 ?? null;
  const gross = econ?.cashflow?.annualGrossSavingsUsdRange ?? null;
  const g0 = Array.isArray(gross) ? asNumber(gross[0]) : null;
  const g1 = Array.isArray(gross) ? asNumber(gross[1]) : null;
  if (g0 !== null && g1 !== null) return { found: true, annualUsd: { min: g0, max: g1, source: 'reportJson.storageOpportunityPackV1.storageEconomicsV1.cashflow.annualGrossSavingsUsdRange' } };

  return { found: false, annualUsd: null };
}

function buildConfidenceAndAssumptions(args: {
  dataQualityTier: ExecutivePackDataQualityTierV1;
  coverage: any;
  warningsSummary: any;
  batteryTierSource?: string;
}): string[] {
  const lines: string[] = [];
  const hasInterval = Boolean(args.coverage?.hasInterval);
  const tariffMatchStatus = stableString(args.coverage?.tariffMatchStatus, 60) || 'unknown';
  const supplyType = stableString(args.coverage?.supplyProviderType, 60) || 'unknown';

  lines.push(`This report is generated from stored run snapshots only (no recompute on GET).`);
  lines.push(`Tariff match status: ${tariffMatchStatus}. Supply provider type: ${supplyType}.`);

  if (!hasInterval) lines.push(`Interval data was missing for this run; interval-derived KPIs and battery feasibility signals may be incomplete.`);
  if (args.dataQualityTier === 'LOW') lines.push(`Confidence is constrained by missing inputs and/or low coverage; treat findings as directional until required items are provided.`);
  if (args.dataQualityTier === 'HIGH') lines.push(`Inputs and coverage appear strong; findings should be stable within the engine’s deterministic assumptions.`);

  const ew = Number(args.warningsSummary?.engineWarningsCount) || 0;
  const mi = Number(args.warningsSummary?.missingInfoCount) || 0;
  if (ew) lines.push(`Engine warnings were present (${String(ew)}). Review the Engineering Pack for full trace and warning codes.`);
  if (mi) lines.push(`Missing-info items were present (${String(mi)}). This pack enumerates required/recommended items explicitly.`);

  if (args.batteryTierSource) lines.push(`Battery fit is derived strictly from stored decision tiers (${args.batteryTierSource}); no additional screening rules are applied here.`);

  return lines;
}

export function buildExecutivePackJsonV1(args: {
  title?: string;
  project: { projectId: string; projectName?: string; address?: string; utilityTerritory?: string; reportId?: string };
  revisionId: string;
  runId: string;
  generatedAtIso: string;
  analysisRun: AnalysisRunV1;
  reportJson: unknown;
  wizardOutput?: unknown | null;
  wizardOutputHash?: string | null;
  diffSincePreviousRun?: DiffSummaryV1 | null;
}): ExecutivePackJsonV1 {
  const nowIso = stableString(args.generatedAtIso) || new Date().toISOString();
  const revisionId = stableString(args.revisionId, 120) || 'missing_revision_id';
  const runId = stableString(args.runId, 120) || 'missing_run_id';

  const projectId = stableString(args.project?.projectId, 120) || 'missing_project_id';
  const projectName = stableString(args.project?.projectName, 160) || undefined;
  const address = stableString(args.project?.address, 240) || undefined;
  const utilityTerritory = stableString(args.project?.utilityTerritory, 40) || undefined;
  const reportId = stableString(args.project?.reportId, 140) || undefined;

  const reportJson: any = args.reportJson && typeof args.reportJson === 'object' ? (args.reportJson as any) : {};
  const trace: any = reportJson?.analysisTraceV1 ?? null;
  const coverage: any = trace?.coverage ?? {};
  const warningsSummary: any = trace?.warningsSummary ?? args.analysisRun?.warningsSummary ?? {};
  const wizardOutput: any = args.wizardOutput && typeof args.wizardOutput === 'object' ? (args.wizardOutput as any) : null;

  const wizardScore = wizardOutput ? asNumber(wizardOutput?.dataQuality?.score0to100) : null;
  const wizardMissingIds = wizardOutput ? uniqSorted(Array.isArray(wizardOutput?.dataQuality?.missingInfoIds) ? wizardOutput.dataQuality.missingInfoIds : []) : [];
  const dqTier = computeDataQualityTier({ coverage, warningsSummary, wizardScore0to100: wizardScore });

  const topFindings = wizardOutput ? parseWizardTopFindings(wizardOutput) : uniqSorted([], 10);

  const intervalInsights: any = reportJson?.intervalInsightsV1 ?? null;
  const baseloadKw = asNumber(intervalInsights?.baseloadKw);
  const baseloadConfidence = stableString(intervalInsights?.baseloadConfidence, 40) || undefined;
  const peakKw = asNumber(intervalInsights?.peakKw);

  const weatherRegression: any = reportJson?.weatherRegressionV1 ?? null;
  const annualKwh = asNumber(weatherRegression?.annualization?.annualKwhEstimate);
  const annualConf = stableString(weatherRegression?.annualization?.confidenceTier, 40) || stableString(weatherRegression?.confidenceTier, 40) || undefined;

  // Battery fit + missing-info
  const v12 = reportJson?.batteryDecisionPackV1_2 ?? null;
  const batteryTierSource = stableString(v12?.recommendationV1?.recommendationTier || v12?.recommendationV1?.tier || '', 80) || undefined;
  const batteryConfidenceTier = stableString(v12?.confidenceTier, 40) || undefined;
  const batteryDecision = mapBatteryFit(batteryTierSource || '');
  const batteryMissing = uniqSorted(Array.isArray(v12?.missingInfo) ? (v12.missingInfo as any[]).map(String) : []);

  const savingsDet = extractSavingsDeterministic(reportJson);

  const missingSummary = wizardOutput ? extractWizardMissingInfoSummary(wizardOutput) : { required: [], recommended: [] };
  const requiredMissingIds = uniqSorted(missingSummary.required.map((m) => m.id));
  const recommendedMissingIds = uniqSorted(missingSummary.recommended.map((m) => m.id));
  const savingsMissingIds = uniqSorted([...requiredMissingIds, ...batteryMissing, ...wizardMissingIds]).slice(0, 120);

  const nextBestActions = wizardOutput ? extractWizardNextActions(wizardOutput) : [];

  const confidenceAndAssumptions = buildConfidenceAndAssumptions({
    dataQualityTier: dqTier.tier,
    coverage,
    warningsSummary,
    batteryTierSource,
  });

  const engineVersions = (() => {
    const fromRun = stableEngineVersions(args.analysisRun?.engineVersions);
    const fromReport = stableEngineVersions(reportJson?.engineVersions);
    return { ...fromReport, ...fromRun };
  })();

  const snapshotIds = {
    tariffSnapshotId: stableString(args.analysisRun?.provenance?.tariffSnapshotId ?? trace?.provenance?.tariffSnapshotId ?? null, 120) || null,
    generationEnergySnapshotId: stableString(args.analysisRun?.provenance?.generationEnergySnapshotId ?? trace?.provenance?.generationEnergySnapshotId ?? null, 120) || null,
    addersSnapshotId: stableString(args.analysisRun?.provenance?.addersSnapshotId ?? trace?.provenance?.addersSnapshotId ?? null, 120) || null,
    exitFeesSnapshotId: stableString(args.analysisRun?.provenance?.exitFeesSnapshotId ?? trace?.provenance?.exitFeesSnapshotId ?? null, 120) || null,
  };

  const wizardOutputHash = stableString(args.wizardOutputHash, 128) || undefined;
  const wizardOutputRef = wizardOutput ? `wizardOutput:${reportId || 'session'}:${wizardOutputHash || 'missing_hash'}` : undefined;
  const warningsSummaryNormalized = normalizeWarningsSummary(warningsSummary);

  // Savings rule: never claim unless deterministic number/range exists in snapshot.
  const savingsStatus = savingsDet.found ? 'DETERMINISTIC_AVAILABLE' : 'PENDING_INPUTS';

  return {
    schemaVersion: 'executivePackV1',
    generatedAtIso: nowIso,
    provenanceHeader: {
      runId,
      revisionId,
      generatedAtIso: nowIso,
      engineVersions,
      warningsSummary: warningsSummaryNormalized,
      ...(wizardOutputHash ? { wizardOutputHash } : {}),
      snapshotIds,
    },
    header: {
      title: stableString(args.title, 140) || 'Executive Report Pack (v1)',
      projectId,
      ...(projectName ? { projectName } : {}),
      ...(address ? { address } : {}),
      ...(utilityTerritory ? { utilityTerritory } : {}),
      ...(reportId ? { reportId } : {}),
    },
    linkage: {
      runId,
      revisionId,
      ...(wizardOutputHash ? { wizardOutputHash } : {}),
    },
    provenance: {
      engineVersions,
      snapshotIds,
      ...(stableString((args.analysisRun as any)?.createdAtIso, 60) ? { analysisRunCreatedAtIso: stableString((args.analysisRun as any).createdAtIso, 60) } : {}),
    },
    topFindings,
    kpis: {
      annualKwhEstimate: annualKwh !== null ? { value: annualKwh, ...(annualConf ? { confidenceTier: annualConf } : {}), source: 'reportJson.weatherRegressionV1.annualization.annualKwhEstimate' } : null,
      baseloadKw: baseloadKw !== null ? { value: baseloadKw, ...(baseloadConfidence ? { confidenceTier: baseloadConfidence } : {}), source: 'reportJson.intervalInsightsV1.baseloadKw' } : null,
      peakKw: peakKw !== null ? { value: peakKw, source: 'reportJson.intervalInsightsV1.peakKw' } : null,
    },
    batteryFit: {
      decision: batteryDecision,
      ...(batteryConfidenceTier ? { confidenceTier: batteryConfidenceTier } : {}),
      ...(batteryTierSource ? { tierSource: batteryTierSource } : {}),
      missingInfoIds: batteryMissing,
    },
    dataQuality: {
      ...(wizardScore !== null ? { score0to100: wizardScore } : { score0to100: null }),
      tier: dqTier.tier,
      reasons: dqTier.reasons,
      missingInfoIds: wizardMissingIds,
    },
    savings: {
      status: savingsStatus,
      ...(savingsDet.found ? { annualUsd: savingsDet.annualUsd } : { annualUsd: null }),
      missingInfoIds: savingsMissingIds,
    },
    whatWeNeedToFinalize: {
      requiredMissingInfo: missingSummary.required,
      recommendedMissingInfo: missingSummary.recommended,
    },
    nextBestActions,
    confidenceAndAssumptions,
    ...(args.diffSincePreviousRun ? { diffSincePreviousRun: args.diffSincePreviousRun } : {}),
    payloadRefs: {
      internalEngineeringReportJsonRef: `analysisRun:${runId}:snapshot.reportJson`,
      analysisRunSnapshotRef: `analysisRun:${runId}:snapshot`,
      ...(wizardOutputRef ? { wizardOutputRef } : {}),
    },
  };
}

