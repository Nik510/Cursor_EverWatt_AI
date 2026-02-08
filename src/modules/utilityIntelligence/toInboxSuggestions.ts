import { randomUUID } from 'crypto';
import type { InboxItem, EvidenceRef } from '../../types/project-graph';
import type { RecommendationSuggestion, RecommendationBecause, RecommendationTopContributor } from '../project/types';
import type { UtilityInputs, UtilityRecommendation } from './types';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function uniq(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr) {
    const s = String(v || '').trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function buildNotes(rec: UtilityRecommendation, nowIso: string): string {
  const missing = rec.requiredInputsMissing.length ? `\n\nRequires inputs:\n- ${rec.requiredInputsMissing.join('\n- ')}` : '';
  const because = rec.because.length ? rec.because.map((l) => `- ${l}`).join('\n') : '- (no explanation provided)';
  return [
    'Suggested by Utility Intelligence Engine v1 (deterministic).',
    `generatedAt=${nowIso}`,
    `type=${rec.recommendationType}`,
    `score=${clamp01(rec.score).toFixed(2)} confidence=${clamp01(rec.confidence).toFixed(2)}`,
    '',
    'Why we suggested this:',
    because,
    missing,
  ]
    .filter(Boolean)
    .join('\n')
    .trim()
    .slice(0, 3500);
}

function matchingFeaturesUsed(inputs: UtilityInputs): Array<'buildingType' | 'sqftBucket' | 'climateZone' | 'territory' | 'assetInventory' | 'scheduleBucket'> {
  const out: Array<'buildingType' | 'sqftBucket' | 'climateZone' | 'territory' | 'assetInventory' | 'scheduleBucket'> = [];
  if (inputs.utilityTerritory) out.push('territory');
  if (inputs.climateZone) out.push('climateZone');
  // v1 uses schedule inference; we mark scheduleBucket as used by default.
  out.push('scheduleBucket');
  return uniq(out) as any;
}

export function toInboxSuggestions(args: {
  inputs: UtilityInputs;
  recommendations: UtilityRecommendation[];
  nowIso?: string;
  suggestionIdFactory?: () => string;
  inboxIdFactory?: () => string;
}): { suggestions: RecommendationSuggestion[]; inboxItems: InboxItem[] } {
  const nowIso = args.nowIso || new Date('2026-01-01T00:00:00.000Z').toISOString();
  const suggestionIdFactory = args.suggestionIdFactory || (() => randomUUID());
  const inboxIdFactory = args.inboxIdFactory || (() => randomUUID());

  const suggestions: RecommendationSuggestion[] = [];
  const inboxItems: InboxItem[] = [];

  for (const rec of args.recommendations || []) {
    const suggestionId = suggestionIdFactory();
    const notes = buildNotes(rec, nowIso);

    const because: RecommendationBecause[] = [
      {
        completedProjectId: 'utilityIntelligenceV1',
        similarityScore: clamp01(rec.score),
        matchedFeatures: uniq([
          `recommendationType:${rec.recommendationType}`,
          args.inputs.utilityTerritory ? `territory:${String(args.inputs.utilityTerritory)}` : '',
          args.inputs.customerType ? `customerType:${String(args.inputs.customerType)}` : '',
        ]),
        measuresInProject: [String(rec.suggestedMeasure.measureType)],
      },
    ];

    const topContributors: RecommendationTopContributor[] = [
      {
        completedProjectId: 'utilityIntelligenceV1',
        summary: notes.split('\n').slice(0, 6).join(' | ').slice(0, 240),
        similarityScore: clamp01(rec.score),
        matchedFeatures: because[0].matchedFeatures,
      },
    ];

    const suggestion: RecommendationSuggestion = {
      suggestionId,
      orgId: args.inputs.orgId,
      projectId: args.inputs.projectId,
      stateId: 'baseline',
      suggestedMeasure: rec.suggestedMeasure,
      score: clamp01(rec.score),
      confidence: clamp01(rec.confidence),
      playbookAlignment: 'neutral',
      playbookRationale: null,
      playbookId: null,
      explain: {
        because,
        matchedFeatureSummary: uniq([
          args.inputs.utilityTerritory ? `territory=${String(args.inputs.utilityTerritory)}` : '',
          args.inputs.currentRate?.rateCode ? `currentRate=${String(args.inputs.currentRate.rateCode)}` : '',
          `recommendationType=${rec.recommendationType}`,
        ]).filter(Boolean),
        topContributors,
        matchingFeaturesUsed: matchingFeaturesUsed(args.inputs),
        frequency: { seenInCount: 1, sampleSizeTopN: 1, text: 'deterministic utility intelligence v1' },
      },
      requiredInputsMissing: uniq(rec.requiredInputsMissing || []),
      status: 'proposed',
      createdAt: nowIso,
    };

    const provenance: EvidenceRef = {
      fileId: `utilityIntelligenceV1:${args.inputs.orgId}:${args.inputs.projectId}`,
      extractedAt: nowIso,
      snippetText: notes.slice(0, 2000),
      sourceKey: `reco:${suggestionId}`,
    };

    const inboxItem: InboxItem = {
      id: inboxIdFactory(),
      kind: 'suggestedMeasure',
      status: 'inferred',
      sourceKey: `reco:${suggestionId}`,
      suggestedMeasure: {
        id: suggestionId,
        name: String(rec.suggestedMeasure.label || rec.suggestedMeasure.measureType),
        category: 'recommendation',
        notes,
      },
      provenance,
      confidence: clamp01(rec.confidence),
      needsConfirmation: true,
      createdAt: nowIso,
    } as any;

    suggestions.push(suggestion);
    inboxItems.push(inboxItem);
  }

  return { suggestions, inboxItems };
}

