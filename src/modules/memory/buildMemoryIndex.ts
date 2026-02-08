import type {
  CompletedProjectAssetSummary,
  CompletedProjectRecord,
  EverWattMemoryIndex,
  MemoryIndexVersion,
  ProjectFeaturesV1,
  ScheduleBucket,
  SqftBucket,
} from '../project/types';

export const memoryIndexVersion: MemoryIndexVersion = 'v1';

export const ASSET_KEYS_ORDER: Array<keyof Required<CompletedProjectAssetSummary>> = [
  'ahuCount',
  'rtuCount',
  'vavCount',
  'fanCount',
  'pumpCount',
  'chillerCount',
  'boilerCount',
  'coolingTowerCount',
  'panelCount',
  'lightingFixtureCount',
  'lightingControlCount',
  'otherCount',
];

function normText(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 _/-]+/g, '')
    .trim();
}

export function bucketSqft(sqft: number | null | undefined): SqftBucket {
  const n = typeof sqft === 'number' ? sqft : Number(sqft);
  if (!Number.isFinite(n) || n <= 0) return '<50k';
  if (n < 50_000) return '<50k';
  if (n < 150_000) return '50-150k';
  if (n < 500_000) return '150-500k';
  return '500k+';
}

export function bucketSchedule(bucket: unknown): ScheduleBucket {
  const b = String(bucket ?? '').trim();
  if (b === '24_7' || b === 'business_hours' || b === 'mixed' || b === 'unknown') return b;
  return 'unknown';
}

export function normalizeAssetCounts(input: CompletedProjectAssetSummary | undefined): Required<CompletedProjectAssetSummary> {
  const src = (input && typeof input === 'object' ? input : {}) as CompletedProjectAssetSummary;
  const out: any = {};
  for (const k of ASSET_KEYS_ORDER) {
    const v = (src as any)[k];
    const n = Number(v);
    out[k] = Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  }
  return out as Required<CompletedProjectAssetSummary>;
}

export function extractProjectFeaturesV1(rec: CompletedProjectRecord): ProjectFeaturesV1 {
  const buildingTypeBucket = normText(rec?.building?.buildingType || 'unknown') || 'unknown';
  const sqftBucket = bucketSqft(rec?.building?.sqft ?? null);
  const climateZone = rec?.building?.climateZone ? String(rec.building.climateZone) : null;
  const territory = rec?.building?.territory ? String(rec.building.territory) : null;
  const scheduleBucket = bucketSchedule(rec?.building?.operatingSchedule?.bucket);

  const counts = normalizeAssetCounts(rec?.assetsBefore || rec?.assetsAfter);

  const canonMeasures = Array.isArray((rec as any)?.measuresImplemented) ? ((rec as any).measuresImplemented as any[]) : [];
  const legacyMeasures = Array.isArray((rec as any)?.measures) ? ((rec as any).measures as any[]) : [];
  const tagsSource = canonMeasures.length ? canonMeasures : legacyMeasures;
  const tags = Array.isArray(tagsSource) ? tagsSource.flatMap((m) => (Array.isArray(m?.tags) ? m.tags : [])) : [];
  const measureTags = [...new Set(tags.map((t) => normText(t)).filter(Boolean))].sort().slice(0, 24);

  return {
    completedProjectId: rec.completedProjectId,
    buildingTypeBucket,
    sqftBucket,
    climateZone: climateZone ? String(climateZone) : null,
    territory: territory ? String(territory) : null,
    scheduleBucket,
    assetInventoryCounts: counts,
    measureTags,
  };
}

function pushIndex(map: Record<string, string[]>, key: string, projectId: string): void {
  const k = normText(key);
  if (!k) return;
  const prev = map[k] || [];
  if (!prev.includes(projectId)) map[k] = [...prev, projectId];
}

export function buildMemoryIndexV1(args: {
  orgId: string;
  projects: CompletedProjectRecord[];
  generatedAtIso: string;
}): EverWattMemoryIndex {
  const feats: Record<string, ProjectFeaturesV1> = {};
  const measureTagToProjects: Record<string, string[]> = {};
  const buildingTypeToProjects: Record<string, string[]> = {};
  const systemTypeToProjects: Record<string, string[]> = {};

  for (const p of Array.isArray(args.projects) ? args.projects : []) {
    if (!p?.completedProjectId) continue;
    const f = extractProjectFeaturesV1(p);
    feats[p.completedProjectId] = f;

    pushIndex(buildingTypeToProjects, f.buildingTypeBucket, p.completedProjectId);

    for (const tag of f.measureTags) pushIndex(measureTagToProjects, tag, p.completedProjectId);

    // systemType: derived from non-zero asset keys
    for (const k of ASSET_KEYS_ORDER) {
      if ((f.assetInventoryCounts as any)[k] > 0) pushIndex(systemTypeToProjects, k, p.completedProjectId);
    }
  }

  return {
    indexId: `${args.orgId}:${memoryIndexVersion}`,
    orgId: args.orgId,
    generatedAt: args.generatedAtIso,
    version: memoryIndexVersion,
    normalization: { version: memoryIndexVersion, assetKeys: ASSET_KEYS_ORDER },
    featuresByProjectId: feats,
    invertedIndexes: {
      measureTagToProjects,
      buildingTypeToProjects,
      systemTypeToProjects,
    },
  };
}

