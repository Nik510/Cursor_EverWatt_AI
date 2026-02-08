import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CarbonEquivalencies, CarbonTotals, ElectricityFactorMode } from './epa-equivalencies';

export type CarbonReportMeta = {
  customerName: string;
  projectName: string;
  siteAddress: string;
  reportPeriodLabel: string; // e.g. "Calendar Year 2025" or "Jan 2025 – Dec 2025"
  generatedAt: string;
};

export type CarbonReportInputs = {
  avoidedKwh: number;
  avoidedTherms: number;
  electricityFactorMode: ElectricityFactorMode;
  electricityFactorTonsPerKwh: number;
};

function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

function fmt1(n: number): string {
  if (!Number.isFinite(n)) return '0.0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

function fmt2(n: number): string {
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function drawBadge(doc: jsPDF, x: number, y: number, w: number, h: number, label: string): void {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 6, 6, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(label, x + 8, y + h / 2 + 3);
}

function drawMetricCard(doc: jsPDF, x: number, y: number, w: number, h: number, title: string, value: string, subtitle?: string): void {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 10, 10, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  doc.text(title, x + 12, y + 18);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(22);
  doc.text(value, x + 12, y + 44);

  if (subtitle) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text(subtitle, x + 12, y + h - 12);
  }
}

function drawEquivalencyPill(doc: jsPDF, x: number, y: number, label: string, value: string): void {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, 170, 16, 8, 8, 'FD');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(label, x + 8, y + 11);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(value, x + 170 - 8, y + 11, { align: 'right' });
}

export function generateCarbonFootprintReportPdf(args: {
  meta: CarbonReportMeta;
  inputs: CarbonReportInputs;
  totals: CarbonTotals;
  equiv: CarbonEquivalencies;
}): Blob {
  const { meta, inputs, totals, equiv } = args;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ========= Cover / Hero =========
  // Background gradient-ish (layered rectangles)
  doc.setFillColor(16, 185, 129); // emerald
  doc.rect(0, 0, pageW, 220, 'F');
  doc.setFillColor(37, 99, 235); // blue
  // Keep to typed jsPDF APIs (no opacity features)
  doc.rect(0, 0, pageW, 140, 'F');

  drawBadge(doc, 44, 34, 210, 24, 'Carbon Footprint Report (EPA-based)');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text('Carbon Footprint', 44, 92);
  doc.setFontSize(16);
  doc.text('Avoided emissions from efficiency savings', 44, 118);

  doc.setFontSize(11);
  doc.text(`Customer: ${meta.customerName}`, 44, 150);
  doc.text(`Project: ${meta.projectName}`, 44, 168);
  doc.text(`Location: ${meta.siteAddress}`, 44, 186);
  doc.text(`Period: ${meta.reportPeriodLabel}`, 44, 204);

  // Big headline number
  const headlineMt = totals.totalMtCo2e;
  const headline = `${fmt1(headlineMt)} metric tons CO₂e avoided`;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(20);
  doc.text(headline, 44, 260);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(11);
  doc.text(`Generated: ${meta.generatedAt}`, 44, 280);

  // Metric cards row
  const cardY = 304;
  const cardW = (pageW - 44 * 2 - 16 * 2) / 3;
  drawMetricCard(doc, 44, cardY, cardW, 84, 'Electricity savings', `${fmtInt(inputs.avoidedKwh)} kWh`, 'Avoided generation');
  drawMetricCard(doc, 44 + cardW + 16, cardY, cardW, 84, 'Natural gas savings', `${fmtInt(inputs.avoidedTherms)} therms`, 'Avoided combustion');
  drawMetricCard(doc, 44 + (cardW + 16) * 2, cardY, cardW, 84, 'Total avoided', `${fmt1(totals.totalMtCo2e)} mt`, `${fmtInt(totals.totalLbCo2e)} lb CO₂e`);

  // Fun equivalencies section
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.text('What does that mean?', 44, 420);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  doc.text('EPA Greenhouse Gas Equivalencies (national averages)', 44, 438);

  const eqStartY = 456;
  drawEquivalencyPill(doc, 44, eqStartY + 0, 'Urban tree seedlings grown for 10 years', `${fmtInt(equiv.urbanTreeSeedlings10yr)} seedlings`);
  drawEquivalencyPill(doc, 44, eqStartY + 22, 'Passenger vehicles driven for one year', `${fmt1(equiv.passengerVehiclesDrivenForOneYear)} vehicles`);
  drawEquivalencyPill(doc, 44, eqStartY + 44, 'Gallons of gasoline burned', `${fmtInt(equiv.gallonsOfGasolineBurned)} gallons`);
  drawEquivalencyPill(doc, 44, eqStartY + 66, 'Households’ electricity use for one year', `${fmt1(equiv.householdsElectricityUseForOneYear)} homes`);
  drawEquivalencyPill(doc, 44, eqStartY + 88, '16‑lb propane cylinders consumed', `${fmtInt(equiv.propaneCylinders)} cylinders`);
  drawEquivalencyPill(doc, 44, eqStartY + 110, 'Railcars of coal burned', `${fmt2(equiv.railcarsOfCoalBurned)} railcars`);

  // Footer
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.text('EverWatt Engine • Carbon Footprint Report', pageW / 2, pageH - 28, { align: 'center' });

  // ========= Detail page =========
  doc.addPage();
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.text('Details & Assumptions', 44, 56);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(11);
  doc.text('This report uses EPA-published conversion factors and equivalencies (national averages).', 44, 76);

  // Breakdown table
  const rows = [
    ['Avoided electricity (kWh)', fmtInt(inputs.avoidedKwh), 'kWh', fmt2(inputs.electricityFactorTonsPerKwh), 'mt CO₂e / kWh', fmt2(totals.electricityMtCo2e)],
    ['Avoided natural gas (therms)', fmtInt(inputs.avoidedTherms), 'therms', fmt2(0.005302), 'mt CO₂ / therm', fmt2(totals.gasMtCo2e)],
  ];

  autoTable(doc, {
    startY: 98,
    head: [['Component', 'Quantity', 'Unit', 'Factor', 'Factor Unit', 'Emissions (mt)']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 170 },
      1: { halign: 'right' },
      3: { halign: 'right' },
      5: { halign: 'right' },
    },
  });

  const afterTableY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 18 : 180;

  // Summary callout
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(44, afterTableY, pageW - 88, 86, 12, 12, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.text('Total avoided emissions', 60, afterTableY + 28);
  doc.setFontSize(22);
  doc.text(`${fmt1(totals.totalMtCo2e)} mt CO₂e`, 60, afterTableY + 58);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  doc.text(`${fmtInt(totals.totalKgCo2e)} kg CO₂e • ${fmtInt(totals.totalLbCo2e)} lb CO₂e`, 60, afterTableY + 74);

  // Methods notes
  const noteY = afterTableY + 116;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.text('Method notes', 44, noteY);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  const lines = [
    `• Electricity factor mode: ${inputs.electricityFactorMode.toUpperCase()}`,
    '• Electricity uses EPA national-average factors (delivered electricity) unless custom factor is provided.',
    '• Natural gas factor reflects combustion emissions (CO₂) per therm.',
    '• Equivalencies are illustrative and not a substitute for program requirements.',
    '• For regulated reporting, use region- and year-specific emission factors when required.',
  ];
  let yy = noteY + 18;
  for (const l of lines) {
    doc.text(l, 52, yy);
    yy += 14;
  }

  // Decorative bar
  doc.setFillColor(37, 99, 235);
  doc.rect(0, pageH - 14, pageW, 14, 'F');

  return doc.output('blob');
}

export function generateCarbonFootprintCertificatePdf(args: {
  customerName: string;
  projectName: string;
  siteAddress: string;
  completionDateLabel: string;
  leadName: string;
  leadTitle: string;
  leadOrg: string;
  recognitionLine?: string;
}): Blob {
  const {
    customerName,
    projectName,
    siteAddress,
    completionDateLabel,
    leadName,
    leadTitle,
    leadOrg,
    recognitionLine,
  } = args;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, 70, 'F');

  // Border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(2);
  doc.roundedRect(36, 36, pageW - 72, pageH - 72, 18, 18, 'S');
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(6);
  doc.roundedRect(48, 48, pageW - 96, pageH - 96, 18, 18, 'S');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(34);
  doc.text('Certificate of Recognition', pageW / 2, 138, { align: 'center' });

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(12);
  doc.text('Presented to', pageW / 2, 170, { align: 'center' });

  // Recipient
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(30);
  doc.text(leadName, pageW / 2, 214, { align: 'center' });
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(12);
  doc.text(`${leadTitle} • ${leadOrg}`, pageW / 2, 236, { align: 'center' });

  // Recognition body
  doc.setTextColor(226, 232, 240);
  doc.setFontSize(13);
  const body = recognitionLine?.trim()
    ? recognitionLine.trim()
    : `In recognition of outstanding leadership delivering carbon-reducing energy savings for ${customerName}.`;
  doc.text(body, pageW / 2, 278, { align: 'center', maxWidth: pageW - 160 });

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(11);
  doc.text(`Project: ${projectName}`, pageW / 2, 316, { align: 'center' });
  doc.text(`Location: ${siteAddress}`, pageW / 2, 334, { align: 'center' });
  doc.text(`Completion Date: ${completionDateLabel}`, pageW / 2, 352, { align: 'center' });

  // Signature line blocks (client-side recognition)
  const sigY = pageH - 140;
  const leftX = pageW / 2 - 210;
  const rightX = pageW / 2 + 60;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(1);
  doc.line(leftX, sigY, leftX + 180, sigY);
  doc.line(rightX, sigY, rightX + 180, sigY);
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(10);
  doc.text('Client / Customer Representative', leftX + 90, sigY + 16, { align: 'center' });
  doc.text('EverWatt Representative', rightX + 90, sigY + 16, { align: 'center' });

  // Footer tag
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text('EverWatt Engine', 58, 52);

  return doc.output('blob');
}

