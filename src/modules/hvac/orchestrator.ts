/**
 * HVAC Optimizer Orchestration (Node)
 *
 * Creates async HVAC optimizer runs, stores them, and executes them via the Python compute service.
 */
import { randomUUID, createHash } from 'crypto';
import {
  HVAC_COMPUTE_API_VERSION,
  type HvacComputeAnalyzeRequest,
  type HvacComputeAnalyzeResponse,
} from './optimizer-contract';
import type { EquipmentSystem, PointMapping, HvacObjective, HvacConstraints } from './optimizer-contract';
import { enqueueHvacJob } from './run-queue';
import { createHvacRun, listHvacRuns, updateHvacRun, type HvacRunRecord } from './run-storage';
import { hvacComputeAnalyze } from './hvac-compute-client';
 
function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalize = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(normalize);
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = normalize(v[k]);
    return out;
  };
  return JSON.stringify(normalize(value));
}
 
function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
 
export type StartHvacRunArgs = {
  userId: string;
  projectId: string;
  timezone?: string;
  systems: EquipmentSystem[];
  pointMapping: PointMapping;
  objective?: HvacObjective;
  constraints?: HvacConstraints;
  targetIntervalMinutes?: number;
  trend: { csvText: string; source: { kind: 'userFile'; key: string } | { kind: 'inlineCsv' } };
  useCache?: boolean;
};
 
export async function startHvacOptimizerRun(args: StartHvacRunArgs): Promise<{
  runId: string;
  status: HvacRunRecord['status'];
  cached: boolean;
}> {
  const requestHash = sha256(
    stableStringify({
      apiVersion: HVAC_COMPUTE_API_VERSION,
      projectId: args.projectId,
      timezone: args.timezone || 'UTC',
      systems: args.systems,
      pointMapping: args.pointMapping,
      objective: args.objective,
      constraints: args.constraints,
      targetIntervalMinutes: args.targetIntervalMinutes ?? 15,
      // IMPORTANT: include the trend text in the hash so caching is safe.
      trendCsvSha: sha256(args.trend.csvText),
    })
  );
 
  if (args.useCache !== false) {
    const runs = await listHvacRuns(args.userId, args.projectId);
    const cached = runs.find((r) => r.status === 'completed' && r.requestHash === requestHash);
    if (cached) {
      return { runId: cached.id, status: cached.status, cached: true };
    }
  }
 
  const runId = randomUUID();
  const now = new Date().toISOString();
 
  const requestForCompute: HvacComputeAnalyzeRequest = {
    apiVersion: HVAC_COMPUTE_API_VERSION,
    projectId: args.projectId,
    runId,
    timezone: args.timezone || 'UTC',
    systems: args.systems,
    pointMapping: args.pointMapping,
    trend: { format: 'csv', csvText: args.trend.csvText },
    objective: args.objective,
    constraints: args.constraints,
    targetIntervalMinutes: args.targetIntervalMinutes ?? 15,
  };
 
  const record: HvacRunRecord = {
    id: runId,
    userId: args.userId,
    projectId: args.projectId,
    status: 'queued',
    requestHash,
    request: {
      apiVersion: requestForCompute.apiVersion,
      projectId: requestForCompute.projectId,
      runId: requestForCompute.runId,
      timezone: requestForCompute.timezone,
      systems: requestForCompute.systems,
      pointMapping: requestForCompute.pointMapping,
      objective: requestForCompute.objective,
      constraints: requestForCompute.constraints,
      targetIntervalMinutes: requestForCompute.targetIntervalMinutes,
      trendSource: args.trend.source,
    },
    createdAt: now,
    updatedAt: now,
  };
 
  await createHvacRun(record);
 
  enqueueHvacJob({
    runId,
    execute: async () => {
      await updateHvacRun(args.userId, runId, { status: 'running', error: undefined });
      try {
        const result: HvacComputeAnalyzeResponse = await hvacComputeAnalyze({ request: requestForCompute });
        const findings = Array.isArray((result as any)?.fdd_findings) ? ((result as any).fdd_findings as any[]) : [];
        const blocked = findings.some((f) => Boolean(f?.blocks_optimization));
        await updateHvacRun(args.userId, runId, { status: blocked ? 'blocked_by_faults' : 'completed', result });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'HVAC compute failed';
        await updateHvacRun(args.userId, runId, { status: 'failed', error: { message } });
      }
    },
  });
 
  return { runId, status: 'queued', cached: false };
}
 
