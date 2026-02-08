import fs from 'node:fs';
import path from 'node:path';

import type { TariffCurationV1 } from './curationTypes';
import type { TariffRateMetadata } from '../../tariffLibrary/types';

function defaultPath(): string {
  return path.resolve(process.cwd(), 'data', 'curation', 'tariffs', 'ca', 'ca-tariffs-curation.json');
}

function clean(s: unknown): string {
  return String(s ?? '').trim();
}

function normRateCode(raw: string): string {
  const s = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  const m = /^([A-Z]{1,3})-?(\d{1,3})([A-Z]?)$/.exec(s);
  if (m) return `${m[1]}-${m[2]}${m[3] || ''}`;
  return s;
}

export function loadTariffCurationV1(args?: { env?: Record<string, string | undefined> }): {
  items: TariffCurationV1[];
  warnings: string[];
  loadedFromPath: string;
  capturedAtIso?: string | null;
  version?: number | null;
} {
  const env = args?.env || process.env;
  const p = clean(env.EVERWATT_TARIFF_CURATION_PATH) || defaultPath();
  const warnings: string[] = [];
  if (!fs.existsSync(p)) {
    warnings.push(`tariff curation missing; using empty list (${p})`);
    return { loadedFromPath: p, warnings, items: [], capturedAtIso: null, version: null };
  }
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items) ? (parsed.items as TariffCurationV1[]) : [];
    const capturedAtIso = typeof parsed?.capturedAtIso === 'string' ? clean(parsed.capturedAtIso) : null;
    const version = Number.isFinite(Number(parsed?.version)) ? Number(parsed.version) : null;
    return { loadedFromPath: p, warnings, items, capturedAtIso, version };
  } catch (e) {
    warnings.push(`tariff curation failed to parse; using empty list (${p}): ${e instanceof Error ? e.message : String(e)}`);
    return { loadedFromPath: p, warnings, items: [], capturedAtIso: null, version: null };
  }
}

function matchPattern(pattern: string, rateCode: string): boolean {
  const p = clean(pattern).toUpperCase();
  const rc = normRateCode(rateCode);
  if (!p) return false;
  if (p.endsWith('*')) {
    const prefix = p.slice(0, -1);
    return rc.startsWith(prefix);
  }
  return rc === normRateCode(p);
}

export function applyTariffCurationV1(args: { rates: TariffRateMetadata[]; items: TariffCurationV1[] }): TariffRateMetadata[] {
  const items = Array.isArray(args.items) ? args.items : [];
  const byUtility = new Map<string, TariffCurationV1[]>();
  for (const it of items) {
    const uk = clean((it as any)?.utilityKey).toUpperCase();
    if (!uk) continue;
    const arr = byUtility.get(uk) || [];
    arr.push(it);
    byUtility.set(uk, arr);
  }

  const out: TariffRateMetadata[] = [];
  for (const r of args.rates || []) {
    const uk = clean((r as any).utility).toUpperCase();
    const arr = byUtility.get(uk) || [];
    const rc = normRateCode(r.rateCode);

    // exact match first
    let best: TariffCurationV1 | null = arr.find((x) => clean(x.rateCode).toUpperCase() === rc) || null;
    if (!best) {
      const patterns = arr
        .filter((x) => clean(x.rateCode).endsWith('*'))
        .slice()
        .sort((a, b) => clean(b.rateCode).length - clean(a.rateCode).length);
      best = patterns.find((x) => matchPattern(x.rateCode, rc)) || null;
    }

    if (!best) {
      out.push({ ...(r as any), popularityTier: (r as any).popularityTier || 'all', popularitySource: (r as any).popularitySource || 'unknown' });
      continue;
    }

    out.push({
      ...(r as any),
      popularityTier: (best.tier as any) || (r as any).popularityTier || 'all',
      popularitySource: 'OPERATOR_CURATED',
      curationHidden: typeof best.hidden === 'boolean' ? Boolean(best.hidden) : Boolean((r as any).curationHidden),
      curationNotes: clean(best.notes) || (r as any).curationNotes,
      curationTags: Array.isArray(best.tags) ? best.tags : (r as any).curationTags,
      preferredForEverWatt: typeof best.preferredForEverWatt === 'boolean' ? Boolean(best.preferredForEverWatt) : (r as any).preferredForEverWatt,
    });
  }
  return out;
}

