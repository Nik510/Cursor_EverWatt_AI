import { describe, expect, test } from 'vitest';
import { importCompletedProjectFromJson } from '../src/modules/project/importCompletedProject';

describe('Completed project importer - schema validation', () => {
  test('reports missing required fields', () => {
    const nowIso = '2026-01-01T00:00:00.000Z';
    const res = importCompletedProjectFromJson({
      importedAtIso: nowIso,
      input: {
        // completedProjectId missing
        orgId: 'org',
        createdAt: '2025-01-01T00:00:00.000Z',
        building: { sqft: 1000 },
        measures: [],
      },
    });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    // missing fields should include at least these paths
    expect(res.errors.join('\n')).toContain('completedProjectId');
    expect(res.errors.join('\n')).toContain('building.buildingType');
  });

  test('requires at least one measure', () => {
    const nowIso = '2026-01-01T00:00:00.000Z';
    const res = importCompletedProjectFromJson({
      importedAtIso: nowIso,
      input: {
        completedProjectId: 'cp_x',
        orgId: 'org',
        createdAt: '2025-01-01T00:00:00.000Z',
        building: { buildingType: 'office', sqft: 1000 },
        // no measuresImplemented + no measures
      },
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors.join('\n')).toContain('measuresImplemented');
  });
});

