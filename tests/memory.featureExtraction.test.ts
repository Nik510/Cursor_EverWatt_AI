import { describe, expect, test } from 'vitest';
import { extractProjectFeaturesV1 } from '../src/modules/memory/buildMemoryIndex';
import type { CompletedProjectRecord } from '../src/modules/project/types';

describe('EverWatt Memory v1 - feature extraction', () => {
  test('extractProjectFeaturesV1 buckets sqft and normalizes tags', () => {
    const rec: CompletedProjectRecord = {
      completedProjectId: 'cp1',
      orgId: 'org',
      createdAt: '2025-01-01T00:00:00.000Z',
      importedAt: '2026-01-01T00:00:00.000Z',
      building: {
        buildingType: 'Office',
        sqft: 120_000,
        climateZone: 'CA-3',
        territory: 'PG&E',
        operatingSchedule: { bucket: 'business_hours' },
      },
      assetsBefore: { ahuCount: 2, vavCount: 20, lightingFixtureCount: 1000 },
      measuresImplemented: [
        { measureType: 'VFD_RETROFIT', label: 'VFD retrofit', tags: ['VFD', 'HVAC'], parameters: {} },
        { measureType: 'LIGHTING_RETROFIT', label: 'Lighting retrofit', tags: ['Lighting', 'LED'], parameters: {} },
      ],
      // legacy (optional)
      measures: [
        { measureId: 'm1', type: 'VFD_RETROFIT', tags: ['VFD', 'HVAC'] },
        { measureId: 'm2', type: 'LIGHTING_RETROFIT', tags: ['Lighting', 'LED'] },
      ],
      evidenceRefs: [{ refId: 'e1', url: 'https://example.com' }],
    };

    const f = extractProjectFeaturesV1(rec);
    expect(f.completedProjectId).toBe('cp1');
    expect(f.buildingTypeBucket).toBe('office');
    expect(f.sqftBucket).toBe('50-150k');
    expect(f.climateZone).toBe('CA-3');
    expect(f.territory).toBe('PG&E');
    expect(f.scheduleBucket).toBe('business_hours');
    expect(f.assetInventoryCounts.ahuCount).toBe(2);
    expect(f.assetInventoryCounts.vavCount).toBe(20);
    expect(f.assetInventoryCounts.lightingFixtureCount).toBe(1000);
    expect(f.measureTags).toEqual(['hvac', 'led', 'lighting', 'vfd']);
  });
});

