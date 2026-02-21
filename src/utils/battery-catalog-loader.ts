/**
 * Battery Catalog Loader
 * Reads battery catalog from CSV and converts to BatterySpec format
 */

import { parseCsv } from './csv-parser';
import type { CatalogBatteryRow } from './battery-catalog-types';
import { catalogToBatterySpec } from './battery-catalog-types';
import {
  validateBatteryCatalogHeaderKeys,
  validateBatteryCatalogRows,
  type BatteryCatalogValidationIssue,
} from './schemas/battery-catalog-schema';

export type { CatalogBatteryRow } from './battery-catalog-types';
export { catalogToBatterySpec } from './battery-catalog-types';

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

