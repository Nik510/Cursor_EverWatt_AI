import { describe, expect, test } from 'vitest';
import { buildMemoryIndexV1 } from '../src/modules/memory/buildMemoryIndex';
import { generateRecommendationsV1 } from '../src/modules/recommendations/generateRecommendations';
import type { CompletedProjectRecord } from '../src/modules/project/types';
import type { ProjectRecord } from '../src/types/change-order';

describe('Playbooks v1 - recommendation scoring overlay', () => {
  test('preferred measures get boosted vs baseScore', () => {
    const completed: CompletedProjectRecord[] = [
      {
        completedProjectId: 'cp_hc_1',
        orgId: 'org',
        createdAt: '2025-01-01T00:00:00.000Z',
        importedAt: '2026-01-01T00:00:00.000Z',
        building: { buildingType: 'healthcare', sqft: 300_000, climateZone: 'CA-10', territory: 'SCE', operatingSchedule: { bucket: '24_7' } },
        assetsBefore: { chillerCount: 2, pumpCount: 10, ahuCount: 6, vavCount: 120 },
        measuresImplemented: [
          { measureType: 'PUMP_VFD', label: 'Pump VFD install', tags: ['pump', 'vfd'], parameters: {} },
        ],
        evidenceRefs: [{ refId: 'e1' }],
      },
      {
        completedProjectId: 'cp_hc_2',
        orgId: 'org',
        createdAt: '2025-02-01T00:00:00.000Z',
        importedAt: '2026-01-01T00:00:00.000Z',
        building: { buildingType: 'healthcare', sqft: 280_000, climateZone: 'CA-10', territory: 'SCE', operatingSchedule: { bucket: '24_7' } },
        assetsBefore: { chillerCount: 2, pumpCount: 8, ahuCount: 5, vavCount: 100 },
        measuresImplemented: [{ measureType: 'EMS_TUNING', label: 'BMS tuning', tags: ['controls'], parameters: {} }],
        evidenceRefs: [{ refId: 'e2' }],
      },
    ];

    const index = buildMemoryIndexV1({ orgId: 'org', projects: completed, generatedAtIso: '2026-01-02T00:00:00.000Z' });

    const target: ProjectRecord = {
      id: 'p_hc',
      driveFolderLink: '',
      customer: { projectNumber: 'P-HC', companyName: 'ACME', facilityType: 'healthcare' },
      building: { buildingType: 'healthcare', operatingSchedule: { bucket: '24_7' }, sqft: 310_000 } as any,
      graph: {
        assets: [
          { kind: 'asset', id: 'p1', assetTag: 'P-1', type: 'pump' as any, baseline: { properties: { motorHp: '15' } } },
          { kind: 'asset', id: 'c1', assetTag: 'CH-1', type: 'chiller' as any, baseline: { properties: { tonnage: '400' } } },
        ] as any,
        measures: [],
        inbox: [],
      } as any,
    };

    const { suggestions } = generateRecommendationsV1({
      orgId: 'org',
      projectId: 'p_hc',
      targetProject: target,
      memoryIndex: index,
      completedProjects: completed,
      topN: 2,
      nowIso: '2026-01-03T00:00:00.000Z',
      idFactory: () => 's1',
      inboxIdFactory: () => 'i1',
    });

    const pump = suggestions.find((s) => s.suggestedMeasure.measureType === 'PUMP_VFD');
    expect(pump).toBeTruthy();
    expect(pump?.playbookAlignment).toBe('preferred');
    expect(pump?.explain?.scoreOverlay?.baseScore).toBeGreaterThan(0);
    expect(pump?.score).toBeGreaterThan((pump as any).explain.scoreOverlay.baseScore);
  });
});

