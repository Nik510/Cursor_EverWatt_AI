import { describe, it, expect } from 'vitest';

import { ProjectRecordSchema, PROJECT_RECORD_SCHEMA_VERSION } from '../src/modules/projectLibrary/projectRecord';
import { summarizeForHVAC } from '../src/modules/projectLibrary/summarizeForHVAC';

describe('projectLibrary summarizeForHVAC (Phase 1)', () => {
  it('returns deterministic HVAC-focused fields with truncation', () => {
    const epochIso = new Date(0).toISOString();

    const project = ProjectRecordSchema.parse({
      schema_version: PROJECT_RECORD_SCHEMA_VERSION,
      project_id: 'pl_test_1',
      project_slug: 'test-1',
      created_at: epochIso,
      updated_at: epochIso,
      project_year: 2023,
      client: { name: 'ACME' },
      site: {},
      building_type: 'hospital',
      systems: [{ system_type: 'chilled water', description: 'Central plant chillers and pumps' }],
      measures: [
        {
          name: 'Chiller plant optimization',
          description: 'Reset CHWST and staging based on OAT and load',
          status: 'implemented',
        },
      ],
      assumptions: {
        notes: 'Assume 24/7 operation with night setback exceptions.',
        kv: { chwst_min_f: 40, oat_bin_source: 'TMY3' },
      },
      calc_outputs: {
        annual_kwh_savings: 100000,
        annual_cost_savings_usd: 12000,
      },
      confidence: { overall: 0.7 },
      implementation_notes: 'Implemented in phases; initial tuning required two follow-up visits.',
      source_files: [],
    });

    const summary = summarizeForHVAC(project);
    expect(summary.project_id).toBe('pl_test_1');
    expect(summary.building_type).toBe('hospital');
    expect(summary.project_year).toBe(2023);
    expect(summary.systems[0]?.system_type).toBe('chilled water');
    expect(summary.measures[0]?.title).toBe('Chiller plant optimization');
    expect(summary.calc_outputs.annual_kwh_savings).toBe(100000);
    expect(summary.assumptions_summary).toContain('kv:');
    expect(summary.implementation_notes.length).toBeGreaterThan(0);
  });
});

