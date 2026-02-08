import { describe, expect, test } from 'vitest';
import path from 'path';
import { readFileSync } from 'fs';

import type { UtilityInsights } from '../src/modules/utilityIntelligence/types';
import { analyzeLoadShape } from '../src/modules/utilityIntelligence/interval/analyzeLoadShape';
import { evaluateLoadShiftPotential } from '../src/modules/utilityIntelligence/interval/loadShiftPotential';
import { evaluateOptionSRelevance } from '../src/modules/utilityIntelligence/storage/evaluateOptionS';

import { shouldEvaluateBattery } from '../src/modules/batteryIntelligence/shouldEvaluateBattery';
import { selectBatteryCandidatesV1 } from '../src/modules/batteryIntelligence/selectCandidates';
import { toBatteryRecommendationsV1 } from '../src/modules/batteryIntelligence/toBatteryRecommendations';

import { loadBatteryLibraryV1 } from '../src/modules/batteryLibrary/loadLibrary';

function loadIntervalFixture(name: string): Array<{ timestampIso: string; kw: number }> {
  const fp = path.join(process.cwd(), 'samples', name);
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

async function loadLibraryFixture() {
  const fp = path.join(process.cwd(), 'samples', 'battery_library_fixture.json');
  const lib = await loadBatteryLibraryV1(fp);
  return lib.library.items;
}

function makeInsightsFromInterval(args: {
  interval: Array<{ timestampIso: string; kw: number }> | null;
  demandKnown?: boolean;
  currentRateCode?: string;
}): UtilityInsights {
  if (!args.interval) {
    return {
      inferredLoadShape: {},
      operatingPatternInference: { scheduleBucket: 'unknown', confidence: 0.1, reasons: ['no interval'] },
      loadShiftingFeasibility: { score: 0, candidateShiftWindows: [], constraintsDetected: [] },
      weatherSensitivity: { available: false, method: 'regression_v1', reasons: ['no provider'] },
      rateFit: { status: 'unknown', confidence: 0, because: ['missing'], alternatives: [] },
      optionSRelevance: { status: 'unknown', confidence: 0, because: ['missing'], requiredInputsMissing: ['interval missing'] },
      programs: { matches: [], topRecommendations: [] },
      requiredInputsMissing: ['interval missing'],
    };
  }

  const shape = analyzeLoadShape({ intervalKw: args.interval });
  const shift = evaluateLoadShiftPotential({ intervalKw: args.interval, loadShape: shape.metrics });
  const optionS = evaluateOptionSRelevance({
    inputs: {
      orgId: 't',
      projectId: 'p',
      serviceType: 'electric',
      utilityTerritory: 'PGE',
      meterMeta: { hasDemandChargesKnown: args.demandKnown },
      ...(args.currentRateCode ? { currentRate: { utility: 'PG&E', rateCode: args.currentRateCode } } : {}),
    },
    loadShape: shape.metrics,
    loadShiftScore: shift.score,
  });

  return {
    inferredLoadShape: shape.metrics,
    operatingPatternInference: { scheduleBucket: 'unknown', confidence: 0.3, reasons: ['fixture'] },
    loadShiftingFeasibility: { score: shift.score, candidateShiftWindows: shift.candidateShiftWindows, constraintsDetected: shift.constraintsDetected },
    weatherSensitivity: { available: false, method: 'regression_v1', reasons: ['no provider'] },
    rateFit: { status: args.currentRateCode ? 'ok' : 'unknown', currentRateCode: args.currentRateCode, confidence: 0.3, because: [], alternatives: [] },
    optionSRelevance: optionS,
    programs: { matches: [], topRecommendations: [] },
    requiredInputsMissing: [],
  };
}

describe('batteryIntelligence v1', () => {
  test('flat_baseload -> battery not recommended', async () => {
    const interval = loadIntervalFixture('interval_flat_baseload.json');
    const insights = makeInsightsFromInterval({ interval, demandKnown: true, currentRateCode: 'B-19' });
    const gate = shouldEvaluateBattery({ insights });
    expect(gate.status).toBe('not_recommended');

    const lib = await loadLibraryFixture();
    const sel = selectBatteryCandidatesV1({ insights, library: lib });
    // Selection can still produce candidates but should be low-score; we mainly gate it out.
    expect(sel.rankedCandidates.length).toBeGreaterThan(0);
  });

  test('peaky_office -> battery recommended or evaluate', async () => {
    const interval = loadIntervalFixture('interval_peaky_office.json');
    const insights = makeInsightsFromInterval({ interval, demandKnown: true, currentRateCode: 'B-19' });
    const gate = shouldEvaluateBattery({ insights });
    expect(['recommended', 'unknown']).toContain(gate.status);
    expect(gate.because.length).toBeGreaterThan(0);

    const lib = await loadLibraryFixture();
    const sel = selectBatteryCandidatesV1({ insights, library: lib, topN: 5 });
    expect(sel.requiredInputsMissing).toEqual([]);
    expect(sel.rankedCandidates.length).toBe(5);
    // Stable top-3 ordering from fixture library under our heuristic
    const top3 = sel.rankedCandidates.slice(0, 3).map((c) => c.sku);
    expect(top3).toEqual(['ACME-LFP-100-215', 'ACME-LFP-50-100', 'BETA-NMC-60-120']);
  });

  test('missing interval -> unknown + requiredInputsMissing', async () => {
    const insights = makeInsightsFromInterval({ interval: null });
    const gate = shouldEvaluateBattery({ insights });
    expect(gate.status).toBe('unknown');
    expect(gate.requiredInputsMissing.length).toBeGreaterThan(0);

    const lib = await loadLibraryFixture();
    const sel = selectBatteryCandidatesV1({ insights, library: lib });
    expect(sel.rankedCandidates).toEqual([]);
    expect(sel.requiredInputsMissing.length).toBeGreaterThan(0);
  });

  test('inbox adapter purity (does not mutate inputs)', async () => {
    const interval = loadIntervalFixture('interval_peaky_office.json');
    const insights = makeInsightsFromInterval({ interval, demandKnown: true, currentRateCode: 'B-19' });
    const gate = shouldEvaluateBattery({ insights });
    const lib = await loadLibraryFixture();
    const sel = selectBatteryCandidatesV1({ insights, library: lib, topN: 3 });

    const inputs = {
      orgId: 't',
      projectId: 'p',
      serviceType: 'electric' as const,
      utilityTerritory: 'PGE',
      currentRate: { utility: 'PG&E', rateCode: 'B-19' },
    };
    const beforeInputs = JSON.stringify(inputs);
    const beforeGate = JSON.stringify(gate);
    const beforeSel = JSON.stringify(sel);

    const out = toBatteryRecommendationsV1({
      inputs,
      insights,
      gate,
      selection: sel,
      meterId: 'm1',
      nowIso: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      suggestionIdFactory: () => 's1',
      inboxIdFactory: () => 'i1',
    });

    expect(JSON.stringify(inputs)).toBe(beforeInputs);
    expect(JSON.stringify(gate)).toBe(beforeGate);
    expect(JSON.stringify(sel)).toBe(beforeSel);

    expect(out.suggestions.length).toBe(1);
    expect(out.inboxItems.length).toBe(1);
    expect(out.inboxItems[0].kind).toBe('suggestedMeasure');
    expect(out.inboxItems[0].needsConfirmation).toBe(true);
  });
});

