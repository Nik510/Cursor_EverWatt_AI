import { randomUUID } from 'crypto';
import type { ProjectRecord } from '../../types/change-order';
import type { EvidenceRef, InboxItem } from '../../types/project-graph';
import type { RecommendationSuggestion, Project as CanonicalProject, RecommendationBecause } from '../project/types';
import type { Measure, MeasureType } from '../measures/types';
import { getMissingInputs } from '../recommendations/missingInputs';
import { matchPlaybooks, playbookAlignmentForMeasure, playbookScoreMultiplier } from '../playbooks/registry';
import type { BatteryLibraryItemV1 } from '../batteryLibrary/types';
import { selectBatteryCandidatesV1, type BatteryCalcConstraintsV1, type BatteryTelemetryRefsV1 } from './selectCandidates';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function generateBatteryRecommendationsV1(args: {
  orgId: string;
  projectId: string;
  stateId?: 'baseline' | 'proposed';
  targetProject: ProjectRecord;
  libraryItems: BatteryLibraryItemV1[];
  meter?: BatteryTelemetryRefsV1;
  constraints?: BatteryCalcConstraintsV1;
  nowIso: string;
  idFactory?: () => string;
  inboxIdFactory?: () => string;
}): {
  requiredInputsMissing: string[];
  rankedCandidates: Array<{ vendor: string; sku: string; fitScore: number; disqualifiers: string[] }>;
  suggestions: RecommendationSuggestion[];
  inboxItems: InboxItem[];
  explain: string[];
} {
  const stateId = args.stateId || 'baseline';
  const idFactory = args.idFactory || (() => randomUUID());
  const inboxIdFactory = args.inboxIdFactory || (() => randomUUID());

  const canonicalProject: CanonicalProject = {
    orgId: args.orgId,
    projectId: args.projectId,
    status: 'active',
    projectBuilder: args.targetProject,
    // Non-authoritative telemetry refs for missing-input checks (deterministic).
    ...(true
      ? ({
          telemetry: {
            intervalKwSeries: (args.meter as any)?.intervalKwSeries,
            intervalFilePath: (args.meter as any)?.intervalFilePath,
          },
        } as any)
      : {}),
  };

  const selection = selectBatteryCandidatesV1({
    project: canonicalProject,
    libraryItems: args.libraryItems,
    telemetry: args.meter,
    constraints: args.constraints,
  });

  const playbookMatches = matchPlaybooks(canonicalProject);
  const pb = playbookAlignmentForMeasure({ matches: playbookMatches, measureType: 'BATTERY_PEAK_SHAVE' });

  const top = selection.rankedCandidates[0] || null;
  const measureType: MeasureType = 'BATTERY_PEAK_SHAVE';

  const suggestedMeasure: Measure = {
    measureType,
    label: top ? `Battery peak shaving (${top.candidate.vendor} ${top.candidate.sku})` : 'Battery peak shaving',
    tags: ['battery', 'peak_shaving'],
    parameters: top
      ? {
          candidateSku: top.candidate.sku,
          candidateVendor: top.candidate.vendor,
          kw: top.candidate.kw,
          kwh: top.candidate.kwh,
          roundTripEfficiency: top.candidate.roundTripEfficiency,
        }
      : {},
  };

  // Required inputs using existing missing-input pattern.
  const missingInputs = getMissingInputs(canonicalProject, suggestedMeasure);

  // Overlay: playbook alignment multiplier (even if neutral by default).
  const baseScore = top ? clamp01(top.fitScore) : 0;
  const mult = playbookScoreMultiplier(pb.alignment);
  const adjustedScore = clamp01(baseScore * mult);
  const confidence = clamp01(0.25 + 0.65 * baseScore);

  const because: RecommendationBecause[] = [
    {
      completedProjectId: 'batteryCalcV1',
      similarityScore: baseScore,
      matchedFeatures: ['batteryLibraryFit', ...(selection.requiredInputsMissing.length ? ['telemetryMissing'] : ['telemetryPresent'])],
      measuresInProject: [measureType],
    },
  ];

  const suggestion: RecommendationSuggestion = {
    suggestionId: idFactory(),
    orgId: args.orgId,
    projectId: args.projectId,
    stateId,
    suggestedMeasure,
    score: adjustedScore,
    confidence,
    playbookAlignment: pb.alignment,
    playbookRationale: pb.rationale,
    playbookId: pb.playbookId,
    explain: {
      because,
      matchedFeatureSummary: selection.explain.slice(0, 8),
      topContributors: [
        {
          completedProjectId: 'batteryCalcV1',
          summary: top
            ? `Best-fit candidate: ${top.candidate.vendor} ${top.candidate.sku} (${top.candidate.kw}kW/${top.candidate.kwh}kWh)`
            : 'No candidate selected',
          similarityScore: baseScore,
          matchedFeatures: because[0].matchedFeatures,
        },
      ],
      matchingFeaturesUsed: ['buildingType', 'assetInventory', 'territory'],
      frequency: { seenInCount: top ? 1 : 0, sampleSizeTopN: top ? 1 : 0, text: top ? 'selection: best-fit battery candidate from library' : 'selection: no candidate selected' },
      playbooksApplied: playbookMatches.map((m) => ({ playbookId: m.playbook.playbookId, priority: m.playbook.priority, matchedBecause: m.matchedBecause })),
      scoreOverlay: { baseScore, multiplier: mult, adjustedScore },
    },
    requiredInputsMissing: [...new Set([...selection.requiredInputsMissing, ...missingInputs])],
    status: 'proposed',
    createdAt: args.nowIso,
  };

  const requires = suggestion.requiredInputsMissing.length
    ? `\n\nEstimate unavailable; requires:\n- ${suggestion.requiredInputsMissing.join('\n- ')}`
    : '';

  const notes = [
    'Suggested by Battery Calc v1 (deterministic selection only)',
    `score=${suggestion.score.toFixed(2)} confidence=${suggestion.confidence.toFixed(2)}`,
    `playbookAlignment=${suggestion.playbookAlignment}${suggestion.playbookId ? ` playbookId=${suggestion.playbookId}` : ''}`,
    suggestion.playbookRationale ? `playbookRationale=${suggestion.playbookRationale}` : '',
    '',
    'Why we suggested this:',
    ...(top ? top.explain.map((l) => `- ${l}`) : ['- No candidate selected']),
    requires,
  ]
    .filter(Boolean)
    .join('\n')
    .trim()
    .slice(0, 3500);

  const provenance: EvidenceRef = {
    fileId: `batteryCalcV1:${args.orgId}:${args.projectId}`,
    extractedAt: args.nowIso,
    snippetText: notes.slice(0, 2000),
    sourceKey: `reco:${suggestion.suggestionId}`,
  } as any;

  const inboxItem: InboxItem = {
    id: inboxIdFactory(),
    kind: 'suggestedMeasure',
    status: 'inferred',
    sourceKey: `reco:${suggestion.suggestionId}`,
    suggestedMeasure: {
      id: suggestion.suggestionId,
      name: String(suggestedMeasure.label || suggestedMeasure.measureType),
      category: 'recommendation',
      notes,
    },
    provenance,
    confidence: clamp01(confidence),
    needsConfirmation: true,
    createdAt: args.nowIso,
  } as any;

  return {
    requiredInputsMissing: suggestion.requiredInputsMissing,
    rankedCandidates: selection.rankedCandidates.map((r) => ({
      vendor: r.candidate.vendor,
      sku: r.candidate.sku,
      fitScore: r.fitScore,
      disqualifiers: r.disqualifiers,
    })),
    suggestions: [suggestion],
    inboxItems: [inboxItem],
    explain: selection.explain,
  };
}

