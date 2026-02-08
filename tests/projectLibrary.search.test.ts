import { describe, it, expect } from 'vitest';
import path from 'path';
import { tmpdir } from 'os';
import { mkdir, mkdtemp, writeFile } from 'fs/promises';

import { ProjectRecordSchema, PROJECT_RECORD_SCHEMA_VERSION } from '../src/modules/projectLibrary/projectRecord';
import { searchProjectLibrary } from '../src/modules/projectLibrary/search';

describe('projectLibrary search (Phase 1)', () => {
  it('returns top matches with why matched', async () => {
    const libraryRoot = await mkdtemp(path.join(tmpdir(), 'everwatt-pl-search-'));
    const normalizedDir = path.join(libraryRoot, 'normalized');
    await mkdir(normalizedDir, { recursive: true });

    const epochIso = new Date(0).toISOString();

    const office = ProjectRecordSchema.parse({
      schema_version: PROJECT_RECORD_SCHEMA_VERSION,
      project_id: 'pl_office_1',
      project_slug: 'office-1',
      title: 'Office HVAC Controls Tune-up',
      created_at: epochIso,
      updated_at: epochIso,
      project_year: 2022,
      client: { name: 'ACME Corp' },
      site: { name: 'ACME HQ', city: 'Austin', state: 'TX' },
      building_type: 'office',
      tags: ['controls', 'vav'],
      systems: [{ system_type: 'air handling', description: 'VAV air handling units' }],
      measures: [{ name: 'VAV static pressure reset', status: 'implemented' }],
      assumptions: { kv: {} },
      calc_outputs: {},
      confidence: { overall: 0.6 },
      source_files: [],
    });

    const hospital = ProjectRecordSchema.parse({
      schema_version: PROJECT_RECORD_SCHEMA_VERSION,
      project_id: 'pl_hospital_1',
      project_slug: 'hospital-1',
      title: 'Hospital Chiller Plant Optimization',
      created_at: epochIso,
      updated_at: epochIso,
      project_year: 2021,
      client: { name: 'Metro Health' },
      site: { name: 'Metro Hospital', city: 'Dallas', state: 'TX' },
      building_type: 'hospital',
      tags: ['chiller', 'plant', 'controls'],
      systems: [{ system_type: 'chilled water', description: 'Central plant chillers' }],
      measures: [{ name: 'Chiller plant optimization', status: 'implemented' }],
      assumptions: { kv: {} },
      calc_outputs: {},
      confidence: { overall: 0.8 },
      source_files: [],
    });

    await writeFile(path.join(normalizedDir, `${office.project_id}.json`), `${JSON.stringify(office, null, 2)}\n`, 'utf8');
    await writeFile(path.join(normalizedDir, `${hospital.project_id}.json`), `${JSON.stringify(hospital, null, 2)}\n`, 'utf8');

    const results = await searchProjectLibrary({
      q: 'hospital chiller optimization',
      libraryRoot,
      limit: 5,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.project_id).toBe('pl_hospital_1');
    expect(results[0]?.why_matched.score).toBeGreaterThan(0);
    expect(results[0]?.why_matched.matched_fields).toContain('building_type');
    expect(results[0]?.why_matched.matched_terms).toContain('hospital');
    expect(results[0]?.why_matched.matched_terms).toContain('chiller');
  });
});

