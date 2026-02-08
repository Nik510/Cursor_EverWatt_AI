import tariffTablesJson from './data/pge-tariff-tables.json';

export interface TariffTableSheet {
  columns: string[];
  rows: Record<string, string | number | null>[];
}

export interface TariffWorkbook {
  [sheetName: string]: TariffTableSheet;
}

export interface TariffTablesPayload {
  source_root: string;
  files: Record<string, TariffWorkbook>;
}

const tariffTables = tariffTablesJson as TariffTablesPayload;

export interface TariffTableMatch {
  file: string;
  sheet: string;
  preview: Record<string, string | number | null>[];
  columns: string[];
}

/**
 * Return the full parsed tariff table payload.
 */
export function getTariffTables(): TariffTablesPayload {
  return tariffTables;
}

/**
 * Find tables that mention a given rate code anywhere in their rows.
 * This is a lightweight substring match to surface relevant source sheets.
 */
export function findTablesByRateCode(rateCode: string, previewRows = 8): TariffTableMatch[] {
  const code = rateCode.toLowerCase();
  const matches: TariffTableMatch[] = [];

  Object.entries(tariffTables.files).forEach(([file, workbook]) => {
    Object.entries(workbook).forEach(([sheet, table]) => {
      const hasMatch = table.rows.some((row) =>
        Object.values(row).some((val) => typeof val === 'string' && val.toLowerCase().includes(code))
      );
      if (hasMatch) {
        matches.push({
          file,
          sheet,
          columns: table.columns,
          preview: table.rows.slice(0, previewRows),
        });
      }
    });
  });

  return matches;
}
