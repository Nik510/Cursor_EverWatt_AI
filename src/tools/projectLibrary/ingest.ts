import path from 'path';
import { fileURLToPath } from 'url';

import { ingestProjectLibrary } from '../../modules/projectLibrary/ingest';

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function usage(): string {
  return [
    'EverWatt Project Library ingestion (Phase 1)',
    '',
    'Usage:',
    '  tsx src/tools/projectLibrary/ingest.ts [--libraryRoot <path>] [--project <project_slug>]',
    '',
    'Notes:',
    '  - Reads everwatt-project-library/raw/*/manifest.yaml',
    '  - Writes everwatt-project-library/normalized/<project_id>.json',
    '  - Deterministic: no OCR/PDF parsing, no embeddings',
    '',
  ].join('\n');
}

export async function main() {
  if (hasFlag('--help') || hasFlag('-h')) {
    console.log(usage());
    process.exit(0);
  }

  const libraryRoot =
    getArg('--libraryRoot') || path.join(process.cwd(), 'everwatt-project-library');
  const onlyProjectSlug = getArg('--project');

  const ingested = await ingestProjectLibrary({ libraryRoot, onlyProjectSlug });
  console.log(
    JSON.stringify(
      {
        success: true,
        ingested,
        count: ingested.length,
      },
      null,
      2
    )
  );
}

// Run only when executed as a script (not when imported in tests).
const isExecutedDirectly = (() => {
  const thisFile = fileURLToPath(import.meta.url);
  const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
  return invoked && path.resolve(invoked) === path.resolve(thisFile);
})();

if (isExecutedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

