import type { ProjectGraph } from '../../types/project-graph';

export type HvacAssetSnapshot = {
  assetId: string;
  assetTag: string;
  assetType: string;
  name?: string;
  location?: string;
  /**
   * Frozen "what existed" blueprint (pre-side).
   * If `frozenAt` is present, this should be treated as immutable history.
   */
  baseline?: {
    frozenAt?: string;
    description?: string;
    equipment?: string[];
  };
  /**
   * Measures attached to this asset (post-side changes).
   * Keep this structure stable so HVAC calculators/optimizers can consume it.
   */
  measures: Array<{
    id: string;
    name: string;
    measureType?: string;
    before?: { description?: string; equipment?: string[] };
    after?: { description?: string; equipmentAdded?: string[] };
  }>;
};

export type HvacProjectSnapshot = {
  assets: HvacAssetSnapshot[];
};

export function projectGraphToHvacSnapshot(graph: ProjectGraph | undefined | null): HvacProjectSnapshot {
  const assets = Array.isArray(graph?.assets) ? graph!.assets : [];
  return {
    assets: assets.map((a) => ({
      assetId: String(a.id),
      assetTag: String(a.assetTag),
      assetType: String(a.type),
      name: a.name,
      location: a.location,
      baseline: a.baseline
        ? {
            frozenAt: a.baseline.frozenAt,
            description: a.baseline.description,
            equipment: Array.isArray(a.baseline.equipment) ? a.baseline.equipment : [],
          }
        : undefined,
      measures: Array.isArray(a.measures)
        ? a.measures.map((m) => ({
            id: String(m.id),
            name: String(m.name),
            measureType: m.measureType,
            before: m.before
              ? {
                  description: m.before.description,
                  equipment: Array.isArray(m.before.equipment) ? m.before.equipment : [],
                }
              : undefined,
            after: m.after
              ? {
                  description: m.after.description,
                  equipmentAdded: Array.isArray(m.after.equipmentAdded) ? m.after.equipmentAdded : [],
                }
              : undefined,
          }))
        : [],
    })),
  };
}

