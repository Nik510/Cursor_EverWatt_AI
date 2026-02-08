import fs from 'node:fs';
import path from 'node:path';

import type { CurationBundleV1, ProgramCurationV1, UtilityCurationV1 } from './curationTypes';

function defaultPath(): string {
  return path.resolve(process.cwd(), 'data', 'curation', 'curation.json');
}

function safeObj<T extends Record<string, any>>(x: unknown): T {
  return x && typeof x === 'object' ? (x as T) : ({} as T);
}

export function loadCurationBundleV1(args?: { env?: Record<string, string | undefined> }): {
  curation: CurationBundleV1;
  warnings: string[];
  loadedFromPath: string;
  capturedAtIso?: string | null;
  version?: number | null;
} {
  const env = args?.env || process.env;
  const p = String(env.EVERWATT_CURATION_PATH || '').trim() || defaultPath();
  const warnings: string[] = [];
  if (!fs.existsSync(p)) {
    warnings.push(`curation missing; using empty bundle (${p})`);
    return { loadedFromPath: p, warnings, curation: { utilities: {}, programs: {}, implementers: {} }, capturedAtIso: null, version: null };
  }

  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw);
    const curation: CurationBundleV1 = {
      utilities: safeObj(parsed?.utilities),
      programs: safeObj(parsed?.programs),
      implementers: safeObj(parsed?.implementers),
    };
    const capturedAtIso = typeof parsed?.capturedAtIso === 'string' ? String(parsed.capturedAtIso).trim() : null;
    const version = Number.isFinite(Number(parsed?.version)) ? Number(parsed.version) : null;
    return { loadedFromPath: p, warnings, curation, capturedAtIso, version };
  } catch (e) {
    warnings.push(`curation failed to parse; using empty bundle (${p}): ${e instanceof Error ? e.message : String(e)}`);
    return { loadedFromPath: p, warnings, curation: { utilities: {}, programs: {}, implementers: {} }, capturedAtIso: null, version: null };
  }
}

export function applyUtilityCurationV1<T extends { utilityKey: string }>(args: {
  utilities: T[];
  curation: Record<string, UtilityCurationV1>;
}): Array<T & { policyNotes?: string[] }> {
  const out: Array<T & { policyNotes?: string[] }> = [];
  for (const u of args.utilities || []) {
    const key = String(u.utilityKey || '').trim();
    const cur = args.curation?.[key] || {};
    if (cur.hidden) continue;
    const notes: string[] = [];
    if (cur.internalNotes) notes.push(`curation.internalNotes: ${String(cur.internalNotes)}`);
    out.push({ ...(u as any), ...(notes.length ? { policyNotes: notes } : {}) });
  }
  return out;
}

export function applyProgramCurationV1<T extends { programId: string; customerClassTags?: string[]; because?: string[]; evidence?: any[] }>(args: {
  programs: T[];
  curation: Record<string, ProgramCurationV1>;
  allowResidential?: boolean;
}): Array<T & { policyNotes?: string[]; curation?: ProgramCurationV1 }> {
  const allowResidential = Boolean(args.allowResidential);
  const out: Array<T & { policyNotes?: string[]; curation?: ProgramCurationV1 }> = [];

  function normalizeInternalRating(x: any): 1 | 2 | 3 | 4 | 5 | undefined {
    if (x === 1 || x === 2 || x === 3 || x === 4 || x === 5) return x;
    const s = String(x ?? '').trim().toUpperCase();
    if (s === 'A') return 5;
    if (s === 'B') return 4;
    if (s === 'C') return 3;
    return undefined;
  }

  for (const p of args.programs || []) {
    const id = String(p.programId || '').trim();
    const cur = args.curation?.[id] || {};

    const tags = Array.isArray(p.customerClassTags) ? p.customerClassTags.map((t) => String(t).toLowerCase()) : [];
    const isResidentialOnly = tags.includes('residential') && !tags.includes('nonresidential');
    const residentialAllowedByCuration = Boolean(cur.allowResidential);
    if (cur.hidden) continue;

    if (isResidentialOnly && !allowResidential && !residentialAllowedByCuration) {
      continue;
    }

    const notes: string[] = [];
    if (isResidentialOnly) {
      notes.push('Program is residential-only; included only because residential is allowed (policy override).');
    }
    if (cur.excludeReason) notes.push(`curation.excludeReason: ${String(cur.excludeReason)}`);
    if (cur.internalNotes) notes.push(`curation.internalNotes: ${String(cur.internalNotes)}`);

    out.push({
      ...(p as any),
      ...(Object.keys(cur).length ? { curation: cur } : {}),
      ...(notes.length ? { policyNotes: notes } : {}),
      ...(typeof (cur as any).participatedBefore === 'boolean' ? { participatedBefore: Boolean((cur as any).participatedBefore) } : {}),
      ...(typeof normalizeInternalRating((cur as any).internalRating) !== 'undefined' ? { internalRating: normalizeInternalRating((cur as any).internalRating) } : {}),
      ...((cur as any).worthItThresholds ? { worthItThresholds: (cur as any).worthItThresholds } : {}),
      ...(Array.isArray((cur as any).prominentCallouts) ? { prominentCallouts: (cur as any).prominentCallouts } : {}),
    });
  }
  return out;
}

