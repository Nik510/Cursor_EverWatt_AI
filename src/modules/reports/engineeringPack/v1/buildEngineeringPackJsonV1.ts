import type { AnalysisRunV1 } from '../../../analysisRunsV1/types';
import { runVerifierV1 } from '../../../verifierV1/runVerifierV1';
import { evaluateClaimsPolicyV1 } from '../../../claimsPolicyV1/evaluateClaimsPolicyV1';

type MissingInfoLike = {
  id?: string;
  category?: string;
  severity?: string;
  description?: string;
  details?: unknown;
};

export type EngineeringPackJsonV1 = {
  schemaVersion: 'engineeringPackV1';
  generatedAtIso: string;
  /** Deterministic verification layer (anti-hallucination firewall). */
  verifierResultV1?: unknown;
  /** Lightweight badge-ready summary (stable keys). */
  verificationSummaryV1?: { status: string; passCount: number; warnCount: number; failCount: number };
  /** Claims gating policy derived from stored snapshots only. */
  claimsPolicyV1?: unknown;
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
    /** Optional: wizard output hash when the pack was generated. */
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
  sections: {
    analysisTrace: {
      coverage?: unknown;
      steps?: unknown;
      ranModules?: unknown;
      skippedModules?: unknown;
      warningsSummary?: unknown;
    };
    effectiveRateContext: {
      currentRate?: unknown;
      currentRateSelectionSource?: unknown;
      rateFit?: unknown;
      tariffMatchStatus?: unknown;
    };
    supplyStructure: unknown | null;
    intervalInsights: unknown | null;
    determinantsPackSummary: unknown | null;
    weatherRegression: unknown | null;
    /** Snapshot-only Truth Engine detail view (bounded). */
    truthEngineV1: unknown | null;
    battery: {
      storageOpportunityPackV1?: unknown | null;
      batteryEconomicsV1?: unknown | null;
      batteryDecisionPackV1?: unknown | null;
      batteryDecisionPackV1_2?: unknown | null;
    };
    auditDrawer: {
      present: boolean;
      version?: string;
      moneyExplainersCount?: number;
    };
    warningsAndMissingInfo: {
      engineWarnings: Array<{ code: string; details?: unknown }>;
      missingInfo: Array<{ id: string; category?: string; severity?: string; description?: string }>;
    };
    /** Snapshot-only Scenario Lab v1 (bounded). */
    scenarioLabV1?: unknown | null;
  };
  /** Full snapshot payload link-out (kept as inline ref ids, not URLs). */
  payloadRefs: {
    internalEngineeringReportJsonRef: string;
    analysisRunSnapshotRef: string;
    wizardOutputRef?: string;
  };
};

function stableString(x: unknown, max = 600): string {
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

function normalizeWarningsSummary(v: unknown): EngineeringPackJsonV1['provenanceHeader']['warningsSummary'] {
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

function sortMissingInfo(a: any, b: any): number {
  const sevRank = (s: any): number => {
    const x = String(s ?? '').toLowerCase();
    if (x === 'blocking' || x === 'required') return 0;
    if (x === 'warning') return 1;
    return 2;
  };
  const ra = sevRank(a?.severity);
  const rb = sevRank(b?.severity);
  if (ra !== rb) return ra - rb;
  const ida = String(a?.id ?? '');
  const idb = String(b?.id ?? '');
  if (ida !== idb) return ida.localeCompare(idb);
  return String(a?.description ?? '').localeCompare(String(b?.description ?? ''));
}

function normalizeMissingInfo(list: unknown, max = 400): EngineeringPackJsonV1['sections']['warningsAndMissingInfo']['missingInfo'] {
  const arr: MissingInfoLike[] = Array.isArray(list) ? (list as any[]) : [];
  const out = arr
    .filter((it) => it && typeof it === 'object')
    .map((it) => ({
      id: stableString(it.id, 160),
      category: stableString(it.category, 60) || undefined,
      severity: stableString(it.severity, 40) || undefined,
      description: stableString(it.description, 600) || undefined,
    }))
    .filter((it) => Boolean(it.id || it.description))
    .slice()
    .sort(sortMissingInfo)
    .slice(0, max);

  // deterministic uniq by (id, description)
  const seen = new Set<string>();
  const uniq: typeof out = [];
  for (const it of out) {
    const key = `${it.id}::${it.description || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(it);
  }
  return uniq;
}

function normalizeEngineWarnings(reportJson: any): Array<{ code: string; details?: unknown }> {
  // Snapshot-only: prefer analysisTraceV1.engineWarnings when present, else best-effort from warningsSummary.
  const trace = reportJson?.analysisTraceV1 ?? null;
  const list = Array.isArray(trace?.engineWarnings) ? (trace.engineWarnings as any[]) : [];
  const out: Array<{ code: string; details?: unknown }> = [];
  for (const w of list) {
    const code = stableString(w?.code || w?.id || '', 120);
    if (!code) continue;
    out.push({
      code,
      ...(w && typeof w === 'object' && Object.prototype.hasOwnProperty.call(w, 'details') ? { details: (w as any).details } : {}),
    });
    if (out.length >= 200) break;
  }
  out.sort((a, b) => a.code.localeCompare(b.code));
  return out;
}

export function buildEngineeringPackJsonV1(args: {
  title?: string;
  project: { projectId: string; projectName?: string; address?: string; utilityTerritory?: string; reportId?: string };
  revisionId: string;
  runId: string;
  generatedAtIso: string;
  analysisRun: AnalysisRunV1;
  /** Stored internal engineering report JSON from analysisRun.snapshot.reportJson. */
  reportJson: unknown;
  /** Stored wizard output JSON (optional). */
  wizardOutput?: unknown | null;
  wizardOutputHash?: string | null;
}): EngineeringPackJsonV1 {
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
  const workflow: any = reportJson?.workflow ?? null;
  const summaryJson: any = reportJson?.summary?.json ?? null;

  const currentRate = workflow?.utility?.inputs?.currentRate ?? summaryJson?.building?.currentRate ?? null;
  const currentRateSelectionSource = workflow?.utility?.inputs?.currentRateSelectionSource ?? summaryJson?.building?.currentRateSelectionSource ?? null;
  const rateFit = summaryJson?.rateFit ?? null;
  const tariffMatchStatus = trace?.coverage?.tariffMatchStatus ?? null;

  const supplyStructure = workflow?.utility?.insights?.supplyStructure ?? null;
  const intervalInsights = reportJson?.intervalInsightsV1 ?? null;
  const determinantsPackSummary = workflow?.utility?.insights?.determinantsPackSummary ?? null;
  const weatherRegression = reportJson?.weatherRegressionV1 ?? null;

  const truthEngineV1 = (() => {
    const truth: any = reportJson?.truthSnapshotV1 ?? reportJson?.workflow?.truthSnapshotV1 ?? null;
    if (!truth || typeof truth !== 'object' || String(truth?.schemaVersion) !== 'truthSnapshotV1') return null;
    const cps: any[] = Array.isArray(truth?.changepointsV1) ? truth.changepointsV1 : [];
    const anoms: any[] = Array.isArray(truth?.anomalyLedgerV1) ? truth.anomalyLedgerV1 : [];
    const peakHours: any[] = Array.isArray(truth?.residualMapsV1?.peakResidualHours) ? truth.residualMapsV1.peakResidualHours : [];
    return {
      coverage: truth?.coverage ?? null,
      baselineModelV1: truth?.baselineModelV1 ?? null,
      truthConfidence: truth?.truthConfidence ?? null,
      truthWarnings: truth?.truthWarnings ?? null,
      residualPeakHours: peakHours.slice(0, 10),
      changepointsV1: cps.slice(0, 20),
      anomalyLedgerV1: anoms.slice(0, 50),
    };
  })();

  const auditDrawerV1: any = reportJson?.auditDrawerV1 ?? null;
  const auditDrawer = (() => {
    try {
      const v = stableString(auditDrawerV1?.version, 60);
      const explainersCount =
        auditDrawerV1?.moneyExplainers && typeof auditDrawerV1.moneyExplainers === 'object' ? Object.keys(auditDrawerV1.moneyExplainers).length : 0;
      return {
        present: Boolean(v),
        ...(v ? { version: v } : {}),
        ...(Number.isFinite(Number(explainersCount)) ? { moneyExplainersCount: Math.max(0, Math.trunc(Number(explainersCount))) } : {}),
      };
    } catch {
      return { present: false };
    }
  })();

  const missingInfo = normalizeMissingInfo(reportJson?.missingInfo);
  const engineWarnings = normalizeEngineWarnings(reportJson);

  const engineVersions = (() => {
    const fromRun = stableEngineVersions(args.analysisRun?.engineVersions);
    const fromReport = stableEngineVersions(reportJson?.engineVersions);
    // Prefer analysisRun.engineVersions as source of truth; fill missing keys from reportJson.
    return { ...fromReport, ...fromRun };
  })();

  const snapshotIds = {
    tariffSnapshotId: stableString(args.analysisRun?.provenance?.tariffSnapshotId ?? trace?.provenance?.tariffSnapshotId ?? null, 120) || null,
    generationEnergySnapshotId: stableString(args.analysisRun?.provenance?.generationEnergySnapshotId ?? trace?.provenance?.generationEnergySnapshotId ?? null, 120) || null,
    addersSnapshotId: stableString(args.analysisRun?.provenance?.addersSnapshotId ?? trace?.provenance?.addersSnapshotId ?? null, 120) || null,
    exitFeesSnapshotId: stableString(args.analysisRun?.provenance?.exitFeesSnapshotId ?? trace?.provenance?.exitFeesSnapshotId ?? null, 120) || null,
  };

  const wizardOutputHash = stableString(args.wizardOutputHash, 128) || undefined;
  const wizardOutputRef = args.wizardOutput ? `wizardOutput:${reportId || 'session'}:${wizardOutputHash || 'missing_hash'}` : undefined;
  const warningsSummary = normalizeWarningsSummary(trace?.warningsSummary ?? (args.analysisRun as any)?.warningsSummary ?? null);

  const pack: EngineeringPackJsonV1 = {
    schemaVersion: 'engineeringPackV1',
    generatedAtIso: nowIso,
    provenanceHeader: {
      runId,
      revisionId,
      generatedAtIso: nowIso,
      engineVersions,
      warningsSummary,
      ...(wizardOutputHash ? { wizardOutputHash } : {}),
      snapshotIds,
    },
    header: {
      title: stableString(args.title, 140) || 'Engineering Report Pack (v1)',
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
    sections: {
      analysisTrace: {
        ...(trace?.coverage !== undefined ? { coverage: trace.coverage } : {}),
        ...(trace?.steps !== undefined ? { steps: trace.steps } : {}),
        ...(trace?.ranModules !== undefined ? { ranModules: trace.ranModules } : {}),
        ...(trace?.skippedModules !== undefined ? { skippedModules: trace.skippedModules } : {}),
        ...(trace?.warningsSummary !== undefined ? { warningsSummary: trace.warningsSummary } : { warningsSummary }),
      },
      effectiveRateContext: {
        ...(currentRate !== undefined ? { currentRate } : {}),
        ...(currentRateSelectionSource !== undefined ? { currentRateSelectionSource } : {}),
        ...(rateFit !== undefined ? { rateFit } : {}),
        ...(tariffMatchStatus !== undefined ? { tariffMatchStatus } : {}),
      },
      supplyStructure,
      intervalInsights,
      determinantsPackSummary,
      weatherRegression,
      truthEngineV1,
      battery: {
        storageOpportunityPackV1: reportJson?.storageOpportunityPackV1 ?? null,
        batteryEconomicsV1: reportJson?.batteryEconomicsV1 ?? null,
        batteryDecisionPackV1: reportJson?.batteryDecisionPackV1 ?? null,
        batteryDecisionPackV1_2: reportJson?.batteryDecisionPackV1_2 ?? null,
      },
      auditDrawer,
      warningsAndMissingInfo: {
        engineWarnings,
        missingInfo,
      },
      scenarioLabV1: reportJson?.scenarioLabV1 ?? reportJson?.workflow?.scenarioLabV1 ?? null,
    },
    payloadRefs: {
      internalEngineeringReportJsonRef: `analysisRun:${runId}:snapshot.reportJson`,
      analysisRunSnapshotRef: `analysisRun:${runId}:snapshot`,
      ...(wizardOutputRef ? { wizardOutputRef } : {}),
    },
  };

  const verifierResultV1 = runVerifierV1({
    generatedAtIso: nowIso,
    reportType: 'ENGINEERING_PACK_V1',
    analysisRun: args.analysisRun,
    reportJson,
    packJson: pack,
    wizardOutput: args.wizardOutput ?? null,
  });

  const claimsPolicyV1 = evaluateClaimsPolicyV1({
    analysisTraceV1: reportJson?.analysisTraceV1 ?? null,
    requiredInputsMissing: workflow?.requiredInputsMissing ?? [],
    missingInfo: reportJson?.missingInfo ?? [],
    engineWarnings: (reportJson?.analysisTraceV1 as any)?.engineWarnings ?? [],
    verifierResultV1,
  });

  pack.verifierResultV1 = verifierResultV1;
  pack.verificationSummaryV1 = {
    status: verifierResultV1.status,
    passCount: verifierResultV1.summary.passCount,
    warnCount: verifierResultV1.summary.warnCount,
    failCount: verifierResultV1.summary.failCount,
  };
  pack.claimsPolicyV1 = claimsPolicyV1;

  return pack;
}

