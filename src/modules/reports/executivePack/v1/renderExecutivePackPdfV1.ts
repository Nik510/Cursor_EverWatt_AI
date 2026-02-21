import PDFDocument from 'pdfkit';
import type { ExecutivePackJsonV1 } from './buildExecutivePackJsonV1';

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

function renderBullets(doc: PDFKit.PDFDocument, items: string[], max = 40) {
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

export async function renderExecutivePackPdfV1(args: { packJson: ExecutivePackJsonV1 }): Promise<Buffer> {
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
    Title: `Executive Pack v1`,
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
    const kpis = pack?.kpis || {};
    const dq = pack?.dataQuality || {};
    const batt = pack?.batteryFit || {};
    const savings = pack?.savings || {};
    const missing = pack?.whatWeNeedToFinalize || {};
    const required: any[] = Array.isArray(missing?.requiredMissingInfo) ? missing.requiredMissingInfo : [];
    const recommended: any[] = Array.isArray(missing?.recommendedMissingInfo) ? missing.recommendedMissingInfo : [];
    const findings: string[] = Array.isArray(pack?.topFindings) ? pack.topFindings.map((x: any) => safeText(x)).filter(Boolean) : [];
    const actions: any[] = Array.isArray(pack?.nextBestActions) ? pack.nextBestActions : [];
    const assumptions: string[] = Array.isArray(pack?.confidenceAndAssumptions) ? pack.confidenceAndAssumptions.map((x: any) => safeText(x)).filter(Boolean) : [];

    doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827').text('EverWatt', { continued: false });
    doc.font('Helvetica').fontSize(12).fillColor('#374151').text('Executive Report Pack v1 (snapshot-only)');
    doc.moveDown(0.6);
    drawRule(doc, doc.y);
    doc.moveDown(0.8);

    renderKeyValue(doc, [
      { key: 'projectId', value: safeText(hdr.projectId) || 'n/a' },
      { key: 'projectName', value: safeText(hdr.projectName) || 'n/a' },
      { key: 'utility', value: safeText(hdr.utilityTerritory) || 'n/a' },
      { key: 'runId', value: safeText(linkage.runId) || 'n/a' },
      { key: 'revisionId', value: safeText(linkage.revisionId) || 'n/a' },
      { key: 'generatedAtIso', value: generatedAtIso || 'n/a' },
    ]);

    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('KPIs');
    doc.moveDown(0.3);

    const annualKwh = kpis?.annualKwhEstimate?.value;
    const baseload = kpis?.baseloadKw?.value;
    const peak = kpis?.peakKw?.value;
    const savingsLine =
      savings?.annualUsd?.value !== undefined && savings?.annualUsd?.value !== null
        ? `$${fmtNum(savings.annualUsd.value, 0)}/yr`
        : savings?.annualUsd?.min !== undefined && savings?.annualUsd?.max !== undefined
          ? `$${fmtNum(savings.annualUsd.min, 0)}..$${fmtNum(savings.annualUsd.max, 0)}/yr`
          : 'pending inputs';

    renderKeyValue(doc, [
      { key: 'annualKwhEstimate', value: annualKwh !== undefined && annualKwh !== null ? fmtNum(annualKwh, 0) : '—' },
      { key: 'baseloadKw', value: baseload !== undefined && baseload !== null ? fmtNum(baseload, 2) : '—' },
      { key: 'peakKw', value: peak !== undefined && peak !== null ? fmtNum(peak, 2) : '—' },
      { key: 'batteryFit', value: safeText(batt?.decision) || '—' },
      { key: 'dataQuality', value: `${safeText(dq?.tier) || '—'}${Number.isFinite(Number(dq?.score0to100)) ? ` (${Math.trunc(Number(dq.score0to100))}/100)` : ''}` },
      { key: 'savings', value: `${safeText(savings?.status) || '—'} • ${savingsLine}` },
    ]);

    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Top findings');
    doc.moveDown(0.3);
    if (findings.length) renderBullets(doc, findings, 8);
    else doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text('(none)');

    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('What we need to finalize');
    doc.moveDown(0.3);
    const reqIds = required.map((m: any) => safeText(m?.id)).filter(Boolean);
    const recIds = recommended.map((m: any) => safeText(m?.id)).filter(Boolean);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text('Required');
    doc.moveDown(0.2);
    if (reqIds.length) renderBullets(doc, reqIds, 12);
    else doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text('(none)');
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text('Recommended');
    doc.moveDown(0.2);
    if (recIds.length) renderBullets(doc, recIds, 12);
    else doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text('(none)');

    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Next best actions');
    doc.moveDown(0.3);
    const actionLines = actions
      .slice(0, 14)
      .map((a: any) => {
        const id = safeText(a?.actionId) || '(action)';
        const label = safeText(a?.label);
        const status = safeText(a?.status);
        return `${id}${label ? ` — ${label}` : ''}${status ? ` [${status}]` : ''}`;
      })
      .filter(Boolean);
    if (actionLines.length) renderBullets(doc, actionLines, 14);
    else doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text('(wizard output missing)');

    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Confidence & assumptions');
    doc.moveDown(0.3);
    if (assumptions.length) renderBullets(doc, assumptions, 10);
    else doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text('(none)');

    doc.end();
  });

  return Buffer.concat(chunks);
}

