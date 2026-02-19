import { createHash } from 'node:crypto';

import type { ReportSessionV1 } from '../reportSessionsV1/types';
import type { WizardFindingV1, WizardOpportunityV1, WizardOutputV1 } from './types';

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

export function buildWizardOutputV1(args: {
  session: ReportSessionV1;
  runId: string;
  analysisRunSnapshot: unknown;
  nowIso?: string;
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

  // Deterministic, bounded.
  const severityRank: Record<WizardFindingV1['severity'], number> = { critical: 0, warning: 1, info: 2 };
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

  const payload = {
    provenance: {
      reportId: String(session.reportId),
      projectId: session.projectId ?? null,
      generatedAtIso: nowIso,
      runIdsUsed: [runId],
      revisionIdsUsed,
      engineVersions,
    },
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

