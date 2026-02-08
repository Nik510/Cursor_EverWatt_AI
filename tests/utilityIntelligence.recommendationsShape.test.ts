import { describe, expect, test } from 'vitest';
import path from 'path';
import { readFileSync } from 'fs';

import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';

function loadFixture(name: string): Array<{ timestampIso: string; kw: number }> {
  const fp = path.join(process.cwd(), 'samples', name);
  const raw = readFileSync(fp, 'utf-8');
  return JSON.parse(raw);
}

describe('utilityIntelligence: recommendation shape guarantees', () => {
  test('recommendations always include requiredInputsMissing and because', async () => {
    const interval = loadFixture('interval_peaky_office.json');
    const out = await analyzeUtility(
      {
        orgId: 't',
        projectId: 'p',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        currentRate: { utility: 'PG&E', rateCode: 'B-19' },
        naicsCode: '622110',
        customerType: 'healthcare',
        intervalDataRef: { telemetrySeriesId: 'fixture', resolution: 'hourly', channels: ['kW'] },
        meterMeta: { hasDemandChargesKnown: true },
      },
      {
        intervalKwSeries: interval,
        nowIso: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        idFactory: () => 'id1',
      }
    );

    expect(out.recommendations.length).toBeGreaterThan(0);
    for (const r of out.recommendations) {
      expect(Array.isArray(r.because)).toBe(true);
      expect(r.because.length).toBeGreaterThan(0);
      expect(Array.isArray(r.requiredInputsMissing)).toBe(true);
    }
  });
});

