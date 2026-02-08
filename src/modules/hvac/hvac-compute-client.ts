/**
 * HVAC Compute Client (Node -> Python FastAPI)
 */
import { config } from '../../config';
import {
  HVAC_COMPUTE_API_VERSION,
  HvacComputeAnalyzeRequestSchema,
  HvacComputeAnalyzeResponseSchema,
  type HvacComputeAnalyzeRequest,
  type HvacComputeAnalyzeResponse,
} from './optimizer-contract';
 
export class HvacComputeError extends Error {
  constructor(message: string, public status?: number, public details?: unknown) {
    super(message);
    this.name = 'HvacComputeError';
  }
}
 
export async function hvacComputeAnalyze(args: {
  request: Omit<HvacComputeAnalyzeRequest, 'apiVersion'>;
  timeoutMs?: number;
}): Promise<HvacComputeAnalyzeResponse> {
  const req: HvacComputeAnalyzeRequest = HvacComputeAnalyzeRequestSchema.parse({
    apiVersion: HVAC_COMPUTE_API_VERSION,
    ...args.request,
  });
 
  const base = String(config.hvacComputeUrl || '').replace(/\/+$/, '');
  const url = `${base}/${HVAC_COMPUTE_API_VERSION}/analyze`;
 
  const controller = new AbortController();
  const timeoutMs = args.timeoutMs ?? 120_000;
  const t = setTimeout(() => controller.abort(), timeoutMs);
 
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
 
    const text = await resp.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
 
    if (!resp.ok) {
      throw new HvacComputeError(`hvac_compute returned ${resp.status}`, resp.status, json);
    }
 
    return HvacComputeAnalyzeResponseSchema.parse(json);
  } catch (e) {
    if (e instanceof HvacComputeError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new HvacComputeError(`hvac_compute timed out after ${timeoutMs}ms`);
    }
    throw new HvacComputeError(e instanceof Error ? e.message : 'hvac_compute call failed');
  } finally {
    clearTimeout(t);
  }
}
 
