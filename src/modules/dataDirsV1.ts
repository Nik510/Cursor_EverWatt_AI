import path from 'node:path';

function resolveEnvDir(envValueRaw: unknown): string | null {
  const envValue = String(envValueRaw || '').trim();
  if (!envValue) return null;
  return path.resolve(envValue);
}

/**
 * Canonical EverWatt data root for snapshot-only stores.
 *
 * Note: individual stores may still support per-store env overrides.
 */
export function getEverwattDataDirV1(): string {
  return path.resolve(path.join(process.cwd(), '.data'));
}

export function getEverwattProjectsBaseDirV1(): string {
  return resolveEnvDir(process.env.EVERWATT_PROJECTS_BASEDIR) ?? path.resolve(path.join(process.cwd(), 'data', 'projects'));
}

/**
 * Analysis runs v1 base dir (snapshot-only).
 *
 * Preferred env: EVERWATT_RUNS_BASEDIR
 * Legacy env: EVERWATT_ANALYSIS_RUNS_V1_BASEDIR (kept for back-compat/tests)
 */
export function getEverwattRunsBaseDirV1(): string {
  return (
    resolveEnvDir(process.env.EVERWATT_RUNS_BASEDIR) ??
    resolveEnvDir(process.env.EVERWATT_ANALYSIS_RUNS_V1_BASEDIR) ??
    path.resolve(path.join(getEverwattDataDirV1(), 'analysisRunsV1'))
  );
}

/**
 * Report sessions v1 base dir (snapshot-only spine).
 *
 * Preferred env: EVERWATT_REPORTS_BASEDIR
 * Legacy env: EVERWATT_REPORT_SESSIONS_V1_BASEDIR (kept for back-compat/tests)
 */
export function getEverwattReportsBaseDirV1(): string {
  return (
    resolveEnvDir(process.env.EVERWATT_REPORTS_BASEDIR) ??
    resolveEnvDir(process.env.EVERWATT_REPORT_SESSIONS_V1_BASEDIR) ??
    path.resolve(path.join(getEverwattDataDirV1(), 'reportSessionsV1'))
  );
}

/**
 * Share links v1 base dir (snapshot-only distribution).
 *
 * Env override: EVERWATT_SHARES_BASEDIR
 */
export function getEverwattSharesBaseDirV1(): string {
  return resolveEnvDir(process.env.EVERWATT_SHARES_BASEDIR) ?? path.resolve(path.join(getEverwattDataDirV1(), 'sharesV1'));
}

/**
 * Customer portal v1 base dir.
 *
 * Env override: EVERWATT_PORTAL_BASEDIR
 */
export function getEverwattPortalBaseDirV1(): string {
  return resolveEnvDir(process.env.EVERWATT_PORTAL_BASEDIR) ?? path.resolve(path.join(getEverwattDataDirV1(), 'portalV1'));
}

