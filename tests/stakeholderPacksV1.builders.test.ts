import { describe, expect, it } from 'vitest';

import { loadGoldenAnalysisRunFixtureV1, runGoldenReportSessionCaseV1 } from '../src/modules/testing/goldenReportSessionsV1/runner';
import { buildEngineeringPackJsonV1 } from '../src/modules/reports/engineeringPack/v1/buildEngineeringPackJsonV1';
import { buildExecutivePackJsonV1 } from '../src/modules/reports/executivePack/v1/buildExecutivePackJsonV1';

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

describe('stakeholder report packs v1 (builders)', () => {
  it('provenance header invariants (engineering + executive) are always present', async () => {
    const nowIso = '2026-03-01T00:00:00.000Z';
    const analysisRun = loadGoldenAnalysisRunFixtureV1({ runId: 'run_golden_01', snapshotId: '01_pge_b19_no_cca', nowIso, projectId: 'p_golden_01' });

    const golden = await runGoldenReportSessionCaseV1({
      caseId: 'builder_only_prov_01',
      nowIso,
      reportId: 'rs_builder_only_prov_01',
      projectId: 'p_golden_01',
      kind: 'WIZARD',
      title: 'Builder-only-prov',
      runs: [{ runId: 'run_golden_01', analysisResultsSnapshotId: '01_pge_b19_no_cca' }],
      revisionForRunId: 'run_golden_01',
      wizardOutputForRunId: 'run_golden_01',
    } as any);
    const wiz: any = golden.wizardOutput;

    const eng = buildEngineeringPackJsonV1({
      title: 'Engineering Pack • Test',
      project: { projectId: 'p_golden_01', projectName: 'Demo', address: 'Oakland, CA', utilityTerritory: 'PGE', reportId: 'rs_builder_only_prov_01' },
      revisionId: 'rev_test_eng_prov_01',
      runId: 'run_golden_01',
      generatedAtIso: nowIso,
      analysisRun,
      reportJson: analysisRun.snapshot.reportJson,
      wizardOutput: wiz,
      wizardOutputHash: String(wiz?.wizardOutputHash || ''),
    });

    const exec = buildExecutivePackJsonV1({
      title: 'Executive Pack • Test',
      project: { projectId: 'p_golden_01', projectName: 'Demo', address: 'Oakland, CA', utilityTerritory: 'PGE', reportId: 'rs_builder_only_prov_01' },
      revisionId: 'rev_test_exec_prov_01',
      runId: 'run_golden_01',
      generatedAtIso: nowIso,
      analysisRun,
      reportJson: analysisRun.snapshot.reportJson,
      wizardOutput: wiz,
      wizardOutputHash: String(wiz?.wizardOutputHash || ''),
      diffSincePreviousRun: null,
    });

    const assertProvHeader = (p: any) => {
      expect(p?.provenanceHeader).toBeTruthy();
      expect(String(p.provenanceHeader.runId || '')).toBeTruthy();
      expect(String(p.provenanceHeader.revisionId || '')).toBeTruthy();
      expect(String(p.provenanceHeader.generatedAtIso || '')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(p.provenanceHeader.engineVersions).toBeTruthy();
      expect(typeof p.provenanceHeader.engineVersions).toBe('object');

      expect(p.provenanceHeader.warningsSummary).toBeTruthy();
      expect(typeof p.provenanceHeader.warningsSummary.engineWarningsCount).toBe('number');
      expect(Array.isArray(p.provenanceHeader.warningsSummary.topEngineWarningCodes)).toBe(true);
      expect(typeof p.provenanceHeader.warningsSummary.missingInfoCount).toBe('number');
      expect(Array.isArray(p.provenanceHeader.warningsSummary.topMissingInfoCodes)).toBe(true);

      // Snapshot IDs: keys must exist (values may be null).
      expect(p.provenanceHeader.snapshotIds).toBeTruthy();
      expect(Object.prototype.hasOwnProperty.call(p.provenanceHeader.snapshotIds, 'tariffSnapshotId')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(p.provenanceHeader.snapshotIds, 'generationEnergySnapshotId')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(p.provenanceHeader.snapshotIds, 'addersSnapshotId')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(p.provenanceHeader.snapshotIds, 'exitFeesSnapshotId')).toBe(true);
    };

    assertProvHeader(eng);
    assertProvHeader(exec);

    // Executive pack must always include confidence/assumptions section.
    expect(Array.isArray(exec.confidenceAndAssumptions)).toBe(true);
    expect(exec.confidenceAndAssumptions.length).toBeGreaterThan(0);
  });

  it('engineering pack builder is deterministic given stored run snapshot', async () => {
    const nowIso = '2026-03-01T00:00:00.000Z';
    const analysisRun = loadGoldenAnalysisRunFixtureV1({ runId: 'run_golden_01', snapshotId: '01_pge_b19_no_cca', nowIso, projectId: 'p_golden_01' });

    const golden = await runGoldenReportSessionCaseV1({
      caseId: 'builder_only_01',
      nowIso,
      reportId: 'rs_builder_only_01',
      projectId: 'p_golden_01',
      kind: 'WIZARD',
      title: 'Builder-only',
      runs: [{ runId: 'run_golden_01', analysisResultsSnapshotId: '01_pge_b19_no_cca' }],
      revisionForRunId: 'run_golden_01',
      wizardOutputForRunId: 'run_golden_01',
    } as any);

    const wiz: any = golden.wizardOutput;
    const packA = buildEngineeringPackJsonV1({
      title: 'Engineering Pack • Test',
      project: { projectId: 'p_golden_01', projectName: 'Demo', address: 'Oakland, CA', utilityTerritory: 'PGE', reportId: 'rs_builder_only_01' },
      revisionId: 'rev_test_eng_01',
      runId: 'run_golden_01',
      generatedAtIso: nowIso,
      analysisRun,
      reportJson: analysisRun.snapshot.reportJson,
      wizardOutput: wiz,
      wizardOutputHash: String(wiz?.wizardOutputHash || ''),
    });
    const packB = buildEngineeringPackJsonV1({
      title: 'Engineering Pack • Test',
      project: { projectId: 'p_golden_01', projectName: 'Demo', address: 'Oakland, CA', utilityTerritory: 'PGE', reportId: 'rs_builder_only_01' },
      revisionId: 'rev_test_eng_01',
      runId: 'run_golden_01',
      generatedAtIso: nowIso,
      analysisRun,
      reportJson: analysisRun.snapshot.reportJson,
      wizardOutput: wiz,
      wizardOutputHash: String(wiz?.wizardOutputHash || ''),
    });

    expect(stableSnapshotStringify(packA)).toBe(stableSnapshotStringify(packB));
    expect(packA.schemaVersion).toBe('engineeringPackV1');
    expect(packA.linkage.runId).toBe('run_golden_01');
  });

  it('executive pack never claims savings without stored deterministic numbers', async () => {
    const nowIso = '2026-03-01T00:00:00.000Z';
    const analysisRun = loadGoldenAnalysisRunFixtureV1({ runId: 'run_golden_02_b', snapshotId: '07_pge_missing_intervals', nowIso, projectId: 'p_golden_02' });

    const golden = await runGoldenReportSessionCaseV1({
      caseId: 'builder_only_02',
      nowIso,
      reportId: 'rs_builder_only_02',
      projectId: 'p_golden_02',
      kind: 'WIZARD',
      title: 'Builder-only-2',
      runs: [{ runId: 'run_golden_02_b', analysisResultsSnapshotId: '07_pge_missing_intervals' }],
      revisionForRunId: 'run_golden_02_b',
      wizardOutputForRunId: 'run_golden_02_b',
    } as any);

    const wiz: any = golden.wizardOutput;
    const pack = buildExecutivePackJsonV1({
      title: 'Executive Pack • Test',
      project: { projectId: 'p_golden_02', projectName: 'Demo', address: 'Oakland, CA', utilityTerritory: 'PGE', reportId: 'rs_builder_only_02' },
      revisionId: 'rev_test_exec_02',
      runId: 'run_golden_02_b',
      generatedAtIso: nowIso,
      analysisRun,
      reportJson: analysisRun.snapshot.reportJson,
      wizardOutput: wiz,
      wizardOutputHash: String(wiz?.wizardOutputHash || ''),
      diffSincePreviousRun: null,
    });

    expect(pack.schemaVersion).toBe('executivePackV1');
    if (pack.savings.status === 'PENDING_INPUTS') {
      expect(pack.savings.annualUsd).toBeNull();
    } else {
      expect(pack.savings.annualUsd).toBeTruthy();
    }
  });

  it('executive pack returns PENDING_INPUTS when no deterministic savings basis exists in snapshot', async () => {
    const nowIso = '2026-03-01T00:00:00.000Z';
    const analysisRun = loadGoldenAnalysisRunFixtureV1({ runId: 'run_no_savings', snapshotId: '01_pge_b19_no_cca', nowIso, projectId: 'p_no_savings' });

    // Minimal reportJson shell with trace only; intentionally no battery decision/econ fields.
    const reportJsonMinimal = {
      analysisTraceV1: {
        warningsSummary: { engineWarningsCount: 0, topEngineWarningCodes: [], missingInfoCount: 0, topMissingInfoCodes: [] },
        provenance: { tariffSnapshotId: null, generationEnergySnapshotId: null, addersSnapshotId: null, exitFeesSnapshotId: null },
        coverage: { hasInterval: false, intervalDays: null, tariffMatchStatus: null, supplyProviderType: null },
      },
      engineVersions: (analysisRun as any)?.snapshot?.reportJson?.engineVersions ?? {},
    };

    const pack = buildExecutivePackJsonV1({
      title: 'Executive Pack • NoSavings',
      project: { projectId: 'p_no_savings', projectName: 'NoSavings', utilityTerritory: 'PGE', reportId: 'rs_no_savings' },
      revisionId: 'rev_no_savings',
      runId: 'run_no_savings',
      generatedAtIso: nowIso,
      analysisRun,
      reportJson: reportJsonMinimal,
      wizardOutput: null,
      wizardOutputHash: null,
      diffSincePreviousRun: null,
    });

    expect(pack.savings.status).toBe('PENDING_INPUTS');
    expect(pack.savings.annualUsd).toBeNull();
  });
});

