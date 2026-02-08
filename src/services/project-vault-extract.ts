import type { ParseResult } from 'papaparse';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Dynamic import for pdfjs-dist to handle ESM/CommonJS
let pdfjsLib: any;
async function getPdfJs() {
  if (!pdfjsLib) {
    try {
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    }
  }
  return pdfjsLib;
}

export type VaultDocKind =
  | 'pdf-plan-set'
  | 'pdf'
  | 'spreadsheet'
  | 'photo'
  | 'spec-sheet'
  | 'unknown';

export type VaultChunk = {
  chunkIndex: number;
  text: string;
  provenance: {
    page?: number;
    sheet?: string;
    cellRange?: string;
  };
};

export type PdfExtracted = {
  pages: number;
  /**
   * Heuristic sheet index extracted from the PDF text. V1 is best-effort only.
   */
  sheetIndex: Array<{
    sheetId?: string;
    title?: string;
    discipline?: 'M' | 'E' | 'RCP' | 'unknown';
    confidence: number; // 0..1
  }>;
};

export type SpreadsheetExtracted = {
  sheets: Array<{
    name: string;
    kind: 'data' | 'calc' | 'unknown';
    headers: string[];
    nonEmptyRowsSampled: number;
  }>;
};

export type VaultExtraction = {
  kind: VaultDocKind;
  tags: string[];
  extracted: Record<string, unknown>;
  chunks: VaultChunk[];
};

function extLower(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : '';
}

function classifyPdfFromName(name: string): VaultDocKind {
  const n = name.toLowerCase();
  if (n.includes('plan') || n.includes('plans') || n.includes('rcp') || n.includes('mech') || n.includes('elect')) {
    return 'pdf-plan-set';
  }
  return 'pdf';
}

function detectDiscipline(s: string): { discipline: 'M' | 'E' | 'RCP' | 'unknown'; confidence: number; tags: string[] } {
  const t = s.toLowerCase();
  if (/\brcp\b/.test(t) || t.includes('reflected ceiling')) return { discipline: 'RCP', confidence: 0.75, tags: ['RCP'] };
  if (t.includes('electrical') || /\be[0-9]/.test(t) || /\be-\d/.test(t) || /\be\./.test(t)) return { discipline: 'E', confidence: 0.6, tags: ['Electrical'] };
  if (t.includes('mechanical') || /\bm[0-9]/.test(t) || /\bm-\d/.test(t) || /\bm\./.test(t)) return { discipline: 'M', confidence: 0.6, tags: ['Mechanical'] };
  return { discipline: 'unknown', confidence: 0.3, tags: [] };
}

function chunkText(text: string, maxLen = 1200): string[] {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const out: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    out.push(cleaned.slice(i, i + maxLen));
    i += maxLen;
  }
  return out;
}

export function detectVaultDocKind(filename: string, contentType: string): VaultDocKind {
  const ext = extLower(filename);
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('pdf') || ext === 'pdf') return classifyPdfFromName(filename);
  if (ct.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'photo';
  if (ct.includes('spreadsheet') || ['xlsx', 'xls'].includes(ext)) return 'spreadsheet';
  if (ext === 'csv' || ct.includes('csv')) return 'spreadsheet';
  if (ct.includes('octet-stream') && ['xlsx', 'xls', 'csv', 'pdf'].includes(ext)) return ext === 'pdf' ? classifyPdfFromName(filename) : 'spreadsheet';
  return 'unknown';
}

export async function extractVaultDoc(args: {
  filename: string;
  contentType: string;
  buf: Buffer;
}): Promise<VaultExtraction> {
  const kind = detectVaultDocKind(args.filename, args.contentType);
  const tags: string[] = [];
  const chunks: VaultChunk[] = [];

  if (kind === 'pdf' || kind === 'pdf-plan-set') {
    const pdf = await extractPdf(args.buf);
    tags.push('PDF');
    if (kind === 'pdf-plan-set') tags.push('Plan Set');
    // Add discipline tags based on sheet index if present
    const discTags = new Set<string>();
    for (const s of pdf.sheetIndex) {
      if (s.discipline === 'M') discTags.add('Mechanical');
      if (s.discipline === 'E') discTags.add('Electrical');
      if (s.discipline === 'RCP') discTags.add('RCP');
    }
    tags.push(...[...discTags]);

    const extracted: PdfExtracted = pdf;
    pdf.pageChunks.forEach((pc, idx) => {
      const parts = chunkText(pc.text, 1200);
      parts.forEach((p, j) => {
        chunks.push({
          chunkIndex: chunks.length,
          text: p,
          provenance: { page: pc.page, sheet: pc.sheet || undefined },
        });
      });
    });

    return { kind, tags, extracted: extracted as any, chunks };
  }

  if (kind === 'spreadsheet') {
    const ext = extLower(args.filename);
    if (ext === 'csv') {
      const csv = args.buf.toString('utf-8');
      const parsed: ParseResult<Record<string, unknown>> = Papa.parse(csv, { header: true, skipEmptyLines: true });
      const headers = Object.keys((parsed.data && parsed.data[0]) || {});
      const extracted: SpreadsheetExtracted = {
        sheets: [
          {
            name: 'CSV',
            kind: 'data',
            headers,
            nonEmptyRowsSampled: Math.min(50, Array.isArray(parsed.data) ? parsed.data.length : 0),
          },
        ],
      };

      tags.push('Spreadsheet', 'CSV');

      // chunk: include headers + first ~25 rows values (best-effort)
      const rows = Array.isArray(parsed.data) ? parsed.data.slice(0, 25) : [];
      const lines: string[] = [];
      if (headers.length) lines.push(`HEADERS: ${headers.join(' | ')}`);
      for (const r of rows) {
        const vals = headers.map((h) => String((r as any)?.[h] ?? '')).join(' | ');
        if (vals.trim()) lines.push(vals);
      }
      chunkText(lines.join('\n'), 1200).forEach((t) => {
        chunks.push({ chunkIndex: chunks.length, text: t, provenance: { sheet: 'CSV' } });
      });

      return { kind, tags, extracted: extracted as any, chunks };
    }

    const wb = XLSX.read(args.buf, { type: 'buffer' });
    const sheetNames = wb.SheetNames || [];
    const extractedSheets: SpreadsheetExtracted['sheets'] = [];

    tags.push('Spreadsheet', ext.toUpperCase() || 'XLSX');

    for (const name of sheetNames.slice(0, 30)) {
      const ws = wb.Sheets[name];
      if (!ws) continue;
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[][];
      const sample = rows.slice(0, 40);
      const headerRow = pickHeaderRow(sample);
      const headers = headerRow ? headerRow.map((c) => String(c || '').trim()).filter(Boolean).slice(0, 64) : [];
      const kindGuess = inferSheetKind(name, headers);
      const nonEmpty = sample.filter((r) => Array.isArray(r) && r.some((c) => String(c || '').trim())).length;

      extractedSheets.push({
        name,
        kind: kindGuess,
        headers,
        nonEmptyRowsSampled: nonEmpty,
      });

      // Chunk a compact TSV-like view for retrieval
      const lines: string[] = [];
      lines.push(`SHEET: ${name}`);
      if (headers.length) lines.push(`HEADERS: ${headers.join(' | ')}`);
      for (const r of sample.slice(headerRow ? sample.indexOf(headerRow as any) + 1 : 0, 25)) {
        if (!Array.isArray(r)) continue;
        const vals = r.slice(0, Math.min(24, r.length)).map((c) => String(c ?? '').trim());
        if (vals.join('').trim()) lines.push(vals.join(' | '));
      }
      chunkText(lines.join('\n'), 1200).forEach((t) => {
        chunks.push({ chunkIndex: chunks.length, text: t, provenance: { sheet: name } });
      });
    }

    const extracted: SpreadsheetExtracted = { sheets: extractedSheets };
    return { kind, tags, extracted: extracted as any, chunks };
  }

  if (kind === 'photo') {
    tags.push('Image');
    return { kind, tags, extracted: { note: 'No OCR in V1 (photo stored; user-assisted interpretation).' }, chunks: [] };
  }

  // unknown/spec-sheet: store as-is; if it's PDF it will have been captured above
  return { kind, tags, extracted: { note: 'No extractor for this file type in V1.' }, chunks: [] };
}

function inferSheetKind(name: string, headers: string[]): 'data' | 'calc' | 'unknown' {
  const n = (name || '').toLowerCase();
  const h = headers.map((x) => x.toLowerCase()).join(' ');
  if (n.includes('summary') || n.includes('calc') || n.includes('calculation') || n.includes('results')) return 'calc';
  if (h.includes('total') || h.includes('savings') || h.includes('payback') || h.includes('cost')) return 'calc';
  if (headers.length >= 3) return 'data';
  return 'unknown';
}

function pickHeaderRow(sample: any[][]): any[] | null {
  let best: { idx: number; score: number } | null = null;
  for (let i = 0; i < Math.min(sample.length, 20); i++) {
    const row = sample[i];
    if (!Array.isArray(row)) continue;
    const nonEmpty = row.map((c) => String(c || '').trim()).filter(Boolean);
    const score = nonEmpty.length;
    if (!best || score > best.score) best = { idx: i, score };
  }
  if (!best || best.score < 2) return null;
  return sample[best.idx] || null;
}

async function extractPdf(buf: Buffer): Promise<PdfExtracted & { pageChunks: Array<{ page: number; text: string; sheet?: string }> }> {
  const pdfjs = await getPdfJs();
  const uint8Array = new Uint8Array(buf);
  const loadingTask = pdfjs.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  const pageChunks: Array<{ page: number; text: string; sheet?: string }> = [];
  const sheetIndex: PdfExtracted['sheetIndex'] = [];

  // Best-effort: try to infer sheet identifiers/titles from early pages
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = (textContent.items || []).map((item: any) => item.str).join(' ');
    pageChunks.push({ page: pageNum, text: pageText });

    if (pageNum <= 10) {
      const candidates = guessSheetFromPageText(pageText);
      for (const c of candidates) sheetIndex.push(c);
    }
  }

  // de-dupe sheetIndex by sheetId/title
  const seen = new Set<string>();
  const deduped: PdfExtracted['sheetIndex'] = [];
  for (const s of sheetIndex) {
    const key = `${s.sheetId || ''}::${s.title || ''}`.toLowerCase();
    if (!key.trim()) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(s);
  }

  return { pages: pdf.numPages, sheetIndex: deduped.slice(0, 200), pageChunks };
}

function guessSheetFromPageText(text: string): PdfExtracted['sheetIndex'] {
  const t = String(text || '').replace(/\s+/g, ' ');
  const out: PdfExtracted['sheetIndex'] = [];

  // Common sheet ID patterns: E1.1 / M2.0 / RCP1 / E-101, etc.
  const idMatches = t.match(/\b([A-Z]{1,3}[- ]?\d{1,3}(\.\d{1,2})?)\b/g) || [];
  // Title-ish lines (very heuristic)
  const titleMatches = t.match(/\b(REFLECTED CEILING PLAN|ELECTRICAL PLAN|MECHANICAL PLAN|LIGHTING PLAN|POWER PLAN|PANEL SCHEDULE)\b/gi) || [];

  const ids = [...new Set(idMatches)].slice(0, 6);
  const titles = [...new Set(titleMatches)].slice(0, 3);

  for (const id of ids) {
    const det = detectDiscipline(`${id} ${titles.join(' ')}`);
    out.push({
      sheetId: id,
      title: titles[0],
      discipline: det.discipline,
      confidence: Math.min(0.9, det.confidence + 0.2),
    });
  }

  if (out.length === 0 && titles.length > 0) {
    const det = detectDiscipline(titles[0]);
    out.push({
      sheetId: undefined,
      title: titles[0],
      discipline: det.discipline,
      confidence: det.confidence,
    });
  }

  return out;
}

