import { describe, expect, test } from 'vitest';
import { buildMemoryIndexV1 } from '../src/modules/memory/buildMemoryIndex';
import { generateRecommendationsV1 } from '../src/modules/recommendations/generateRecommendations';
import type { CompletedProjectRecord } from '../src/modules/project/types';
import type { ProjectRecord } from '../src/types/change-order';

describe('EverWatt Memory v1 - recommendation snapshot', () => {
  test('generates explainable suggestions from similar historical projects', () => {
    const completed: CompletedProjectRecord[] = [
      {
        completedProjectId: 'cp_office_1',
        orgId: 'org',
        createdAt: '2025-01-01T00:00:00.000Z',
        importedAt: '2026-01-01T00:00:00.000Z',
        building: { buildingType: 'office', sqft: 100_000, climateZone: 'CA-3', territory: 'PG&E', operatingSchedule: { bucket: 'business_hours' } },
        assetsBefore: { ahuCount: 2, vavCount: 20, lightingFixtureCount: 1500 },
        measuresImplemented: [
          { measureType: 'VFD_RETROFIT', label: 'VFD retrofit', tags: ['vfd', 'hvac'], parameters: {} },
          { measureType: 'EMS_TUNING', label: 'EMS tuning', tags: ['controls', 'ems'], parameters: {} },
        ],
        evidenceRefs: [{ refId: 'e1', url: 'https://example.com/p1' }],
      },
      {
        completedProjectId: 'cp_office_2',
        orgId: 'org',
        createdAt: '2025-02-01T00:00:00.000Z',
        importedAt: '2026-01-01T00:00:00.000Z',
        building: { buildingType: 'office', sqft: 130_000, climateZone: 'CA-3', territory: 'PG&E', operatingSchedule: { bucket: 'business_hours' } },
        assetsBefore: { ahuCount: 3, vavCount: 25, lightingFixtureCount: 2200 },
        measuresImplemented: [
          { measureType: 'LIGHTING_RETROFIT', label: 'LED lighting retrofit', tags: ['lighting', 'led'], parameters: {} },
          { measureType: 'EMS_TUNING', label: 'BMS tuning', tags: ['controls', 'ems'], parameters: {} },
        ],
        evidenceRefs: [{ refId: 'e2', url: 'https://example.com/p2' }],
      },
      {
        completedProjectId: 'cp_warehouse',
        orgId: 'org',
        createdAt: '2025-03-01T00:00:00.000Z',
        importedAt: '2026-01-01T00:00:00.000Z',
        building: { buildingType: 'warehouse', sqft: 600_000, climateZone: 'TX-2', territory: 'ERCOT', operatingSchedule: { bucket: '24_7' } },
        assetsBefore: { rtuCount: 12, lightingFixtureCount: 8000 },
        measuresImplemented: [{ measureType: 'LIGHTING_RETROFIT', label: 'Lighting retrofit', tags: ['lighting'], parameters: {} }],
        evidenceRefs: [{ refId: 'e3', url: 'https://example.com/p3' }],
      },
    ];

    const index = buildMemoryIndexV1({ orgId: 'org', projects: completed, generatedAtIso: '2026-01-02T00:00:00.000Z' });

    const target: ProjectRecord = {
      id: 'p1',
      driveFolderLink: '',
      customer: { projectNumber: 'P-1', companyName: 'ACME', facilityType: 'office' },
      graph: {
        assets: [
          { kind: 'asset', id: 'a1', assetTag: 'AHU-1', type: 'ahu' as any, baseline: { properties: { motorHp: '15' } } },
          { kind: 'asset', id: 'a2', assetTag: 'AHU-2', type: 'ahu' as any, baseline: { properties: { motorHp: '10' } } },
          { kind: 'asset', id: 'l1', assetTag: 'LTG-1', type: 'lightingFixture' as any, baseline: { properties: { fixtureWatts: '40' } } },
        ] as any,
        measures: [],
        inbox: [],
      } as any,
    };

    let sid = 0;
    let iid = 0;
    const { suggestions, inboxItems } = generateRecommendationsV1({
      orgId: 'org',
      projectId: 'p1',
      stateId: 'baseline',
      targetProject: target,
      memoryIndex: index,
      completedProjects: completed,
      topN: 2,
      nowIso: '2026-01-03T00:00:00.000Z',
      idFactory: () => `sug_${++sid}`,
      inboxIdFactory: () => `inbox_${++iid}`,
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(inboxItems.length).toBe(suggestions.length);

    const types = new Set(suggestions.map((s) => s.suggestedMeasure.measureType));
    expect(types.has('EMS_TUNING')).toBe(true);
    expect(types.has('VFD_RETROFIT')).toBe(true);
    expect(types.has('LIGHTING_RETROFIT')).toBe(true);

    const ems = suggestions.find((s) => s.suggestedMeasure.measureType === 'EMS_TUNING');
    expect(ems?.requiredInputsMissing || []).toEqual(
      expect.arrayContaining(['utility interval electricity data (15-min or hourly)', 'building or AHU operating schedule (needed to validate schedule changes)'])
    );

    for (const s of suggestions) {
      expect(s.explain.topContributors.length).toBeGreaterThan(0);
      expect(s.explain.topContributors.length).toBeLessThanOrEqual(3);
      expect(s.explain.matchingFeaturesUsed).toEqual(expect.arrayContaining(['buildingType', 'assetInventory']));
      expect(String(s.explain.frequency.text || '')).toContain('seen in');
    }
  });
});

