/**
 * Battery Intelligence v1 (deterministic screening) - downstream consumer of Utility Intelligence outputs.
 *
 * Usage:
 *   npx tsx scripts/run-battery-intelligence.ts --projectId <id> --meterId <id> --library samples/battery_library_fixture.json
 *
 * Optional:
 *   --org <orgId>                  (defaults to "default-user")
 *   --territory PGE
 *   --rateCode B-19
 *   --naics 622110
 *   --customerType healthcare
 *   --intervalFixture samples/interval_peaky_office.json
 *   --utilityInsightsFile <path>   (if provided, skips running analyzeUtility)
 */

import path from 'path';
import { readFileSync, existsSync } from 'fs';
import { loadProjectForOrg } from '../src/modules/project/projectRepository';
import { loadBatteryLibraryV1 } from '../src/modules/batteryLibrary/loadLibrary';
import type { UtilityInsights, UtilityInputs } from '../src/modules/utilityIntelligence/types';
import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';
import { shouldEvaluateBattery } from '../src/modules/batteryIntelligence/shouldEvaluateBattery';
import { selectBatteryCandidatesV1 } from '../src/modules/batteryIntelligence/selectCandidates';
import { toBatteryRecommendationsV1 } from '../src/modules/batteryIntelligence/toBatteryRecommendations';

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

function loadJsonFile<T = any>(filePath: string): T {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!existsSync(abs)) throw new Error(`File not found: ${abs}`);
  return JSON.parse(readFileSync(abs, 'utf-8')) as T;
}

async function main() {
  const args = argMap(process.argv.slice(2));
  const orgId = String(args.org || 'default-user').trim();
  const projectId = String(args.projectId || '').trim();
  const meterId = String(args.meterId || '').trim();
  const libraryPath = String(args.library || '').trim();
  const territory = String(args.territory || 'PGE').trim();
  const rateCode = String(args.rateCode || '').trim();
  const naics = String(args.naics || '').trim();
  const customerType = String(args.customerType || '').trim();
  const intervalFixture = String(args.intervalFixture || '').trim();
  const utilityInsightsFile = String(args.utilityInsightsFile || '').trim();

  if (!projectId) {
    console.error('Missing --projectId <id>');
    process.exit(2);
  }
  if (!meterId) {
    console.error('Missing --meterId <id>');
    process.exit(2);
  }
  if (!libraryPath) {
    console.error('Missing --library <path>');
    process.exit(2);
  }

  // Load project (best-effort; used primarily for compatibility with other scripts)
  await loadProjectForOrg(orgId, projectId).catch(() => null);

  const lib = await loadBatteryLibraryV1(libraryPath);

  const intervalKwSeries = intervalFixture ? loadIntervalFixture(intervalFixture) : null;
  const nowIso = new Date('2026-01-01T00:00:00.000Z').toISOString();

  const inputs: UtilityInputs = {
    orgId,
    projectId,
    serviceType: 'electric',
    utilityTerritory: territory || undefined,
    ...(customerType ? { customerType } : {}),
    ...(naics ? { naicsCode: naics } : {}),
    ...(rateCode ? { currentRate: { utility: territory || 'PGE', rateCode } } : {}),
    ...(intervalKwSeries
      ? { intervalDataRef: { telemetrySeriesId: `fixture:${intervalFixture}`, resolution: 'hourly', channels: ['kW'] } }
      : {}),
    // Demand indicator is often unknown at screening time; default undefined (conservative).
  };

  const insights: UtilityInsights = utilityInsightsFile
    ? loadJsonFile<UtilityInsights>(utilityInsightsFile)
    : (await analyzeUtility(inputs, { intervalKwSeries: intervalKwSeries || undefined, nowIso, idFactory: () => 'utilReco_1' })).insights;

  const gate = shouldEvaluateBattery({ insights });
  const selection = selectBatteryCandidatesV1({ insights, library: lib.library.items, topN: 10 });

  const reco = toBatteryRecommendationsV1({
    inputs,
    insights,
    gate,
    selection,
    meterId,
    nowIso,
    suggestionIdFactory: () => 'batterySug_1',
    inboxIdFactory: () => 'batteryInbox_1',
  });

  const out = {
    inputs,
    meterId,
    utilityInsights: insights,
    batteryGate: gate,
    candidateSelection: selection,
    inboxReady: { suggestion: reco.suggestions[0], inboxItem: reco.inboxItems[0] },
    libraryWarnings: lib.warnings,
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

