/**
 * Battery Catalog Loader
 * Reads battery catalog from CSV and converts to BatterySpec format
 */

import { parseCsv } from './csv-parser';
import type { BatterySpec } from '../modules/battery/types';
import {
  validateBatteryCatalogHeaderKeys,
  validateBatteryCatalogRows,
  type BatteryCatalogValidationIssue,
} from './schemas/battery-catalog-schema';

export interface CatalogBatteryRow {
  id?: string;
  modelName: string;
  manufacturer: string;
  capacityKwh: number;
  powerKw: number;
  cRate: number;
  efficiency: number;
  warrantyYears: number;
  price1_10: number;
  price11_20: number;
  price21_50: number;
  price50Plus: number;
  active: boolean;
}

/**
 * Load battery catalog from CSV file
 */
export function loadBatteryCatalog(catalogPath: string): CatalogBatteryRow[] {
  const rows = parseCsv(catalogPath) as Array<Record<string, unknown>>;
  
  if (rows.length === 0) {
    throw new Error('Battery catalog file is empty or could not be parsed');
  }

  // Validate header structure
  const headerKeys = Object.keys(rows[0] || {});
  const headerCheck = validateBatteryCatalogHeaderKeys(headerKeys);
  if (!headerCheck.ok) {
    throw new Error(
      `Battery catalog CSV is missing required columns: ${headerCheck.missing.join(', ')}`
    );
  }

  // Validate + parse rows
  const { rows: parsedRows, issues } = validateBatteryCatalogRows(rows);

  if (parsedRows.length === 0) {
    const previewIssues = issues.slice(0, 8).map((i) => `Row ${i.rowIndex}: ${i.message}`).join('; ');
    throw new Error(
      `Battery catalog contains no valid active batteries. ${issues.length > 0 ? `Issues: ${previewIssues}` : ''}`
    );
  }

  // Surface warnings for visibility (don’t fail the entire load if some rows are bad)
  if (issues.length > 0) {
    const preview = issues.slice(0, 10);
    const msg = preview.map((i: BatteryCatalogValidationIssue) => `Row ${i.rowIndex}: ${i.message}`).join('\n');
    console.warn(`Battery catalog validation: ${issues.length} issue(s) found.\n${msg}`);
  }

  return parsedRows as CatalogBatteryRow[];
}

/**
 * Convert catalog battery to BatterySpec format
 */
export function catalogToBatterySpec(catalogBattery: CatalogBatteryRow, quantity: number = 1): BatterySpec {
  // Determine price based on quantity
  let systemPrice: number;
  // Tier buckets must match pricing columns: 1-10, 11-20, 21-50, 50+ (where 50+ means >50)
  if (quantity > 50) {
    systemPrice = catalogBattery.price50Plus;
  } else if (quantity > 20) {
    systemPrice = catalogBattery.price21_50;
  } else if (quantity > 10) {
    systemPrice = catalogBattery.price11_20;
  } else {
    systemPrice = catalogBattery.price1_10;
  }
  
  // Estimate degradation rate (conservative 2% per year)
  const degradationRate = 0.02;
  
  return {
    capacity_kwh: catalogBattery.capacityKwh,
    max_power_kw: catalogBattery.powerKw,
    round_trip_efficiency: catalogBattery.efficiency,
    degradation_rate: degradationRate,
    min_soc: 0.10,
    max_soc: 0.90,
    depth_of_discharge: 0.90,
  };
}

/**
 * Parse number from string (handles currency, commas, etc.)
 */
function parsePriceNumber(value: string): number {
  if (typeof value === 'number') return value;
  
  const cleaned = String(value)
    .replace(/[$,\s]/g, '')
    .replace(/\(/g, '-')
    .replace(/\)/g, '')
    .trim();
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

