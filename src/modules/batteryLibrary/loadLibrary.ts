import { readFile } from 'fs/promises';
import path from 'path';
import type { BatteryChemistry, BatteryLibraryItemV1, BatteryLibraryV1, BatteryUseCaseTag } from './types';

function asNumber(x: unknown): number {
  const n = typeof x === 'number' ? x : Number(x);
  return Number.isFinite(n) ? n : NaN;
}

function normText(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 _/-]+/g, '')
    .trim();
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function parseChemistry(x: unknown): BatteryChemistry {
  const v = normText(x);
  if (v === 'lfp') return 'LFP';
  if (v === 'nmc') return 'NMC';
  if (v === 'lmo') return 'LMO';
  return 'OTHER';
}

function parseUseCaseTags(x: unknown): BatteryUseCaseTag[] {
  const arr = Array.isArray(x) ? x : [];
  const out: BatteryUseCaseTag[] = [];
  const seen = new Set<string>();
  for (const t of arr) {
    const k = normText(t);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    const tag: BatteryUseCaseTag =
      k === 'peak_shaving' || k === 'peak shaving'
        ? 'peak_shaving'
        : k === 'arbitrage'
          ? 'arbitrage'
          : k === 'demand_response' || k === 'demand response' || k === 'dr'
            ? 'demand_response'
            : k === 'backup'
              ? 'backup'
              : k === 'resiliency' || k === 'resilience'
                ? 'resiliency'
                : k === 'solar_self_consumption' || k === 'solar self consumption'
                  ? 'solar_self_consumption'
                  : 'other';
    out.push(tag);
  }
  return out;
}

function validateItem(raw: any, idx: number): { ok: true; item: BatteryLibraryItemV1 } | { ok: false; error: string } {
  const sku = String(raw?.sku ?? '').trim();
  const vendor = String(raw?.vendor ?? '').trim();
  const kw = asNumber(raw?.kw);
  const kwh = asNumber(raw?.kwh);
  const rte = clamp01(asNumber(raw?.roundTripEfficiency));
  const maxC = asNumber(raw?.maxC);
  const minSoc = clamp01(asNumber(raw?.minSoc));
  const maxSoc = clamp01(asNumber(raw?.maxSoc));

  if (!sku) return { ok: false, error: `items[${idx}].sku missing` };
  if (!vendor) return { ok: false, error: `items[${idx}].vendor missing` };
  if (!Number.isFinite(kw) || kw <= 0) return { ok: false, error: `items[${idx}].kw invalid` };
  if (!Number.isFinite(kwh) || kwh <= 0) return { ok: false, error: `items[${idx}].kwh invalid` };
  if (!Number.isFinite(maxC) || maxC <= 0) return { ok: false, error: `items[${idx}].maxC invalid` };
  if (minSoc >= maxSoc) return { ok: false, error: `items[${idx}].minSoc/maxSoc invalid` };

  const chemistry = parseChemistry(raw?.chemistry);
  const useCaseTags = parseUseCaseTags(raw?.useCaseTags);

  const constraints = raw?.constraints && typeof raw.constraints === 'object' ? raw.constraints : undefined;
  const footprint = raw?.footprint && typeof raw.footprint === 'object' ? raw.footprint : undefined;
  const interconnectionNotes = raw?.interconnectionNotes ? String(raw.interconnectionNotes) : undefined;

  const item: BatteryLibraryItemV1 = {
    sku,
    vendor,
    kw,
    kwh,
    roundTripEfficiency: rte > 0 ? rte : 0.9,
    maxC,
    minSoc,
    maxSoc,
    chemistry,
    useCaseTags,
    ...(constraints ? { constraints } : {}),
    ...(footprint ? { footprint } : {}),
    ...(interconnectionNotes ? { interconnectionNotes } : {}),
  };
  return { ok: true, item };
}

/**
 * Load battery library from a JSON file.
 *
 * Accepts either:
 * - `BatteryLibraryV1` shape: { version:"v1", items:[...] }
 * - or a raw array of items: [...]
 */
export async function loadBatteryLibraryV1(filePath: string): Promise<{ library: BatteryLibraryV1; warnings: string[] }> {
  const fp = path.resolve(filePath);
  const raw = JSON.parse(await readFile(fp, 'utf-8')) as any;

  const itemsRaw = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  const warnings: string[] = [];
  const items: BatteryLibraryItemV1[] = [];

  for (let i = 0; i < itemsRaw.length; i++) {
    const r = itemsRaw[i];
    const v = validateItem(r, i);
    if (!v.ok) {
      warnings.push(v.error);
      continue;
    }
    items.push(v.item);
  }

  if (items.length === 0) {
    const preview = warnings.slice(0, 8).join('; ');
    throw new Error(`Battery library contains no valid items. ${warnings.length ? `Issues: ${preview}` : ''}`);
  }

  return {
    library: {
      version: 'v1',
      items,
      source: { kind: 'other', sourceKey: filePath },
    },
    warnings,
  };
}

