/**
 * Build EverWatt Memory Index (v1).
 *
 * Usage:
 *   npx tsx scripts/build-memory-index.ts --org <orgId>
 */

import { ensureDatabaseSchema, isDatabaseEnabled } from '../src/db/client';
import { listCompletedProjects, upsertMemoryIndex } from '../src/modules/memory/storage';
import { buildMemoryIndexV1 } from '../src/modules/memory/buildMemoryIndex';

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
  const orgId = String(args.org || '').trim();
  if (!orgId) {
    console.error('Missing --org <orgId>');
    process.exit(2);
  }

  if (isDatabaseEnabled()) await ensureDatabaseSchema();

  const projects = await listCompletedProjects(orgId);
  const nowIso = new Date().toISOString();
  const index = buildMemoryIndexV1({ orgId, projects, generatedAtIso: nowIso });
  await upsertMemoryIndex(index);

  console.log('✅ Memory index built');
  console.log(`- orgId: ${orgId}`);
  console.log(`- version: ${index.version}`);
  console.log(`- projects indexed: ${Object.keys(index.featuresByProjectId).length}`);
  console.log(`- invertedIndexes.measureTagToProjects: ${Object.keys(index.invertedIndexes.measureTagToProjects).length} tags`);
  console.log(`- generatedAt: ${index.generatedAt}`);
  console.log(`\nStorage: ${isDatabaseEnabled() ? 'database' : 'data/dev/* (file-based)'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

