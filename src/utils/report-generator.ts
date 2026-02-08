/**
 * Report Generation Utilities
 * Supports PDF and Excel export for various report types
 */

// @ts-ignore - jsPDF types
import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable types
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { generateWordReport } from './report-generator-word';

export interface ReportData {
  title: string;
  type: 'energy-model' | 'regression' | 'savings' | 'proposal';
  building?: {
    name: string;
    address: string;
    squareFootage: number;
    buildingType: string;
  };
  audit?: unknown;
  calculations?: {
    hvac?: {
      individual?: HvacCalcItem[];
      aggregate?: { annualSavings: number; paybackYears: number; co2Reduction: number };
    };
    lighting?: {
      individual?: LightingCalcItem[];
      aggregate?: { annualSavings: number; paybackYears: number; kwhReduction: number; co2Reduction: number };
    };
    battery?: unknown;
  };
  financials?: {
    annualSavings: number;
    projectCost: number;
    paybackYears: number;
    npv10: number;
    co2Reduction: number;
  };
  recommendations?: string[];
  metadata?: {
    generatedAt: string;
    generatedBy?: string;
  };
}

type HvacCalcItem = {
  system: {
    name?: string;
    type: string;
    capacity: number;
    currentEfficiency?: number;
    proposedEfficiency?: number;
  };
  result: { annualSavings: number; paybackYears: number; co2Reduction?: number };
};

type LightingCalcItem = {
  system: {
    name?: string;
    type?: string;
    fixtureCount?: number;
    currentWattage?: number;
    proposedWattage?: number;
  };
  result: { annualSavings: number; paybackYears: number; kwhReduction?: number; co2Reduction?: number };
};

/**
 * Generate PDF Report
 */
export function generatePDFReport(data: ReportData): Blob {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // Blue
  doc.text(data.title, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${data.metadata?.generatedAt || new Date().toLocaleString()}`, 14, 30);
  
  let yPosition = 40;

  // Building Information Section
  if (data.building) {
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Building Information', 14, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Name: ${data.building.name}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Address: ${data.building.address}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Square Footage: ${data.building.squareFootage.toLocaleString()} sq ft`, 14, yPosition);
    yPosition += 7;
    doc.text(`Building Type: ${data.building.buildingType}`, 14, yPosition);
    yPosition += 15;
  }

  // Financial Summary
  if (data.financials) {
    doc.setFontSize(14);
    doc.text('Financial Summary', 14, yPosition);
    yPosition += 10;

    const financials = [
      ['Annual Savings', `$${data.financials.annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
      ['Project Cost', `$${data.financials.projectCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
      ['Payback Period', `${data.financials.paybackYears.toFixed(1)} years`],
      ['NPV (10 years)', `$${data.financials.npv10.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
      ['CO₂ Reduction', `${data.financials.co2Reduction.toFixed(1)} tons/year`],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: financials,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 10 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // HVAC Systems Table
  if (data.calculations?.hvac?.individual) {
    doc.setFontSize(14);
    doc.text('HVAC Systems Analysis', 14, yPosition);
    yPosition += 10;

    const hvacRows = data.calculations.hvac.individual.map((item) => [
      item.system.name || item.system.type,
      `${item.system.capacity} ${item.system.type === 'boiler' ? 'MBH' : 'tons'}`,
      `$${item.result.annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      `${item.result.paybackYears.toFixed(1)} yrs`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['System', 'Capacity', 'Annual Savings', 'Payback']],
      body: hvacRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Lighting Systems Table
  if (data.calculations?.lighting?.individual) {
    doc.setFontSize(14);
    doc.text('Lighting Systems Analysis', 14, yPosition);
    yPosition += 10;

    const lightingRows = data.calculations.lighting.individual.map((item) => [
      item.system.name || item.system.type,
      `${item.system.fixtureCount} fixtures`,
      `$${item.result.annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      `${item.result.paybackYears.toFixed(1)} yrs`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['System', 'Fixtures', 'Annual Savings', 'Payback']],
      body: lightingRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Recommendations
  if (data.recommendations && data.recommendations.length > 0) {
    doc.setFontSize(14);
    doc.text('Recommendations', 14, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    data.recommendations.forEach((rec, index) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`${index + 1}. ${rec}`, 14, yPosition);
      yPosition += 7;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

/**
 * Generate Excel Report
 */
export function generateExcelReport(data: ReportData): Blob {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData: Array<Array<string | number>> = [
    ['Report', data.title],
    ['Generated', data.metadata?.generatedAt || new Date().toLocaleString()],
    [''],
  ];

  if (data.building) {
    summaryData.push(['BUILDING INFORMATION', '']);
    summaryData.push(['Name', data.building.name]);
    summaryData.push(['Address', data.building.address]);
    summaryData.push(['Square Footage', data.building.squareFootage]);
    summaryData.push(['Building Type', data.building.buildingType]);
    summaryData.push(['']);
  }

  if (data.financials) {
    summaryData.push(['FINANCIAL SUMMARY', '']);
    summaryData.push(['Annual Savings', data.financials.annualSavings]);
    summaryData.push(['Project Cost', data.financials.projectCost]);
    summaryData.push(['Payback Period (years)', data.financials.paybackYears]);
    summaryData.push(['NPV (10 years)', data.financials.npv10]);
    summaryData.push(['CO₂ Reduction (tons/year)', data.financials.co2Reduction]);
    summaryData.push(['']);
  }

  if (data.recommendations && data.recommendations.length > 0) {
    summaryData.push(['RECOMMENDATIONS', '']);
    data.recommendations.forEach(rec => {
      summaryData.push([rec, '']);
    });
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // HVAC Sheet
  if (data.calculations?.hvac?.individual) {
    const hvacHeaders = [['System', 'Type', 'Capacity', 'Current Efficiency', 'Proposed Efficiency', 'Annual Savings ($)', 'Payback (years)', 'CO₂ Reduction (tons)']];
    const hvacRows = data.calculations.hvac.individual.map((item) => [
      item.system.name || item.system.type,
      item.system.type,
      item.system.capacity,
      item.system.currentEfficiency,
      item.system.proposedEfficiency,
      item.result.annualSavings,
      item.result.paybackYears,
      item.result.co2Reduction,
    ]);
    const hvacData = [...hvacHeaders, ...hvacRows];
    
    if (data.calculations.hvac.aggregate) {
      hvacData.push([]);
      hvacData.push(['TOTALS', '', '', '', '', 
        data.calculations.hvac.aggregate.annualSavings,
        data.calculations.hvac.aggregate.paybackYears,
        data.calculations.hvac.aggregate.co2Reduction,
      ]);
    }

    const hvacSheet = XLSX.utils.aoa_to_sheet(hvacData);
    XLSX.utils.book_append_sheet(workbook, hvacSheet, 'HVAC Systems');
  }

  // Lighting Sheet
  if (data.calculations?.lighting?.individual) {
    const lightingHeaders = [['System', 'Type', 'Fixtures', 'Current Wattage', 'Proposed Wattage', 'Annual Savings ($)', 'Payback (years)', 'kWh Reduction', 'CO₂ Reduction (tons)']];
    const lightingRows = data.calculations.lighting.individual.map((item) => [
      item.system.name || item.system.type,
      item.system.type,
      item.system.fixtureCount,
      item.system.currentWattage,
      item.system.proposedWattage,
      item.result.annualSavings,
      item.result.paybackYears,
      item.result.kwhReduction,
      item.result.co2Reduction,
    ]);
    const lightingData = [...lightingHeaders, ...lightingRows];
    
    if (data.calculations.lighting.aggregate) {
      lightingData.push([]);
      lightingData.push(['TOTALS', '', '', '', '', 
        data.calculations.lighting.aggregate.annualSavings,
        data.calculations.lighting.aggregate.paybackYears,
        data.calculations.lighting.aggregate.kwhReduction,
        data.calculations.lighting.aggregate.co2Reduction,
      ]);
    }

    const lightingSheet = XLSX.utils.aoa_to_sheet(lightingData);
    XLSX.utils.book_append_sheet(workbook, lightingSheet, 'Lighting Systems');
  }

  // Convert to blob
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Download file helper
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate report based on type
 */
export async function generateReport(data: ReportData, format: 'pdf' | 'excel' | 'word'): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${data.title.replace(/[^a-z0-9]/gi, '_')}_${timestamp}`;

  if (format === 'pdf') {
    const pdfBlob = generatePDFReport(data);
    downloadFile(pdfBlob, `${filename}.pdf`);
  } else if (format === 'excel') {
    const excelBlob = generateExcelReport(data);
    downloadFile(excelBlob, `${filename}.xlsx`);
  } else {
    const wordBlob = await generateWordReport(data);
    downloadFile(wordBlob, `${filename}.docx`);
  }
}

