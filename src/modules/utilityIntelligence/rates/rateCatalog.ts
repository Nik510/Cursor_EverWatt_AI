import type { RateCatalogEntry } from './types';

/**
 * Minimal, seed catalog for v1 (PG&E only).
 * This is not intended to be complete; it exists to provide deterministic candidate generation.
 */
export const RATE_CATALOG_V1: RateCatalogEntry[] = [
  {
    utilityTerritory: 'PGE',
    utility: 'PG&E',
    rateCode: 'B-19',
    serviceClassTags: ['C&I', 'secondary', 'demand'],
    requiresDemand: true,
    touSensitive: true,
    notes: ['Common large commercial TOU schedule with demand charges (placeholder tags for v1).'],
  },
  {
    utilityTerritory: 'PGE',
    utility: 'PG&E',
    rateCode: 'B-20',
    serviceClassTags: ['C&I', 'secondary', 'demand'],
    requiresDemand: true,
    touSensitive: true,
    notes: ['Large commercial TOU schedule (placeholder tags for v1).'],
  },
  {
    utilityTerritory: 'PGE',
    utility: 'PG&E',
    rateCode: 'E-19',
    serviceClassTags: ['C&I', 'secondary', 'demand'],
    requiresDemand: true,
    touSensitive: true,
    notes: ['Legacy/older large commercial schedule; included for completeness in v1.'],
  },
  {
    utilityTerritory: 'PGE',
    utility: 'PG&E',
    rateCode: 'A-10',
    serviceClassTags: ['C&I', 'secondary', 'demand'],
    requiresDemand: true,
    touSensitive: false,
    notes: ['Small/medium commercial demand schedule (placeholder).'],
  },
  {
    utilityTerritory: 'PGE',
    utility: 'PG&E',
    rateCode: 'B-19S',
    serviceClassTags: ['C&I', 'secondary', 'demand', 'option_s'],
    requiresDemand: true,
    touSensitive: true,
    optionSTag: true,
    notes: ['Option S variant (daily demand determinants). Use only when storage/rider evaluation is relevant.'],
  },
  {
    utilityTerritory: 'PGE',
    utility: 'PG&E',
    rateCode: 'E-19S',
    serviceClassTags: ['C&I', 'secondary', 'demand', 'option_s'],
    requiresDemand: true,
    touSensitive: true,
    optionSTag: true,
    notes: ['Option S variant (daily demand determinants). Use only when storage/rider evaluation is relevant.'],
  },
];

export function listRatesForTerritory(utilityTerritory: string | undefined | null): RateCatalogEntry[] {
  const t = String(utilityTerritory || '').trim().toUpperCase();
  if (!t) return [];
  return RATE_CATALOG_V1.filter((r) => String(r.utilityTerritory).toUpperCase() === t);
}

