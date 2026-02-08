/**
 * Generate Utility Summary markdown (v1).
 *
 * Usage:
 *   npx tsx scripts/generate-utility-summary.ts --projectId <id> --out docs/output/utility_summary_<id>.md
 *
 * Optional:
 *   --org <orgId>                  (defaults to "default-user")
 *   --library <path>               (defaults to samples/battery_library_fixture.json)
 *   --intervalFixture <path>       (if provided, uses fixture interval instead of project telemetry)
 */

import path from 'path';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { loadProjectForOrg } from '../src/modules/project/projectRepository';
import { loadBatteryLibraryV1 } from '../src/modules/batteryLibrary/loadLibrary';
import { readIntervalData } from '../src/utils/excel-reader';
import { runUtilityWorkflow } from '../src/modules/workflows/runUtilityWorkflow';
import { generateUtilitySummaryV1 } from '../src/modules/reports/utilitySummary/v1/generateUtilitySummary';
import type { UtilityInputs } from '../src/modules/utilityIntelligence/types';

function argMap(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    out[k] = v;
  }
  return out;
}

function loadIntervalFixture(filePath: string): Array<{ timestampIso: string; kw: number }> {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!existsSync(abs)) throw new Error(`Interval fixture not found: ${abs}`);
  const raw = readFileSync(abs, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Interval fixture must be a JSON array of {timestampIso, kw}');
  return parsed
    .map((r: any) => ({ timestampIso: String(r?.timestampIso || '').trim(), kw: Number(r?.kw) }))
    .filter((r: any) => r.timestampIso && Number.isFinite(r.kw));
}

function intervalFromProjectTelemetry(project: any): Array<{ timestampIso: string; kw: number }> | null {
  const telemetry = project?.telemetry || {};
  if (Array.isArray(telemetry.intervalKwSeries) && telemetry.intervalKwSeries.length) return telemetry.intervalKwSeries;
  const fp = String(telemetry.intervalFilePath || '').trim();
  if (fp && existsSync(fp)) {
    const rows = readIntervalData(fp);
    const out = rows
      .map((d) => ({
        timestampIso: d.timestamp instanceof Date ? d.timestamp.toISOString() : new Date(d.timestamp as any).toISOString(),
        kw: Number((d as any).demand),
      }))
      .filter((r) => r.timestampIso && Number.isFinite(r.kw));
    return out.length ? out : null;
  }
  return null;
}

async function main() {
  const args = argMap(process.argv.slice(2));
  const orgId = String(args.org || 'default-user').trim();
  const projectId = String(args.projectId || '').trim();
  const outPath = String(args.out || '').trim();
  const libraryPath = String(args.library || path.join(process.cwd(), 'samples', 'battery_library_fixture.json')).trim();
  const intervalFixture = String(args.intervalFixture || '').trim();

  if (!projectId) {
    console.error('Missing --projectId <id>');
    process.exit(2);
  }
  if (!outPath) {
    console.error('Missing --out <path>');
    process.exit(2);
  }

  const project = await loadProjectForOrg(orgId, projectId);
  if (!project) {
    console.error(`Project not found for org=${orgId} projectId=${projectId}`);
    process.exit(1);
  }

  const lib = await loadBatteryLibraryV1(libraryPath);

  const interval = intervalFixture ? loadIntervalFixture(intervalFixture) : intervalFromProjectTelemetry(project);

  const inputs: UtilityInputs = {
    orgId,
    projectId,
    serviceType: 'electric',
    utilityTerritory: String(project?.customer?.utilityCompany || '').trim() || undefined,
    customerType: String((project as any)?.customer?.facilityType || '').trim() || undefined,
    // currentRate may not be known; workflow will be conservative.
    ...(interval ? { intervalDataRef: { telemetrySeriesId: 'project_or_fixture', resolution: 'hourly', channels: ['kW'] } } : {}),
  };

  const nowIso = new Date('2026-01-01T00:00:00.000Z').toISOString();
  let seq = 0;
  const wf = await runUtilityWorkflow({
    inputs,
    intervalKwSeries: interval || undefined,
    batteryLibrary: lib.library.items,
    nowIso,
    idFactory: () => `wfReco_${++seq}`,
    suggestionIdFactory: () => `wfSug_${++seq}`,
    inboxIdFactory: () => `wfInbox_${++seq}`,
  });

  const summary = generateUtilitySummaryV1({
    inputs,
    insights: wf.utility.insights,
    utilityRecommendations: wf.utility.recommendations,
    batteryGate: wf.battery.gate,
    batterySelection: wf.battery.selection,
    nowIso,
  });

  const absOut = path.isAbsolute(outPath) ? outPath : path.join(process.cwd(), outPath);
  mkdirSync(path.dirname(absOut), { recursive: true });
  writeFileSync(absOut, summary.markdown, 'utf-8');

  console.log(JSON.stringify({ ok: true, projectId, out: absOut, missingInputsCount: summary.json.missingInputsChecklist.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

