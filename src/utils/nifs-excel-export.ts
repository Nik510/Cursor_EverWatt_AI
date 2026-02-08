/**
 * NIFS Excel Export Utility
 * Generates Excel files for NIFS Solar Analysis
 */

import * as XLSX from 'xlsx';
import type { ProjectData, NIFSResult } from '../modules/nifs';

/**
 * Generates an Excel workbook for NIFS analysis
 * Note: This is a simplified version. For full template filling,
 * you may need to use a backend API with openpyxl or similar.
 */
export function generateNIFSExcel(projectData: ProjectData): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // 1. Create Summary Sheet
  const summaryData = [
    ['NIFS Analysis - Savings Summary'],
    ['Project Name', projectData.projectName],
    ['Total Project Savings (kWh)', projectData.totalProjectSavings],
    [],
    ['Meter', 'Has Solar', 'Total Eligible Savings (kWh)'],
  ];

  projectData.meters.forEach((meter) => {
    summaryData.push([
      meter.id,
      meter.hasSolar ? 'Y' : 'N',
      meter.result?.totalEligible || 0,
    ]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'NIFS Summary');

  // 2. Create sheets for each solar meter
  projectData.meters.forEach((meter, index) => {
    if (!meter.hasSolar || !meter.result || meter.result.breakdown.length === 0) {
      return;
    }

    const meterData = [
      ['NIFS Analysis - Meter ' + (index + 1)],
      ['Service Account ID (SAID)', meter.id],
      ['Allocated Savings (kWh)', meter.allocatedSavings],
      [],
      ['Bill Date', 'Grid Usage (kWh)', 'Target Savings (kWh)', 'Eligible Savings (kWh)', 'Note'],
    ];

    meter.result.breakdown.forEach((row) => {
      meterData.push([
        row.billDate,
        row.gridUsage,
        row.targetSavings,
        row.eligibleSavings,
        row.note,
      ]);
    });

    // Add totals
    meterData.push([]);
    meterData.push(['Total Requested', meter.result.totalRequested]);
    meterData.push(['Total Eligible', meter.result.totalEligible]);
    meterData.push(['Savings Lost', meter.result.savingsLost]);

    const meterSheet = XLSX.utils.aoa_to_sheet(meterData);
    XLSX.utils.book_append_sheet(workbook, meterSheet, `Meter ${index + 1}`);
  });

  return workbook;
}

/**
 * Downloads the Excel file
 */
export function downloadNIFSExcel(projectData: ProjectData, filename?: string): void {
  const workbook = generateNIFSExcel(projectData);
  const fileName = filename || `NIFS_Analysis_${projectData.projectName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

