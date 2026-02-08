import { describe, expect, test } from 'vitest';
import { similarityV1 } from '../src/modules/recommendations/generateRecommendations';
import type { ProjectFeaturesV1 } from '../src/modules/project/types';

describe('EverWatt Memory v1 - similarity scoring', () => {
  test('similar projects score higher than dissimilar', () => {
    const target = {
      buildingTypeBucket: 'office',
      sqftBucket: '50-150k',
      climateZone: 'CA-3',
      territory: 'pge',
      scheduleBucket: 'business_hours',
      assetCounts: {
        ahuCount: 2,
        rtuCount: 0,
        vavCount: 20,
        fanCount: 5,
        pumpCount: 2,
        chillerCount: 1,
        boilerCount: 0,
        coolingTowerCount: 1,
        panelCount: 10,
        lightingFixtureCount: 1000,
        lightingControlCount: 0,
        otherCount: 0,
      },
    };

    const similar: ProjectFeaturesV1 = {
      completedProjectId: 'cp_sim',
      buildingTypeBucket: 'office',
      sqftBucket: '50-150k',
      climateZone: 'CA-3',
      territory: 'PG&E',
      scheduleBucket: 'business_hours',
      assetInventoryCounts: { ...target.assetCounts } as any,
      measureTags: ['vfd'],
    };

    const dissimilar: ProjectFeaturesV1 = {
      completedProjectId: 'cp_far',
      buildingTypeBucket: 'warehouse',
      sqftBucket: '500k+',
      climateZone: 'TX-2',
      territory: 'ERCOT',
      scheduleBucket: '24_7',
      assetInventoryCounts: {
        ahuCount: 0,
        rtuCount: 15,
        vavCount: 0,
        fanCount: 30,
        pumpCount: 0,
        chillerCount: 0,
        boilerCount: 0,
        coolingTowerCount: 0,
        panelCount: 4,
        lightingFixtureCount: 6000,
        lightingControlCount: 0,
        otherCount: 0,
      },
      measureTags: [],
    };

    const a = similarityV1({ target: target as any, historical: similar });
    const b = similarityV1({ target: target as any, historical: dissimilar });
    expect(a.score).toBeGreaterThan(0.75);
    expect(b.score).toBeLessThan(a.score);
  });
});

