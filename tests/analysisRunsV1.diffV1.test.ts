import { describe, expect, it } from 'vitest';

import { buildDiffSummaryV1 } from '../src/modules/analysisRunsV1/diffV1';
import type { AnalysisRunV1 } from '../src/modules/analysisRunsV1/types';

function runWithReportJson(runId: string, createdAtIso: string, reportJson: any): AnalysisRunV1 {
  return {
    runId,
    createdAtIso,
    nowIso: createdAtIso,
    projectId: 'p1',
    inputFingerprint: 'fp',
    engineVersions: { engine: '1' },
    provenance: {},
    warningsSummary: { engineWarningsCount: 0, topEngineWarningCodes: [], missingInfoCount: 0, topMissingInfoCodes: [] },
    snapshot: {
      response: { success: true },
      reportJson,
    },
  };
}

describe('analysisRunsV1: diffV1', () => {
  it('produces deterministic, bounded diff summary for controlled changes', () => {
    const a = runWithReportJson('a', '2026-02-19T00:00:00.000Z', {
      project: { name: 'Proj', territory: 'PGE' },
      summary: {
        json: {
          building: { territory: 'PGE', currentRateCode: 'B-19' },
          rateFit: { status: 'ok', confidence: 0.5, alternatives: [{ utility: 'PGE', rateCode: 'B-19', status: 'candidate' }] },
          programs: { matches: [{ programId: 'p1', matchStatus: 'eligible', score: 0.9 }] },
          battery: { gate: { status: 'unknown' }, topCandidates: [{ vendor: 'A', sku: 'X', fitScore: 0.1, disqualifiers: [] }] },
          missingInputsChecklist: ['m1'],
        },
        markdown: '# Utility Summary Report v1\n',
      },
      workflow: { utility: { insights: { supplyStructure: { supplyType: 'bundled', confidence: 0.9 }, determinantsPackSummary: { rulesVersionTag: 'r1', warnings: [] } } } },
      analysisTraceV1: { coverage: { hasInterval: false, intervalGranularity: null, intervalDays: null }, warningsSummary: { engineWarningsCount: 0, topEngineWarningCodes: [], missingInfoCount: 0, topMissingInfoCodes: [] } },
      telemetry: { intervalElectricV1: { present: false, pointCount: 0, warningCount: 0 } },
    });

    const b = runWithReportJson('b', '2026-02-20T00:00:00.000Z', {
      project: { name: 'Proj', territory: 'PGE' },
      summary: {
        json: {
          building: { territory: 'PGE', currentRateCode: 'B-20_' + 'X'.repeat(500) },
          rateFit: { status: 'good', confidence: 0.8, alternatives: [{ utility: 'PGE', rateCode: 'B-20', status: 'candidate' }] },
          programs: { matches: [{ programId: 'p2', matchStatus: 'maybe', score: 0.5 }] },
          battery: { gate: { status: 'recommended' }, topCandidates: [{ vendor: 'B', sku: 'Y', fitScore: 0.2, disqualifiers: ['d'] }] },
          missingInputsChecklist: [],
        },
        markdown: '# Utility Summary Report v1\n',
      },
      workflow: { utility: { insights: { supplyStructure: { supplyType: 'CCA', confidence: 0.7 }, determinantsPackSummary: { rulesVersionTag: 'r2', warnings: ['w1'] } } } },
      analysisTraceV1: { coverage: { hasInterval: true, intervalGranularity: '15m', intervalDays: 30 }, warningsSummary: { engineWarningsCount: 1, topEngineWarningCodes: ['E1'], missingInfoCount: 2, topMissingInfoCodes: ['M1'] } },
      telemetry: { intervalElectricV1: { present: true, pointCount: 100, warningCount: 1 } },
    });

    const diff = buildDiffSummaryV1({ runA: a, runB: b });

    expect(diff.runA.runId).toBe('a');
    expect(diff.runB.runId).toBe('b');

    // Fixed category order always present
    expect(diff.categories.map((c) => c.category)).toEqual(['rate_and_supply', 'interval', 'weather_determinants', 'battery', 'programs', 'warnings']);

    // At least these sections changed
    expect(diff.changedSections).toEqual(expect.arrayContaining(['rate_and_supply', 'interval', 'battery', 'programs', 'warnings']));

    const rate = diff.categories.find((c) => c.category === 'rate_and_supply')!;
    expect(rate.changedPaths).toEqual(expect.arrayContaining(['/summary/json/building/currentRateCode', '/summary/json/rateFit/status']));
    expect(rate.highlights.length).toBeGreaterThan(0);

    // Bounded outputs
    for (const c of diff.categories) {
      expect(c.changedPaths.length).toBeLessThanOrEqual(25);
      expect(c.highlights.length).toBeLessThanOrEqual(10);
    }

    // Additive drilldown contract: bounded previews + deterministic ordering.
    expect(Array.isArray((diff as any).changedPathsDetailed)).toBe(true);
    const detailed = ((diff as any).changedPathsDetailed || []) as any[];
    expect(detailed.length).toBeLessThanOrEqual(25);
    for (const it of detailed) {
      expect(typeof it.category).toBe('string');
      expect(typeof it.path).toBe('string');
      expect(typeof it.beforePreview).toBe('string');
      expect(typeof it.afterPreview).toBe('string');
      expect(it.beforePreview.length).toBeLessThanOrEqual(200);
      expect(it.afterPreview.length).toBeLessThanOrEqual(200);
    }

    const rank: Record<string, number> = {
      rate_and_supply: 0,
      interval: 1,
      weather_determinants: 2,
      battery: 3,
      programs: 4,
      warnings: 5,
    };
    for (let i = 1; i < detailed.length; i++) {
      const a0 = detailed[i - 1];
      const b0 = detailed[i];
      const ra = rank[String(a0.category)] ?? 999;
      const rb = rank[String(b0.category)] ?? 999;
      expect(ra).toBeLessThanOrEqual(rb);
      if (ra === rb) expect(String(a0.path).localeCompare(String(b0.path))).toBeLessThanOrEqual(0);
    }
  });
});

