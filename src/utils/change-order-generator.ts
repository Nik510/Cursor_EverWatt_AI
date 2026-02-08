// Change Order Document Generation Utilities (PDF + Word)

// @ts-ignore - jsPDF types
import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable types
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import type { ChangeOrderAiBody, ChangeOrderFileFormat, ChangeOrderRecord } from '../types/change-order';

type DocxHeadingLevel = (typeof HeadingLevel)[keyof typeof HeadingLevel];

function money(amountUsd: number): string {
  const n = Number(amountUsd);
  if (!Number.isFinite(n)) return '$0';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function safeText(v: unknown): string {
  return String(v || '').trim();
}

function buildFilename(co: ChangeOrderRecord, format: ChangeOrderFileFormat): string {
  const projectNumber = safeText(co.customer?.projectNumber) || 'Project';
  const coNum = co.changeOrderNumber || 0;
  const date = new Date().toISOString().split('T')[0];
  const base = `Change_Order_${projectNumber}_CO_${coNum}_${date}`.replace(/[^a-z0-9]/gi, '_');
  return `${base}.${format === 'word' ? 'docx' : 'pdf'}`;
}

export function generateChangeOrderPDF(co: ChangeOrderRecord): Blob {
  const doc = new jsPDF();

  const title = `Change Order #${co.changeOrderNumber}`;
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(title, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Date: ${new Date(co.metadata?.generatedAt || Date.now()).toLocaleDateString()}`, 14, 26);

  let y = 34;

  const cust = co.customer || ({} as any);
  const projectInfo = [
    ['Client', safeText(cust.companyName)],
    ['Project #', safeText(cust.projectNumber)],
    ...(cust.obfNumber ? [['OBF #', safeText(cust.obfNumber)]] : []),
    ...(cust.siteLocation ? [['Site', safeText(cust.siteLocation)]] : []),
    ...(cust.address || cust.city || cust.state || cust.zipCode
      ? [['Address', [cust.address, cust.city, cust.state, cust.zipCode].filter(Boolean).join(', ')]]
      : []),
    ...(cust.primaryContactName ? [['Primary Contact', safeText(cust.primaryContactName)]] : []),
    ...(cust.primaryContactEmail ? [['Email', safeText(cust.primaryContactEmail)]] : []),
    ...(cust.primaryContactPhone ? [['Phone', safeText(cust.primaryContactPhone)]] : []),
  ];

  autoTable(doc, {
    startY: y,
    head: [['Project Information', '']],
    body: projectInfo,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85] },
    styles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 135 } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  autoTable(doc, {
    startY: y,
    head: [['Change Order Details', '']],
    body: [
      ['Amount', money(co.amountUsd)],
      ['Description', safeText(co.description)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85] },
    styles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 135 } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  const ai = (co.aiBody || null) as ChangeOrderAiBody | null;
  if (ai) {
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('Scope & Terms', 14, y);
    y += 8;

    doc.setFontSize(10);
    const summary = safeText(ai.summary);
    if (summary) {
      const lines = doc.splitTextToSize(summary, 180);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 4;
    }

    const scope = Array.isArray(ai.scopeOfWork) ? ai.scopeOfWork : [];
    if (scope.length) {
      doc.setFontSize(11);
      doc.text('Scope of Work', 14, y);
      y += 6;
      doc.setFontSize(10);
      scope.forEach((s) => {
        const lines = doc.splitTextToSize(`• ${safeText(s)}`, 180);
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(lines, 14, y);
        y += lines.length * 5 + 1;
      });
      y += 3;
    }

    const terms = Array.isArray(ai.termsAndConditions) ? ai.termsAndConditions : [];
    if (terms.length) {
      doc.setFontSize(11);
      doc.text('Terms & Conditions', 14, y);
      y += 6;
      doc.setFontSize(10);
      terms.forEach((t) => {
        const lines = doc.splitTextToSize(`• ${safeText(t)}`, 180);
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(lines, 14, y);
        y += lines.length * 5 + 1;
      });
      y += 3;
    }
  }

  // Signature blocks
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(11);
  doc.text('Approval', 14, y);
  y += 10;
  doc.setFontSize(10);
  doc.text('Client Authorized Signature: ________________________________   Date: ____________', 14, y);
  y += 8;
  doc.text('EverWatt Authorized Signature: _______________________________   Date: ____________', 14, y);

  return doc.output('blob');
}

function h(level: DocxHeadingLevel, text: string): Paragraph {
  return new Paragraph({ text, heading: level, spacing: { after: 200 } });
}

function p(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun(text)], spacing: { after: 120 } });
}

function bullets(items: string[]): Paragraph[] {
  return items
    .filter((x) => safeText(x))
    .map(
      (t) =>
        new Paragraph({
          text: safeText(t),
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
    );
}

export async function generateChangeOrderWord(co: ChangeOrderRecord): Promise<Blob> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `CHANGE ORDER #${co.changeOrderNumber}`,
          bold: true,
          size: 32,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Date: ${new Date(co.metadata?.generatedAt || Date.now()).toLocaleDateString()}`,
          italics: true,
          color: '666666',
        }),
      ],
      spacing: { after: 240 },
    })
  );

  const cust = co.customer || ({} as any);
  children.push(h(HeadingLevel.HEADING_1, 'Project Information'));
  children.push(p(`Client: ${safeText(cust.companyName)}`));
  children.push(p(`Project #: ${safeText(cust.projectNumber)}`));
  if (cust.obfNumber) children.push(p(`OBF #: ${safeText(cust.obfNumber)}`));
  if (cust.siteLocation) children.push(p(`Site: ${safeText(cust.siteLocation)}`));
  const addr = [cust.address, cust.city, cust.state, cust.zipCode, cust.country].filter(Boolean).join(', ');
  if (addr) children.push(p(`Address: ${addr}`));
  if (cust.primaryContactName) children.push(p(`Primary Contact: ${safeText(cust.primaryContactName)}`));
  if (cust.primaryContactEmail) children.push(p(`Email: ${safeText(cust.primaryContactEmail)}`));
  if (cust.primaryContactPhone) children.push(p(`Phone: ${safeText(cust.primaryContactPhone)}`));

  children.push(h(HeadingLevel.HEADING_1, 'Change Order Details'));
  children.push(p(`Amount: ${money(co.amountUsd)}`));
  children.push(p(`Description: ${safeText(co.description)}`));

  const ai = (co.aiBody || null) as ChangeOrderAiBody | null;
  if (ai) {
    children.push(h(HeadingLevel.HEADING_1, 'Scope & Terms'));
    if (ai.summary) children.push(p(safeText(ai.summary)));
    if (ai.scopeOfWork?.length) {
      children.push(h(HeadingLevel.HEADING_2, 'Scope of Work'));
      children.push(...bullets(ai.scopeOfWork));
    }
    if (ai.exclusions?.length) {
      children.push(h(HeadingLevel.HEADING_2, 'Exclusions'));
      children.push(...bullets(ai.exclusions));
    }
    if (ai.scheduleImpact) {
      children.push(h(HeadingLevel.HEADING_2, 'Schedule Impact'));
      children.push(p(safeText(ai.scheduleImpact)));
    }
    if (ai.termsAndConditions?.length) {
      children.push(h(HeadingLevel.HEADING_2, 'Terms & Conditions'));
      children.push(...bullets(ai.termsAndConditions));
    }
  }

  children.push(h(HeadingLevel.HEADING_1, 'Approval'));
  children.push(p('Client Authorized Signature: ________________________________   Date: ____________'));
  children.push(p('EverWatt Authorized Signature: _______________________________   Date: ____________'));

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });
  return await Packer.toBlob(doc);
}

export async function generateChangeOrder(co: ChangeOrderRecord, format: ChangeOrderFileFormat): Promise<{ blob: Blob; filename: string }> {
  const filename = buildFilename(co, format);
  const blob = format === 'pdf' ? generateChangeOrderPDF(co) : await generateChangeOrderWord(co);
  return { blob, filename };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


