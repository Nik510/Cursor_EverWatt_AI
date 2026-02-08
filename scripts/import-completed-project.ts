/**
 * Import a completed project snapshot into EverWatt Memory (v1).
 *
 * Usage:
 *   npx tsx scripts/import-completed-project.ts --file samples/completed_project_template.json
 *   npx tsx scripts/import-completed-project.ts --file <path> --createArchivedProject false
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { ensureDatabaseSchema, isDatabaseEnabled } from '../src/db/client';
import { importCompletedProjectFromJson, buildArchivedProjectFromCompletedRecord } from '../src/modules/project/importCompletedProject';
import { upsertCompletedProject } from '../src/modules/memory/storage';
import { createOrOverwriteProjectForOrg } from '../src/modules/project/projectRepository';

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

function parseBool(s: string | undefined, fallback = false): boolean {
  const v = String(s ?? '').trim().toLowerCase();
  if (!v) return fallback;
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

async function main() {
  const args = argMap(process.argv.slice(2));
  const file = String(args.file || '').trim();
  if (!file) {
    console.error('Missing --file <path>');
    process.exit(2);
  }

  if (isDatabaseEnabled()) await ensureDatabaseSchema();

  const fp = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const raw = await readFile(fp, 'utf-8');
  const json = JSON.parse(raw);
  const nowIso = new Date().toISOString();

  const imported = importCompletedProjectFromJson({ input: json, importedAtIso: nowIso });
  if (!imported.ok) {
    console.error('Import validation failed. Missing/invalid fields:');
    for (const e of imported.errors) console.error(`- ${e}`);
    process.exit(1);
  }

  const record = imported.record;
  await upsertCompletedProject(record);

  // Project Builder is the system of record: default to writing an archived PB project.
  const createArchivedProject = parseBool(args.createArchivedProject, true);
  if (createArchivedProject) {
    const archived = buildArchivedProjectFromCompletedRecord({ record, nowIso });
    await createOrOverwriteProjectForOrg(record.orgId, archived);
  }

  const assetCounts = record.assetsAfter || record.assetsBefore || {};
  const evidenceCount = Array.isArray(record.evidenceRefs) ? record.evidenceRefs.length : 0;
  const decisionCount = record.rationale?.assumptions?.length ? record.rationale.assumptions.length : record.rationale?.summary ? 1 : 0;

  console.log('✅ Completed project imported');
  console.log(`- completedProjectId: ${record.completedProjectId}`);
  console.log(`- orgId: ${record.orgId}`);
  console.log(`- measures: ${record.measures.length}`);
  console.log(
    `- assets (before/after summary): ahu=${Number(assetCounts.ahuCount || 0)} vav=${Number(assetCounts.vavCount || 0)} rtu=${Number(
      assetCounts.rtuCount || 0
    )} lightingFixtures=${Number(assetCounts.lightingFixtureCount || 0)}`
  );
  console.log(`- decisions/assumptions: ${decisionCount}`);
  console.log(`- evidence items: ${evidenceCount}`);
  if (imported.warnings.length) {
    console.log('\nWarnings:');
    for (const w of imported.warnings) console.log(`- ${w}`);
  }
  console.log(`\nStorage: ${isDatabaseEnabled() ? 'database' : 'data/dev/* (file-based)'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

