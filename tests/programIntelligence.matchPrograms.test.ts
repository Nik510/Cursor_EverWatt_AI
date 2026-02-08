import { describe, expect, test } from 'vitest';

import { matchPrograms, getDefaultCatalogForTerritory } from '../src/modules/programIntelligence/matchPrograms';

describe('programIntelligence: matchPrograms', () => {
  test('NAICS prefix include works (healthcare program)', () => {
    const catalog = getDefaultCatalogForTerritory('PGE');
    const matches = matchPrograms({
      inputs: {
        orgId: 't',
        projectId: 'p',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        naicsCode: '622110',
        customerType: 'healthcare',
      },
      derived: {
        annualKwh: 2_500_000,
        peakKw: 600,
        hasIntervalData: false,
        hasAdvancedMetering: false,
        scheduleBucket: 'unknown',
        loadShiftScore: 0.2,
      },
      catalog,
    });

    const health = matches.find((m) => m.programId === 'pge.incentives.healthcare_efficiency_v1');
    expect(health).toBeTruthy();
    expect(health!.matchStatus).not.toBe('unlikely');
    expect(health!.requiredInputsMissing).toEqual([]);
  });

  test('missing NAICS returns unknown + requiredInputsMissing for NAICS-gated programs', () => {
    const catalog = getDefaultCatalogForTerritory('PGE');
    const matches = matchPrograms({
      inputs: {
        orgId: 't',
        projectId: 'p',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        customerType: 'healthcare',
      },
      derived: {
        annualKwh: 2_500_000,
        peakKw: 600,
        hasIntervalData: false,
        hasAdvancedMetering: false,
      },
      catalog,
    });

    const health = matches.find((m) => m.programId === 'pge.incentives.healthcare_efficiency_v1');
    expect(health).toBeTruthy();
    expect(health!.matchStatus).toBe('unknown');
    expect(health!.requiredInputsMissing.join('\n').toLowerCase()).toContain('naics');
  });

  test('minPeakKw thresholds enforced', () => {
    const catalog = getDefaultCatalogForTerritory('PGE');
    const matches = matchPrograms({
      inputs: {
        orgId: 't',
        projectId: 'p',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
      },
      derived: {
        peakKw: 150,
        hasIntervalData: true,
        hasAdvancedMetering: true,
      },
      catalog,
    });

    const cap = matches.find((m) => m.programId === 'pge.dr.capacity_bidder_v1');
    expect(cap).toBeTruthy();
    expect(cap!.matchStatus).toBe('unlikely');
    expect((cap!.flags || []).join(',')).toContain('below_minPeakKw');
  });
});

