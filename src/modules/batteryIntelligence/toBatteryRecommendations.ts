import { randomUUID } from 'crypto';
import type { InboxItem, EvidenceRef } from '../../types/project-graph';
import type { RecommendationSuggestion, RecommendationBecause, RecommendationTopContributor } from '../project/types';
import type { Measure } from '../measures/types';
import type { UtilityInputs, UtilityInsights } from '../utilityIntelligence/types';
import type { BatteryCandidateSelectionOutput } from './selectCandidates';
import type { BatteryFeasibilityGateResult } from './shouldEvaluateBattery';

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

function buildNotes(args: {
  gate: BatteryFeasibilityGateResult;
  selection: BatteryCandidateSelectionOutput;
  insights: UtilityInsights;
  meterId?: string;
  nowIso: string;
}): string {
  const top = args.selection.rankedCandidates.slice(0, 5);
  const topLines = top.length
    ? top.map((c, idx) => `- ${idx + 1}. ${c.vendor} ${c.sku} fitScore=${c.fitScore.toFixed(3)}${c.disqualifiers.length ? ` disq=[${c.disqualifiers.join('; ')}]` : ''}`)
    : ['- (none)'];

  const missing = uniq([...(args.gate.requiredInputsMissing || []), ...(args.selection.requiredInputsMissing || [])]);
  const missingBlock = missing.length ? `\n\nRequires inputs:\n- ${missing.join('\n- ')}` : '';

  const ls = args.insights.loadShiftingFeasibility?.score;
  const pk = args.insights.inferredLoadShape?.peakKw;
  const pz = args.insights.inferredLoadShape?.peakinessIndex;

  return [
    'Suggested by Battery Intelligence v1 (deterministic screening).',
    `generatedAt=${args.nowIso}`,
    args.meterId ? `meterId=${args.meterId}` : '',
    `gateStatus=${args.gate.status}`,
    Number.isFinite(pk ?? NaN) ? `peakKw≈${Number(pk).toFixed(1)}` : '',
    Number.isFinite(pz ?? NaN) ? `peakinessIndex≈${Number(pz).toFixed(2)}` : '',
    Number.isFinite(ls ?? NaN) ? `loadShiftScore≈${Number(ls).toFixed(2)}` : '',
    '',
    'Why we suggested this:',
    ...(args.gate.because || []).map((b) => `- ${b}`),
    '',
    'Top battery candidates (library):',
    ...topLines,
    missingBlock,
  ]
    .filter(Boolean)
    .join('\n')
    .trim()
    .slice(0, 3500);
}

function buildMeasure(args: {
  inputs: UtilityInputs;
  gate: BatteryFeasibilityGateResult;
  selection: BatteryCandidateSelectionOutput;
  meterId?: string;
}): Measure {
  const top = args.selection.rankedCandidates.slice(0, 5);
  const skuList = top.map((c) => c.sku).filter(Boolean);
  const vendorList = top.map((c) => c.vendor).filter(Boolean);

  const params: Record<string, number | string | boolean | null> = {
    territory: args.inputs.utilityTerritory ?? null,
    gateStatus: args.gate.status,
    meterId: args.meterId ?? null,
    // Store candidate SKUs deterministically in string form (Measure.parameters is scalar-only).
    candidateSkus: skuList.join(','),
    candidateVendors: vendorList.join(','),
    topCandidateSku: skuList[0] ?? null,
    targetPowerKw: Number.isFinite(args.selection.sizing.targetPowerKw ?? NaN) ? Number(args.selection.sizing.targetPowerKw) : null,
    targetDurationHours: Number.isFinite(args.selection.sizing.targetDurationHours ?? NaN) ? Number(args.selection.sizing.targetDurationHours) : null,
    targetEnergyKwh: Number.isFinite(args.selection.sizing.targetEnergyKwh ?? NaN) ? Number(args.selection.sizing.targetEnergyKwh) : null,
  };

  return {
    measureType: 'BATTERY_PEAK_SHAVE',
    label: skuList.length ? `Battery peak shaving (screened candidates: ${skuList.slice(0, 2).join(', ')}${skuList.length > 2 ? ', …' : ''})` : 'Battery peak shaving (screening)',
    tags: uniq(['battery', 'peak_shaving', args.gate.status]),
    parameters: params,
  };
}

export function toBatteryRecommendationsV1(args: {
  inputs: UtilityInputs;
  insights: UtilityInsights;
  gate: BatteryFeasibilityGateResult;
  selection: BatteryCandidateSelectionOutput;
  meterId?: string;
  nowIso?: string;
  suggestionIdFactory?: () => string;
  inboxIdFactory?: () => string;
}): { suggestions: RecommendationSuggestion[]; inboxItems: InboxItem[] } {
  const nowIso = args.nowIso || new Date('2026-01-01T00:00:00.000Z').toISOString();
  const suggestionIdFactory = args.suggestionIdFactory || (() => randomUUID());
  const inboxIdFactory = args.inboxIdFactory || (() => randomUUID());

  const suggestionId = suggestionIdFactory();
  const measure = buildMeasure({ inputs: args.inputs, gate: args.gate, selection: args.selection, meterId: args.meterId });

  const scoreBase = args.gate.status === 'recommended' ? 0.7 : args.gate.status === 'unknown' ? 0.35 : 0.15;
  const score = clamp01(scoreBase + 0.2 * clamp01(args.insights.loadShiftingFeasibility?.score ?? 0));
  const confidence = clamp01(args.gate.status === 'recommended' ? 0.65 : args.gate.status === 'unknown' ? 0.35 : 0.55);

  const because: RecommendationBecause[] = [
    {
      completedProjectId: 'batteryIntelligenceV1',
      similarityScore: score,
      matchedFeatures: uniq([
        `gateStatus:${args.gate.status}`,
        args.inputs.utilityTerritory ? `territory:${String(args.inputs.utilityTerritory)}` : '',
        Number.isFinite(args.insights.inferredLoadShape?.peakinessIndex ?? NaN) ? `peakinessIndex:${Number(args.insights.inferredLoadShape.peakinessIndex).toFixed(2)}` : '',
      ]),
      measuresInProject: ['BATTERY_PEAK_SHAVE'],
    },
  ];

  const notes = buildNotes({ gate: args.gate, selection: args.selection, insights: args.insights, meterId: args.meterId, nowIso });

  const topContributors: RecommendationTopContributor[] = [
    {
      completedProjectId: 'batteryIntelligenceV1',
      summary: notes.split('\n').slice(0, 7).join(' | ').slice(0, 240),
      similarityScore: score,
      matchedFeatures: because[0].matchedFeatures,
    },
  ];

  const requiredInputsMissing = uniq([...(args.gate.requiredInputsMissing || []), ...(args.selection.requiredInputsMissing || [])]);

  const suggestion: RecommendationSuggestion = {
    suggestionId,
    orgId: args.inputs.orgId,
    projectId: args.inputs.projectId,
    stateId: 'baseline',
    suggestedMeasure: measure,
    score,
    confidence,
    playbookAlignment: 'neutral',
    playbookRationale: null,
    playbookId: null,
    explain: {
      because,
      matchedFeatureSummary: uniq([
        `batteryGate=${args.gate.status}`,
        args.inputs.currentRate?.rateCode ? `currentRate=${String(args.inputs.currentRate.rateCode)}` : '',
        args.inputs.utilityTerritory ? `territory=${String(args.inputs.utilityTerritory)}` : '',
      ]).filter(Boolean),
      topContributors,
      matchingFeaturesUsed: uniq(['territory', 'scheduleBucket']) as any,
      frequency: { seenInCount: 1, sampleSizeTopN: 1, text: 'deterministic battery screening v1' },
    },
    requiredInputsMissing,
    status: 'proposed',
    createdAt: nowIso,
  };

  const provenance: EvidenceRef = {
    fileId: `batteryIntelligenceV1:${args.inputs.orgId}:${args.inputs.projectId}`,
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
      name: String(measure.label || measure.measureType),
      category: 'recommendation',
      notes,
    },
    provenance,
    confidence,
    needsConfirmation: true,
    createdAt: nowIso,
  } as any;

  return { suggestions: [suggestion], inboxItems: [inboxItem] };
}

