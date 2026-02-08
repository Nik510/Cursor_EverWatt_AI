import { describe, it, expect } from 'vitest';

import { ProjectRecordSchema, PROJECT_RECORD_SCHEMA_VERSION } from '../src/modules/projectLibrary/projectRecord';
import { ProjectLibraryManifestSchema, PROJECT_MANIFEST_SCHEMA_VERSION } from '../src/modules/projectLibrary/manifest';

describe('projectLibrary schemas (Phase 1)', () => {
  it('rejects wrong schema_version for ProjectRecord', () => {
    const res = ProjectRecordSchema.safeParse({
      schema_version: 'project_record/v0',
      project_id: 'x',
      project_slug: 'y',
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
      client: { name: 'ACME' },
      site: {},
      building_type: 'office',
      confidence: { overall: 0.5 },
      source_files: [],
    });
    expect(res.success).toBe(false);
  });

  it('accepts minimal valid ProjectRecord and enforces source file role', () => {
    const epochIso = new Date(0).toISOString();

    const ok = ProjectRecordSchema.safeParse({
      schema_version: PROJECT_RECORD_SCHEMA_VERSION,
      project_id: 'pl_1',
      project_slug: 'slug-1',
      created_at: epochIso,
      updated_at: epochIso,
      project_year: 2024,
      client: { name: 'ACME' },
      site: {},
      building_type: 'office',
      confidence: { overall: 0.5 },
      source_files: [
        {
          path: 'everwatt-project-library/raw/slug-1/summary.pdf',
          role: 'summary',
          sha256: 'a'.repeat(64),
          bytes: 123,
          source: 'raw',
        },
      ],
    });
    expect(ok.success).toBe(true);

    const bad = ProjectRecordSchema.safeParse({
      schema_version: PROJECT_RECORD_SCHEMA_VERSION,
      project_id: 'pl_1',
      project_slug: 'slug-1',
      created_at: epochIso,
      updated_at: epochIso,
      client: { name: 'ACME' },
      site: {},
      building_type: 'office',
      confidence: { overall: 0.5 },
      source_files: [
        {
          path: 'everwatt-project-library/raw/slug-1/summary.pdf',
          role: 'not-a-role',
          sha256: 'a'.repeat(64),
          bytes: 123,
          source: 'raw',
        },
      ],
    });
    expect(bad.success).toBe(false);
  });

  it('rejects wrong schema_version for manifest and requires project_slug/manual/building_type', () => {
    const wrongVersion = ProjectLibraryManifestSchema.safeParse({
      schema_version: 'project_manifest/v0',
      project_slug: 'x',
      manual: { client: { name: 'ACME' }, building_type: 'office' },
      source_files: [],
    });
    expect(wrongVersion.success).toBe(false);

    const missingManual = ProjectLibraryManifestSchema.safeParse({
      schema_version: PROJECT_MANIFEST_SCHEMA_VERSION,
      project_slug: 'x',
      source_files: [],
    });
    expect(missingManual.success).toBe(false);
  });
});

