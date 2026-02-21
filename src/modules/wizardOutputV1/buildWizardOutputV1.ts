import { createHash } from 'node:crypto';

import type { ReportSessionV1 } from '../reportSessionsV1/types';
import type {
  EngineWarningV1,
  MissingInfoItemV1,
  WizardActionV1,
  WizardFindingV1,
  WizardOpportunityV1,
  WizardOutputV1,
  WizardStepStatusV1,
} from './types';
import { computeWizardGatingV1 } from './gatingV1';
import { runVerifierV1 } from '../verifierV1/runVerifierV1';
import { evaluateClaimsPolicyV1 } from '../claimsPolicyV1/evaluateClaimsPolicyV1';

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

function stableNormalizeJson(value: any, seen: WeakSet<object>): JsonValue {
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return value as any;
  if (t !== 'object') return String(value) as any;

  if (seen.has(value)) return '[Circular]' as any;
  seen.add(value);

  if (Array.isArray(value)) return value.map((v) => stableNormalizeJson(v, seen));

  const obj = value as Record<string, any>;
  const out: Record<string, JsonValue> = {};
  for (const k of Object.keys(obj).sort((a, b) => a.localeCompare(b))) {
    const v = obj[k];
    if (typeof v === 'undefined') continue;
    out[k] = stableNormalizeJson(v, seen);
  }
  return out;
}

function stableSnapshotStringifyV1(value: any): string {
  const norm = stableNormalizeJson(value, new WeakSet<object>());
  return JSON.stringify(norm, null, 2) + '\n';
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function clampInt(x: number, min: number, max: number): number {
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

function safeString(x: unknown, max = 160): string {
  const s = String(x ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, Math.max(0, max - 12)) + '…(truncated)' : s;
}

function uniqMostRecentFirst(items: string[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const s = String(it || '').trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function uniqSorted(items: string[], max: number): string[] {
  const set = new Set<string>();
  for (const it of items) {
    const s = String(it || '').trim();
    if (!s) continue;
    set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, max);
}

function toMissingInfoItemV1(raw: any): MissingInfoItemV1 | null {
  const id = safeString(raw?.id, 140);
  if (!id) return null;
  const category = safeString(raw?.category, 80) || undefined;
  const description = safeString(raw?.description, 600) || '';
  const sev = String(raw?.severity ?? '').trim().toLowerCase();
  const severity: MissingInfoItemV1['severity'] = sev === 'blocking' ? 'REQUIRED' : 'RECOMMENDED';
  const details = raw?.details && typeof raw.details === 'object' ? (raw.details as Record<string, unknown>) : undefined;
  return {
    id,
    severity,
    ...(category ? { category } : {}),
    description,
    ...(details ? { details } : {}),
  };
}

function toEngineWarningV1(raw: any): EngineWarningV1 | null {
  const code = safeString(raw?.code, 160);
  const module = safeString(raw?.module, 180);
  const operation = safeString(raw?.operation, 180);
  const exceptionName = safeString(raw?.exceptionName, 120);
  const contextKey = safeString(raw?.contextKey, 160);
  if (!code || !module || !operation) return null;
  return { code, module, operation, exceptionName: exceptionName || 'Error', contextKey: contextKey || 'unknown' };
}

function sortEngineWarningsDeterministic(a: EngineWarningV1, b: EngineWarningV1): number {
  return (
    a.code.localeCompare(b.code) ||
    a.module.localeCompare(b.module) ||
    a.operation.localeCompare(b.operation) ||
    a.contextKey.localeCompare(b.contextKey) ||
    a.exceptionName.localeCompare(b.exceptionName)
  );
}

function sortMissingInfoDeterministic(a: MissingInfoItemV1, b: MissingInfoItemV1): number {
  const ra = a.severity === 'REQUIRED' ? 0 : 1;
  const rb = b.severity === 'REQUIRED' ? 0 : 1;
  return ra - rb || a.id.localeCompare(b.id) || String(a.description || '').localeCompare(String(b.description || ''));
}

function buildAction(args: {
  stepId: string;
  type: WizardActionV1['type'];
  label: string;
  required: boolean;
  status: WizardActionV1['status'];
  endpoint: string;
  payloadExample: Record<string, unknown>;
}): WizardActionV1 {
  const actionId = safeString(`${args.stepId}.${args.type}`, 80);
  return {
    actionId,
    type: args.type,
    label: safeString(args.label, 140),
    required: Boolean(args.required),
    apiHint: { method: 'POST', endpoint: args.endpoint, payloadExample: args.payloadExample },
    status: args.status,
  };
}

export function buildWizardOutputV1(args: {
  session: ReportSessionV1;
  runId: string;
  analysisRunSnapshot: unknown;
  nowIso?: string;
  /** When true, the operator explicitly allowed a partial run despite required missing inputs. */
  partialRunAllowed?: boolean;
}): WizardOutputV1 {
  const nowIso = String(args.nowIso || new Date().toISOString()).trim();
  const session = args.session;
  const runId = String(args.runId || '').trim();
  if (!runId) throw new Error('runId is required');

  const analysisRun: any = args.analysisRunSnapshot as any;
  const reportJson: any = analysisRun?.snapshot?.reportJson ?? null;
  const response: any = analysisRun?.snapshot?.response ?? null;
  const workflow: any = reportJson?.workflow ?? response?.workflow ?? null;

  const engineVersions: Record<string, string> = (() => {
    const v: any = analysisRun?.engineVersions && typeof analysisRun.engineVersions === 'object' ? analysisRun.engineVersions : reportJson?.engineVersions;
    if (!v || typeof v !== 'object') return {};
    const out: Record<string, string> = {};
    for (const k of Object.keys(v).sort()) {
      const val = String((v as any)[k] ?? '').trim();
      if (val) out[k] = val;
    }
    return out;
  })();

  const revisionIdsUsed = uniqMostRecentFirst(
    (Array.isArray((session as any)?.revisions) ? ((session as any).revisions as any[]) : [])
      .filter((r) => String(r?.runId || '').trim() === runId)
      .map((r) => String(r?.revisionId || '').trim()),
    50,
  ).sort((a, b) => a.localeCompare(b));

  const hasIntervals =
    Boolean(session?.inputsSummary?.hasIntervals) ||
    Boolean(reportJson?.telemetry?.intervalElectricV1?.present) ||
    Number(reportJson?.telemetry?.intervalElectricV1?.pointCount) > 0;
  const hasBillText = Boolean(session?.inputsSummary?.hasBillText) || Boolean(safeString(workflow?.utility?.inputs?.billPdfText));
  const hasAddress = Boolean(session?.inputsSummary?.hasAddress) || Boolean(safeString(reportJson?.project?.siteLocation || reportJson?.project?.address));
  const hasQuestionnaire = Boolean(session?.inputsSummary?.hasQuestionnaire);
  const hasNotes = Boolean(session?.inputsSummary?.hasNotes);

  let score = 50;
  if (hasIntervals) score += 18;
  if (hasBillText) score += 12;
  if (hasAddress) score += 6;
  if (hasQuestionnaire) score += 7;
  if (hasNotes) score += 4;
  score = clampInt(score, 0, 100);

  const missingInfoIds = uniqSorted(
    (Array.isArray(reportJson?.missingInfo) ? reportJson.missingInfo : [])
      .map((m: any) => String(m?.id || '').trim())
      .filter(Boolean),
    60,
  );

  const warnings = uniqSorted(
    [
      ...(Array.isArray(session?.warnings) ? session.warnings : []),
      ...(Array.isArray(analysisRun?.warningsSummary?.topEngineWarningCodes) ? analysisRun.warningsSummary.topEngineWarningCodes.map((x: any) => `engine:${String(x)}`) : []),
      ...(Array.isArray(analysisRun?.warningsSummary?.topMissingInfoCodes) ? analysisRun.warningsSummary.topMissingInfoCodes.map((x: any) => `missing:${String(x)}`) : []),
    ],
    60,
  );

  const territory = safeString(reportJson?.project?.territory || response?.project?.territory || workflow?.utility?.inputs?.utilityTerritory);
  const currentRateCode = safeString(reportJson?.summary?.json?.building?.currentRateCode || workflow?.utility?.inputs?.currentRate?.rateCode);
  const supplyType = safeString(workflow?.utility?.insights?.supplyStructure?.supplyType);
  const supplyConfidence = Number(workflow?.utility?.insights?.supplyStructure?.confidence);
  const rateFitStatus = safeString(reportJson?.summary?.json?.rateFit?.status || workflow?.utility?.insights?.rateFit?.status);

  const batteryDecisionPack: any = reportJson?.batteryDecisionPackV1_2 ?? null;
  const batteryTier = safeString(batteryDecisionPack?.recommendationV1?.recommendationTier || batteryDecisionPack?.confidenceTier);
  const batterySelected = safeString(batteryDecisionPack?.selected?.candidateId);

  const findings: WizardFindingV1[] = [];
  const pushFinding = (f: WizardFindingV1) => findings.push(f);

  const boundFinding = (f: WizardFindingV1): WizardFindingV1 => ({
    ...f,
    id: safeString(f.id, 64),
    title: safeString(f.title, 120),
    confidence0to1: clamp01(f.confidence0to1),
    evidenceRefs: uniqMostRecentFirst(Array.isArray(f.evidenceRefs) ? f.evidenceRefs : [], 12),
    summaryBullets: uniqMostRecentFirst(Array.isArray(f.summaryBullets) ? f.summaryBullets : [], 16),
  });

  pushFinding({
    id: 'dq_inputs',
    title: 'Data completeness',
    severity: score >= 75 ? 'info' : score >= 55 ? 'warning' : 'critical',
    confidence0to1: 0.95,
    evidenceRefs: [`analysisRun:${runId}:session.inputsSummary`],
    summaryBullets: [
      `Score: ${score}/100`,
      `Intervals: ${hasIntervals ? 'present' : 'missing'}`,
      `Bill text: ${hasBillText ? 'present' : 'missing'}`,
      `Address: ${hasAddress ? 'present' : 'missing'}`,
    ],
  });

  if (territory) {
    pushFinding({
      id: 'utility_territory',
      title: 'Utility territory',
      severity: 'info',
      confidence0to1: 0.85,
      evidenceRefs: [`analysisRun:${runId}:reportJson.project.territory`],
      summaryBullets: [`Territory: ${territory}`],
    });
  }

  if (currentRateCode) {
    pushFinding({
      id: 'current_rate',
      title: 'Current rate code',
      severity: 'info',
      confidence0to1: 0.8,
      evidenceRefs: [`analysisRun:${runId}:reportJson.summary.json.building.currentRateCode`],
      summaryBullets: [`Rate: ${currentRateCode}`],
    });
  }

  if (rateFitStatus) {
    pushFinding({
      id: 'rate_fit',
      title: 'Rate fit status',
      severity: rateFitStatus === 'good' ? 'info' : 'warning',
      confidence0to1: 0.75,
      evidenceRefs: [`analysisRun:${runId}:reportJson.summary.json.rateFit.status`],
      summaryBullets: [`Status: ${rateFitStatus}`],
    });
  }

  if (supplyType) {
    pushFinding({
      id: 'supply_structure',
      title: 'Supply structure',
      severity: 'info',
      confidence0to1: clamp01(Number.isFinite(supplyConfidence) ? supplyConfidence : 0.6),
      evidenceRefs: [`analysisRun:${runId}:workflow.utility.insights.supplyStructure`],
      summaryBullets: [`Supply type: ${supplyType}`, ...(Number.isFinite(supplyConfidence) ? [`Confidence: ${supplyConfidence}`] : [])],
    });
  }

  if (missingInfoIds.length) {
    pushFinding({
      id: 'missing_info',
      title: 'Missing info (reduces certainty)',
      severity: missingInfoIds.length >= 6 ? 'warning' : 'info',
      confidence0to1: 0.9,
      evidenceRefs: [`analysisRun:${runId}:reportJson.missingInfo`],
      summaryBullets: [`Missing IDs: ${missingInfoIds.slice(0, 12).join(', ')}${missingInfoIds.length > 12 ? '…' : ''}`],
    });
  }

  if (batteryTier || batterySelected) {
    pushFinding({
      id: 'battery_screening',
      title: 'Battery screening',
      severity: 'info',
      confidence0to1: 0.7,
      evidenceRefs: [`analysisRun:${runId}:reportJson.batteryDecisionPackV1_2`],
      summaryBullets: [
        ...(batteryTier ? [`Recommendation tier: ${batteryTier}`] : []),
        ...(batterySelected ? [`Selected candidate: ${batterySelected}`] : []),
      ],
    });
  }

  const truthSnapshot: any = reportJson?.truthSnapshotV1 ?? workflow?.truthSnapshotV1 ?? null;
  if (truthSnapshot && typeof truthSnapshot === 'object' && String(truthSnapshot?.schemaVersion) === 'truthSnapshotV1') {
    const tier = safeString(truthSnapshot?.truthConfidence?.tier, 10) || 'C';
    const sev: WizardFindingV1['severity'] = tier === 'A' ? 'info' : tier === 'B' ? 'warning' : 'warning';
    const conf0to1 = clamp01(tier === 'A' ? 0.85 : tier === 'B' ? 0.65 : 0.45);

    const cps: any[] = Array.isArray(truthSnapshot?.changepointsV1) ? truthSnapshot.changepointsV1 : [];
    cps.sort(
      (a, b) =>
        Number(b?.confidence || 0) - Number(a?.confidence || 0) ||
        Math.abs(Number(b?.magnitude || 0)) - Math.abs(Number(a?.magnitude || 0)) ||
        safeString(a?.atIso, 60).localeCompare(safeString(b?.atIso, 60)) ||
        safeString(a?.type, 60).localeCompare(safeString(b?.type, 60)),
    );

    const anoms: any[] = Array.isArray(truthSnapshot?.anomalyLedgerV1) ? truthSnapshot.anomalyLedgerV1 : [];

    const requiredNext = uniqSorted(
      anoms
        .flatMap((a: any) => (Array.isArray(a?.requiredNextData) ? a.requiredNextData : []))
        .map((x: any) => safeString(x, 120))
        .filter(Boolean),
      12,
    );

    const bullets: string[] = [];
    bullets.push(`Truth Engine confidence: ${tier}`);
    if (cps.length) bullets.push(`Top changepoints: ${cps.slice(0, 3).map((c) => `${safeString(c?.type, 40)} @ ${safeString(c?.atIso, 30)}`).join(' • ')}`);
    if (anoms.length) bullets.push(`Top anomalies: ${anoms.slice(0, 5).map((a) => `${safeString(a?.class, 20)} (${safeString(a?.window?.startIso, 30)})`).join(' • ')}`);
    if (requiredNext.length) bullets.push(`Required next data: ${requiredNext.slice(0, 6).join(' • ')}`);

    pushFinding({
      id: 'truth_building_story',
      title: 'Building story (Truth Engine v1)',
      severity: sev,
      confidence0to1: conf0to1,
      evidenceRefs: [`analysisRun:${runId}:reportJson.truthSnapshotV1`],
      summaryBullets: bullets,
    });
  }

  // Deterministic, bounded.
  const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  const boundedFindings = findings
    .map(boundFinding)
    .slice(0, 60)
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.id.localeCompare(b.id))
    .slice(0, 20);

  const opportunities: WizardOpportunityV1[] = [];
  if (batteryTier) {
    opportunities.push({
      id: 'opp_battery',
      title: 'Battery opportunity (screening)',
      tier: batteryTier,
      confidence0to1: 0.65,
      prerequisites: uniqSorted(
        [
          hasIntervals ? '' : 'Provide interval data (15-min or 1-hr)',
          hasBillText ? '' : 'Provide bill text or rate code',
        ].filter(Boolean),
        10,
      ),
      expectedRange: '',
      risks: [],
    });
  }

  const opportunitiesBounded = opportunities
    .map((o) => ({
      ...o,
      id: safeString(o.id, 64),
      title: safeString(o.title, 140),
      tier: o.tier ? safeString(o.tier, 60) : undefined,
      confidence0to1: clamp01(o.confidence0to1),
      prerequisites: uniqSorted(Array.isArray(o.prerequisites) ? o.prerequisites : [], 12),
      expectedRange: o.expectedRange ? safeString(o.expectedRange, 160) : undefined,
      risks: uniqSorted(Array.isArray(o.risks) ? o.risks : [], 12),
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 20);

  const missingInfoRaw = Array.isArray(reportJson?.missingInfo) ? reportJson.missingInfo : [];
  const missingInfoItemsV1 = missingInfoRaw
    .map((m: any) => toMissingInfoItemV1(m))
    .filter(Boolean) as MissingInfoItemV1[];
  missingInfoItemsV1.sort(sortMissingInfoDeterministic);
  const missingInfoRequired = missingInfoItemsV1.filter((m) => m.severity === 'REQUIRED');
  const missingInfoRecommended = missingInfoItemsV1.filter((m) => m.severity !== 'REQUIRED');

  const engineWarningsRaw = Array.isArray(workflow?.utility?.insights?.engineWarnings) ? workflow.utility.insights.engineWarnings : [];
  const engineWarnings = engineWarningsRaw
    .map((w: any) => toEngineWarningV1(w))
    .filter(Boolean) as EngineWarningV1[];
  engineWarnings.sort(sortEngineWarningsDeterministic);

  const requiredInputsMissing = Array.isArray(workflow?.requiredInputsMissing) ? workflow.requiredInputsMissing : [];
  const gating = computeWizardGatingV1({
    requiredInputsMissing,
    missingInfo: missingInfoRaw,
    runAnywayChosen: Boolean(args.partialRunAllowed === true),
  });

  const runStepStatus: WizardStepStatusV1 = gating.runStepStatus;

  const hasSupplyType = Boolean(supplyType && supplyType !== 'unknown');
  const billPdfMissing = !hasBillText;
  const intervalMissing = !hasIntervals;
  const rateMissing = !currentRateCode;

  const wizardSteps = (() => {
    const steps: any[] = [];

    // Project metadata (optional)
    steps.push({
      id: 'project_metadata',
      title: 'Project metadata (optional)',
      status: hasAddress ? 'DONE' : 'OPTIONAL',
      requiredActions: [
        buildAction({
          stepId: 'project_metadata',
          type: 'ADD_PROJECT_METADATA',
          label: 'Add address and utility account identifiers',
          required: false,
          status: hasAddress ? 'DONE' : 'OPTIONAL',
          endpoint: `/api/report-sessions-v1/${encodeURIComponent(String(session.reportId))}/inputs/set-project-metadata`,
          payloadExample: { address: '123 Main St, City, CA', utilityHint: 'PGE', meterId: 'optional' },
        }),
      ],
      evidence: { runId },
      helpText: 'Optional context that improves auditability and downstream reporting.',
    });

    // Bill PDF
    steps.push({
      id: 'bill_pdf',
      title: 'Bill PDF',
      status: billPdfMissing ? 'NEEDS_INPUT' : 'DONE',
      requiredActions: [
        buildAction({
          stepId: 'bill_pdf',
          type: 'UPLOAD_BILL_PDF',
          label: 'Upload bill PDF (extract bill text)',
          required: false,
          status: billPdfMissing ? 'NEEDS_INPUT' : 'DONE',
          endpoint: `/api/report-sessions-v1/${encodeURIComponent(String(session.reportId))}/inputs/upload-bill`,
          payloadExample: { file: '<multipart/form-data field: file>' },
        }),
      ],
      evidence: { runId },
      helpText: 'Used to extract rate labels, billing periods, and TOU hints when available.',
    });

    // Interval data
    steps.push({
      id: 'interval_data',
      title: 'Interval data (CSV)',
      status: intervalMissing ? 'NEEDS_INPUT' : 'DONE',
      requiredActions: [
        buildAction({
          stepId: 'interval_data',
          type: 'UPLOAD_INTERVAL_CSV',
          label: 'Upload interval CSV (PG&E exports supported)',
          required: false,
          status: intervalMissing ? 'NEEDS_INPUT' : 'DONE',
          endpoint: `/api/report-sessions-v1/${encodeURIComponent(String(session.reportId))}/inputs/upload-interval`,
          payloadExample: { file: '<multipart/form-data field: file>' },
        }),
      ],
      evidence: { runId },
      helpText: 'Enables interval-derived load shape, demand, and battery feasibility signals.',
    });

    // Building story (Truth Engine)
    steps.push({
      id: 'building_story',
      title: 'Building story (Truth Engine v1)',
      status: hasIntervals ? 'DONE' : 'OPTIONAL',
      requiredActions: [],
      evidence: { runId },
      helpText: hasIntervals
        ? 'Derived from stored interval/weather snapshots only: baseline expectations, residual maps, changepoints, and bounded anomaly ledger.'
        : 'Optional: interval data unlocks baseline expectations, residual maps, changepoints, and bounded anomaly ledger.',
    });

    // Rate code (required for full tariff auditability)
    steps.push({
      id: 'rate_code',
      title: 'Current rate code',
      status: rateMissing ? 'NEEDS_INPUT' : 'DONE',
      requiredActions: [
        buildAction({
          stepId: 'rate_code',
          type: 'ENTER_RATE_CODE',
          label: 'Enter current rate code (e.g., E-19, B-19)',
          required: true,
          status: rateMissing ? 'NEEDS_INPUT' : 'DONE',
          endpoint: `/api/report-sessions-v1/${encodeURIComponent(String(session.reportId))}/inputs/set-rate-code`,
          payloadExample: { rateCode: 'E-19' },
        }),
      ],
      evidence: { runId },
      helpText: 'Required to resolve tariff metadata deterministically when bill matching is unavailable/ambiguous.',
    });

    // Supply structure
    steps.push({
      id: 'supply_provider',
      title: 'Supply provider type (CCA/DA/None)',
      status: hasSupplyType ? 'DONE' : 'OPTIONAL',
      requiredActions: [
        buildAction({
          stepId: 'supply_provider',
          type: 'SELECT_PROVIDER_TYPE',
          label: 'Select supply provider type',
          required: false,
          status: hasSupplyType ? 'DONE' : 'OPTIONAL',
          endpoint: `/api/report-sessions-v1/${encodeURIComponent(String(session.reportId))}/inputs/set-provider`,
          payloadExample: { providerType: 'NONE' },
        }),
      ],
      evidence: { runId },
      helpText: 'Improves generation/exit-fee context when analyzing CCA or Direct Access supply.',
    });

    // PCIA vintage key
    steps.push({
      id: 'pcia_vintage',
      title: 'PCIA vintage key (optional)',
      status: 'OPTIONAL',
      requiredActions: [
        buildAction({
          stepId: 'pcia_vintage',
          type: 'SET_PCIA_VINTAGE_KEY',
          label: 'Set PCIA vintage key (when known)',
          required: false,
          status: 'OPTIONAL',
          endpoint: `/api/report-sessions-v1/${encodeURIComponent(String(session.reportId))}/inputs/set-pcia-vintage-key`,
          payloadExample: { pciaVintageKey: '2019' },
        }),
      ],
      evidence: { runId },
      helpText: 'Selects vintage-specific PCIA deterministically when available.',
    });

    // Run gating (based on stored run snapshot outputs)
    steps.push({
      id: 'run_utility',
      title: 'Run Utility',
      status: runStepStatus,
      requiredActions: [],
      evidence: { runId },
      helpText: gating.blocked
        ? 'Required inputs are missing; resolve required items or explicitly choose “Run anyway” to mark outputs as partial.'
        : 'Run is allowed with current inputs.',
    });

    // Build wizard output (this artifact)
    steps.push({
      id: 'build_wizard_output',
      title: 'Build wizard output',
      status: 'DONE',
      requiredActions: [],
      evidence: { runId },
      helpText: 'Builds a deterministic wizard artifact from stored run snapshots (no engine recompute on GET).',
    });

    // Revision step (optional, depends on operator flow)
    steps.push({
      id: 'generate_revision',
      title: 'Generate revision',
      status: revisionIdsUsed.length ? 'DONE' : 'OPTIONAL',
      requiredActions: [],
      evidence: { runId, ...(revisionIdsUsed[0] ? { revisionId: revisionIdsUsed[0] } : {}) },
      helpText: 'Optional: attach a rendered revision (HTML/PDF) for sharing.',
    });

    return steps as any[];
  })();

  const verifierResultV1 = (() => {
    try {
      return runVerifierV1({
        generatedAtIso: nowIso,
        reportType: 'UNKNOWN',
        analysisRun,
        reportJson,
        packJson: null,
        wizardOutput: null,
      });
    } catch {
      return null;
    }
  })();

  const claimsPolicyV1 = (() => {
    try {
      return evaluateClaimsPolicyV1({
        analysisTraceV1: reportJson?.analysisTraceV1 ?? null,
        requiredInputsMissing,
        missingInfo: missingInfoRaw,
        engineWarnings,
        verifierResultV1: verifierResultV1 ?? null,
      });
    } catch {
      return null;
    }
  })();

  const payload = {
    provenance: {
      reportId: String(session.reportId),
      projectId: session.projectId ?? null,
      generatedAtIso: nowIso,
      runIdsUsed: [runId],
      revisionIdsUsed,
      engineVersions,
    },
    ...(gating.partialRunAllowed ? { partialRunAllowed: true } : {}),
    wizardSteps,
    missingInfoSummary: {
      required: missingInfoRequired.slice(0, 60),
      recommended: missingInfoRecommended.slice(0, 120),
      warnings: engineWarnings.slice(0, 80),
    },
    ...(verifierResultV1 ? { verifierResultV1 } : {}),
    ...(claimsPolicyV1 ? { claimsPolicyV1 } : {}),
    dataQuality: {
      score0to100: score,
      missingInfoIds: missingInfoIds.slice(0, 50),
      warnings: warnings.slice(0, 50),
    },
    findings: boundedFindings,
    charts: [],
    opportunities: opportunitiesBounded,
  } satisfies Omit<WizardOutputV1, 'wizardOutputHash'>;

  const wizardOutputHash = sha256Hex(stableSnapshotStringifyV1(payload));
  return { ...payload, wizardOutputHash };
}

