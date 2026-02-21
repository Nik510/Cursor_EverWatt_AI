import { parseDelimitedText } from './data-column-detector';
import {
  validateBatteryCatalogHeaderKeys,
  validateBatteryCatalogRows,
  type BatteryCatalogValidationIssue,
} from './schemas/battery-catalog-schema';

import type { CatalogBatteryRow } from '../shared/types/batteryCatalog';

function toRowObjects(table: ReturnType<typeof parseDelimitedText>): Array<Record<string, unknown>> {
  const headers = (table.headers || []).map((h) => String(h || '').trim().toLowerCase());
  return (table.rows || []).map((row) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i];
      if (!key) continue;
      obj[key] = String(row?.[i] ?? '').replace(/\r/g, '').trim();
    }
    return obj;
  });
}

export function loadBatteryCatalogFromCsvText(csvText: string): CatalogBatteryRow[] {
  const table = parseDelimitedText(String(csvText || ''), ',');
  const rows = toRowObjects(table);

  if (rows.length === 0) {
    throw new Error('Battery catalog CSV is empty or could not be parsed');
  }

  const headerKeys = Object.keys(rows[0] || {});
  const headerCheck = validateBatteryCatalogHeaderKeys(headerKeys);
  if (!headerCheck.ok) {
    throw new Error(`Battery catalog CSV is missing required columns: ${headerCheck.missing.join(', ')}`);
  }

  const { rows: parsedRows, issues } = validateBatteryCatalogRows(rows);

  if (parsedRows.length === 0) {
    const previewIssues = issues
      .slice(0, 8)
      .map((i) => `Row ${i.rowIndex}: ${i.message}`)
      .join('; ');
    throw new Error(
      `Battery catalog contains no valid active batteries. ${issues.length > 0 ? `Issues: ${previewIssues}` : ''}`
    );
  }

  if (issues.length > 0) {
    const preview = issues.slice(0, 10);
    const msg = preview.map((i: BatteryCatalogValidationIssue) => `Row ${i.rowIndex}: ${i.message}`).join('\n');
    console.warn(`Battery catalog validation: ${issues.length} issue(s) found.\n${msg}`);
  }

  return parsedRows as CatalogBatteryRow[];
}

export async function loadBatteryCatalogFromUrl(url: string): Promise<CatalogBatteryRow[]> {
  const u = String(url || '').trim();
  if (!u) throw new Error('Battery catalog URL is missing');
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Failed to fetch battery catalog (${res.status})`);
  const text = await res.text();
  return loadBatteryCatalogFromCsvText(text);
}

