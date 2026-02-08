import { randomUUID } from 'crypto';
import type { ProjectRecord } from '../../types/change-order';
import type { AssetType, EvidenceRef, InboxItem, ProjectGraph } from '../../types/project-graph';
import type {
  CompletedProjectRecord,
  EverWattMemoryIndex,
  MemoryIndexVersion,
  ProjectFeaturesV1,
  RecommendationBecause,
  RecommendationSuggestion,
  ScheduleBucket,
  SqftBucket,
} from '../project/types';
import { ASSET_KEYS_ORDER, bucketSchedule, bucketSqft, memoryIndexVersion } from '../memory/buildMemoryIndex';
import type { Measure, MeasureType } from '../measures/types';
import { normalizeMeasure } from '../measures/normalizeMeasure';
import { getMissingInputs } from './missingInputs';
import type { Project as CanonicalProject } from '../project/types';
import { matchPlaybooks, playbookAlignmentForMeasure, playbookScoreMultiplier } from '../playbooks/registry';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normText(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 _/-]+/g, '')
    .trim();
}

function assetTypeKeyToGraphType(key: string): AssetType | null {
  const k = String(key || '').trim();
  if (k === 'ahuCount') return 'ahu';
  if (k === 'rtuCount') return 'rtu';
  if (k === 'vavCount') return 'vav';
  if (k === 'fanCount') return 'fan';
  if (k === 'pumpCount') return 'pump';
  if (k === 'chillerCount') return 'chiller';
  if (k === 'boilerCount') return 'boiler';
  if (k === 'coolingTowerCount') return 'coolingTower';
  if (k === 'panelCount') return 'panel';
  if (k === 'lightingFixtureCount') return 'lightingFixture';
  if (k === 'lightingControlCount') return 'lightingControl';
  if (k === 'otherCount') return 'other';
  return null;
}

export type TargetProjectFeaturesV1 = {
  buildingTypeBucket: string | null;
  sqftBucket: SqftBucket | null;
  climateZone: string | null;
  territory: string | null;
  scheduleBucket: ScheduleBucket | null;
  assetCounts: Record<string, number>;
};

export function extractTargetFeaturesV1(project: ProjectRecord): TargetProjectFeaturesV1 {
  const buildingTypeBucket =
    normText((project as any)?.building?.buildingType) ||
    normText((project as any)?.customer?.facilityType) ||
    null;

  const sqftRaw = (project as any)?.building?.sqft ?? (project as any)?.customer?.sqft ?? null;
  const sqftBucket: SqftBucket | null = sqftRaw != null ? bucketSqft(Number(sqftRaw)) : null;

  const climateZone = (project as any)?.building?.climateZone ? String((project as any).building.climateZone) : null;
  const territory =
    (project as any)?.building?.territory
      ? String((project as any).building.territory)
      : (project as any)?.customer?.utilityCompany
        ? String((project as any).customer.utilityCompany)
        : null;

  const scheduleBucket: ScheduleBucket | null =
    (project as any)?.building?.operatingSchedule?.bucket
      ? bucketSchedule((project as any).building.operatingSchedule.bucket)
      : null;

  const graph = ((project as any)?.graph || {}) as ProjectGraph;
  const assets = Array.isArray(graph?.assets) ? graph.assets : [];
  const counts: Record<string, number> = {};
  for (const k of ASSET_KEYS_ORDER) counts[k] = 0;
  for (const a of assets as any[]) {
    const t = String(a?.type || '').trim();
    for (const k of ASSET_KEYS_ORDER) {
      const gt = assetTypeKeyToGraphType(k);
      if (gt && t === gt) counts[k] = (counts[k] || 0) + 1;
    }
  }

  return {
    buildingTypeBucket,
    sqftBucket,
    climateZone,
    territory,
    scheduleBucket,
    assetCounts: counts,
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na <= 0 || nb <= 0) return 0;
  return clamp01(dot / (Math.sqrt(na) * Math.sqrt(nb)));
}

function sqftBucketOrdinal(b: SqftBucket): number {
  if (b === '<50k') return 0;
  if (b === '50-150k') return 1;
  if (b === '150-500k') return 2;
  return 3;
}

export function similarityV1(args: {
  target: TargetProjectFeaturesV1;
  historical: ProjectFeaturesV1;
}): { score: number; matchedFeatures: string[]; effectiveWeight: number } {
  const weights = {
    buildingType: 0.28,
    sqftBucket: 0.14,
    climateTerritory: 0.18,
    assetInventory: 0.28,
    scheduleBucket: 0.12,
  };

  const matched: string[] = [];
  let usedWeight = 0;
  let weighted = 0;

  // building type
  if (args.target.buildingTypeBucket && args.historical.buildingTypeBucket) {
    usedWeight += weights.buildingType;
    const m = normText(args.target.buildingTypeBucket) === normText(args.historical.buildingTypeBucket);
    if (m) matched.push('buildingType');
    weighted += weights.buildingType * (m ? 1 : 0);
  }

  // sqft bucket (adjacent buckets get partial credit)
  if (args.target.sqftBucket && args.historical.sqftBucket) {
    usedWeight += weights.sqftBucket;
    const d = Math.abs(sqftBucketOrdinal(args.target.sqftBucket) - sqftBucketOrdinal(args.historical.sqftBucket));
    const sim = d === 0 ? 1 : d === 1 ? 0.5 : 0;
    if (sim === 1) matched.push('sqftBucket');
    weighted += weights.sqftBucket * sim;
  }

  // climate zone + territory
  const hasClimate = Boolean(args.target.climateZone && args.historical.climateZone);
  const hasTerritory = Boolean(args.target.territory && args.historical.territory);
  if (hasClimate || hasTerritory) {
    usedWeight += weights.climateTerritory;
    const climateMatch = hasClimate ? String(args.target.climateZone) === String(args.historical.climateZone) : false;
    const territoryMatch = hasTerritory ? normText(args.target.territory) === normText(args.historical.territory) : false;
    const sim = clamp01((climateMatch ? 0.5 : 0) + (territoryMatch ? 0.5 : 0));
    if (climateMatch) matched.push('climateZone');
    if (territoryMatch) matched.push('territory');
    weighted += weights.climateTerritory * sim;
  }

  // asset inventory similarity
  {
    usedWeight += weights.assetInventory;
    const a = ASSET_KEYS_ORDER.map((k) => Number(args.target.assetCounts[k] || 0));
    const b = ASSET_KEYS_ORDER.map((k) => Number((args.historical.assetInventoryCounts as any)[k] || 0));
    const sim = cosineSimilarity(a, b);
    if (sim >= 0.8) matched.push('assetInventory');
    weighted += weights.assetInventory * sim;
  }

  // schedule bucket
  if (args.target.scheduleBucket && args.historical.scheduleBucket) {
    usedWeight += weights.scheduleBucket;
    const m = String(args.target.scheduleBucket) === String(args.historical.scheduleBucket);
    if (m) matched.push('scheduleBucket');
    weighted += weights.scheduleBucket * (m ? 1 : 0);
  }

  if (usedWeight <= 0) return { score: 0, matchedFeatures: [], effectiveWeight: 0 };
  const score = clamp01(weighted / usedWeight);
  return { score, matchedFeatures: matched, effectiveWeight: usedWeight };
}

function inferDisplayName(type: string): string {
  const t = String(type || '').trim();
  if (!t) return 'Recommended measure';
  const acronyms = new Set(['vfd', 'ems', 'ahu', 'rtu', 'vav', 'kw', 'kwh']);
  const words = t
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/g)
    .filter(Boolean)
    .map((w) => {
      const lw = w.toLowerCase();
      if (acronyms.has(lw)) return lw.toUpperCase();
      return lw.length ? lw[0].toUpperCase() + lw.slice(1) : lw;
    });
  return words.join(' ').trim();
}

function toCanonicalMeasures(p: CompletedProjectRecord): Measure[] {
  const canon = Array.isArray((p as any)?.measuresImplemented) ? ((p as any).measuresImplemented as Measure[]) : [];
  if (canon.length) return canon.map((m) => normalizeMeasure(m));
  const legacy = Array.isArray((p as any)?.measures) ? ((p as any).measures as any[]) : [];
  return legacy.map((m) => normalizeMeasure({ type: m?.type, label: m?.type, tags: m?.tags, parameters: m?.parameters }));
}

function contributorSummary(p: CompletedProjectRecord): string {
  const s = String((p as any)?.rationale?.summary || '').trim();
  if (s) return s.slice(0, 240);
  const b = (p as any)?.building || {};
  const bt = String(b?.buildingType || '').trim() || 'unknown building';
  const sqft = Number.isFinite(Number(b?.sqft)) ? `${Number(b.sqft).toLocaleString()} sqft` : '';
  const territory = String(b?.territory || '').trim();
  const parts = [bt, sqft, territory].filter(Boolean);
  return parts.join(' • ').slice(0, 240);
}

export function generateRecommendationsV1(args: {
  orgId: string;
  projectId: string;
  stateId?: 'baseline' | 'proposed';
  targetProject: ProjectRecord;
  memoryIndex: EverWattMemoryIndex;
  completedProjects: CompletedProjectRecord[];
  topN?: number;
  nowIso: string;
  idFactory?: () => string;
  inboxIdFactory?: () => string;
}): { suggestions: RecommendationSuggestion[]; inboxItems: InboxItem[] } {
  const stateId = args.stateId || 'baseline';
  const idFactory = args.idFactory || (() => randomUUID());
  const inboxIdFactory = args.inboxIdFactory || (() => randomUUID());
  const topN = Number.isFinite(Number(args.topN)) ? Math.max(1, Math.min(50, Number(args.topN))) : 12;

  const target = extractTargetFeaturesV1(args.targetProject);

  const featuresById = args.memoryIndex?.featuresByProjectId || {};
  const scored = Object.values(featuresById)
    .map((h) => {
      const sim = similarityV1({ target, historical: h });
      return { completedProjectId: h.completedProjectId, simScore: sim.score, matchedFeatures: sim.matchedFeatures, effectiveWeight: sim.effectiveWeight };
    })
    .filter((x) => x.simScore > 0)
    .sort((a, b) => b.simScore - a.simScore)
    .slice(0, topN);

  const byId = new Map<string, CompletedProjectRecord>();
  for (const p of args.completedProjects || []) byId.set(p.completedProjectId, p);

  const similaritySum = scored.reduce((acc, s) => acc + s.simScore, 0) || 1;
  const sampleSizeTopN = scored.length;
  const matchingFeaturesUsed: Array<'buildingType' | 'sqftBucket' | 'climateZone' | 'territory' | 'assetInventory' | 'scheduleBucket'> = [
    'buildingType',
    'sqftBucket',
    'climateZone',
    'territory',
    'assetInventory',
    'scheduleBucket',
  ];

  const canonicalProject: CanonicalProject = {
    orgId: args.orgId,
    projectId: args.projectId,
    status: 'active',
    projectBuilder: args.targetProject,
  };
  const playbookMatches = matchPlaybooks(canonicalProject);
  const playbooksApplied = playbookMatches.map((m) => ({
    playbookId: m.playbook.playbookId,
    priority: m.playbook.priority,
    matchedBecause: m.matchedBecause,
  }));

  // Aggregate measures from top matches using similarity-weighted frequency.
  const measureSupport: Record<
    MeasureType,
    {
      sumWeight: number;
      countProjects: number;
      exampleMeasures: Measure[];
      labelCounts: Record<string, number>;
      labelExamples: Record<string, string>;
      because: RecommendationBecause[];
      matchedFeatureSummary: Record<string, number>;
      topContributors: Array<{
        completedProjectId: string;
        archivedProjectId?: string;
        summary: string;
        similarityScore: number;
        matchedFeatures: string[];
      }>;
    }
  > = {};

  for (const s of scored) {
    const proj = byId.get(s.completedProjectId);
    if (!proj) continue;
    const measures = toCanonicalMeasures(proj);
    const uniqueTypes = [...new Set(measures.map((m) => m.measureType))] as MeasureType[];
    for (const mt of uniqueTypes) {
      if (!measureSupport[mt]) {
        measureSupport[mt] = {
          sumWeight: 0,
          countProjects: 0,
          exampleMeasures: [],
          labelCounts: {},
          labelExamples: {},
          because: [],
          matchedFeatureSummary: {},
          topContributors: [],
        };
      }
      const bucket = measureSupport[mt];
      bucket.sumWeight += s.simScore;
      bucket.countProjects += 1;
      const examples = measures.filter((m) => m.measureType === mt).slice(0, 2);
      bucket.exampleMeasures.push(...examples);
      bucket.because.push({
        completedProjectId: s.completedProjectId,
        similarityScore: s.simScore,
        matchedFeatures: s.matchedFeatures,
        measuresInProject: measures.map((m) => m.measureType).slice(0, 50),
      });
      for (const mf of s.matchedFeatures) bucket.matchedFeatureSummary[mf] = (bucket.matchedFeatureSummary[mf] || 0) + 1;
      for (const ex of examples) {
        const lbl = String(ex?.label || '').trim();
        if (!lbl) continue;
        const k = normText(lbl);
        bucket.labelCounts[k] = (bucket.labelCounts[k] || 0) + 1;
        if (!bucket.labelExamples[k]) bucket.labelExamples[k] = lbl;
      }
      bucket.topContributors.push({
        completedProjectId: proj.completedProjectId,
        archivedProjectId: (proj as any)?.archivedProjectId,
        summary: contributorSummary(proj),
        similarityScore: s.simScore,
        matchedFeatures: s.matchedFeatures,
      });
    }
  }

  const suggestions: RecommendationSuggestion[] = Object.entries(measureSupport)
    .map(([measureType, agg]) => {
      const baseScore = clamp01(agg.sumWeight / similaritySum);
      const avgSim = agg.countProjects > 0 ? agg.sumWeight / agg.countProjects : 0;
      const supportBoost = clamp01(agg.countProjects / 6);
      const confidence = clamp01(0.15 + 0.55 * avgSim + 0.3 * supportBoost);

      const repLabel =
        Object.entries(agg.labelCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([k]) => (agg as any).labelExamples?.[k] || k)
          .find(Boolean) || '';

      const tags = [
        ...new Set(
          agg.exampleMeasures
            .flatMap((m) => (Array.isArray(m?.tags) ? m.tags : []))
            .map((t) => normText(t))
            .filter(Boolean)
        ),
      ].slice(0, 12);

      const suggestedMeasure: Measure = {
        measureType: measureType as MeasureType,
        label: repLabel ? repLabel : inferDisplayName(measureType),
        tags,
        parameters: {},
        affectedAssetTypes: agg.exampleMeasures.find((m) => Array.isArray(m?.affectedAssetTypes) && m.affectedAssetTypes.length)?.affectedAssetTypes,
      };

      const alignment = playbookAlignmentForMeasure({ matches: playbookMatches, measureType: suggestedMeasure.measureType });
      const mult = playbookScoreMultiplier(alignment.alignment);
      const adjustedScore = clamp01(baseScore * mult);

      const requiredInputsMissing = getMissingInputs(canonicalProject, suggestedMeasure);

      const matchedFeatureSummary = Object.entries(agg.matchedFeatureSummary)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} matched in ${v}/${agg.countProjects} similar projects`)
        .slice(0, 8);

      const seenInCount = agg.countProjects;
      const freqText = `seen in ${seenInCount}/${sampleSizeTopN || agg.countProjects || 0} similar projects`;

      const topContributors = agg.topContributors
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, 3);

      return {
        suggestionId: idFactory(),
        orgId: args.orgId,
        projectId: args.projectId,
        stateId,
        suggestedMeasure,
        score: adjustedScore,
        confidence,
        playbookAlignment: alignment.alignment,
        playbookRationale: alignment.rationale,
        playbookId: alignment.playbookId,
        explain: {
          because: agg.because.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 5),
          matchedFeatureSummary,
          topContributors,
          matchingFeaturesUsed,
          frequency: { seenInCount, sampleSizeTopN, text: freqText },
          playbooksApplied,
          scoreOverlay: { baseScore, multiplier: mult, adjustedScore },
        },
        requiredInputsMissing,
        status: 'proposed',
        createdAt: args.nowIso,
      } satisfies RecommendationSuggestion;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  // Surface into Project Builder inbox as Phase-1 suggestedMeasure (safe, non-authoritative).
  const inboxItems: InboxItem[] = suggestions.map((sug) => {
    const topLines = (Array.isArray((sug.explain as any)?.topContributors) ? (sug.explain as any).topContributors : []).map((c: any) => {
      const pid = String(c?.completedProjectId || '');
      const sim = Number.isFinite(Number(c?.similarityScore)) ? Number(c.similarityScore).toFixed(2) : 'n/a';
      const feats = Array.isArray(c?.matchedFeatures) ? c.matchedFeatures.join(', ') : '';
      const summary = String(c?.summary || '').trim();
      return `- because completedProject=${pid} similarity=${sim} matched=[${feats || 'n/a'}] summary="${summary}"`;
    });
    const becauseLines = topLines.join('\n');
    const missing = sug.requiredInputsMissing.length ? `\n\nEstimate unavailable; requires:\n- ${sug.requiredInputsMissing.join('\n- ')}` : '';
    const notes = [
      `Suggested by EverWatt Memory (${args.memoryIndex.version})`,
      `score=${sug.score.toFixed(2)} confidence=${sug.confidence.toFixed(2)}`,
      `playbookAlignment=${String((sug as any).playbookAlignment || 'neutral')}`,
      (sug as any)?.playbookId ? `playbookId=${String((sug as any).playbookId)}` : '',
      (sug as any)?.playbookRationale ? `playbookRationale=${String((sug as any).playbookRationale)}` : '',
      Array.isArray((sug.explain as any)?.playbooksApplied) && (sug.explain as any).playbooksApplied.length
        ? `playbooksApplied=${(sug.explain as any).playbooksApplied.map((p: any) => String(p?.playbookId || '').trim()).filter(Boolean).join(',')}`
        : '',
      `frequency=${(sug.explain as any)?.frequency?.text || ''}`.trim(),
      '',
      'Why we suggested this:',
      becauseLines || '- because (no similar projects found)',
      missing,
    ]
      .filter(Boolean)
      .join('\n')
      .trim()
      .slice(0, 3500);

    const provenance: EvidenceRef = {
      fileId: `memoryIndex:${args.memoryIndex.indexId}`,
      extractedAt: args.nowIso,
      snippetText: notes.slice(0, 2000),
      sourceKey: `reco:${sug.suggestionId}`,
    } as any;

    return {
      id: inboxIdFactory(),
      kind: 'suggestedMeasure',
      status: 'inferred',
      sourceKey: `reco:${sug.suggestionId}`,
      suggestedMeasure: {
        id: sug.suggestionId,
        name: String(sug.suggestedMeasure.label || inferDisplayName(String((sug.suggestedMeasure as any).measureType || ''))),
        category: 'recommendation',
        notes,
      },
      provenance,
      confidence: clamp01(sug.confidence),
      needsConfirmation: true,
      createdAt: args.nowIso,
    } as InboxItem;
  });

  return { suggestions, inboxItems };
}

export function assertMemoryIndexVersion(index: EverWattMemoryIndex): { ok: true } | { ok: false; error: string } {
  const v = String((index as any)?.version || '').trim() as MemoryIndexVersion;
  if (v !== memoryIndexVersion) return { ok: false, error: `Unsupported memory index version: ${v || '(missing)'} (expected ${memoryIndexVersion})` };
  return { ok: true };
}

