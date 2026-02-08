import type { ProgramV1 } from './types';
import { isSnapshotStaleV1, loadLatestProgramSnapshotV1 } from './storage';
import { applyProgramCurationV1, loadCurationBundleV1 } from '../../policy/curation/loadCuration';

export async function getLatestProgramsV1(args: {
  utilityKey: string;
  allowResidential?: boolean;
  onlyParticipatedBefore?: boolean;
  nowIso?: string;
  baseDir?: string;
}): Promise<{
  utilityKey: string;
  versionTag: string | null;
  capturedAt: string | null;
  isStale: boolean;
  programs: ProgramV1[];
  warnings: string[];
  curationStatus?: {
    loadedFromPath: string;
    capturedAtIso?: string | null;
    version?: number | null;
    programOverridesCount: number;
  };
}> {
  const nowIso = args.nowIso || new Date().toISOString();
  const { snapshot, warnings: readWarnings } = await loadLatestProgramSnapshotV1(args.utilityKey, args.baseDir ? { baseDir: args.baseDir } : undefined);
  const warnings: string[] = [...readWarnings];
  if (!snapshot) {
    return { utilityKey: args.utilityKey, versionTag: null, capturedAt: null, isStale: true, programs: [], warnings };
  }

  const { curation, warnings: curWarnings, loadedFromPath, capturedAtIso, version } = loadCurationBundleV1();
  warnings.push(...curWarnings);

  const programs = applyProgramCurationV1({
    programs: (Array.isArray(snapshot.programs) ? snapshot.programs : []) as any[],
    curation: curation.programs,
    allowResidential: Boolean(args.allowResidential),
  }) as any as ProgramV1[];

  const onlyParticipatedBefore = Boolean(args.onlyParticipatedBefore);
  const filteredPrograms = onlyParticipatedBefore ? programs.filter((p) => Boolean((p as any).participatedBefore || (p as any)?.curation?.labels?.participated)) : programs;
  if (onlyParticipatedBefore && filteredPrograms.length === 0) warnings.push('onlyParticipatedBefore filter removed all programs');

  const isStale = isSnapshotStaleV1(snapshot.capturedAt, nowIso, 14);
  return {
    utilityKey: args.utilityKey,
    versionTag: snapshot.versionTag,
    capturedAt: snapshot.capturedAt,
    isStale,
    programs: filteredPrograms,
    warnings,
    curationStatus: {
      loadedFromPath,
      capturedAtIso: capturedAtIso ?? null,
      version: version ?? null,
      programOverridesCount: Object.keys(curation.programs || {}).length,
    },
  };
}

