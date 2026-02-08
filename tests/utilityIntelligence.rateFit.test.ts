import { describe, expect, test } from 'vitest';
import path from 'path';
import { readFileSync } from 'fs';

import { evaluateRateFit } from '../src/modules/utilityIntelligence/rates/evaluateRateFit';
import { analyzeLoadShape } from '../src/modules/utilityIntelligence/interval/analyzeLoadShape';
import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';

function loadFixture(name: string): Array<{ timestampIso: string; kw: number }> {
  const fp = path.join(process.cwd(), 'samples', name);
  const raw = readFileSync(fp, 'utf-8');
  return JSON.parse(raw);
}

describe('utilityIntelligence: rate fit', () => {
  test('rateFit is unknown when currentRate missing and suggests collecting rate code', async () => {
    const interval = loadFixture('interval_peaky_office.json');
    const shape = analyzeLoadShape({ intervalKw: interval });

    const rf = evaluateRateFit({
      inputs: {
        orgId: 't',
        projectId: 'p',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        intervalDataRef: { telemetrySeriesId: 'fixture', resolution: 'hourly', channels: ['kW'] },
      },
      scheduleBucket: 'business_hours',
      loadShape: shape.metrics,
      intervalKw: interval,
    });

    expect(rf.status).toBe('unknown');
    expect(rf.because.join('\n').toLowerCase()).toContain('missing');

    const out = await analyzeUtility(
      {
        orgId: 't',
        projectId: 'p',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        intervalDataRef: { telemetrySeriesId: 'fixture', resolution: 'hourly', channels: ['kW'] },
      },
      {
        intervalKwSeries: interval,
        nowIso: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        idFactory: () => 'id1',
      }
    );

    expect(out.insights.rateFit.status).toBe('unknown');
    const collect = out.recommendations.find((r) => r.suggestedMeasure.measureType === 'RATE_CHANGE' && String(r.suggestedMeasure.label || '').toLowerCase().includes('collect'));
    expect(collect).toBeTruthy();
  });

  test('rateFit includes computed estimatedDeltaDollars when billing engine can run', async () => {
    const interval = loadFixture('interval_peaky_office.json');
    const out = await analyzeUtility(
      {
        orgId: 't',
        projectId: 'p',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        currentRate: { utility: 'PGE', rateCode: 'PGE_SIM_B19_LIKE' },
        intervalDataRef: { telemetrySeriesId: 'fixture', resolution: 'hourly', channels: ['kW'] },
      },
      {
        intervalKwSeries: interval,
        nowIso: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        idFactory: () => 'id2',
      }
    );

    const alts = out.insights.rateFit.alternatives;
    expect(alts.some((a) => Number.isFinite(a.estimatedDeltaDollars ?? NaN))).toBe(true);
    const withAudit = alts.find((a) => (a.because || []).some((b) => String(b).includes('BillingEngineV1')));
    expect(withAudit).toBeTruthy();
  });
});

