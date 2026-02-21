import PDFDocument from 'pdfkit';
import type { UtilitySummaryV1 } from './generateUtilitySummary';

export type UtilitySummaryPdfProjectMeta = {
  name: string;
  address?: string;
  territory?: string;
};

type RenderArgs = {
  project: UtilitySummaryPdfProjectMeta;
  summaryMarkdown: string;
  summaryJson: UtilitySummaryV1;
};

type MdSection = {
  level: number;
  title: string;
  lines: string[];
};

function safeText(v: unknown): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim();
}

function formatIsoDate(isoLike: string | undefined): string {
  const s = safeText(isoLike);
  if (!s) return '';
  // Keep deterministic + timezone-independent by using the ISO date prefix when available.
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

function splitMarkdownSections(markdown: string): MdSection[] {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const sections: MdSection[] = [];
  let current: MdSection | null = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, '');
    const m = /^(#{1,6})\s+(.+)$/.exec(line);
    if (m) {
      if (current) sections.push(current);
      current = { level: m[1].length, title: safeText(m[2]), lines: [] };
      continue;
    }
    if (!current) current = { level: 0, title: '', lines: [] };
    current.lines.push(line);
  }
  if (current) sections.push(current);
  return sections;
}

function drawRule(doc: PDFKit.PDFDocument, y: number, color = '#E5E7EB') {
  const { left, right } = doc.page.margins as any;
  const w = doc.page.width - left - right;
  doc.save();
  doc.moveTo(left, y).lineTo(left + w, y).lineWidth(1).strokeColor(color).stroke();
  doc.restore();
}

function addSpace(doc: PDFKit.PDFDocument, pts: number) {
  doc.y = doc.y + pts;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottomLimit = doc.page.height - (doc.page.margins as any).bottom;
  if (doc.y + needed <= bottomLimit) return;
  doc.addPage();
}

function drawInlineBold(doc: PDFKit.PDFDocument, text: string, opts: { fontSize: number; color: string; width: number }) {
  // Supports **bold** segments (simple, deterministic).
  const parts: Array<{ t: string; bold: boolean }> = [];
  const s = String(text || '');
  let i = 0;
  while (i < s.length) {
    const start = s.indexOf('**', i);
    if (start === -1) {
      parts.push({ t: s.slice(i), bold: false });
      break;
    }
    const end = s.indexOf('**', start + 2);
    if (end === -1) {
      parts.push({ t: s.slice(i), bold: false });
      break;
    }
    if (start > i) parts.push({ t: s.slice(i, start), bold: false });
    parts.push({ t: s.slice(start + 2, end), bold: true });
    i = end + 2;
  }

  const x0 = doc.x;
  const y0 = doc.y;
  let x = x0;
  const lineGap = 2;
  const maxX = x0 + opts.width;

  doc.fillColor(opts.color);
  for (const p of parts) {
    const font = p.bold ? 'Helvetica-Bold' : 'Helvetica';
    doc.font(font).fontSize(opts.fontSize);

    // Wrap per-word deterministically.
    const words = p.t.split(/(\s+)/);
    for (const w of words) {
      if (!w) continue;
      const wWidth = doc.widthOfString(w, { font: font as any, size: opts.fontSize } as any);
      if (x + wWidth > maxX && w.trim().length > 0) {
        // New line
        x = x0;
        doc.y = doc.y + opts.fontSize + lineGap;
      }
      doc.text(w, x, doc.y, { lineBreak: false });
      x += wWidth;
    }
  }
  // Advance y to next line baseline
  doc.x = x0;
  doc.y = Math.max(doc.y, y0) + opts.fontSize + lineGap;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  args: {
    headers: string[];
    rows: string[][];
    columnWeights?: number[];
    zebra?: boolean;
  }
) {
  const left = (doc.page.margins as any).left as number;
  const right = (doc.page.margins as any).right as number;
  const tableWidth = doc.page.width - left - right;
  const colCount = args.headers.length;
  const weights =
    args.columnWeights && args.columnWeights.length === colCount
      ? args.columnWeights
      : new Array(colCount).fill(1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const colWidths = weights.map((w) => (tableWidth * w) / weightSum);

  const headerFontSize = 10;
  const cellFontSize = 9.5;
  const padX = 6;
  const padY = 5;
  const rowGap = 0;

  const border = '#E5E7EB';
  const headerBg = '#F3F4F6';
  const zebraBg = '#FAFAFA';
  const text = '#111827';
  const muted = '#374151';

  function rowHeight(cells: string[], fontSize: number): number {
    const heights = cells.map((c, idx) => {
      doc.font('Helvetica').fontSize(fontSize);
      const h = doc.heightOfString(safeText(c), {
        width: Math.max(10, colWidths[idx] - padX * 2),
        align: 'left',
      });
      return h + padY * 2;
    });
    return Math.max(...heights, fontSize + padY * 2);
  }

  // Header
  ensureSpace(doc, 28);
  const headerH = rowHeight(args.headers, headerFontSize);
  doc.save();
  doc.rect(left, doc.y, tableWidth, headerH).fill(headerBg);
  doc.restore();
  doc.strokeColor(border).rect(left, doc.y, tableWidth, headerH).stroke();
  let x = left;
  for (let c = 0; c < colCount; c++) {
    doc
      .font('Helvetica-Bold')
      .fontSize(headerFontSize)
      .fillColor(muted)
      .text(safeText(args.headers[c]), x + padX, doc.y + padY, {
        width: colWidths[c] - padX * 2,
        align: 'left',
      });
    if (c < colCount - 1) doc.strokeColor(border).moveTo(x + colWidths[c], doc.y).lineTo(x + colWidths[c], doc.y + headerH).stroke();
    x += colWidths[c];
  }
  doc.y = doc.y + headerH + rowGap;

  // Body
  for (let r = 0; r < args.rows.length; r++) {
    const row = args.rows[r] || [];
    const cells = new Array(colCount).fill('').map((_, i) => safeText(row[i]));
    const h = rowHeight(cells, cellFontSize);
    ensureSpace(doc, h + 4);

    if (args.zebra && r % 2 === 1) {
      doc.save();
      doc.rect(left, doc.y, tableWidth, h).fill(zebraBg);
      doc.restore();
    }

    doc.strokeColor(border).rect(left, doc.y, tableWidth, h).stroke();
    let cx = left;
    for (let c = 0; c < colCount; c++) {
      doc
        .font('Helvetica')
        .fontSize(cellFontSize)
        .fillColor(text)
        .text(cells[c], cx + padX, doc.y + padY, {
          width: colWidths[c] - padX * 2,
          align: 'left',
        });
      if (c < colCount - 1) doc.strokeColor(border).moveTo(cx + colWidths[c], doc.y).lineTo(cx + colWidths[c], doc.y + h).stroke();
      cx += colWidths[c];
    }
    doc.y = doc.y + h + rowGap;
  }
}

function renderBullets(doc: PDFKit.PDFDocument, items: string[]) {
  const bulletGap = 6;
  for (const it of items) {
    ensureSpace(doc, 16);
    const x0 = doc.x;
    const y0 = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor('#111827').text('•', x0, y0, { lineBreak: false });
    doc.x = x0 + bulletGap + 2;
    drawInlineBold(doc, safeText(it), { fontSize: 10, color: '#111827', width: doc.page.width - (doc.page.margins as any).right - doc.x });
    doc.x = x0;
  }
}

function renderKeyValueGrid(doc: PDFKit.PDFDocument, pairs: Array<{ key: string; value: string }>) {
  const left = (doc.page.margins as any).left as number;
  const right = (doc.page.margins as any).right as number;
  const w = doc.page.width - left - right;
  const keyW = Math.min(180, w * 0.33);
  const valW = w - keyW;
  const rowH = 16;

  for (const p of pairs) {
    ensureSpace(doc, rowH + 6);
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(p.key, left, y, { width: keyW });
    doc.font('Helvetica').fontSize(10).fillColor('#111827').text(p.value, left + keyW, y, { width: valW });
    doc.y = y + rowH;
  }
}

export async function renderUtilitySummaryPdf(args: RenderArgs): Promise<Buffer> {
  const generatedAtIso = safeText(args.summaryJson?.generatedAt);
  const generatedDate = formatIsoDate(generatedAtIso);
  const title = 'Analysis Results v1';
  const reportName = safeText(args.project?.name) || 'Project';

  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 64,
    bufferPages: true,
    compress: false, // keep deterministic + allow lightweight text checks in tests
  });

  // Deterministic metadata (avoid "now" unless present in inputs).
  (doc as any).info = {
    ...(doc as any).info,
    Title: `${title} — ${reportName}`,
    Author: 'EverWatt',
    Producer: 'EverWatt Engine',
    Creator: 'EverWatt Engine',
    CreationDate: generatedAtIso ? new Date(generatedAtIso) : new Date(),
    ModDate: generatedAtIso ? new Date(generatedAtIso) : new Date(),
  };

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    doc.on('data', (d: Buffer) => chunks.push(d));
    doc.on('end', () => resolve());
    doc.on('error', (e: Error) => reject(e));

    // Leave room for header/footer on every page.
    const left = (doc.page.margins as any).left as number;
    const right = (doc.page.margins as any).right as number;
    const top = (doc.page.margins as any).top as number;

    // Cover / header block
    doc.x = left;
    doc.y = top;

    doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827').text('EverWatt Engine', { continued: false });
    doc.font('Helvetica').fontSize(12).fillColor('#374151').text(title);
    addSpace(doc, 8);

    const metaPairs: Array<{ key: string; value: string }> = [];
    metaPairs.push({ key: 'Project', value: reportName || 'n/a' });
    if (safeText(args.project?.address)) metaPairs.push({ key: 'Address', value: safeText(args.project.address) });
    if (safeText(args.project?.territory)) metaPairs.push({ key: 'Territory', value: safeText(args.project.territory) });
    if (generatedDate) metaPairs.push({ key: 'Generated', value: generatedDate });
    renderKeyValueGrid(doc, metaPairs);
    addSpace(doc, 10);
    drawRule(doc, doc.y);
    addSpace(doc, 14);

    // Sections from markdown (mapped), rendered with structured JSON where available.
    const sections = splitMarkdownSections(args.summaryMarkdown);
    const sjson = args.summaryJson;

    const normalized = (s: string) => safeText(s).toLowerCase();
    for (const s of sections) {
      // Skip empty prelude
      if (!s.title && !s.lines.some((l) => safeText(l))) continue;
      // Skip the top-level markdown title; we already have a cover header.
      if (s.level === 1 && normalized(s.title).includes('utility summary report v1')) continue;

      // Heading
      if (s.title) {
        ensureSpace(doc, 24);
        const size = s.level <= 2 ? 14 : 12;
        doc.font('Helvetica-Bold').fontSize(size).fillColor('#111827').text(s.title, { align: 'left' });
        addSpace(doc, 6);
      }

      const key = normalized(s.title);

      if (key === 'building metadata') {
        renderKeyValueGrid(doc, [
          { key: 'projectId', value: safeText(sjson?.building?.projectId) || 'n/a' },
          { key: 'territory', value: safeText(sjson?.building?.territory) || safeText(args.project?.territory) || 'n/a' },
          { key: 'customerType', value: safeText(sjson?.building?.customerType) || 'n/a' },
          { key: 'naicsCode', value: safeText(sjson?.building?.naicsCode) || 'n/a' },
          { key: 'currentRate', value: safeText(sjson?.building?.currentRateCode) || 'n/a' },
        ]);
        addSpace(doc, 10);
        continue;
      }

      if (key.startsWith('key load shape metrics')) {
        const ls = sjson?.loadShape as any;
        const op = sjson?.operatingPattern as any;
        drawTable(doc, {
          headers: ['Metric', 'Value'],
          rows: [
            ['baseloadKw', safeText(ls?.baseloadKw)],
            ['peakKw', safeText(ls?.peakKw)],
            ['loadFactor', safeText(ls?.loadFactor)],
            ['peakinessIndex', safeText(ls?.peakinessIndex)],
            ['operatingScheduleBucket', `${safeText(op?.scheduleBucket)} (conf=${safeText(op?.confidence) || 'n/a'})`],
          ],
          columnWeights: [1.2, 2.3],
          zebra: true,
        });
        addSpace(doc, 10);
        continue;
      }

      if (key === 'rate fit') {
        const rf = sjson?.rateFit as any;
        renderKeyValueGrid(doc, [{ key: 'status', value: `${safeText(rf?.status) || 'n/a'} (conf=${safeText(rf?.confidence) || 'n/a'})` }]);
        addSpace(doc, 6);
        const because = Array.isArray(rf?.because) ? rf.because.map(safeText).filter(Boolean) : [];
        if (because.length) {
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Because');
          addSpace(doc, 4);
          renderBullets(doc, because);
          addSpace(doc, 6);
        }
        const alts = Array.isArray(rf?.alternatives) ? rf.alternatives : [];
        if (alts.length) {
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Top alternatives');
          addSpace(doc, 6);
          drawTable(doc, {
            headers: ['Rate', 'Status', 'Notes'],
            rows: alts.slice(0, 6).map((a: any) => [
              `${safeText(a?.utility)} ${safeText(a?.rateCode)}`.trim(),
              safeText(a?.status) || 'n/a',
              Number.isFinite(a?.estimatedDeltaDollars)
                ? `estimatedDeltaDollars=${Number(a.estimatedDeltaDollars).toFixed(0)}`
                : safeText(Array.isArray(a?.because) ? a.because[0] : '') || 'needs inputs for deterministic delta',
            ]),
            columnWeights: [1.2, 0.9, 2.4],
            zebra: true,
          });
          addSpace(doc, 10);
        }
        continue;
      }

      if (key.startsWith('option s')) {
        const os = sjson?.optionS as any;
        renderKeyValueGrid(doc, [{ key: 'status', value: `${safeText(os?.status) || 'n/a'} (conf=${safeText(os?.confidence) || 'n/a'})` }]);
        addSpace(doc, 6);
        const because = Array.isArray(os?.because) ? os.because.map(safeText).filter(Boolean) : [];
        if (because.length) {
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Because');
          addSpace(doc, 4);
          renderBullets(doc, because);
          addSpace(doc, 10);
        }
        continue;
      }

      if (key.startsWith('demand response') || key.includes('utility/iso programs')) {
        const progs = sjson?.programs as any;
        const matches = Array.isArray(progs?.matches) ? progs.matches : [];
        if (matches.length) {
          drawTable(doc, {
            headers: ['Program', 'Match', 'Score'],
            rows: matches.slice(0, 10).map((m: any) => [safeText(m?.programId), safeText(m?.matchStatus), Number.isFinite(m?.score) ? Number(m.score).toFixed(2) : 'n/a']),
            columnWeights: [2.0, 1.0, 0.7],
            zebra: true,
          });
        } else {
          doc.font('Helvetica').fontSize(10).fillColor('#374151').text('(no matches)');
        }
        addSpace(doc, 10);
        continue;
      }

      if (key.startsWith('battery screening')) {
        const gate = sjson?.battery?.gate as any;
        renderKeyValueGrid(doc, [{ key: 'gate', value: safeText(gate?.status) || 'n/a' }]);
        addSpace(doc, 6);
        const because = Array.isArray(gate?.because) ? gate.because.map(safeText).filter(Boolean) : [];
        if (because.length) {
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Because');
          addSpace(doc, 4);
          renderBullets(doc, because);
          addSpace(doc, 6);
        }
        const cands = Array.isArray(sjson?.battery?.topCandidates) ? sjson.battery.topCandidates : [];
        if (cands.length) {
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Top candidates');
          addSpace(doc, 6);
          drawTable(doc, {
            headers: ['Candidate', 'Fit', 'Disqualifiers'],
            rows: cands.slice(0, 6).map((c: any) => [
              `${safeText(c?.vendor)} ${safeText(c?.sku)}`.trim(),
              Number.isFinite(c?.fitScore) ? Number(c.fitScore).toFixed(3) : 'n/a',
              Array.isArray(c?.disqualifiers) && c.disqualifiers.length ? c.disqualifiers.join('; ') : '',
            ]),
            columnWeights: [1.7, 0.6, 2.0],
            zebra: true,
          });
          addSpace(doc, 10);
        }
        continue;
      }

      if (key.startsWith('missing inputs checklist')) {
        const missing = Array.isArray(sjson?.missingInputsChecklist) ? sjson.missingInputsChecklist.map(safeText).filter(Boolean) : [];
        if (missing.length) renderBullets(doc, missing);
        else doc.font('Helvetica').fontSize(10).fillColor('#374151').text('(none)');
        addSpace(doc, 10);
        continue;
      }

      // Fallback: render markdown lines (headings already printed).
      const nonEmpty = s.lines.map((l) => safeText(l)).filter(Boolean);
      for (const l of nonEmpty) {
        // Bullets (- ...)
        const bm = /^-\s+(.*)$/.exec(l);
        if (bm) {
          renderBullets(doc, [bm[1]]);
          continue;
        }
        // Paragraph
        ensureSpace(doc, 16);
        drawInlineBold(doc, l, { fontSize: 10, color: '#111827', width: doc.page.width - right - doc.x });
      }
      addSpace(doc, 8);
    }

    // Header/Footer with page numbers after content is buffered.
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const pageNumber = i + 1;
      const pageCount = range.count;

      const leftM = (doc.page.margins as any).left as number;
      const rightM = (doc.page.margins as any).right as number;
      const topM = (doc.page.margins as any).top as number;
      const bottomM = (doc.page.margins as any).bottom as number;

      // Header
      doc.save();
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text('EverWatt', leftM, 22, { lineBreak: false });
      doc.font('Helvetica').fontSize(10).fillColor('#374151').text(` — ${title}`, leftM + doc.widthOfString('EverWatt'), 22, { lineBreak: false });
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280').text(reportName, leftM, 38, {
        width: doc.page.width - leftM - rightM,
        align: 'right',
      });
      drawRule(doc, topM - 18);
      doc.restore();

      // Footer
      doc.save();
      const footerY = doc.page.height - bottomM + 18;
      const leftText = generatedDate ? `Generated ${generatedDate}` : 'Generated';
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280').text(leftText, leftM, footerY, { align: 'left' });
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280').text(`Page ${pageNumber} of ${pageCount}`, leftM, footerY, {
        width: doc.page.width - leftM - rightM,
        align: 'right',
      });
      doc.restore();
    }

    doc.end();
  });

  return Buffer.concat(chunks);
}

