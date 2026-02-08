import { describe, expect, test } from 'vitest';
import path from 'path';
import { readFileSync } from 'fs';

import { evaluateOptionSRelevance } from '../src/modules/utilityIntelligence/storage/evaluateOptionS';
import { analyzeLoadShape } from '../src/modules/utilityIntelligence/interval/analyzeLoadShape';
import { evaluateLoadShiftPotential } from '../src/modules/utilityIntelligence/interval/loadShiftPotential';

function loadFixture(name: string): Array<{ timestampIso: string; kw: number }> {
  const fp = path.join(process.cwd(), 'samples', name);
  const raw = readFileSync(fp, 'utf-8');
  return JSON.parse(raw);
}

describe('utilityIntelligence: Option S relevance', () => {
  test('unknown when missing interval/demand; becomes relevant on peaky fixture when demand present', () => {
    const missing = evaluateOptionSRelevance({
      inputs: { orgId: 't', projectId: 'p', serviceType: 'electric', utilityTerritory: 'PGE' },
      loadShape: {},
      loadShiftScore: 0,
    });
    expect(missing.status).toBe('unknown');
    expect(missing.requiredInputsMissing.length).toBeGreaterThan(0);

    const peaky = loadFixture('interval_peaky_office.json');
    const shape = analyzeLoadShape({ intervalKw: peaky });
    const shift = evaluateLoadShiftPotential({ intervalKw: peaky, loadShape: shape.metrics });

    const res = evaluateOptionSRelevance({
      inputs: {
        orgId: 't',
        projectId: 'p',
        serviceType: 'electric',
        utilityTerritory: 'PGE',
        meterMeta: { hasDemandChargesKnown: true },
        currentRate: { utility: 'PG&E', rateCode: 'B-19' },
      },
      loadShape: shape.metrics,
      loadShiftScore: shift.score,
    });

    expect(res.requiredInputsMissing).toEqual([]);
    expect(res.status).toBe('relevant');
    expect(res.confidence).toBeGreaterThan(0.5);
  });
});

