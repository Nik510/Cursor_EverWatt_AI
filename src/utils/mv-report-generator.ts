/**
 * Measurement and Verification (M&V) Report Generator
 * 
 * Generates M&V reports comparing project performance before and after upgrades
 * Supports multiple time period comparisons: monthly, quarterly, bi-annual, and yearly
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { generateWordReport } from './report-generator-word';
import type { ReportData } from './report-generator';

export type MVTimePeriod = 'monthly' | 'quarterly' | 'bi-annual' | 'yearly';

export interface MVProjectData {
  projectId: string;
  projectName: string;
  upgradeDate: Date;
  building?: {
    name: string;
    address: string;
    squareFootage: number;
    buildingType: string;
  };
}

export interface MVComparisonData {
  period: string; // e.g., "2024-Q1", "2024-H1", "2024"
  periodStart: Date;
  periodEnd: Date;
  baseline: {
    energyConsumption: number; // kWh
    demandPeak: number; // kW
    cost: number; // $
    averageDemand: number; // kW
    operatingHours: number;
  };
  postUpgrade: {
    energyConsumption: number; // kWh
    demandPeak: number; // kW
    cost: number; // $
    averageDemand: number; // kW
    operatingHours: number;
  };
  savings: {
    energySavings: number; // kWh
    energySavingsPercent: number; // %
    demandReduction: number; // kW
    demandReductionPercent: number; // %
    costSavings: number; // $
    costSavingsPercent: number; // %
  };
}

export interface MVReportData {
  title: string;
  project: MVProjectData;
  timePeriod: MVTimePeriod;
  comparisons: MVComparisonData[];
  summary: {
    totalEnergySavings: number; // kWh
    totalCostSavings: number; // $
    averageEnergySavingsPercent: number; // %
    averageDemandReduction: number; // kW
    averageDemandReductionPercent: number; // %
    totalOperatingHours: number;
  };
  metadata?: {
    generatedAt: string;
    generatedBy?: string;
  };
}

/**
 * Calculate comparison data for a given period
 */
export function calculateMVComparison(
  baselineData: Array<{ timestamp: Date; energy?: number; demand: number; cost?: number }>,
  postUpgradeData: Array<{ timestamp: Date; energy?: number; demand: number; cost?: number }>,
  periodStart: Date,
  periodEnd: Date
): MVComparisonData {
  // Filter data for the period
  const baselinePeriod = baselineData.filter(
    (d) => d.timestamp >= periodStart && d.timestamp <= periodEnd
  );
  const postUpgradePeriod = postUpgradeData.filter(
    (d) => d.timestamp >= periodStart && d.timestamp <= periodEnd
  );

  // Calculate baseline metrics
  const baselineEnergy = baselinePeriod.reduce((sum, d) => sum + (d.energy || 0), 0);
  const baselineDemandPeak = Math.max(...baselinePeriod.map((d) => d.demand), 0);
  const baselineCost = baselinePeriod.reduce((sum, d) => sum + (d.cost || 0), 0);
  const baselineAvgDemand =
    baselinePeriod.length > 0
      ? baselinePeriod.reduce((sum, d) => sum + d.demand, 0) / baselinePeriod.length
      : 0;

  // Calculate post-upgrade metrics
  const postUpgradeEnergy = postUpgradePeriod.reduce((sum, d) => sum + (d.energy || 0), 0);
  const postUpgradeDemandPeak = Math.max(...postUpgradePeriod.map((d) => d.demand), 0);
  const postUpgradeCost = postUpgradePeriod.reduce((sum, d) => sum + (d.cost || 0), 0);
  const postUpgradeAvgDemand =
    postUpgradePeriod.length > 0
      ? postUpgradePeriod.reduce((sum, d) => sum + d.demand, 0) / postUpgradePeriod.length
      : 0;

  // Calculate savings
  const energySavings = baselineEnergy - postUpgradeEnergy;
  const energySavingsPercent = baselineEnergy > 0 ? (energySavings / baselineEnergy) * 100 : 0;
  const demandReduction = baselineDemandPeak - postUpgradeDemandPeak;
  const demandReductionPercent =
    baselineDemandPeak > 0 ? (demandReduction / baselineDemandPeak) * 100 : 0;
  const costSavings = baselineCost - postUpgradeCost;
  const costSavingsPercent = baselineCost > 0 ? (costSavings / baselineCost) * 100 : 0;

  // Calculate operating hours (assuming 15-minute intervals)
  const operatingHours = baselinePeriod.length * 0.25;

  const periodLabel = formatPeriodLabel(periodStart, periodEnd);

  return {
    period: periodLabel,
    periodStart,
    periodEnd,
    baseline: {
      energyConsumption: baselineEnergy,
      demandPeak: baselineDemandPeak,
      cost: baselineCost,
      averageDemand: baselineAvgDemand,
      operatingHours,
    },
    postUpgrade: {
      energyConsumption: postUpgradeEnergy,
      demandPeak: postUpgradeDemandPeak,
      cost: postUpgradeCost,
      averageDemand: postUpgradeAvgDemand,
      operatingHours,
    },
    savings: {
      energySavings,
      energySavingsPercent,
      demandReduction,
      demandReductionPercent,
      costSavings,
      costSavingsPercent,
    },
  };
}

/**
 * Format period label based on time period type
 */
function formatPeriodLabel(start: Date, end: Date): string {
  const year = start.getFullYear();
  const month = start.getMonth() + 1;
  const quarter = Math.floor(month / 3) + 1;

  // Determine if it's monthly, quarterly, bi-annual, or yearly
  const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 35) {
    // Monthly
    return `${year}-${String(month).padStart(2, '0')}`;
  } else if (daysDiff <= 100) {
    // Quarterly
    return `${year}-Q${quarter}`;
  } else if (daysDiff <= 200) {
    // Bi-annual
    const half = quarter <= 2 ? 'H1' : 'H2';
    return `${year}-${half}`;
  } else {
    // Yearly
    return `${year}`;
  }
}

/**
 * Generate periods for comparison based on time period type
 */
export function generateComparisonPeriods(
  upgradeDate: Date,
  timePeriod: MVTimePeriod,
  numberOfPeriods: number = 12
): Array<{ start: Date; end: Date }> {
  const periods: Array<{ start: Date; end: Date }> = [];
  const now = new Date();

  // Start from upgrade date and generate periods forward
  let currentStart = new Date(upgradeDate);

  for (let i = 0; i < numberOfPeriods; i++) {
    let periodEnd: Date;

    switch (timePeriod) {
      case 'monthly':
        periodEnd = new Date(currentStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(0); // Last day of the month
        break;
      case 'quarterly':
        periodEnd = new Date(currentStart);
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        periodEnd.setDate(0);
        break;
      case 'bi-annual':
        periodEnd = new Date(currentStart);
        periodEnd.setMonth(periodEnd.getMonth() + 6);
        periodEnd.setDate(0);
        break;
      case 'yearly':
        periodEnd = new Date(currentStart);
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        periodEnd.setDate(0);
        break;
    }

    // Don't generate periods beyond today
    if (currentStart > now) break;
    if (periodEnd > now) periodEnd = now;

    periods.push({ start: new Date(currentStart), end: new Date(periodEnd) });

    // Move to next period
    currentStart = new Date(periodEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  return periods;
}

/**
 * Calculate summary statistics from comparison data
 */
export function calculateMVSummary(comparisons: MVComparisonData[]): MVReportData['summary'] {
  if (comparisons.length === 0) {
    return {
      totalEnergySavings: 0,
      totalCostSavings: 0,
      averageEnergySavingsPercent: 0,
      averageDemandReduction: 0,
      averageDemandReductionPercent: 0,
      totalOperatingHours: 0,
    };
  }

  const totalEnergySavings = comparisons.reduce(
    (sum, c) => sum + c.savings.energySavings,
    0
  );
  const totalCostSavings = comparisons.reduce((sum, c) => sum + c.savings.costSavings, 0);
  const averageEnergySavingsPercent =
    comparisons.reduce((sum, c) => sum + c.savings.energySavingsPercent, 0) /
    comparisons.length;
  const averageDemandReduction =
    comparisons.reduce((sum, c) => sum + c.savings.demandReduction, 0) / comparisons.length;
  const averageDemandReductionPercent =
    comparisons.reduce((sum, c) => sum + c.savings.demandReductionPercent, 0) /
    comparisons.length;
  const totalOperatingHours = comparisons.reduce(
    (sum, c) => sum + c.baseline.operatingHours,
    0
  );

  return {
    totalEnergySavings,
    totalCostSavings,
    averageEnergySavingsPercent,
    averageDemandReduction,
    averageDemandReductionPercent,
    totalOperatingHours,
  };
}

/**
 * Generate PDF M&V Report
 */
export function generateMVPDFReport(data: MVReportData): Blob {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.text('Measurement and Verification Report', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${data.metadata?.generatedAt || new Date().toLocaleString()}`, 14, 30);
  doc.text(`Time Period: ${data.timePeriod.charAt(0).toUpperCase() + data.timePeriod.slice(1)}`, 14, 36);

  let yPosition = 45;

  // Project Information
  if (data.project.building) {
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Project Information', 14, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Project: ${data.project.projectName}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Building: ${data.project.building.name}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Address: ${data.project.building.address}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Upgrade Date: ${data.project.upgradeDate.toLocaleDateString()}`, 14, yPosition);
    yPosition += 15;
  }

  // Summary Section
  doc.setFontSize(14);
  doc.text('Summary', 14, yPosition);
  yPosition += 10;

  const summaryData = [
    ['Total Energy Savings', `${data.summary.totalEnergySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`],
    ['Total Cost Savings', `$${data.summary.totalCostSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
    ['Average Energy Savings %', `${data.summary.averageEnergySavingsPercent.toFixed(2)}%`],
    ['Average Demand Reduction', `${data.summary.averageDemandReduction.toFixed(1)} kW`],
    ['Average Demand Reduction %', `${data.summary.averageDemandReductionPercent.toFixed(2)}%`],
    ['Total Operating Hours', `${data.summary.totalOperatingHours.toFixed(0)} hours`],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 10 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Period-by-Period Comparison
  doc.setFontSize(14);
  doc.text('Period-by-Period Comparison', 14, yPosition);
  yPosition += 10;

  const comparisonRows = data.comparisons.map((comp) => [
    comp.period,
    comp.baseline.energyConsumption.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    comp.postUpgrade.energyConsumption.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    comp.savings.energySavings.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    `${comp.savings.energySavingsPercent.toFixed(2)}%`,
    `$${comp.savings.costSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Period', 'Baseline (kWh)', 'Post-Upgrade (kWh)', 'Savings (kWh)', 'Savings %', 'Cost Savings']],
    body: comparisonRows,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Demand Comparison Table
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.text('Demand Comparison', 14, yPosition);
  yPosition += 10;

  const demandRows = data.comparisons.map((comp) => [
    comp.period,
    comp.baseline.demandPeak.toFixed(1),
    comp.postUpgrade.demandPeak.toFixed(1),
    comp.savings.demandReduction.toFixed(1),
    `${comp.savings.demandReductionPercent.toFixed(2)}%`,
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Period', 'Baseline Peak (kW)', 'Post-Upgrade Peak (kW)', 'Reduction (kW)', 'Reduction %']],
    body: demandRows,
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241] },
    styles: { fontSize: 9 },
  });

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
 * Generate Excel M&V Report
 */
export function generateMVExcelReport(data: MVReportData): Blob {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData: Array<Array<string | number>> = [
    ['Measurement and Verification Report'],
    ['Generated', data.metadata?.generatedAt || new Date().toLocaleString()],
    ['Time Period', data.timePeriod],
    [''],
    ['PROJECT INFORMATION', ''],
  ];

  if (data.project.building) {
    summaryData.push(['Project Name', data.project.projectName]);
    summaryData.push(['Building', data.project.building.name]);
    summaryData.push(['Address', data.project.building.address]);
    summaryData.push(['Square Footage', data.project.building.squareFootage]);
    summaryData.push(['Building Type', data.project.building.buildingType]);
  }
  summaryData.push(['Upgrade Date', data.project.upgradeDate.toISOString().split('T')[0]]);
  summaryData.push(['']);

  summaryData.push(['SUMMARY', '']);
  summaryData.push(['Total Energy Savings (kWh)', data.summary.totalEnergySavings]);
  summaryData.push(['Total Cost Savings ($)', data.summary.totalCostSavings]);
  summaryData.push(['Average Energy Savings %', data.summary.averageEnergySavingsPercent]);
  summaryData.push(['Average Demand Reduction (kW)', data.summary.averageDemandReduction]);
  summaryData.push(['Average Demand Reduction %', data.summary.averageDemandReductionPercent]);
  summaryData.push(['Total Operating Hours', data.summary.totalOperatingHours]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Comparison Sheet
  const comparisonHeaders = [
    'Period',
    'Period Start',
    'Period End',
    'Baseline Energy (kWh)',
    'Post-Upgrade Energy (kWh)',
    'Energy Savings (kWh)',
    'Energy Savings %',
    'Baseline Peak Demand (kW)',
    'Post-Upgrade Peak Demand (kW)',
    'Demand Reduction (kW)',
    'Demand Reduction %',
    'Baseline Cost ($)',
    'Post-Upgrade Cost ($)',
    'Cost Savings ($)',
    'Cost Savings %',
    'Operating Hours',
  ];

  const comparisonRows = data.comparisons.map((comp) => [
    comp.period,
    comp.periodStart.toISOString().split('T')[0],
    comp.periodEnd.toISOString().split('T')[0],
    comp.baseline.energyConsumption,
    comp.postUpgrade.energyConsumption,
    comp.savings.energySavings,
    comp.savings.energySavingsPercent,
    comp.baseline.demandPeak,
    comp.postUpgrade.demandPeak,
    comp.savings.demandReduction,
    comp.savings.demandReductionPercent,
    comp.baseline.cost,
    comp.postUpgrade.cost,
    comp.savings.costSavings,
    comp.savings.costSavingsPercent,
    comp.baseline.operatingHours,
  ]);

  const comparisonData = [comparisonHeaders, ...comparisonRows];
  const comparisonSheet = XLSX.utils.aoa_to_sheet(comparisonData);
  XLSX.utils.book_append_sheet(workbook, comparisonSheet, 'Comparisons');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Generate Word M&V Report
 */
export async function generateMVWordReport(data: MVReportData): Promise<Blob> {
  // Convert MVReportData to ReportData format for Word generation
  const reportData: ReportData = {
    title: data.title,
    type: 'savings',
    building: data.project.building,
    financials: {
      annualSavings: data.summary.totalCostSavings,
      projectCost: 0, // Not available in M&V context
      paybackYears: 0,
      npv10: 0,
      co2Reduction: 0, // Could be calculated if needed
    },
    metadata: data.metadata,
  };

  // For now, use the standard Word report generator
  // In the future, we could create a specialized M&V Word template
  return await generateWordReport(reportData);
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
 * Generate M&V report based on format
 */
export async function generateMVReport(
  data: MVReportData,
  format: 'pdf' | 'excel' | 'word'
): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `M&V_Report_${data.project.projectName.replace(/[^a-z0-9]/gi, '_')}_${timestamp}`;

  if (format === 'pdf') {
    const pdfBlob = generateMVPDFReport(data);
    downloadFile(pdfBlob, `${filename}.pdf`);
  } else if (format === 'excel') {
    const excelBlob = generateMVExcelReport(data);
    downloadFile(excelBlob, `${filename}.xlsx`);
  } else {
    const wordBlob = await generateMVWordReport(data);
    downloadFile(wordBlob, `${filename}.docx`);
  }
}
