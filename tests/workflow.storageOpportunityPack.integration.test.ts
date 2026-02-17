import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';

import { parseIntervalElectricCsvV1 } from '../src/modules/utilityIntelligence/intake/intervalElectricV1/parseIntervalElectricCsvV1';
import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';
import { buildInternalEngineeringReportJsonV1 } from '../src/modules/reports/internalEngineering/v1/buildInternalEngineeringReportJsonV1';
import { renderInternalEngineeringReportHtmlV1 } from '../src/modules/reports/internalEngineering/v1/renderInternalEngineeringReportHtml';

describe(
  'workflow: storage opportunity pack v1 integration (deterministic)',
  () => {
    it('pipes analyzeUtility -> reportJson -> html without recompute', async () => {
      const projectId = 'p_storage_pack_kitchen';
      const orgId = 'o_test';

      const csvText = readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'client_interval_month_full.csv'), 'utf-8');
      const parsed = parseIntervalElectricCsvV1({ csvText, timezoneHint: 'America/Los_Angeles' });
      expect(parsed.ok).toBe(true);
      expect(parsed.points.length).toBeGreaterThan(1000);

      const analysis = await analyzeUtility(
        {
          orgId,
          projectId,
          serviceType: 'electric',
          utilityTerritory: 'PGE',
          currentRate: { utility: 'PGE', rateCode: 'E-19' },
          billPdfText: 'Rate Schedule: E-19',
        } as any,
        {
          intervalPointsV1: parsed.points as any,
          nowIso: '2026-02-10T00:00:00.000Z',
          idFactory: () => 'id_fixed',
        },
      );

      expect(analysis.insights).toBeTruthy();
      expect((analysis.insights as any).storageOpportunityPackV1).toBeTruthy();

      const reportJson = buildInternalEngineeringReportJsonV1({
        projectId,
        generatedAtIso: '2026-02-10T00:00:00.000Z',
        analysisResults: {
          project: { id: projectId },
          workflow: { utility: { insights: analysis.insights, inputs: { currentRate: { utility: 'PGE', rateCode: 'E-19' } } } },
          summary: { markdown: '', json: {} },
        },
        telemetry: { intervalElectricPointsV1: parsed.points as any, intervalElectricMetaV1: parsed.meta as any },
      });

      // Snapshot-only: reportJson must carry the pack exactly as provided by analyzeUtility output.
      expect((reportJson as any).storageOpportunityPackV1).toEqual((analysis.insights as any).storageOpportunityPackV1);

      const html = renderInternalEngineeringReportHtmlV1({
        project: { id: projectId, name: 'Storage Pack Kitchen' },
        revision: { id: 'rev_storage_pack', createdAt: '2026-02-10T00:00:00.000Z', title: 'Storage Pack', reportJson, reportHash: 'h' },
      });

      expect(html).toContain('Battery Opportunity');
      expect(html).toContain('Dispatch Simulation');
      expect(html).toContain('DR Readiness');
      expect(html).not.toContain(':projectId');
    });
  },
  60_000,
);

