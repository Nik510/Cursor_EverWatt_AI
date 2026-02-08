import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { analyzeLoadShape } from '../src/modules/utilityIntelligence/interval/analyzeLoadShape';
import { evaluateLoadShiftPotential } from '../src/modules/utilityIntelligence/interval/loadShiftPotential';
import { computeDrOperationalFitV1 } from '../src/modules/programIntelligence/dr/operationalFit';

type IntervalKwPoint = { timestampIso: string; kw: number };

function loadFixture(p: string): Promise<IntervalKwPoint[]> {
  return readFile(p, 'utf-8').then((s) => JSON.parse(s) as IntervalKwPoint[]);
}

describe('programIntelligence: DR operational fit', () => {
  it('produces higher fit for peaky_office than flat baseload', async () => {
    const tz = 'America/Los_Angeles';

    const flat = await loadFixture(path.join(process.cwd(), 'tests', 'fixtures', 'interval_flat_baseload_hourly_kw.local.json'));
    const peaky = await loadFixture(path.join(process.cwd(), 'samples', 'interval_peaky_office.json'));

    const flatShape = analyzeLoadShape({ intervalKw: flat });
    const flatShift = evaluateLoadShiftPotential({ intervalKw: flat, loadShape: flatShape.metrics });
    const peakyShape = analyzeLoadShape({ intervalKw: peaky });
    const peakyShift = evaluateLoadShiftPotential({ intervalKw: peaky, loadShape: peakyShape.metrics });

    const flatFit = computeDrOperationalFitV1({ intervalKw: flat, loadShiftScore: flatShift.score, scheduleBucket: '24_7' });
    const peakyFit = computeDrOperationalFitV1({ intervalKw: peaky, loadShiftScore: peakyShift.score, scheduleBucket: 'business_hours' });

    expect(flatFit.drFitScore).toBeGreaterThanOrEqual(0);
    expect(flatFit.drFitScore).toBeLessThanOrEqual(1);
    expect(peakyFit.drFitScore).toBeGreaterThanOrEqual(0);
    expect(peakyFit.drFitScore).toBeLessThanOrEqual(1);

    expect(peakyFit.drFitScore).toBeGreaterThan(flatFit.drFitScore + 0.15);

    // Ensure we emit reasons for UI/inbox traces.
    expect(peakyFit.whyNow.length + peakyFit.whyNotNow.length).toBeGreaterThan(0);
  });
});

