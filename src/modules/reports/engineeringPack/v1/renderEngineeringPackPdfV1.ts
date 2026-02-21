import PDFDocument from 'pdfkit';
import type { EngineeringPackJsonV1 } from './buildEngineeringPackJsonV1';

function safeText(v: unknown): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim();
}

function fmtNum(x: unknown, digits = 0): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return '—';
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return isInt ? String(Math.round(n)) : n.toFixed(digits);
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottomLimit = doc.page.height - (doc.page.margins as any).bottom;
  if (doc.y + needed <= bottomLimit) return;
  doc.addPage();
}

function drawRule(doc: PDFKit.PDFDocument, y: number, color = '#E5E7EB') {
  const { left, right } = doc.page.margins as any;
  const w = doc.page.width - left - right;
  doc.save();
  doc.moveTo(left, y).lineTo(left + w, y).lineWidth(1).strokeColor(color).stroke();
  doc.restore();
}

function renderKeyValue(doc: PDFKit.PDFDocument, pairs: Array<{ key: string; value: string }>) {
  const left = (doc.page.margins as any).left as number;
  const right = (doc.page.margins as any).right as number;
  const w = doc.page.width - left - right;
  const keyW = Math.min(190, w * 0.34);
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

function renderBullets(doc: PDFKit.PDFDocument, items: string[], max = 60) {
  const left = (doc.page.margins as any).left as number;
  for (const it of items.slice(0, max)) {
    ensureSpace(doc, 16);
    const y = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor('#111827').text('•', left, y, { lineBreak: false });
    doc.x = left + 12;
    doc.font('Helvetica').fontSize(10).fillColor('#111827').text(safeText(it), { width: doc.page.width - left - (doc.page.margins as any).right - 12 });
    doc.x = left;
  }
}

export async function renderEngineeringPackPdfV1(args: { packJson: EngineeringPackJsonV1 }): Promise<Buffer> {
  const pack = args.packJson as any;
  const generatedAtIso = safeText(pack?.generatedAtIso);

  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 64,
    bufferPages: true,
    compress: false,
  });

  (doc as any).info = {
    ...(doc as any).info,
    Title: `Engineering Pack v1`,
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

    const hdr = pack?.header || {};
    const linkage = pack?.linkage || {};
    const prov = pack?.provenance || {};
    const snap = prov?.snapshotIds || {};
    const sections = pack?.sections || {};
    const trace = sections?.analysisTrace || {};
    const cov = trace?.coverage || {};
    const warn = sections?.warningsAndMissingInfo || {};

    doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827').text('EverWatt', { continued: false });
    doc.font('Helvetica').fontSize(12).fillColor('#374151').text('Engineering Report Pack v1 (snapshot-only)');
    doc.moveDown(0.6);
    drawRule(doc, doc.y);
    doc.moveDown(0.8);

    renderKeyValue(doc, [
      { key: 'projectId', value: safeText(hdr.projectId) || 'n/a' },
      { key: 'projectName', value: safeText(hdr.projectName) || 'n/a' },
      { key: 'utility', value: safeText(hdr.utilityTerritory) || 'n/a' },
      { key: 'runId', value: safeText(linkage.runId) || 'n/a' },
      { key: 'revisionId', value: safeText(linkage.revisionId) || 'n/a' },
      { key: 'verifierStatus', value: safeText((pack as any)?.verificationSummaryV1?.status || (pack as any)?.verifierResultV1?.status) || '—' },
      { key: 'claimsStatus', value: safeText((pack as any)?.claimsPolicyV1?.status) || '—' },
      { key: 'generatedAtIso', value: generatedAtIso || 'n/a' },
    ]);

    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Coverage & provenance');
    doc.moveDown(0.4);
    renderKeyValue(doc, [
      { key: 'hasInterval', value: String(Boolean(cov?.hasInterval)) },
      { key: 'intervalDays', value: cov?.intervalDays !== undefined ? fmtNum(cov.intervalDays, 3) : '—' },
      { key: 'tariffMatchStatus', value: safeText(cov?.tariffMatchStatus) || '—' },
      { key: 'supplyProviderType', value: safeText(cov?.supplyProviderType) || '—' },
      { key: 'tariffSnapshotId', value: safeText(snap?.tariffSnapshotId) || '—' },
      { key: 'exitFeesSnapshotId', value: safeText(snap?.exitFeesSnapshotId) || '—' },
    ]);

    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Warnings (engine)');
    doc.moveDown(0.3);
    const engineWarnings: any[] = Array.isArray(warn?.engineWarnings) ? warn.engineWarnings : [];
    renderBullets(
      doc,
      engineWarnings.map((w) => safeText(w?.code)).filter(Boolean),
      50
    );
    if (!engineWarnings.length) doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text('(none)');

    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Missing info');
    doc.moveDown(0.3);
    const missingInfo: any[] = Array.isArray(warn?.missingInfo) ? warn.missingInfo : [];
    renderBullets(
      doc,
      missingInfo.map((m) => safeText(m?.id || m?.description)).filter(Boolean),
      60
    );
    if (!missingInfo.length) doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text('(none)');

    doc.end();
  });

  return Buffer.concat(chunks);
}

