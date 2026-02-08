import { describe, expect, test } from 'vitest';
import path from 'path';
import { readFileSync } from 'fs';

import { analyzeLoadShape } from '../src/modules/utilityIntelligence/interval/analyzeLoadShape';
import { evaluateLoadShiftPotential } from '../src/modules/utilityIntelligence/interval/loadShiftPotential';

function loadFixture(name: string): Array<{ timestampIso: string; kw: number }> {
  const fp = path.join(process.cwd(), 'samples', name);
  const raw = readFileSync(fp, 'utf-8');
  return JSON.parse(raw);
}

describe('utilityIntelligence: load shifting potential', () => {
  test('peaky_office has higher load shifting score than flat_baseload', () => {
    const flat = loadFixture('interval_flat_baseload.json');
    const peaky = loadFixture('interval_peaky_office.json');

    const flatShape = analyzeLoadShape({ intervalKw: flat });
    const peakyShape = analyzeLoadShape({ intervalKw: peaky });

    const a = evaluateLoadShiftPotential({ intervalKw: flat, loadShape: flatShape.metrics });
    const b = evaluateLoadShiftPotential({ intervalKw: peaky, loadShape: peakyShape.metrics });

    expect(a.requiredInputsMissing).toEqual([]);
    expect(b.requiredInputsMissing).toEqual([]);

    expect(b.score).toBeGreaterThan(a.score);
    expect(b.score).toBeGreaterThan(0.3);
  });
});

