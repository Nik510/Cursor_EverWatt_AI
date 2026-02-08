import { describe, expect, test } from 'vitest';
import path from 'path';
import { readFileSync } from 'fs';

import { analyzeLoadShape } from '../src/modules/utilityIntelligence/interval/analyzeLoadShape';

function loadFixture(name: string): Array<{ timestampIso: string; kw: number }> {
  const fp = path.join(process.cwd(), 'samples', name);
  const raw = readFileSync(fp, 'utf-8');
  return JSON.parse(raw);
}

describe('utilityIntelligence: load shape metrics', () => {
  test('metrics differ across fixtures deterministically', () => {
    const flat = loadFixture('interval_flat_baseload.json');
    const peaky = loadFixture('interval_peaky_office.json');

    const a = analyzeLoadShape({ intervalKw: flat });
    const b = analyzeLoadShape({ intervalKw: peaky });

    expect(a.requiredInputsMissing).toEqual([]);
    expect(b.requiredInputsMissing).toEqual([]);

    expect(a.metrics.baseloadKw).toBeDefined();
    expect(a.metrics.peakKw).toBeDefined();
    expect(b.metrics.baseloadKw).toBeDefined();
    expect(b.metrics.peakKw).toBeDefined();

    // Flat fixture: baseload≈peak
    expect(Math.abs((a.metrics.peakKw ?? 0) - (a.metrics.baseloadKw ?? 0))).toBeLessThan(1e-9);

    // Peaky fixture: peak >> baseload
    expect((b.metrics.peakKw ?? 0)).toBeGreaterThan((b.metrics.baseloadKw ?? 0) * 2);
  });
});

