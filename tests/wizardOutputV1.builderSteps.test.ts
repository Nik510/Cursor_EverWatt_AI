import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';

import { createReportSessionsStoreFsV1 } from '../src/modules/reportSessionsV1/storeFsV1';
import { buildWizardOutputV1 } from '../src/modules/wizardOutputV1/buildWizardOutputV1';
import { loadGoldenAnalysisRunFixtureV1 } from '../src/modules/testing/goldenReportSessionsV1/runner';

describe('wizardOutputV1 builder (steps + gating)', () => {
  it('derives run step BLOCKED from stored run snapshot requiredInputsMissing', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'ew-wizSteps-'));
    const store = createReportSessionsStoreFsV1({ baseDir });

    const nowIso = '2026-03-01T00:00:00.000Z';
    const { reportId } = await store.createSession({ kind: 'WIZARD', title: 'Wizard', nowIso, entropyHex: '000000' });
    await store.attachRun(reportId, 'run_test_07', { nowIso });
    const session = await store.getSession(reportId);

    const analysisRun = loadGoldenAnalysisRunFixtureV1({
      runId: 'run_test_07',
      snapshotId: '07_pge_missing_intervals',
      nowIso,
      projectId: 'p_test',
    });

    const wizBlocked = buildWizardOutputV1({ session: session as any, runId: 'run_test_07', analysisRunSnapshot: analysisRun, nowIso, partialRunAllowed: false });
    const stepIds = wizBlocked.wizardSteps.map((s) => s.id);
    expect(stepIds).toEqual([
      'project_metadata',
      'bill_pdf',
      'interval_data',
      'building_story',
      'rate_code',
      'supply_provider',
      'pcia_vintage',
      'run_utility',
      'build_wizard_output',
      'generate_revision',
    ]);
    const runStep = wizBlocked.wizardSteps.find((s) => s.id === 'run_utility');
    expect(runStep?.status).toBe('BLOCKED');

    const wizAnyway = buildWizardOutputV1({ session: session as any, runId: 'run_test_07', analysisRunSnapshot: analysisRun, nowIso, partialRunAllowed: true });
    expect(wizAnyway.partialRunAllowed).toBe(true);
    const runStep2 = wizAnyway.wizardSteps.find((s) => s.id === 'run_utility');
    expect(runStep2?.status).toBe('DONE');
  });
});

