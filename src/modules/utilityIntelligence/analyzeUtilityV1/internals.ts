import path from 'path';
import { existsSync } from 'fs';
import { tmpdir } from 'os';

import type { EngineWarning, UtilityInputs, UtilityInsights } from '../types';
import type { IntervalKwPoint as IntervalKwPoint1 } from '../interval/analyzeLoadShape';
import type { IntervalKwPoint as IntervalKwPoint2 } from '../rates/evaluateRateFit';

import { loadProjectForOrg } from '../../project/projectRepository';
import { readIntervalData } from '../../../utils/excel-reader';

export type IntervalKwPoint = IntervalKwPoint1 & IntervalKwPoint2;

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function normText(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function uniq(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const k = String(x || '').trim();
    if (!k) continue;
    const nk = k.toLowerCase();
    if (seen.has(nk)) continue;
    seen.add(nk);
    out.push(k);
  }
  return out;
}

export function mergeBillIntelWarnings(base: Array<{ code: any; reason: string }>, add: Array<{ code: any; reason: string }>): void {
  const seen = new Set(base.map((w) => `${String(w.code)}|${String(w.reason)}`.toLowerCase()));
  for (const w of add) {
    const k = `${String(w.code)}|${String(w.reason)}`.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    base.push(w as any);
  }
}

export function asCaIouUtility(raw: unknown): 'PGE' | 'SCE' | 'SDGE' | null {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (s === 'PGE' || s === 'PG&E' || s === 'PACIFICGASANDELECTRIC' || s === 'PACIFICGASELECTRIC') return 'PGE';
  if (s === 'SCE' || s === 'SOUTHERNCALIFORNIAEDISON') return 'SCE';
  if (s === 'SDGE' || s === 'SDG&E' || s === 'SANDIEGOGASANDELECTRIC') return 'SDGE';
  return null;
}

export function mapBillUtilityHintToLibraryUtility(args: { utilityHint?: string | null; commodity: 'electric' | 'gas' }): string | null {
  const h = String(args.utilityHint || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  // From bill extractor returns: PG&E, SCE, SDG&E, SoCalGas
  if (args.commodity === 'electric') {
    if (h.includes('PGE') || h.includes('PACIFICGAS')) return 'PGE';
    if (h === 'SCE' || h.includes('SOUTHERNCALIFORNIAEDISON')) return 'SCE';
    if (h.includes('SDGE') || h.includes('SANDIEGOGAS')) return 'SDGE';
    return null;
  }
  // gas
  if (h.includes('PGE') || h.includes('PACIFICGAS')) return 'PGE';
  if (h.includes('SDGE') || h.includes('SANDIEGOGAS')) return 'SDGE';
  if (h.includes('SOCALGAS') || h.includes('SOUTHERNCALIFORNIAGAS')) return 'SOCALGAS';
  return null;
}

export function normRateCode(raw: unknown): string {
  const s = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const m = /^([A-Z]{1,3})-?(\d{1,3})([A-Z]?)$/.exec(s);
  if (m) return `${m[1]}-${m[2]}${m[3] || ''}`;
  return s;
}

export function inferScheduleBucket(args: { metrics: UtilityInsights['inferredLoadShape']; intervalPoints: number }): UtilityInsights['operatingPatternInference'] {
  const reasons: string[] = [];
  const p10 = args.metrics.baseloadKw;
  const p95 = args.metrics.peakKw;
  const nightDay = args.metrics.nightDayRatio;
  const ww = args.metrics.weekdayWeekendDelta;

  if (!Number.isFinite(nightDay ?? NaN) || !Number.isFinite(ww ?? NaN) || !Number.isFinite(p10 ?? NaN) || !Number.isFinite(p95 ?? NaN)) {
    return { scheduleBucket: 'unknown', confidence: 0.15, reasons: ['Insufficient load shape metrics to infer operating schedule.'] };
  }

  const nd = Number(nightDay);
  const wwd = Number(ww);

  if (nd >= 0.85 && Math.abs(wwd) <= 0.08) {
    reasons.push(`nightDayRatio≈${nd.toFixed(2)} suggests high overnight load relative to daytime.`);
    reasons.push(`weekdayWeekendDelta≈${wwd.toFixed(2)} suggests similar usage on weekends.`);
    return { scheduleBucket: '24_7', confidence: 0.75, reasons };
  }

  if (nd <= 0.65 && wwd >= 0.08) {
    reasons.push(`nightDayRatio≈${nd.toFixed(2)} suggests lower overnight load vs daytime.`);
    reasons.push(`weekdayWeekendDelta≈${wwd.toFixed(2)} suggests higher weekday usage than weekends.`);
    return { scheduleBucket: 'business_hours', confidence: 0.7, reasons };
  }

  reasons.push('Metrics suggest mixed operating behavior (neither clearly 24/7 nor strictly business-hours).');
  return { scheduleBucket: 'mixed', confidence: 0.55, reasons };
}

export function exceptionName(e: unknown): string {
  if (e && typeof e === 'object' && 'name' in e) return String((e as any).name || 'Error');
  if (typeof e === 'string') return 'Error';
  return String(e === null ? 'null' : typeof e);
}

const DEFAULT_ALLOWLIST_ROOTS = [path.join(tmpdir(), 'everwatt-uploads'), path.join(process.cwd(), 'samples')];

function resolveAllowlistedPath(rawPath: string, allowRoots = DEFAULT_ALLOWLIST_ROOTS): string | null {
  const fp = String(rawPath || '').trim();
  if (!fp) return null;
  const abs = path.resolve(path.isAbsolute(fp) ? fp : path.join(process.cwd(), fp));
  for (const rootRaw of allowRoots) {
    const root = path.resolve(String(rootRaw || ''));
    if (!root) continue;
    if (abs === root) return abs;
    if (abs.startsWith(root + path.sep)) return abs;
  }
  return null;
}

export function makeEphemeralIdFactory(args: { prefix: string; seed: string }): () => string {
  const prefix = String(args.prefix || 'id').trim() || 'id';
  const seed =
    String(args.seed || '')
      .trim()
      .replace(/[^0-9A-Za-z]/g, '')
      .slice(0, 24) || 'seed';
  let i = 0;
  return () => `${prefix}_${seed}_${++i}`;
}

export async function tryLoadIntervalKwFromProject(inputs: UtilityInputs, warn?: (w: EngineWarning) => void): Promise<IntervalKwPoint[] | null> {
  try {
    if (!inputs.orgId || !inputs.projectId) return null;
    const project = await loadProjectForOrg(inputs.orgId, inputs.projectId);
    if (!project) return null;

    const telemetry: any = (project as any)?.telemetry || {};
    const series = telemetry.intervalKwSeries;
    if (Array.isArray(series) && series.length) {
      const out: IntervalKwPoint[] = series
        .map((r: any) => ({
          timestampIso: String(r?.timestampIso || r?.timestamp || '').trim(),
          kw: Number(r?.kw),
          temperatureF: Number((r as any)?.temperatureF ?? (r as any)?.tempF ?? (r as any)?.temperature),
        }))
        .filter((r: any) => r.timestampIso && Number.isFinite(r.kw));
      if (out.length) return out;
    }

    const fp = String(telemetry.intervalFilePath || '').trim();
    if (fp) {
      const abs = resolveAllowlistedPath(fp);
      if (!abs) {
        warn?.({
          code: 'UIE_INTERVAL_FILE_PATH_REJECTED',
          module: 'utilityIntelligence/analyzeUtility',
          operation: 'tryLoadIntervalKwFromProject',
          exceptionName: 'PathNotAllowed',
          contextKey: 'intervalFilePath',
        });
      } else if (existsSync(abs)) {
        try {
          const data = readIntervalData(abs);
          const out: IntervalKwPoint[] = data
            .map((d) => ({
              timestampIso: d.timestamp instanceof Date ? d.timestamp.toISOString() : new Date(d.timestamp as any).toISOString(),
              kw: Number((d as any).demand),
              temperatureF: Number((d as any).temperatureF ?? (d as any).avgTemperature ?? (d as any).temperature),
            }))
            .filter((r) => r.timestampIso && Number.isFinite(r.kw));
          if (out.length) return out;
        } catch (e) {
          warn?.({
            code: 'UIE_INTERVAL_FILE_READ_FAILED',
            module: 'utilityIntelligence/analyzeUtility',
            operation: 'readIntervalData',
            exceptionName: exceptionName(e),
            contextKey: 'intervalFilePath',
          });
        }
      }
    }

    return null;
  } catch (e) {
    warn?.({
      code: 'UIE_INTERVAL_LOAD_FROM_PROJECT_FAILED',
      module: 'utilityIntelligence/analyzeUtility',
      operation: 'tryLoadIntervalKwFromProject',
      exceptionName: exceptionName(e),
      contextKey: 'projectTelemetry',
    });
    return null;
  }
}

export async function tryLoadProjectTelemetry(inputs: UtilityInputs, warn?: (w: EngineWarning) => void): Promise<any | null> {
  try {
    if (!inputs.orgId || !inputs.projectId) return null;
    const project = await loadProjectForOrg(inputs.orgId, inputs.projectId);
    const telemetry: any = (project as any)?.telemetry || null;
    return telemetry && typeof telemetry === 'object' ? telemetry : null;
  } catch (e) {
    warn?.({
      code: 'UIE_PROJECT_TELEMETRY_LOAD_FAILED',
      module: 'utilityIntelligence/analyzeUtility',
      operation: 'tryLoadProjectTelemetry',
      exceptionName: exceptionName(e),
      contextKey: 'projectTelemetry',
    });
    return null;
  }
}

export function intervalKwFromProjectTelemetry(telemetry: any, warn?: (w: EngineWarning) => void): IntervalKwPoint[] | null {
  try {
    if (!telemetry || typeof telemetry !== 'object') return null;

    const series = (telemetry as any).intervalKwSeries;
    if (Array.isArray(series) && series.length) {
      const out: IntervalKwPoint[] = series
        .map((r: any) => ({
          timestampIso: String(r?.timestampIso || r?.timestamp || '').trim(),
          kw: Number(r?.kw),
          temperatureF: Number((r as any)?.temperatureF ?? (r as any)?.tempF ?? (r as any)?.temperature),
        }))
        .filter((r: any) => r.timestampIso && Number.isFinite(r.kw));
      if (out.length) return out;
    }

    const fp = String((telemetry as any).intervalFilePath || '').trim();
    if (fp) {
      const abs = resolveAllowlistedPath(fp);
      if (!abs) {
        warn?.({
          code: 'UIE_INTERVAL_FILE_PATH_REJECTED',
          module: 'utilityIntelligence/analyzeUtility',
          operation: 'intervalKwFromProjectTelemetry',
          exceptionName: 'PathNotAllowed',
          contextKey: 'intervalFilePath',
        });
      } else if (existsSync(abs)) {
        try {
          const data = readIntervalData(abs);
          const out: IntervalKwPoint[] = data
            .map((d) => ({
              timestampIso: d.timestamp instanceof Date ? d.timestamp.toISOString() : new Date(d.timestamp as any).toISOString(),
              kw: Number((d as any).demand),
              temperatureF: Number((d as any).temperatureF ?? (d as any).avgTemperature ?? (d as any).temperature),
            }))
            .filter((r) => r.timestampIso && Number.isFinite(r.kw));
          if (out.length) return out;
        } catch (e) {
          warn?.({
            code: 'UIE_INTERVAL_FILE_READ_FAILED',
            module: 'utilityIntelligence/analyzeUtility',
            operation: 'readIntervalData',
            exceptionName: exceptionName(e),
            contextKey: 'intervalFilePath',
          });
        }
      }
    }

    return null;
  } catch (e) {
    warn?.({
      code: 'UIE_INTERVAL_FROM_TELEMETRY_FAILED',
      module: 'utilityIntelligence/analyzeUtility',
      operation: 'intervalKwFromProjectTelemetry',
      exceptionName: exceptionName(e),
      contextKey: 'projectTelemetry',
    });
    return null;
  }
}

