import type { UtilityInputs, UtilityRecommendation } from '../utilityIntelligence/types';
import type { ProgramCatalogEntry, ProgramMatchResult } from './types';

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

function byId(catalog: ProgramCatalogEntry[]): Map<string, ProgramCatalogEntry> {
  const m = new Map<string, ProgramCatalogEntry>();
  for (const e of catalog) m.set(e.programId, e);
  return m;
}

function makeEphemeralIdFactory(args: { prefix: string; seed: string }): () => string {
  const prefix = String(args.prefix || 'id').trim() || 'id';
  const seed =
    String(args.seed || '')
      .trim()
      .replace(/[^0-9A-Za-z]/g, '')
      .slice(0, 24) || 'seed';
  let i = 0;
  return () => `${prefix}_${seed}_${++i}`;
}

export function programMatchesToRecommendations(args: {
  inputs: UtilityInputs;
  matches: ProgramMatchResult[];
  catalog: ProgramCatalogEntry[];
  nowIso?: string;
  idFactory?: () => string;
}): UtilityRecommendation[] {
  const nowIso = args.nowIso || new Date().toISOString();
  const idFactory = args.idFactory || makeEphemeralIdFactory({ prefix: 'progReco', seed: nowIso });
  const lookup = byId(args.catalog);

  const recos: UtilityRecommendation[] = [];
  for (const m of (args.matches || []).slice(0, 10)) {
    const entry = lookup.get(m.programId);
    if (!entry) continue;

    const isDr = entry.category === 'DEMAND_RESPONSE';
    const recommendationType: UtilityRecommendation['recommendationType'] = isDr ? 'DEMAND_RESPONSE' : 'UTILITY_PROGRAM';
    const measureType = (isDr ? 'DEMAND_RESPONSE_ENROLLMENT' : 'UTILITY_PROGRAM_ENROLLMENT') as any;

    const drFitLines =
      isDr && Number.isFinite(m.drFitScore ?? NaN)
        ? uniq([
            `Operational fit (DR): score=${Number(m.drFitScore).toFixed(2)}.`,
            ...(Array.isArray(m.drWhyNow) && m.drWhyNow.length ? [`Why now: ${m.drWhyNow.join(' ')}`] : []),
            ...(Array.isArray(m.drWhyNotNow) && m.drWhyNotNow.length ? [`Why not now: ${m.drWhyNotNow.join(' ')}`] : []),
            ...(Array.isArray(m.drNextStepsChecklist) && m.drNextStepsChecklist.length
              ? m.drNextStepsChecklist.slice(0, 5).map((s) => `Next step: ${s}`)
              : []),
          ])
        : [];

    const because = uniq([
      `Matched program: ${entry.name} (${entry.programId})`,
      entry.benefitsSummary,
      ...m.because,
      ...drFitLines,
      ...(Array.isArray(entry.nextSteps) && entry.nextSteps.length ? entry.nextSteps.map((s) => `Next step: ${s}`) : []),
    ]);

    recos.push({
      recommendationId: idFactory(),
      recommendationType,
      score: clamp01(m.score),
      confidence: clamp01(m.matchStatus === 'eligible' ? 0.8 : m.matchStatus === 'likely_eligible' ? 0.6 : m.matchStatus === 'unknown' ? 0.35 : 0.2),
      because,
      requiredInputsMissing: uniq(m.requiredInputsMissing || []),
      suggestedMeasure: {
        measureType,
        label: isDr ? `Enroll in Demand Response: ${entry.name}` : `Enroll in Utility Program: ${entry.name}`,
        tags: uniq([isDr ? 'demand_response' : 'utility_program', entry.category.toLowerCase(), 'enrollment']),
        parameters: {
          territory: args.inputs.utilityTerritory ?? null,
          programId: entry.programId,
          programName: entry.name,
          administrator: entry.administrator,
          category: entry.category,
          createdAt: nowIso,
          ...(isDr && Number.isFinite(m.drFitScore ?? NaN)
            ? {
                drFitScore: Number(m.drFitScore),
                drWhyNow: Array.isArray(m.drWhyNow) ? m.drWhyNow : [],
                drWhyNotNow: Array.isArray(m.drWhyNotNow) ? m.drWhyNotNow : [],
                drNextStepsChecklist: Array.isArray(m.drNextStepsChecklist) ? m.drNextStepsChecklist : [],
              }
            : {}),
        },
      },
    });
  }

  return recos.sort((a, b) => b.score - a.score || b.confidence - a.confidence);
}

