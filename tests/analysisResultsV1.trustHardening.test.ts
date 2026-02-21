import { describe, expect, it, vi } from 'vitest';
import { toInboxSuggestions } from '../src/modules/utilityIntelligence/toInboxSuggestions';
import { toBatteryRecommendationsV1 } from '../src/modules/batteryIntelligence/toBatteryRecommendations';
import { generateUtilitySummaryV1 } from '../src/modules/reports/utilitySummary/v1/generateUtilitySummary';

describe('trust hardening (nowIso, stable IDs)', () => {
  it('defaults nowIso to real time (not frozen) for downstream helpers', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-02T03:04:05.006Z'));
    const expectedNowIso = new Date().toISOString();

    const inbox = toInboxSuggestions({
      inputs: { orgId: 'user:test', projectId: 'proj:test', serviceType: 'electric', utilityTerritory: 'PGE' },
      recommendations: [
        {
          recommendationId: 'r1',
          recommendationType: 'UTILITY_PROGRAM',
          score: 0.5,
          confidence: 0.5,
          because: ['x'],
          requiredInputsMissing: [],
          suggestedMeasure: { measureType: 'UTILITY_PROGRAM_ENROLLMENT' as any, label: 'Enroll', tags: [], parameters: {} },
        },
      ],
    });

    expect(inbox.suggestions[0]?.createdAt).toBe(expectedNowIso);
    expect(inbox.inboxItems[0]?.createdAt).toBe(expectedNowIso);

    const summary = generateUtilitySummaryV1({
      inputs: { orgId: 'user:test', projectId: 'proj:test', serviceType: 'electric', utilityTerritory: 'PGE' } as any,
      insights: {
        inferredLoadShape: {},
        operatingPatternInference: { scheduleBucket: 'unknown', confidence: 0, reasons: [] },
        loadShiftingFeasibility: { score: 0, candidateShiftWindows: [], constraintsDetected: [] },
        rateFit: { status: 'unknown', confidence: 0, because: [], alternatives: [] },
        optionSRelevance: { status: 'unknown', confidence: 0, because: [], requiredInputsMissing: [] },
        programs: { matches: [], topRecommendations: [] },
        requiredInputsMissing: [],
      } as any,
      utilityRecommendations: [],
      batteryGate: { status: 'unknown', because: [], requiredInputsMissing: [] } as any,
      batterySelection: { rankedCandidates: [], sizing: null, requiredInputsMissing: [] } as any,
    } as any);
    expect(summary.json.generatedAt).toBe(expectedNowIso);

    vi.useRealTimers();
  });

  it('uses request-scoped factories (IDs stable within a run payload)', async () => {
    let s = 0;
    let i = 0;
    const suggestionIdFactory = () => `S${++s}`;
    const inboxIdFactory = () => `I${++i}`;
    const nowIso = '2026-02-10T00:00:00.000Z';

    const out = toInboxSuggestions({
      inputs: { orgId: 'user:test', projectId: 'proj:test', serviceType: 'electric', utilityTerritory: 'PGE' },
      nowIso,
      suggestionIdFactory,
      inboxIdFactory,
      recommendations: [
        {
          recommendationId: 'r1',
          recommendationType: 'UTILITY_PROGRAM',
          score: 0.5,
          confidence: 0.5,
          because: ['x'],
          requiredInputsMissing: [],
          suggestedMeasure: { measureType: 'UTILITY_PROGRAM_ENROLLMENT' as any, label: 'Enroll', tags: [], parameters: {} },
        },
        {
          recommendationId: 'r2',
          recommendationType: 'DEMAND_RESPONSE',
          score: 0.4,
          confidence: 0.4,
          because: ['y'],
          requiredInputsMissing: [],
          suggestedMeasure: { measureType: 'DEMAND_RESPONSE_ENROLLMENT' as any, label: 'Enroll DR', tags: [], parameters: {} },
        },
      ],
    });

    const sug = out.suggestions;
    const inbox = out.inboxItems;
    expect(sug.length).toBe(inbox.length);

    for (let idx = 0; idx < sug.length; idx++) {
      expect(sug[idx].suggestionId).toBe(`S${idx + 1}`);
      expect(inbox[idx].id).toBe(`I${idx + 1}`);
      expect(inbox[idx].suggestedMeasure?.id).toBe(sug[idx].suggestionId);
      expect(inbox[idx].sourceKey).toBe(`reco:${sug[idx].suggestionId}`);
      expect(inbox[idx].provenance?.sourceKey).toBe(`reco:${sug[idx].suggestionId}`);
    }

    // Also ensure other engine paths accept stable factories.
    const bat = toBatteryRecommendationsV1({
      inputs: { orgId: 'user:test', projectId: 'proj:test', serviceType: 'electric', utilityTerritory: 'PGE' } as any,
      insights: { inferredLoadShape: {}, loadShiftingFeasibility: { score: 0, candidateShiftWindows: [], constraintsDetected: [] } } as any,
      gate: { status: 'unknown', because: [], requiredInputsMissing: [] } as any,
      selection: { rankedCandidates: [], sizing: { targetPowerKw: 0, targetDurationHours: 0, targetEnergyKwh: 0 }, requiredInputsMissing: [] } as any,
      nowIso,
      suggestionIdFactory,
      inboxIdFactory,
    });
    expect(bat.suggestions[0]?.createdAt).toBe(nowIso);
  });
});

