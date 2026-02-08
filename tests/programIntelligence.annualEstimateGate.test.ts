import { describe, expect, it } from 'vitest';
import { matchPrograms } from '../src/modules/programIntelligence/matchPrograms';
import type { ProgramCatalogEntry } from '../src/modules/programIntelligence/types';

describe('programIntelligence: annual kWh estimate gates', () => {
  it('uses provenAnnualKwhEstimate from provenMonthlyKwh=7200 (86400) and removes missing input', () => {
    const catalog: ProgramCatalogEntry[] = [
      {
        programId: 'pge.incentives.annual_gate_test',
        name: 'Annual gate test',
        utilityTerritory: 'PGE',
        category: 'INCENTIVE',
        administrator: 'UTILITY',
        eligibility: { minAnnualKwh: 80_000 },
        benefitsSummary: 'Test benefits',
        requiredCustomerData: [],
        nextSteps: [],
        version: 'test',
        lastUpdated: '2026-01-01',
      },
    ];

    const est = { annualKwhEstimate: 86_400, monthsUsed: 1, confidence: 0.45, because: ['annualized scalar'] };
    const matches = matchPrograms({
      inputs: { orgId: 'o', projectId: 'p', serviceType: 'electric', utilityTerritory: 'PGE' },
      derived: {
        provenAnnualKwhEstimate: est,
      },
      catalog,
    });

    const m = matches[0]!;
    expect(m.requiredInputsMissing.join(' | ')).not.toMatch(/Annual kWh required/i);
    expect(m.because.join(' | ')).toMatch(/Annual kWh estimated as 86400/i);
  });
});

