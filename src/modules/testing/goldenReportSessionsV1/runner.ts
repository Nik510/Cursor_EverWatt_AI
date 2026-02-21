import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';

import { createReportSessionsStoreFsV1 } from '../../reportSessionsV1/storeFsV1';
import { buildWizardOutputV1 } from '../../wizardOutputV1/buildWizardOutputV1';

import type { AnalysisRunV1 } from '../../analysisRunsV1/types';
import type { GoldenReportSessionCaseV1, GoldenReportSessionOutputV1 } from './types';

function loadJson(fp: string): any {
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function stableSnapshotStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalize = (v: any): any => {
    if (v === null) return null;
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') return v;
    if (t !== 'object') return String(v);
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(normalize);
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort((a, b) => a.localeCompare(b))) {
      const vv = v[k];
      if (typeof vv === 'undefined') continue;
      out[k] = normalize(vv);
    }
    return out;
  };
  return JSON.stringify(normalize(value as any), null, 2) + '\n';
}

function makeWarningsSummary(snapshot: any): AnalysisRunV1['warningsSummary'] {
  const ws: any = snapshot?.reportJson?.analysisTraceV1?.warningsSummary ?? snapshot?.response?.warningsSummary ?? null;
  const topEngine = Array.isArray(ws?.topEngineWarningCodes) ? ws.topEngineWarningCodes.map((x: any) => String(x)) : [];
  const topMissing = Array.isArray(ws?.topMissingInfoCodes) ? ws.topMissingInfoCodes.map((x: any) => String(x)) : [];
  return {
    engineWarningsCount: Number(ws?.engineWarningsCount) || topEngine.length,
    topEngineWarningCodes: topEngine.slice(0, 20),
    missingInfoCount: Number(ws?.missingInfoCount) || topMissing.length,
    topMissingInfoCodes: topMissing.slice(0, 20),
  };
}

export function discoverGoldenReportSessionCasesV1(args: { nowIso: string }): GoldenReportSessionCaseV1[] {
  const nowIso = String(args.nowIso || '').trim() || new Date().toISOString();
  return [
    {
      caseId: '01_single_run_with_revision_and_wizard',
      nowIso,
      reportId: 'rs_golden_01',
      projectId: 'p_golden_01',
      kind: 'WIZARD',
      title: 'Golden Session 01',
      runs: [{ runId: 'run_golden_01', analysisResultsSnapshotId: '01_pge_b19_no_cca' }],
      revisionForRunId: 'run_golden_01',
      wizardOutputForRunId: 'run_golden_01',
    },
    {
      caseId: '02_multi_run_latest_revision_and_wizard',
      nowIso,
      reportId: 'rs_golden_02',
      projectId: 'p_golden_02',
      kind: 'WIZARD',
      title: 'Golden Session 02',
      runs: [
        { runId: 'run_golden_02_a', analysisResultsSnapshotId: '01_pge_b19_no_cca' },
        { runId: 'run_golden_02_b', analysisResultsSnapshotId: '07_pge_missing_intervals' },
      ],
      revisionForRunId: 'run_golden_02_b',
      wizardOutputForRunId: 'run_golden_02_b',
    },
  ];
}

export function loadGoldenAnalysisRunFixtureV1(args: { runId: string; snapshotId: string; nowIso: string; projectId?: string | null }): AnalysisRunV1 {
  const snapDir = path.join(process.cwd(), 'tests', 'snapshots', 'analysisResultsV1');
  const fp = path.join(snapDir, `${String(args.snapshotId || '').trim()}.json`);
  const snap = loadJson(fp);

  const reportJson = snap?.reportJson ?? null;
  const response = snap?.response ?? null;
  const engineVersions: Record<string, string> = (() => {
    const v: any = reportJson?.engineVersions ?? snap?.engineVersions ?? null;
    if (!v || typeof v !== 'object') return {};
    const out: Record<string, string> = {};
    for (const k of Object.keys(v).sort((a, b) => a.localeCompare(b))) {
      const val = String((v as any)[k] ?? '').trim();
      if (val) out[k] = val;
    }
    return out;
  })();

  const inputFingerprint = sha256Hex(stableSnapshotStringify({ snapshotId: args.snapshotId, reportJson }));
  return {
    runId: String(args.runId || '').trim(),
    createdAtIso: String(args.nowIso || '').trim(),
    nowIso: String(args.nowIso || '').trim(),
    projectId: args.projectId ?? null,
    inputFingerprint,
    engineVersions,
    provenance: {},
    warningsSummary: makeWarningsSummary(snap),
    snapshot: { response, reportJson },
  };
}

export async function runGoldenReportSessionCaseV1(c: GoldenReportSessionCaseV1): Promise<GoldenReportSessionOutputV1> {
  const baseDir = mkdtempSync(path.join(os.tmpdir(), `ew-golden-reportSessionsV1-${c.caseId.replace(/[^0-9A-Za-z]+/g, '_')}-`));
  const store = createReportSessionsStoreFsV1({ baseDir });

  const created = await store.createSession({
    reportId: c.reportId,
    kind: c.kind,
    title: c.title,
    projectId: c.projectId,
    nowIso: c.nowIso,
    entropyHex: '000000',
  });

  // Attach runs (most recent first by insertion).
  for (const r of c.runs) {
    await store.attachRun(created.reportId, r.runId, { nowIso: c.nowIso });
  }

  // Attach a deterministic revision referencing an attached run.
  const revisionRunId = String(c.revisionForRunId || '').trim();
  await store.attachRevision(
    created.reportId,
    {
      revisionId: `rev_${c.caseId}`,
      createdAtIso: c.nowIso,
      runId: revisionRunId,
      format: 'HTML',
      downloadUrl: `/api/projects/${encodeURIComponent(c.projectId)}/reports/internal-engineering/${encodeURIComponent(`rev_${c.caseId}`)}.html`,
    },
    { nowIso: c.nowIso },
  );

  const sessionForWizard = await store.getSession(created.reportId);
  const wizardRun = c.runs.find((x) => x.runId === c.wizardOutputForRunId) || c.runs[c.runs.length - 1];
  const analysisRun = loadGoldenAnalysisRunFixtureV1({ runId: wizardRun.runId, snapshotId: wizardRun.analysisResultsSnapshotId, nowIso: c.nowIso, projectId: c.projectId });

  const wizardOutput = buildWizardOutputV1({ session: sessionForWizard as any, runId: wizardRun.runId, analysisRunSnapshot: analysisRun, nowIso: c.nowIso });
  await store.attachWizardOutput(
    created.reportId,
    {
      wizardOutput,
      hash: String((wizardOutput as any)?.wizardOutputHash || '').trim() || 'missing_hash',
      generatedAtIso: String((wizardOutput as any)?.provenance?.generatedAtIso || '').trim() || c.nowIso,
      runIdsUsed: Array.isArray((wizardOutput as any)?.provenance?.runIdsUsed) ? (wizardOutput as any).provenance.runIdsUsed : [wizardRun.runId],
      revisionIdsUsed: Array.isArray((wizardOutput as any)?.provenance?.revisionIdsUsed) ? (wizardOutput as any).provenance.revisionIdsUsed : [],
      preferInlineUnderBytes: 1_000_000, // keep snapshots self-contained for golden tests
    },
    { nowIso: c.nowIso },
  );

  const finalSession = await store.getSession(created.reportId);
  const storedWizardOutput = await store.readWizardOutput(created.reportId);

  return { caseId: c.caseId, session: finalSession, wizardOutput: storedWizardOutput };
}

