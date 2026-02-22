import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

import { discoverGoldenSnapshotCasesV1, loadGoldenSnapshotBatteryLibraryV1, runGoldenSnapshotCaseV1 } from '../modules/testing/goldenSnapshotsV1/runner';
import { discoverGoldenReportSessionCasesV1, runGoldenReportSessionCaseV1 } from '../modules/testing/goldenReportSessionsV1/runner';
import { stableSnapshotStringifyV1 } from '../modules/testing/goldenSnapshotsV1/stableSnapshotJsonV1';

async function regenAnalysisResultsV1(nowIso: string): Promise<void> {
  const cases = discoverGoldenSnapshotCasesV1({ nowIso });
  const batteryLibrary = await loadGoldenSnapshotBatteryLibraryV1();
  const snapDir = path.join(process.cwd(), 'tests', 'snapshots', 'analysisResultsV1');
  mkdirSync(snapDir, { recursive: true });

  for (const c of cases) {
    const out = await runGoldenSnapshotCaseV1({ c, batteryLibrary });
    const payload = { caseId: out.caseId, response: out.response, reportJson: out.reportJson };
    const fp = path.join(snapDir, `${c.caseId}.json`);
    writeFileSync(fp, stableSnapshotStringifyV1(payload, 2), 'utf-8');
    // eslint-disable-next-line no-console
    console.log(`wrote ${path.relative(process.cwd(), fp)}`);
  }
}

async function regenReportSessionsV1(nowIso: string): Promise<void> {
  const cases = discoverGoldenReportSessionCasesV1({ nowIso });
  const snapDir = path.join(process.cwd(), 'tests', 'snapshots', 'reportSessionsV1');
  mkdirSync(snapDir, { recursive: true });

  for (const c of cases) {
    const out = await runGoldenReportSessionCaseV1(c);
    const fp = path.join(snapDir, `${c.caseId}.json`);
    writeFileSync(fp, stableSnapshotStringifyV1(out, 2), 'utf-8');
    // eslint-disable-next-line no-console
    console.log(`wrote ${path.relative(process.cwd(), fp)}`);
  }
}

async function main(): Promise<void> {
  const nowIso = '2026-03-01T00:00:00.000Z';
  await regenAnalysisResultsV1(nowIso);
  await regenReportSessionsV1(nowIso);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

