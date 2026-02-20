import type { AnalysisRunV1 } from '../../../analysisRunsV1/types';

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
    tariffSnapshotId: (args.analysisRun?.provenance?.tariffSnapshotId ?? trace?.provenance?.tariffSnapshotId ?? null) as any,
    generationEnergySnapshotId: (args.analysisRun?.provenance?.generationEnergySnapshotId ?? trace?.provenance?.generationEnergySnapshotId ?? null) as any,
    addersSnapshotId: (args.analysisRun?.provenance?.addersSnapshotId ?? trace?.provenance?.addersSnapshotId ?? null) as any,
    exitFeesSnapshotId: (args.analysisRun?.provenance?.exitFeesSnapshotId ?? trace?.provenance?.exitFeesSnapshotId ?? null) as any,
  };

  const wizardOutputHash = stableString(args.wizardOutputHash, 128) || undefined;
  const wizardOutputRef = args.wizardOutput ? `wizardOutput:${reportId || 'session'}:${wizardOutputHash || 'missing_hash'}` : undefined;

  return {
    schemaVersion: 'engineeringPackV1',
    generatedAtIso: nowIso,
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
        ...(trace?.warningsSummary !== undefined ? { warningsSummary: trace.warningsSummary } : {}),
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
    },
    payloadRefs: {
      internalEngineeringReportJsonRef: `analysisRun:${runId}:snapshot.reportJson`,
      analysisRunSnapshotRef: `analysisRun:${runId}:snapshot`,
      ...(wizardOutputRef ? { wizardOutputRef } : {}),
    },
  };
}

