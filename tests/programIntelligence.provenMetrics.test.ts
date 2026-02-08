import { describe, expect, it } from 'vitest';
import { matchPrograms } from '../src/modules/programIntelligence/matchPrograms';
import type { ProgramCatalogEntry } from '../src/modules/programIntelligence/types';

describe('programIntelligence: proven metrics preference', () => {
  it('uses provenPeakKw to satisfy minPeakKw gate when heuristic peak is missing', () => {
    const catalog: ProgramCatalogEntry[] = [
      {
        programId: 'pge.dr.test_min_peak_kw',
        name: 'Test DR Program',
        utilityTerritory: 'PGE',
        category: 'DEMAND_RESPONSE',
        administrator: 'UTILITY',
        eligibility: { minPeakKw: 50 },
        benefitsSummary: 'Test benefits',
        requiredCustomerData: [],
        nextSteps: [],
        version: 'test',
        lastUpdated: '2026-01-01',
      },
    ];

    const withoutProven = matchPrograms({
      inputs: { orgId: 'o', projectId: 'p', serviceType: 'electric', utilityTerritory: 'PGE' },
      derived: {
        peakKw: undefined,
        hasIntervalData: true,
        loadShiftScore: 0.9,
      },
      catalog,
    });

    const withProven = matchPrograms({
      inputs: { orgId: 'o', projectId: 'p', serviceType: 'electric', utilityTerritory: 'PGE' },
      derived: {
        peakKw: undefined,
        provenPeakKw: 55,
        hasIntervalData: true,
        loadShiftScore: 0.9,
      },
      catalog,
    });

    const m0 = withoutProven[0]!;
    const m1 = withProven[0]!;
    expect(m0.matchStatus).toBe('unknown');
    expect(m0.requiredInputsMissing.join(' | ')).toMatch(/Peak kW required/i);

    expect(m1.matchStatus).toBe('eligible');
    expect(m1.requiredInputsMissing.join(' | ')).not.toMatch(/Peak kW required/i);
  });
});

