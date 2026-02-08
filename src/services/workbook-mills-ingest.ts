import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';
import type { EvidenceRef, ProjectGraph } from '../types/project-graph';

export type WorkbookSheetArtifact = {
  sheet: string;
  detectedTables: Array<{
    tableId: string;
    headerRow: number;
    rowStart: number;
    rowEnd: number;
    colStart: number;
    colEnd: number;
    headers: string[];
  }>;
};

export type MillsAuditRow = {
  id: string;
  sourceSheet: string;
  rowNumber: number; // 1-based
  data: Record<string, string | number | null>;
  /** Snapshot lineage: extracted display values + formulas (no recomputation). */
  cells?: Record<
    string,
    {
      displayValue: string;
      formula: string | null;
    }
  >;
  evidenceRef: EvidenceRef;
  confidence: number; // 0..1
  needsConfirmation: boolean;
};

export type MillsFixtureType = {
  id: string;
  fixtureTypeKey: string;
  qty: number;
  normalized: {
    area: string | null;
    formFactor: string | null;
    lampCount: number | null;
    lampWatts: number | null;
    mounting: string | null;
    environment: string | null;
    existingDesc: string | null;
    proposedDesc: string | null;
  };
  evidenceRefs: EvidenceRef[];
  sourceRowIds: string[];
  confidence: number; // 0..1
  needsConfirmation: boolean;
};

export type MillsMeasure = {
  id: string;
  name: string;
  category: string;
  existingFixtureTypeId: string;
  proposedSummary: string | null;
  pricing: {
    unitCost: number | null;
    unitPrice: number | null;
    extendedPrice: number | null;
  };
  evidenceRefs: EvidenceRef[];
  confidence: number;
  needsConfirmation: boolean;
};

export type MillsBomItem = {
  id: string;
  sku: string | null;
  description: string | null;
  qty: number | null;
  uom: string | null;
  unitCost: number | null;
  linkedMeasureId: string | null;
  evidenceRef: EvidenceRef;
  confidence: number;
  needsConfirmation: boolean;
};

export type MillsWorkbookIngestOutput = {
  apiVersion: 'workbook-ingest/v1';
  fileId: string;
  extractedAt: string;
  vaultSheets: WorkbookSheetArtifact[];
  auditRows: MillsAuditRow[];
  lightingFixtureTypes: MillsFixtureType[];
  measures: MillsMeasure[];
  bomItems: MillsBomItem[];
  inbox: Array<{
    id: string;
    kind: 'missingSheet' | 'missingColumn' | 'unmappedValue' | 'unlinkedBom';
    message: string;
    evidenceRef: EvidenceRef;
    confidence: number;
    needsConfirmation: boolean;
  }>;
};

function normKey(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normText(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 /x-]+/g, '')
    .trim();
}

function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v ?? '').replace(/[$,]/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function colLetter(col1: number): string {
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
  return String(w ?? v ?? '').trim();
}

function cellFormula(ws: XLSX.WorkSheet, r1: number, c1: number): string | null {
  const addr = XLSX.utils.encode_cell({ r: r1 - 1, c: c1 - 1 });
  const cell = (ws as any)?.[addr] as XLSX.CellObject | undefined;
  const f = (cell as any)?.f;
  return typeof f === 'string' && f.trim() ? String(f).trim() : null;
}

function captureCell(ws: XLSX.WorkSheet, r1: number, c1: number): { displayValue: string; formula: string | null } {
  return { displayValue: cellDisplay(ws, r1, c1), formula: cellFormula(ws, r1, c1) };
}

function buildEvidence(args: {
  fileId: string;
  sheet: string;
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
  snippet: string;
  extractedAt: string;
}): EvidenceRef {
  const cellRange = `${args.sheet}!${colLetter(args.colStart)}${args.rowStart}:${colLetter(args.colEnd)}${args.rowEnd}`;
  return {
    fileId: args.fileId,
    sheet: args.sheet,
    cellRange,
    rowStart: args.rowStart,
    rowEnd: args.rowEnd,
    colStart: args.colStart,
    colEnd: args.colEnd,
    snippet: args.snippet.slice(0, 3000),
    snippetText: args.snippet.slice(0, 3000),
    extractedAt: args.extractedAt,
  };
}

function findSheetName(wb: XLSX.WorkBook, target: string): string | null {
  const t = String(target || '').trim().toLowerCase();
  const exact = (wb.SheetNames || []).find((s) => String(s || '').trim().toLowerCase() === t);
  if (exact) return exact;
  // common: extra whitespace or dashes
  const loose = (wb.SheetNames || []).find((s) => String(s || '').trim().toLowerCase().includes(t));
  return loose || null;
}

function detectHeaderRow(
  ws: XLSX.WorkSheet,
  maxRows = 160,
  maxCols = 120
): { headerRow: number; colStart: number; colEnd: number; headers: string[] } | null {
  const ref = (ws as any)['!ref'] as string | undefined;
  if (!ref) return null;
  const range = XLSX.utils.decode_range(ref);
  const rMax = Math.min(range.e.r + 1, maxRows);
  const cMax = Math.min(range.e.c + 1, maxCols);

  // Mills: header rows tend to be string-heavy and have many unique column names.
  // Don't require exact "QTY" spelling; score candidates and take the best.
  const helpful = [
    'qty',
    'quantity',
    'lamp',
    'lamps',
    'watt',
    'watts',
    'fixture',
    'existing',
    'proposed',
    'retro',
    'type',
    'mount',
    'area',
    'room',
    'location',
  ];

  let best:
    | { headerRow: number; colStart: number; colEnd: number; headers: string[]; score: number }
    | null = null;

  for (let r = 1; r <= rMax; r++) {
    const rowVals: string[] = [];
    for (let c = 1; c <= cMax; c++) rowVals.push(cellDisplay(ws, r, c));

    const trimmed = rowVals.map((v) => String(v || '').trim());
    const nonEmpty = trimmed.filter(Boolean);
    if (nonEmpty.length < 3) continue;

    const stringish = nonEmpty.filter((c) => /[a-zA-Z]/.test(c));
    const stringishRatio = stringish.length / nonEmpty.length;
    if (stringishRatio < 0.6) continue;

    const normed = nonEmpty.map(normKey).filter(Boolean);
    const uniq = new Set(normed);
    if (uniq.size < 3) continue;

    const helpfulHits = helpful.filter((k) => normed.some((h) => h.includes(k))).length;

    // pick colStart/colEnd from first..last non-empty
    let colStart = 1;
    while (colStart <= cMax && !trimmed[colStart - 1]) colStart++;
    let colEnd = cMax;
    while (colEnd >= colStart && !trimmed[colEnd - 1]) colEnd--;
    if (colEnd - colStart + 1 < 3) continue;

    const headers = trimmed.slice(colStart - 1, colEnd);

    // Score: unique headers + helpful hits + density
    const hasQty = normed.some((h) => h === 'qty' || h === 'quantity' || h.includes('qty'));
    const score = uniq.size + helpfulHits * 2 + (hasQty ? 6 : 0) + Math.min(10, Math.floor(nonEmpty.length / 2));
    if (!best || score > best.score) best = { headerRow: r, colStart, colEnd, headers, score };
  }

  return best ? { headerRow: best.headerRow, colStart: best.colStart, colEnd: best.colEnd, headers: best.headers } : null;
}

function headerMap(headers: string[], colStart: number): Record<string, number> {
  const m: Record<string, number> = {};
  headers.forEach((h, idx) => {
    const k = normKey(h);
    if (!k) return;
    if (!m[k]) m[k] = colStart + idx;
  });
  return m;
}

function guessColumn(map: Record<string, number>, candidates: string[]): number | null {
  for (const c of candidates) {
    const k = normKey(c);
    if (map[k]) return map[k];
  }
  // fuzzy contains
  const keys = Object.keys(map);
  for (const cand of candidates) {
    const ck = normKey(cand);
    const hit = keys.find((k) => k.includes(ck) || ck.includes(k));
    if (hit) return map[hit];
  }
  return null;
}

function computeFixtureTypeKey(n: MillsFixtureType['normalized']): { key: string; missingParts: string[] } {
  const missing: string[] = [];
  const part = (label: string, v: string | number | null) => {
    if (v == null || v === '') missing.push(label);
    return v == null || v === '' ? 'null' : String(v);
  };
  const key = [
    `area=${part('area', n.area)}`,
    `form=${part('formFactor', n.formFactor)}`,
    `lamps=${part('lampCount', n.lampCount)}`,
    `w=${part('lampWatts', n.lampWatts)}`,
    `mount=${part('mounting', n.mounting)}`,
    `env=${part('environment', n.environment)}`,
  ].join('|');
  return { key, missingParts: missing };
}

export function ingestMillsWorkbookV1(args: { fileId: string; buf: Buffer }): MillsWorkbookIngestOutput {
  const extractedAt = new Date().toISOString();
  const wb = XLSX.read(args.buf, { type: 'buffer', cellText: true, cellDates: true });

  const firstClassSheets = [
    'RPLC PGE',
    'RETROLUX',
    'PRESETS',
    'SITE SPECIFIC',
    'QUOTE',
    'SALES ORDER',
    'A LAMPS AND ACCESSORIES',
    'QA - Front Page',
  ];

  const inbox: MillsWorkbookIngestOutput['inbox'] = [];
  const vaultSheets: WorkbookSheetArtifact[] = [];

  for (const s of wb.SheetNames || []) {
    const ws = wb.Sheets[s];
    if (!ws) continue;
    const hdr = detectHeaderRow(ws);
    const detectedTables: WorkbookSheetArtifact['detectedTables'] = [];
    if (hdr) {
      // best-effort: treat as one table for v1
      const rowStart = hdr.headerRow + 1;
      // find rowEnd by scanning down until 3 empty rows
      const ref = (ws as any)['!ref'] as string | undefined;
      const range = ref ? XLSX.utils.decode_range(ref) : null;
      const maxRow = range ? range.e.r + 1 : rowStart;
      let rowEnd = rowStart;
      let emptyRun = 0;
      for (let r = rowStart; r <= maxRow; r++) {
        const nonEmpty = hdr.headers.some((_, idx) => cellDisplay(ws, r, hdr.colStart + idx).trim());
        if (!nonEmpty) {
          emptyRun++;
          if (emptyRun >= 3) break;
          continue;
        }
        emptyRun = 0;
        rowEnd = r;
      }
      detectedTables.push({
        tableId: `${s}!R${hdr.headerRow}C${hdr.colStart}:R${rowEnd}C${hdr.colEnd}`,
        headerRow: hdr.headerRow,
        rowStart,
        rowEnd,
        colStart: hdr.colStart,
        colEnd: hdr.colEnd,
        headers: hdr.headers,
      });
    }
    vaultSheets.push({ sheet: s, detectedTables });
  }

  // Missing first-class sheets are inbox items (no hallucination).
  for (const name of firstClassSheets) {
    const found = findSheetName(wb, name);
    if (!found) {
      inbox.push({
        id: randomUUID(),
        kind: 'missingSheet',
        message: `Workbook missing expected sheet "${name}".`,
        evidenceRef: {
          fileId: args.fileId,
          sheet: 'WORKBOOK',
          cellRange: 'WORKBOOK!A1:A1',
          snippet: `Missing sheet: ${name}`,
          snippetText: `Missing sheet: ${name}`,
          extractedAt,
        },
        confidence: 0.95,
        needsConfirmation: true,
      });
    }
  }

  // --- Parse RPLC PGE -> auditRows ---
  const rplcSheet = findSheetName(wb, 'RPLC PGE');
  const auditRows: MillsAuditRow[] = [];
  if (!rplcSheet) {
    // continue with empty outputs
  } else {
    const ws = wb.Sheets[rplcSheet];
    const hdr = ws ? detectHeaderRow(ws) : null;
    if (!ws || !hdr) {
      inbox.push({
        id: randomUUID(),
        kind: 'missingColumn',
        message: `Could not detect a header row on sheet "${rplcSheet}".`,
        evidenceRef: {
          fileId: args.fileId,
          sheet: rplcSheet,
          cellRange: `${rplcSheet}!A1:Z20`,
          snippet: 'Header row not detected.',
          snippetText: 'Header row not detected.',
          extractedAt,
        },
        confidence: 0.8,
        needsConfirmation: true,
      });
    } else {
      const map = headerMap(hdr.headers, hdr.colStart);
      const colQty = guessColumn(map, ['qty', 'quantity']);
      const colArea = guessColumn(map, ['area', 'room', 'location', 'department']);
      const colExisting = guessColumn(map, ['existing', 'existing_fixture', 'existing_type', 'existing_description', 'existing_lamp']);
      const colProposed = guessColumn(map, ['proposed', 'replacement', 'new', 'retro', 'led', 'proposed_description']);
      const colLampCount = guessColumn(map, ['lamp_count', 'lamps', '#_lamps', 'lamps_per_fixture']);
      const colLampWatts = guessColumn(map, ['lamp_watts', 'watt', 'watts', 'lamp_wattage', 'wattage']);
      const colForm = guessColumn(map, ['form', 'form_factor', 'fixture_form', '2x4', '1x4', 'strip', 'troffer']);
      const colMount = guessColumn(map, ['mount', 'mounting']);
      const colEnv = guessColumn(map, ['env', 'environment', 'wet', 'damp']);

      const rowStart = hdr.headerRow + 1;
      const ref = (ws as any)['!ref'] as string | undefined;
      const range = ref ? XLSX.utils.decode_range(ref) : null;
      const maxRow = range ? range.e.r + 1 : rowStart;
      let emptyRun = 0;
      for (let r = rowStart; r <= maxRow; r++) {
        const rowAny = hdr.headers.some((_, idx) => cellDisplay(ws, r, hdr.colStart + idx).trim());
        if (!rowAny) {
          emptyRun++;
          if (emptyRun >= 5) break;
          continue;
        }
        emptyRun = 0;

        const get = (col: number | null) => (col ? captureCell(ws, r, col) : { displayValue: '', formula: null });
        const cQty = get(colQty);
        const cArea = get(colArea);
        const cExisting = get(colExisting);
        const cProposed = get(colProposed);
        const cLampCount = get(colLampCount);
        const cLampWatts = get(colLampWatts);
        const cForm = get(colForm);
        const cMount = get(colMount);
        const cEnv = get(colEnv);

        const qty = num(cQty.displayValue) ?? 0;
        const area = cArea.displayValue || null;
        const existingDesc = cExisting.displayValue || null;
        const proposedDesc = cProposed.displayValue || null;
        const lampCount = num(cLampCount.displayValue);
        const lampWatts = num(cLampWatts.displayValue);
        const formFactor = cForm.displayValue || null;
        const mounting = cMount.displayValue || null;
        const environment = cEnv.displayValue || null;

        const snippet = [
          qty ? `qty=${qty}` : '',
          area ? `area=${area}` : '',
          existingDesc ? `existing=${existingDesc}` : '',
          proposedDesc ? `proposed=${proposedDesc}` : '',
          lampCount != null ? `lamps=${lampCount}` : '',
          lampWatts != null ? `w=${lampWatts}` : '',
        ]
          .filter(Boolean)
          .join(' | ');

        const evidenceRef = buildEvidence({
          fileId: args.fileId,
          sheet: rplcSheet,
          rowStart: r,
          rowEnd: r,
          colStart: hdr.colStart,
          colEnd: hdr.colEnd,
          snippet: snippet || `Row ${r}`,
          extractedAt,
        });

        // needsConfirmation if key columns missing
        const needsConfirmation = !colQty || qty <= 0 || (!existingDesc && !formFactor);
        const confidence = needsConfirmation ? 0.55 : 0.85;

        auditRows.push({
          id: randomUUID(),
          sourceSheet: rplcSheet,
          rowNumber: r,
          data: {
            qty,
            area,
            existingDesc,
            proposedDesc,
            lampCount,
            lampWatts,
            formFactor,
            mounting,
            environment,
          },
          cells: {
            qty: cQty,
            area: cArea,
            existingDesc: cExisting,
            proposedDesc: cProposed,
            lampCount: cLampCount,
            lampWatts: cLampWatts,
            formFactor: cForm,
            mounting: cMount,
            environment: cEnv,
          },
          evidenceRef,
          confidence,
          needsConfirmation,
        });
      }
    }
  }

  // --- Consolidate fixture types from auditRows ---
  const groups = new Map<string, { qty: number; norm: MillsFixtureType['normalized']; refs: EvidenceRef[]; rowIds: string[]; confidenceMin: number; needsConfirmation: boolean }>();
  for (const r of auditRows) {
    const qty = typeof r.data.qty === 'number' ? r.data.qty : 0;
    if (!qty || qty <= 0) continue;
    const n: MillsFixtureType['normalized'] = {
      area: typeof r.data.area === 'string' && r.data.area.trim() ? r.data.area.trim() : null,
      formFactor: typeof r.data.formFactor === 'string' && r.data.formFactor.trim() ? normText(r.data.formFactor) : null,
      lampCount: typeof r.data.lampCount === 'number' ? r.data.lampCount : null,
      lampWatts: typeof r.data.lampWatts === 'number' ? r.data.lampWatts : null,
      mounting: typeof r.data.mounting === 'string' && r.data.mounting.trim() ? normText(r.data.mounting) : null,
      environment: typeof r.data.environment === 'string' && r.data.environment.trim() ? normText(r.data.environment) : null,
      existingDesc: typeof r.data.existingDesc === 'string' && r.data.existingDesc.trim() ? r.data.existingDesc.trim() : null,
      proposedDesc: typeof r.data.proposedDesc === 'string' && r.data.proposedDesc.trim() ? r.data.proposedDesc.trim() : null,
    };
    const { key, missingParts } = computeFixtureTypeKey(n);
    const needsConfirmation = missingParts.length > 0;
    const confidence = needsConfirmation ? 0.6 : 0.9;

    const prev = groups.get(key);
    if (!prev) {
      groups.set(key, { qty, norm: n, refs: [r.evidenceRef], rowIds: [r.id], confidenceMin: confidence, needsConfirmation });
    } else {
      prev.qty += qty;
      prev.rowIds.push(r.id);
      // keep first N evidence refs to prevent bloat
      if (prev.refs.length < 25) prev.refs.push(r.evidenceRef);
      prev.confidenceMin = Math.min(prev.confidenceMin, confidence);
      prev.needsConfirmation = prev.needsConfirmation || needsConfirmation;
    }
  }

  const lightingFixtureTypes: MillsFixtureType[] = Array.from(groups.entries()).map(([fixtureTypeKey, g]) => ({
    id: randomUUID(),
    fixtureTypeKey,
    qty: g.qty,
    normalized: g.norm,
    evidenceRefs: g.refs,
    sourceRowIds: g.rowIds,
    confidence: g.confidenceMin,
    needsConfirmation: g.needsConfirmation,
  }));

  lightingFixtureTypes.sort((a, b) => (b.qty || 0) - (a.qty || 0));

  // --- Measures (v1 best-effort): one per fixture type ---
  const measures: MillsMeasure[] = lightingFixtureTypes.map((ft) => {
    const existing = ft.normalized.existingDesc || ft.normalized.formFactor || 'existing fixture';
    const proposed = ft.normalized.proposedDesc || null;
    const needsConfirmation = !proposed;
    return {
      id: randomUUID(),
      name: proposed ? `Replace ${existing} → ${proposed}` : `Replacement measure for ${existing}`,
      category: 'lighting',
      existingFixtureTypeId: ft.id,
      proposedSummary: proposed,
      pricing: { unitCost: null, unitPrice: null, extendedPrice: null },
      evidenceRefs: ft.evidenceRefs.slice(0, 10),
      confidence: needsConfirmation ? 0.55 : 0.8,
      needsConfirmation,
    };
  });

  // --- BOM Items (v1 best-effort) ---
  const bomItems: MillsBomItem[] = [];
  const bomSheet = findSheetName(wb, 'A LAMPS AND ACCESSORIES');
  if (bomSheet) {
    const ws = wb.Sheets[bomSheet];
    const hdr = ws ? detectHeaderRow(ws) : null;
    if (ws && hdr) {
      const map = headerMap(hdr.headers, hdr.colStart);
      const colSku = guessColumn(map, ['sku', 'item', 'part', 'part_number']);
      const colDesc = guessColumn(map, ['description', 'desc', 'item_description']);
      const colQty = guessColumn(map, ['qty', 'quantity']);
      const colUom = guessColumn(map, ['uom', 'unit']);
      const colCost = guessColumn(map, ['unit_cost', 'cost']);

      const rowStart = hdr.headerRow + 1;
      const ref = (ws as any)['!ref'] as string | undefined;
      const range = ref ? XLSX.utils.decode_range(ref) : null;
      const maxRow = range ? range.e.r + 1 : rowStart;
      let emptyRun = 0;
      for (let r = rowStart; r <= maxRow; r++) {
        const rowAny = hdr.headers.some((_, idx) => cellDisplay(ws, r, hdr.colStart + idx).trim());
        if (!rowAny) {
          emptyRun++;
          if (emptyRun >= 5) break;
          continue;
        }
        emptyRun = 0;
        const get = (col: number | null) => (col ? cellDisplay(ws, r, col) : '');
        const sku = get(colSku) || null;
        const description = get(colDesc) || null;
        const qty = num(get(colQty));
        const uom = get(colUom) || null;
        const unitCost = num(get(colCost));
        const snippet = [sku, description, qty != null ? `qty=${qty}` : '', unitCost != null ? `unitCost=${unitCost}` : ''].filter(Boolean).join(' | ');
        const evidenceRef = buildEvidence({
          fileId: args.fileId,
          sheet: bomSheet,
          rowStart: r,
          rowEnd: r,
          colStart: hdr.colStart,
          colEnd: hdr.colEnd,
          snippet: snippet || `Row ${r}`,
          extractedAt,
        });
        const needsConfirmation = !description || qty == null;
        bomItems.push({
          id: randomUUID(),
          sku,
          description,
          qty,
          uom,
          unitCost,
          linkedMeasureId: null,
          evidenceRef,
          confidence: needsConfirmation ? 0.55 : 0.8,
          needsConfirmation,
        });
      }
    }
  }

  return {
    apiVersion: 'workbook-ingest/v1',
    fileId: args.fileId,
    extractedAt,
    vaultSheets,
    auditRows,
    lightingFixtureTypes,
    measures,
    bomItems,
    inbox,
  };
}

export function applyMillsIngestToProjectGraph(args: {
  ingest: MillsWorkbookIngestOutput;
  existingGraph?: ProjectGraph;
}): ProjectGraph {
  const base: ProjectGraph = args.existingGraph || { assets: [], measures: [], inbox: [], inboxHistory: [], decisions: [] };
  const g: any = {
    assets: [...(Array.isArray(base.assets) ? base.assets : [])],
    measures: [...(Array.isArray(base.measures) ? base.measures : [])],
    inbox: [...(Array.isArray(base.inbox) ? base.inbox : [])],
    inboxHistory: Array.isArray((base as any).inboxHistory) ? (base as any).inboxHistory : [],
    decisions: Array.isArray((base as any).decisions) ? (base as any).decisions : [],
  };

  // Add consolidated fixture types as assets (engineer-usable summaries)
  let idx = 1;
  for (const ft of args.ingest.lightingFixtureTypes) {
    const assetTag = `LGT-GRP-${String(idx).padStart(3, '0')}`;
    idx++;
    g.assets.push({
      kind: 'asset',
      id: ft.id,
      assetTag,
      type: 'lightingFixture',
      name: ft.normalized.area ? `Fixture Group (${ft.normalized.area})` : 'Fixture Group',
      location: ft.normalized.area || undefined,
      tags: ['lighting', 'fixtureGroup'],
      baseline: {
        description: 'Imported from Mills workbook (consolidated fixture type).',
        properties: {
          kind: 'fixtureGroup',
          qty: String(ft.qty),
          fixtureTypeKey: ft.fixtureTypeKey,
          existingDesc: ft.normalized.existingDesc || '',
          proposedDesc: ft.normalized.proposedDesc || '',
        },
        evidenceRefs: ft.evidenceRefs,
      },
      evidenceRefs: ft.evidenceRefs,
      status: 'confirmed',
      createdAt: args.ingest.extractedAt,
      updatedAt: args.ingest.extractedAt,
    });
  }

  // Add measures (v1: lighting replacement measures)
  for (const m of args.ingest.measures) {
    g.measures.push({
      kind: 'measure',
      id: m.id,
      name: m.name,
      category: m.category,
      evidenceRefs: m.evidenceRefs,
      status: 'confirmed',
      createdAt: args.ingest.extractedAt,
      updatedAt: args.ingest.extractedAt,
    });
  }

  // Add inbox items
  for (const it of args.ingest.inbox) {
    g.inbox.push({
      id: it.id,
      kind: 'suggestedProperty',
      status: 'inferred',
      suggestedProperty: { key: `workbook:${it.kind}`, value: it.message },
      provenance: it.evidenceRef,
      confidence: it.confidence,
      needsConfirmation: it.needsConfirmation,
      createdAt: args.ingest.extractedAt,
    });
  }

  return g as ProjectGraph;
}

