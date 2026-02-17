import { describe, it, expect } from 'vitest';
import { unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';

import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';
import { createOrOverwriteProjectForOrg } from '../src/modules/project/projectRepository';

describe('Storage Economics overrides (project telemetry)', () => {
  it('reads storageEconomicsOverridesV1 from project.telemetry when present', async () => {
    const orgId = 'test-org-storage-econ';
    const projectId = 'test-project-storage-econ-overrides';

    const fp = path.join(process.cwd(), 'data', 'projects', `${projectId}.json`);

    const overrides = {
      powerCostPerKwUsdRange: [400, 600],
      energyCostPerKwhUsdRange: [150, 250],
      softCostsPctRange: [0.05, 0.1],
      omPctOfCapexPerYearRange: [0.01, 0.02],
      projectLifeYears: 15,
      discountRateRange: [0.07, 0.1],
    };

    try {
      await createOrOverwriteProjectForOrg(orgId, {
        id: projectId,
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        customer: { name: 'Test' } as any,
        telemetry: { storageEconomicsOverridesV1: overrides } as any,
      } as any);

      const res = await analyzeUtility(
        {
          orgId,
          projectId,
          serviceType: 'electric',
          utilityTerritory: 'PGE',
          customerType: 'office',
        },
        { nowIso: new Date('2026-01-01T00:00:00.000Z').toISOString() },
      );

      const econ = (res as any)?.insights?.storageOpportunityPackV1?.storageEconomicsV1 || null;
      expect(econ).toBeTruthy();

      const miss = Array.isArray(econ.missingInfo) ? econ.missingInfo : [];
      expect(miss).not.toContain('storage.econ.v1.capex_defaults_used');
      expect(miss).not.toContain('storage.econ.v1.discount_rate_default_used');
      expect(String(econ.engineVersion || '')).toBe('storage_econ_v1.0');
    } finally {
      if (existsSync(fp)) unlinkSync(fp);
    }
  });
});

