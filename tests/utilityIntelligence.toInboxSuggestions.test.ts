import { describe, expect, test } from 'vitest';

import { toInboxSuggestions } from '../src/modules/utilityIntelligence/toInboxSuggestions';
import type { UtilityInputs, UtilityRecommendation } from '../src/modules/utilityIntelligence/types';

describe('utilityIntelligence: toInboxSuggestions', () => {
  test('produces inbox-only artifacts and is pure (does not mutate inputs)', () => {
    const inputs: UtilityInputs = {
      orgId: 't',
      projectId: 'p',
      serviceType: 'electric',
      utilityTerritory: 'PGE',
      currentRate: { utility: 'PG&E', rateCode: 'B-19' },
    };

    const recs: UtilityRecommendation[] = [
      {
        recommendationId: 'r1',
        recommendationType: 'RATE_CHANGE',
        score: 0.7,
        confidence: 0.6,
        because: ['Test because'],
        requiredInputsMissing: ['Need rate bill'],
        suggestedMeasure: {
          measureType: 'RATE_CHANGE',
          label: 'Evaluate rate alternative: B-20',
          tags: ['utility'],
          parameters: { territory: 'PGE', currentRate: 'B-19', candidateRate: 'B-20' },
        },
      },
    ];

    const beforeInputs = JSON.stringify(inputs);
    const beforeRecs = JSON.stringify(recs);

    const out = toInboxSuggestions({
      inputs,
      recommendations: recs,
      nowIso: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      suggestionIdFactory: () => 's1',
      inboxIdFactory: () => 'i1',
    });

    expect(JSON.stringify(inputs)).toBe(beforeInputs);
    expect(JSON.stringify(recs)).toBe(beforeRecs);

    expect(out.suggestions.length).toBe(1);
    expect(out.inboxItems.length).toBe(1);

    expect(out.suggestions[0].requiredInputsMissing.length).toBeGreaterThan(0);
    expect(out.suggestions[0].explain.because.length).toBeGreaterThan(0);
    expect(out.inboxItems[0].kind).toBe('suggestedMeasure');
    expect(out.inboxItems[0].needsConfirmation).toBe(true);
  });
});

