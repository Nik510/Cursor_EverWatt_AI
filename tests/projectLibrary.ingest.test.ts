import { describe, it, expect } from 'vitest';
import path from 'path';
import { tmpdir } from 'os';
import { mkdir, mkdtemp, readFile, writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import { existsSync } from 'fs';

import { ingestProjectLibrary } from '../src/modules/projectLibrary/ingest';
import { ProjectRecordSchema } from '../src/modules/projectLibrary/projectRecord';

function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function stableIdFromSlug(slug: string): string {
  const hex = createHash('sha256').update(slug, 'utf8').digest('hex');
  return `pl_${hex.slice(0, 12)}`;
}

describe('projectLibrary ingest (Phase 1)', () => {
  it('ingests manifest.yaml into normalized project record', async () => {
    const libraryRoot = await mkdtemp(path.join(tmpdir(), 'everwatt-pl-'));
    const projectSlug = 'acme-hq';

    const rawDir = path.join(libraryRoot, 'raw', projectSlug);
    await mkdir(rawDir, { recursive: true });

    const proposalBytes = Buffer.from('proposal-v1', 'utf8');
    await writeFile(path.join(rawDir, 'proposal.pdf'), proposalBytes);

    const manifest = [
      'schema_version: project_manifest/v1',
      `project_slug: ${projectSlug}`,
      'manual:',
      '  title: "ACME HQ EMS Retrofit"',
      '  client:',
      '    name: "ACME Corp"',
      '  site:',
      '    city: "Austin"',
      '    state: "TX"',
      '  building_type: "office"',
      '  project_year: 2023',
      '  tags: ["chiller", "controls"]',
      '  systems:',
      '    - system_type: "chilled water"',
      '      description: "Primary chilled water plant"',
      '  measures:',
      '    - name: "Chiller plant optimization"',
      '      status: implemented',
      '  assumptions:',
      '    kv:',
      '      baseline_year: 2022',
      '  calc_outputs:',
      '    annual_kwh_savings: 123456',
      '  confidence_overall: 0.8',
      'source_files:',
      '  - path: "proposal.pdf"',
      '    role: summary',
      '    description: "Project proposal PDF"',
      '',
    ].join('\n');

    await writeFile(path.join(rawDir, 'manifest.yaml'), manifest, 'utf8');

    const ingested = await ingestProjectLibrary({ libraryRoot });
    expect(ingested).toHaveLength(1);
    expect(ingested[0]?.project_slug).toBe(projectSlug);

    const expectedProjectId = stableIdFromSlug(projectSlug);
    expect(ingested[0]?.project_id).toBe(expectedProjectId);

    const normalizedPath = path.join(libraryRoot, 'normalized', `${expectedProjectId}.json`);
    expect(existsSync(normalizedPath)).toBe(true);

    const normalizedRaw = await readFile(normalizedPath, 'utf8');
    const parsed = JSON.parse(normalizedRaw) as unknown;
    const record = ProjectRecordSchema.parse(parsed);

    expect(record.project_id).toBe(expectedProjectId);
    expect(record.project_slug).toBe(projectSlug);
    expect(record.client.name).toBe('ACME Corp');
    expect(record.building_type).toBe('office');
    expect(record.project_year).toBe(2023);
    expect(record.calc_outputs.annual_kwh_savings).toBe(123456);
    expect(record.confidence.overall).toBeCloseTo(0.8);

    expect(record.source_files).toHaveLength(1);
    expect(record.source_files[0]?.sha256).toBe(sha256Hex(proposalBytes));
    expect(record.source_files[0]?.path).toBe('everwatt-project-library/raw/acme-hq/proposal.pdf');
    expect(record.source_files[0]?.role).toBe('summary');
  });
});

