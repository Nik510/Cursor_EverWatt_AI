import * as XLSX from 'xlsx';

export type WorkbookIndexTable = {
  tableId: string;
  sheet: string;
  headerRow: number; // 1-based
  startCol: number; // 1-based
  endCol: number; // 1-based
  rowStart: number; // 1-based (first data row)
  rowEnd: number; // 1-based (last data row)
  columns: Array<{
    key: string; // normalized
    header: string; // displayed
    col: number; // 1-based
    colLetter: string;
    /** Snapshot lineage: whether any sampled cells have formulas. */
    hasFormula?: boolean;
    /** Example formula (first found in sampled rows). */
    sampleFormula?: string | null;
    /** Count of sampled cells with formulas. */
    formulaCellsSampled?: number;
  }>;
  sampleRows: string[]; // compact row previews for UI
};

export type WorkbookIndex = {
  apiVersion: 'workbook-index/v1';
  createdAt: string;
  fileId: string;
  sheets: Array<{
    name: string;
    tables: WorkbookIndexTable[];
  }>;
};

function normHeader(h: string): string {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function isLikelyHeaderRow(cells: string[]): boolean {
  const nonEmpty = cells.filter((c) => c.trim().length > 0);
  if (nonEmpty.length < 3) return false;
  const stringish = nonEmpty.filter((c) => /[a-zA-Z]/.test(c));
  if (stringish.length / nonEmpty.length < 0.7) return false;
  const normed = nonEmpty.map(normHeader).filter(Boolean);
  const uniq = new Set(normed);
  return uniq.size >= Math.min(3, normed.length);
}

function colLetter(col1: number): string {
  // 1-based -> A, B, ... AA
  let n = col1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function cellDisplay(ws: XLSX.WorkSheet, r1: number, c1: number): string {
  const addr = XLSX.utils.encode_cell({ r: r1 - 1, c: c1 - 1 });
  const cell = (ws as any)?.[addr] as XLSX.CellObject | undefined;
  const w = (cell as any)?.w;
  const v = (cell as any)?.v;
  const out = String(w ?? v ?? '').trim();
  return out;
}

function cellFormula(ws: XLSX.WorkSheet, r1: number, c1: number): string | null {
  const addr = XLSX.utils.encode_cell({ r: r1 - 1, c: c1 - 1 });
  const cell = (ws as any)?.[addr] as XLSX.CellObject | undefined;
  const f = (cell as any)?.f;
  return typeof f === 'string' && f.trim() ? String(f).trim() : null;
}

function rowSliceDisplay(ws: XLSX.WorkSheet, r1: number, cStart1: number, cEnd1: number): string[] {
  const out: string[] = [];
  for (let c = cStart1; c <= cEnd1; c++) out.push(cellDisplay(ws, r1, c));
  return out;
}

function detectTablesOnSheet(ws: XLSX.WorkSheet, sheetName: string, maxScanRows = 200, maxScanCols = 60): WorkbookIndexTable[] {
  const ref = (ws as any)['!ref'] as string | undefined;
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const maxRow = Math.min(range.e.r + 1, maxScanRows);
  const maxCol = Math.min(range.e.c + 1, maxScanCols);

  const tables: WorkbookIndexTable[] = [];
  const usedHeaderRows = new Set<number>();

  for (let r = 1; r <= maxRow; r++) {
    if (usedHeaderRows.has(r)) continue;
    const cells = rowSliceDisplay(ws, r, 1, maxCol);
    if (!isLikelyHeaderRow(cells)) continue;

    // Determine contiguous header columns (first..last non-empty)
    let cStart = 1;
    while (cStart <= maxCol && !cells[cStart - 1].trim()) cStart++;
    let cEnd = maxCol;
    while (cEnd >= cStart && !cells[cEnd - 1].trim()) cEnd--;
    if (cEnd - cStart + 1 < 3) continue;

    const header = rowSliceDisplay(ws, r, cStart, cEnd);
    const cols = header
      .map((h, idx) => ({
        header: String(h || '').trim(),
        key: normHeader(String(h || '')) || `col_${idx + 1}`,
        col: cStart + idx,
        colLetter: colLetter(cStart + idx),
      }))
      .filter((c) => c.header.length > 0);

    if (cols.length < 3) continue;

    // Determine data row extent: scan down until we hit a “mostly empty” run
    const firstDataRow = r + 1;
    let lastDataRow = firstDataRow;
    let emptyRun = 0;
    for (let rr = firstDataRow; rr <= Math.min(range.e.r + 1, maxRow + 400); rr++) {
      const rowVals = rowSliceDisplay(ws, rr, cStart, cEnd);
      const nonEmpty = rowVals.filter((x) => String(x || '').trim()).length;
      if (nonEmpty === 0) {
        emptyRun++;
        if (emptyRun >= 3) break;
        continue;
      }
      emptyRun = 0;
      lastDataRow = rr;
    }

    const tableId = `${sheetName}!R${r}C${cStart}:R${lastDataRow}C${cEnd}`;
    const sampleRows: string[] = [];
    for (let rr = firstDataRow; rr <= Math.min(lastDataRow, firstDataRow + 8); rr++) {
      const rowVals = rowSliceDisplay(ws, rr, cStart, cEnd)
        .map((x) => String(x || '').trim())
        .filter(Boolean)
        .slice(0, 8);
      if (rowVals.length) sampleRows.push(rowVals.join(' | '));
    }

    // Snapshot formula lineage (no recomputation): scan a small sample of rows per column.
    const sampleRowEnd = Math.min(lastDataRow, firstDataRow + 60);
    const colsWithFormula = cols.map((c) => {
      let formulaCellsSampled = 0;
      let sampleFormula: string | null = null;
      for (let rr = firstDataRow; rr <= sampleRowEnd; rr++) {
        const f = cellFormula(ws, rr, c.col);
        if (f) {
          formulaCellsSampled += 1;
          if (!sampleFormula) sampleFormula = f;
        }
      }
      return {
        ...c,
        hasFormula: formulaCellsSampled > 0,
        sampleFormula,
        formulaCellsSampled,
      };
    });

    tables.push({
      tableId,
      sheet: sheetName,
      headerRow: r,
      startCol: cStart,
      endCol: cEnd,
      rowStart: firstDataRow,
      rowEnd: lastDataRow,
      columns: colsWithFormula,
      sampleRows,
    });

    usedHeaderRows.add(r);
  }

  return tables.slice(0, 50);
}

export function buildWorkbookIndex(args: { fileId: string; buf: Buffer }): WorkbookIndex {
  const wb = XLSX.read(args.buf, { type: 'buffer', cellText: true, cellDates: true });
  const sheets = (wb.SheetNames || []).slice(0, 50).map((name) => {
    const ws = wb.Sheets[name];
    const tables = ws ? detectTablesOnSheet(ws, name) : [];
    return { name, tables };
  });

  return {
    apiVersion: 'workbook-index/v1',
    createdAt: new Date().toISOString(),
    fileId: args.fileId,
    sheets,
  };
}

