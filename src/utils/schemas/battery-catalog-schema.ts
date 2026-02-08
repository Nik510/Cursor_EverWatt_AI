/**
 * Battery catalog schema + parsing helpers
 *
 * Validates the CSV structure and row data.
 */

import { z } from 'zod';

export const BatteryCatalogRowSchema = z.object({
  id: z.string().min(1).optional(),
  modelName: z.string().min(1, 'modelName is required'),
  manufacturer: z.string().min(1, 'manufacturer is required'),
  capacityKwh: z.number().positive('capacityKwh must be > 0'),
  powerKw: z.number().positive('powerKw must be > 0'),
  cRate: z.number().nonnegative().default(0),
  efficiency: z.number().min(0).max(1),
  warrantyYears: z.number().nonnegative(),
  price1_10: z.number().nonnegative(),
  price11_20: z.number().nonnegative(),
  price21_50: z.number().nonnegative(),
  price50Plus: z.number().nonnegative(),
  active: z.boolean(),
});

export type BatteryCatalogRow = z.infer<typeof BatteryCatalogRowSchema>;

export type BatteryCatalogValidationIssue = {
  rowIndex: number;
  message: string;
};

export type BatteryCatalogValidationResult = {
  rows: BatteryCatalogRow[];
  issues: BatteryCatalogValidationIssue[];
};

function cleanNumber(value: unknown): string {
  return String(value ?? '')
    .replace(/[$,\s]/g, '')
    .replace(/\(/g, '-')
    .replace(/\)/g, '')
    .trim();
}

function parseNumber(value: unknown): number {
  const cleaned = cleanNumber(value);
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parsePercentToRatio(value: unknown): number {
  const cleaned = cleanNumber(value);
  if (!cleaned) return 0;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  // Heuristic: if it's > 1 treat as percent (e.g., 90 → 0.9)
  return n > 1 ? n / 100 : n;
}

export function validateBatteryCatalogHeaderKeys(keys: string[]): { ok: boolean; missing: string[] } {
  const have = new Set(keys.map((k) => k.toLowerCase().trim()));

  const reqGroups: Array<{ label: string; anyOf: string[] }> = [
    { label: 'model name', anyOf: ['model name', 'model_name'] },
    { label: 'manufacturer', anyOf: ['manufacturer'] },
    { label: 'capacity (kwh)', anyOf: ['capacity (kwh)', 'capacity_kwh'] },
    { label: 'power (kw)', anyOf: ['power (kw)', 'power_kw'] },
    { label: 'efficiency (%)', anyOf: ['efficiency (%)', 'efficiency'] },
    { label: 'warranty (years)', anyOf: ['warranty (years)', 'warranty'] },
    { label: 'price 1-10', anyOf: ['price 1-10', 'price1_10', 'price'] },
    { label: 'active', anyOf: ['active'] },
  ];

  const missing: string[] = [];
  for (const g of reqGroups) {
    if (!g.anyOf.some((k) => have.has(k))) missing.push(g.label);
  }

  return { ok: missing.length === 0, missing };
}

/**
 * Parse a raw CSV row (from csv-parser.ts) into a validated BatteryCatalogRow.
 *
 * Note: `csv-parser.ts` lowercases headers.
 */
export function parseBatteryCatalogRow(raw: Record<string, unknown>, rowIndex: number): { row: BatteryCatalogRow | null; issues: BatteryCatalogValidationIssue[] } {
  const issues: BatteryCatalogValidationIssue[] = [];

  const activeRaw = String(raw.active ?? '').toLowerCase();
  const active = activeRaw === 'yes' || activeRaw === 'true' || activeRaw === '1';

  const modelName = String(raw['model name'] ?? raw['model_name'] ?? '').trim();
  const manufacturer = String(raw['manufacturer'] ?? '').trim();

  const capacityKwh = parseNumber(raw['capacity (kwh)'] ?? raw['capacity_kwh']);
  const powerKw = parseNumber(raw['power (kw)'] ?? raw['power_kw']);
  const efficiency = parsePercentToRatio(raw['efficiency (%)'] ?? raw['efficiency']);
  const warrantyYears = parseNumber(raw['warranty (years)'] ?? raw['warranty']);

  const price1_10 = parseNumber(raw['price 1-10'] ?? raw['price1_10'] ?? raw['price']);
  const price11_20 = parseNumber(raw['price 11-20'] ?? raw['price11_20'] ?? price1_10);
  const price21_50 = parseNumber(raw['price 21-50'] ?? raw['price21_50'] ?? price1_10);
  const price50Plus = parseNumber(raw['price 50+'] ?? raw['price50plus'] ?? price1_10);

  const cRateFromCol = parseNumber(raw['c-rate'] ?? raw['c_rate']);
  const cRate = cRateFromCol || (capacityKwh > 0 ? powerKw / capacityKwh : 0);

  const candidate = {
    id: raw['id'] ? String(raw['id']).trim() : undefined,
    modelName,
    manufacturer,
    capacityKwh,
    powerKw,
    cRate,
    efficiency,
    warrantyYears,
    price1_10,
    price11_20,
    price21_50,
    price50Plus,
    active,
  };

  const parsed = BatteryCatalogRowSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const err of parsed.error.issues) {
      issues.push({ rowIndex, message: err.message });
    }
    return { row: null, issues };
  }

  return { row: parsed.data, issues };
}

export function validateBatteryCatalogRows(rawRows: Array<Record<string, unknown>>): BatteryCatalogValidationResult {
  const issues: BatteryCatalogValidationIssue[] = [];
  const rows: BatteryCatalogRow[] = [];

  rawRows.forEach((raw, idx) => {
    const { row, issues: rowIssues } = parseBatteryCatalogRow(raw, idx + 1);
    issues.push(...rowIssues);
    if (row && row.active) rows.push(row);
  });

  return { rows, issues };
}
