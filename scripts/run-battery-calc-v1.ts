/**
 * Battery Calc v1 (deterministic) - candidate selection + inbox-only recommendation payload.
 *
 * Usage:
 *   npx tsx scripts/run-battery-calc-v1.ts --projectId <id> --meterId <id> --library samples/battery_library_fixture.json
 *
 * Optional:
 *   --org <orgId>                 (defaults to "default-user" for file-based dev storage)
 *   --intervalFile <path>         (defaults to data/INTERVAL.csv if present)
 */

import path from 'path';
import { existsSync } from 'fs';
import { loadProjectForOrg } from '../src/modules/project/projectRepository';
import { loadBatteryLibraryV1 } from '../src/modules/batteryLibrary/loadLibrary';
import { generateBatteryRecommendationsV1 } from '../src/modules/batteryCalcV1/generateBatteryRecommendations';

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

async function main() {
  const args = argMap(process.argv.slice(2));
  const orgId = String(args.org || 'default-user').trim();
  const projectId = String(args.projectId || '').trim();
  const meterId = String(args.meterId || '').trim();
  const libraryPath = String(args.library || '').trim();
  const intervalFileArg = String(args.intervalFile || '').trim();

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

  const project = await loadProjectForOrg(orgId, projectId);
  if (!project) {
    console.error(`Project not found for org=${orgId} projectId=${projectId}`);
    process.exit(1);
  }

  const lib = await loadBatteryLibraryV1(libraryPath);
  const intervalDefault = path.join(process.cwd(), 'data', 'INTERVAL.csv');
  const intervalFilePath = intervalFileArg || (existsSync(intervalDefault) ? intervalDefault : '');

  const nowIso = new Date('2026-01-01T00:00:00.000Z').toISOString();
  const out = generateBatteryRecommendationsV1({
    orgId,
    projectId,
    targetProject: project,
    libraryItems: lib.library.items,
    meter: {
      meterId,
      intervalFilePath: intervalFilePath || undefined,
    },
    nowIso,
    idFactory: () => 'batteryReco_1',
    inboxIdFactory: () => 'batteryInbox_1',
  });

  console.log('✅ Battery Calc v1 (deterministic)');
  console.log(`- orgId: ${orgId}`);
  console.log(`- projectId: ${projectId}`);
  console.log(`- meterId: ${meterId}`);
  console.log(`- library: ${libraryPath}`);
  console.log(`- intervalFile: ${intervalFilePath || '(none)'}`);
  console.log('');
  console.log('Top candidates:');
  for (const c of out.rankedCandidates.slice(0, 10)) {
    console.log(`- ${c.vendor} ${c.sku} fitScore=${c.fitScore.toFixed(3)}${c.disqualifiers.length ? ` disq=[${c.disqualifiers.join('; ')}]` : ''}`);
  }
  console.log('');
  console.log('requiredInputsMissing:');
  if (out.requiredInputsMissing.length === 0) console.log('- (none)');
  else for (const m of out.requiredInputsMissing) console.log(`- ${m}`);

  console.log('\nSample RecommendationSuggestion (JSON):');
  console.log(JSON.stringify(out.suggestions[0], null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

