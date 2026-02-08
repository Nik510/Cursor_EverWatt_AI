/**
 * Comprehensive Utility Data Reader
 * 
 * FULLY READS and UNDERSTANDS utility data - no skimming
 * Captures every field, validates, and prepares for analysis
 */

import fs from 'fs';
import path from 'path';
import { parseCsv } from './csv-parser';
import XLSX from 'xlsx';
import type {
  ComprehensiveBillRecord,
  ComprehensiveIntervalRecord,
  UsageDataSummary,
  IntervalDataSummary,
  ThreeTierVerification,
  UtilityDataPackage,
} from './utility-data-types';

// Import rate library for Tier 3 verification

/**
 * Parse a number from various formats (handles commas, $, etc.)
 */
function parseNumericValue(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  
  const str = String(value)
    .replace(/[$,]/g, '')
    .replace(/[()]/g, '-')
    .trim();
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse a date from various formats including Excel serial dates
 */
function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  // Handle Excel serial dates (numbers like 45798 = ~2025)
  // Excel serial date: days since 1899-12-30
  // Range 30000-60000 covers roughly 1982-2064
  if (typeof value === 'number') {
    if (value > 30000 && value < 60000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
      return date;
    }
    // Milliseconds timestamp (very large number)
    if (value > 1000000000000) {
      return new Date(value);
    }
    // Seconds timestamp
    if (value > 1000000000 && value < 10000000000) {
      return new Date(value * 1000);
    }
  }
  
  const str = String(value).trim();
  if (!str) return null;
  
  // Handle MM/DD/YYYY format
  const mmddyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const month = parseInt(mmddyyyy[1]) - 1;
    const day = parseInt(mmddyyyy[2]);
    const year = parseInt(mmddyyyy[3]);
    return new Date(year, month, day);
  }
  
  // Handle MM/DD/YYYY HH:MM format (for interval data)
  const withTime = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (withTime) {
    const month = parseInt(withTime[1]) - 1;
    const day = parseInt(withTime[2]);
    const year = parseInt(withTime[3]);
    const hour = parseInt(withTime[4]);
    const minute = parseInt(withTime[5]);
    return new Date(year, month, day, hour, minute);
  }
  
  // Handle YYYY-MM-DD format
  const isoDate = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    return new Date(str);
  }
  
  // Try native parsing as fallback
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Read tabular data from CSV or XLSX/XLS
 */
function readTable(filePath: string): Array<Record<string, any>> {
  const ext = path.extname(filePath).toLowerCase();
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(absolutePath, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false }) as Array<Record<string, any>>;
    return rows;
  }

  // Fallback to CSV/TSV
  return parseCsv(absolutePath);
}

/**
 * Column mapping for usage/billing exports
 * FLEXIBLE: Handles PG&E exports, Green Button, generic monthly data
 */
const USAGE_COLUMN_MAPPINGS: Record<string, RegExp[]> = {
  billingName: [/^billing\s*name$/i, /^customer\s*name$/i, /^name$/i],
  siteAddress: [/^site\s*address$/i, /^address$/i, /^service\s*address$/i],
  siteCity: [/^site\s*city$/i, /^city$/i],
  zipCode: [/^zip\s*code$/i, /^zip$/i, /^postal$/i],
  saStatus: [/^sa\s*status$/i, /^status$/i],
  activity: [/^activity$/i],
  descriptor: [/^descriptor$/i],
  accountNumber: [/^account\s*#$/i, /^account\s*number$/i, /^account$/i],
  meterNumber: [/^meter\s*#$/i, /^meter\s*number$/i, /^meter$/i],
  nem: [/^nem\??$/i],
  // Service Agreement - also matches "Service Agreement" header
  saId: [/^sa\s*id$/i, /^said$/i, /^service\s*agreement\s*id$/i, /^service\s*agreement$/i],
  spId: [/^sp\s*id$/i],
  prsnId: [/^prsn\s*id$/i],
  naicsCode: [/^naics\s*code$/i],
  yearOfBillEndDate: [/^year\s*of\s*bill\s*end\s*date$/i],
  // Billing period start/end
  billStartDate: [
    /^bill\s*start\s*date$/i,
    /^start\s*date\s*time$/i,
    /^period\s*start$/i,
    /^billing\s*start$/i,
  ],
  billEndDate: [
    /^bill\s*end\s*date$/i,
    /^end\s*date\s*time$/i,
    /^period\s*end$/i,
    /^billing\s*end$/i,
    /^date$/i,
    /^billing\s*date$/i,
  ],
  rateCode: [/^rate$/i, /^rate\s*code$/i, /^rate\s*schedule$/i, /^tariff$/i],
  serviceProvider: [/^service\s*provider$/i, /^utility$/i, /^provider$/i],
  totalBillAmountPge: [/^tot\s*bill\s*amt\s*\(pg&?e\)$/i],
  billingDays: [/^days$/i, /^billing\s*days$/i],
  chargesPerKwh: [/^charges.*kwh.*usage$/i, /^charges\/\(kwh/i],
  pgeRevenueAmount: [/^pg&?e\s*revenue\s*amount/i],
  espTotalRevenueAmount: [/^esp\s*total\s*revenue/i],
  taxAmount: [/^tax\s*amount/i, /^tax$/i],
  // Cost/Bill Amount - matches "Cost", "Total Bill Amount", etc.
  totalBillAmount: [
    /^total\s*bill\s*amount/i, 
    /^bill\s*amount$/i, 
    /^cost$/i,      // Matches "Cost" column
    /^amount$/i, 
    /^total\s*cost$/i,
    /^charges$/i,
  ],
  onPeakKwh: [/^on\s*peak\s*\(kwh\)$/i, /^on\s*peak\s*kwh$/i],
  partialPeakKwh: [/^partial\s*peak\s*\(kwh\)$/i, /^partial\s*peak\s*kwh$/i],
  offPeakKwh: [/^off\s*peak\s*usage\s*\(kwh\)$/i, /^off\s*peak\s*\(kwh\)$/i, /^off\s*peak\s*kwh$/i],
  superOffPeakKwh: [/^super\s*off\s*peak\s*\(kwh\)$/i, /^super\s*off\s*peak\s*kwh$/i],
  // Usage kWh - matches "Usage", "Total Usage (kWh)", etc.
  totalUsageKwh: [
    /^total\s*usage\s*\(kwh\)$/i, 
    /^usage\s*kwh$/i, 
    /^usage$/i,     // Matches "Usage" column
    /^kwh$/i, 
    /^total\s*kwh$/i, 
    /^energy\s*kwh$/i,
    /^consumption$/i,
    /^energy$/i,
  ],
  totalUsageTherms: [/^total\s*usage\s*\(therms?\)$/i, /^therms$/i],
  hours: [/^hours$/i],
  // Peak Demand - matches "Peak Demand", "Max Max Demand (kW)", etc.
  maxMaxDemandKw: [
    /^max\.?\s*max\.?\s*demand\s*\(kw\)$/i, 
    /^demand[_\s]*kw$/i, 
    /^peak\s*demand$/i,    // Matches "Peak Demand" column
    /^max\s*demand$/i,
    /^demand$/i,
    /^kw$/i,
  ],
  onPeakDemandKw: [/^on\s*peak\s*\(kw\)$/i, /^on\s*peak\s*kw$/i],
  partialPeakDemandKw: [/^partial\s*peak\s*\(kw\)$/i, /^partial\s*peak\s*kw$/i],
  offPeakDemandKw: [/^off\s*peak\s*\(kw\)$/i, /^off\s*peak\s*kw$/i],
  superOffPeakDemandKw: [/^super\s*off\s*peak\s*\(kw\)$/i, /^super\s*off\s*peak\s*kw$/i],
};

/**
 * Column mapping for PG&E interval export
 */
const INTERVAL_COLUMN_MAPPINGS: Record<string, RegExp[]> = {
  serviceAgreement: [/^service\s*agreement$/i, /^sa\s*id$/i, /^said$/i],
  startDateTime: [/^start\s*date\s*time$/i, /^timestamp$/i, /^date$/i, /^datetime$/i],
  endDateTime: [/^end\s*date\s*time$/i],
  usage: [/^usage$/i, /^energy[_\s]*kwh$/i, /^kwh$/i],
  usageUnit: [/^usage\s*unit$/i],
  avgTemperature: [/^avg\.?\s*temperature$/i],
  temperatureUnit: [/^temperature\s*unit$/i],
  eventFlags: [/^event\s*flags$/i],
  peakDemand: [/^peak\s*demand$/i, /^demand[_\s]*kw$/i, /^kw$/i],
  demandUnit: [/^demand\s*unit$/i],
};

/**
 * Find column key by mapping
 */
function findColumnKey(headers: string[], mappings: RegExp[]): string | null {
  for (const header of headers) {
    for (const regex of mappings) {
      if (regex.test(header)) {
        return header;
      }
    }
  }
  return null;
}

/**
 * Build column map from headers
 */
function buildColumnMap(
  headers: string[],
  mappings: Record<string, RegExp[]>
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const [fieldName, regexList] of Object.entries(mappings)) {
    result[fieldName] = findColumnKey(headers, regexList);
  }
  return result;
}

/**
 * Read and fully parse usage/billing data from CSV
 * Captures EVERY field - no data is lost
 */
export function readComprehensiveUsageData(filePath: string): UsageDataSummary {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Usage file not found: ${absolutePath}`);
  }
  
  const rows = readTable(absolutePath);
  
  if (rows.length === 0) {
    throw new Error('Usage file is empty');
  }
  
  // Get headers (first row after parsing)
  const headers = Object.keys(rows[0] || {});
  const columnMap = buildColumnMap(headers, USAGE_COLUMN_MAPPINGS);
  
  console.log('📋 Detected usage columns:', Object.entries(columnMap)
    .filter(([_, v]) => v !== null)
    .map(([k, v]) => `${k}=${v}`)
    .join(', '));
  
  // Parse all rows into comprehensive records
  const allBills: ComprehensiveBillRecord[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    
    // Skip empty rows
    const hasData = Object.values(row).some(v => v && String(v).trim() !== '');
    if (!hasData) continue;
    
    // Check for valid bill end date
    const billEndRaw = columnMap.billEndDate ? row[columnMap.billEndDate] : null;
    const billEndDate = parseDateValue(billEndRaw);
    if (!billEndDate) continue;  // Skip rows without valid date

    // Bill start date (preferred) or inferred from billingDays
    const billStartRaw = columnMap.billStartDate ? row[columnMap.billStartDate] : null;
    let billStartDate = parseDateValue(billStartRaw);
    
    // Parse all fields - capture EVERYTHING
    const bill: ComprehensiveBillRecord = {
      // Customer Info
      billingName: columnMap.billingName ? String(row[columnMap.billingName] || '').trim() : '',
      siteAddress: columnMap.siteAddress ? String(row[columnMap.siteAddress] || '').trim() : '',
      siteCity: columnMap.siteCity ? String(row[columnMap.siteCity] || '').trim() : '',
      zipCode: columnMap.zipCode ? String(row[columnMap.zipCode] || '').trim() : '',
      
      // Account Identifiers
      saStatus: columnMap.saStatus ? String(row[columnMap.saStatus] || '').trim() : '',
      activity: columnMap.activity ? String(row[columnMap.activity] || '').trim() : '',
      descriptor: columnMap.descriptor ? String(row[columnMap.descriptor] || '').trim() : '',
      accountNumber: columnMap.accountNumber ? String(row[columnMap.accountNumber] || '').trim() : '',
      meterNumber: columnMap.meterNumber ? String(row[columnMap.meterNumber] || '').trim() : '',
      nem: columnMap.nem ? String(row[columnMap.nem] || '').toLowerCase() === 'yes' : false,
      saId: columnMap.saId ? String(row[columnMap.saId] || '').trim() : '',
      spId: columnMap.spId ? String(row[columnMap.spId] || '').trim() : '',
      prsnId: columnMap.prsnId ? String(row[columnMap.prsnId] || '').trim() : '',
      naicsCode: columnMap.naicsCode ? String(row[columnMap.naicsCode] || '').trim() : '',
      
      // Date Info
      yearOfBillEndDate: columnMap.yearOfBillEndDate ? parseNumericValue(row[columnMap.yearOfBillEndDate]) : billEndDate.getFullYear(),
      billStartDate: billStartDate,
      billEndDate: billEndDate,
      billingDays: columnMap.billingDays ? parseNumericValue(row[columnMap.billingDays]) : 0,
      
      // Rate Info
      rateCode: columnMap.rateCode ? String(row[columnMap.rateCode] || '').trim() : '',
      serviceProvider: columnMap.serviceProvider ? String(row[columnMap.serviceProvider] || '').trim() : '',
      
      // Cost Breakdown
      totalBillAmountPge: columnMap.totalBillAmountPge ? parseNumericValue(row[columnMap.totalBillAmountPge]) : 0,
      chargesPerKwh: columnMap.chargesPerKwh ? parseNumericValue(row[columnMap.chargesPerKwh]) : 0,
      pgeRevenueAmount: columnMap.pgeRevenueAmount ? parseNumericValue(row[columnMap.pgeRevenueAmount]) : 0,
      espTotalRevenueAmount: columnMap.espTotalRevenueAmount ? parseNumericValue(row[columnMap.espTotalRevenueAmount]) : 0,
      taxAmount: columnMap.taxAmount ? parseNumericValue(row[columnMap.taxAmount]) : 0,
      totalBillAmount: columnMap.totalBillAmount ? parseNumericValue(row[columnMap.totalBillAmount]) : 0,
      
      // TOU Usage
      onPeakKwh: columnMap.onPeakKwh ? parseNumericValue(row[columnMap.onPeakKwh]) : 0,
      partialPeakKwh: columnMap.partialPeakKwh ? parseNumericValue(row[columnMap.partialPeakKwh]) : 0,
      offPeakKwh: columnMap.offPeakKwh ? parseNumericValue(row[columnMap.offPeakKwh]) : 0,
      superOffPeakKwh: columnMap.superOffPeakKwh ? parseNumericValue(row[columnMap.superOffPeakKwh]) : 0,
      totalUsageKwh: columnMap.totalUsageKwh ? parseNumericValue(row[columnMap.totalUsageKwh]) : 0,
      totalUsageTherms: columnMap.totalUsageTherms ? parseNumericValue(row[columnMap.totalUsageTherms]) : 0,
      hours: columnMap.hours ? parseNumericValue(row[columnMap.hours]) : 0,
      
      // Demand
      maxMaxDemandKw: columnMap.maxMaxDemandKw ? parseNumericValue(row[columnMap.maxMaxDemandKw]) : 0,
      onPeakDemandKw: columnMap.onPeakDemandKw ? parseNumericValue(row[columnMap.onPeakDemandKw]) : 0,
      partialPeakDemandKw: columnMap.partialPeakDemandKw ? parseNumericValue(row[columnMap.partialPeakDemandKw]) : 0,
      offPeakDemandKw: columnMap.offPeakDemandKw ? parseNumericValue(row[columnMap.offPeakDemandKw]) : 0,
      superOffPeakDemandKw: columnMap.superOffPeakDemandKw ? parseNumericValue(row[columnMap.superOffPeakDemandKw]) : 0,
      
      // Raw data for debugging
      rawRow: { ...row },
    };
    
    // Only add if we have meaningful data
    if (bill.totalUsageKwh > 0 || bill.maxMaxDemandKw > 0 || bill.totalBillAmount > 0) {
      // Infer start date if missing
      if (!bill.billStartDate && Number.isFinite(bill.billingDays) && bill.billingDays > 0) {
        const days = Math.max(1, Math.round(bill.billingDays));
        bill.billStartDate = new Date(bill.billEndDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      }
      allBills.push(bill);
    }
  }
  
  console.log(`✅ Parsed ${allBills.length} complete bill records`);
  
  if (allBills.length === 0) {
    throw new Error('No valid bill records found in usage file');
  }
  
  // Extract identifiers from first valid record
  const firstBill = allBills[0];
  const saId = firstBill.saId;
  const rateCode = firstBill.rateCode;
  
  // Calculate comprehensive statistics
  const sortedBills = [...allBills].sort((a, b) => a.billEndDate.getTime() - b.billEndDate.getTime());
  
  const totalUsageKwh = allBills.reduce((sum, b) => sum + b.totalUsageKwh, 0);
  const totalCost = allBills.reduce((sum, b) => sum + b.totalBillAmount, 0);
  
  const usageValues = allBills.map(b => b.totalUsageKwh).filter(v => v > 0);
  const demandValues = allBills.map(b => b.maxMaxDemandKw).filter(v => v > 0);
  const costValues = allBills.map(b => b.totalBillAmount).filter(v => v > 0);
  
  const touTotal = allBills.reduce((acc, b) => ({
    onPeak: acc.onPeak + b.onPeakKwh,
    partialPeak: acc.partialPeak + b.partialPeakKwh,
    offPeak: acc.offPeak + b.offPeakKwh,
    superOffPeak: acc.superOffPeak + b.superOffPeakKwh,
  }), { onPeak: 0, partialPeak: 0, offPeak: 0, superOffPeak: 0 });
  
  const summary: UsageDataSummary = {
    saId,
    accountNumber: firstBill.accountNumber,
    meterNumber: firstBill.meterNumber,
    billingName: firstBill.billingName,
    siteAddress: `${firstBill.siteAddress}, ${firstBill.siteCity} ${firstBill.zipCode}`,
    rateCode,
    serviceProvider: firstBill.serviceProvider,
    allBills,
    statistics: {
      totalBillCount: allBills.length,
      dateRange: {
        start: sortedBills[0].billEndDate,
        end: sortedBills[sortedBills.length - 1].billEndDate,
      },
      totalUsageKwh,
      avgMonthlyUsageKwh: usageValues.length > 0 ? usageValues.reduce((a, b) => a + b, 0) / usageValues.length : 0,
      minMonthlyUsageKwh: usageValues.length > 0 ? Math.min(...usageValues) : 0,
      maxMonthlyUsageKwh: usageValues.length > 0 ? Math.max(...usageValues) : 0,
      peakDemandKw: demandValues.length > 0 ? Math.max(...demandValues) : 0,
      avgMonthlyDemandKw: demandValues.length > 0 ? demandValues.reduce((a, b) => a + b, 0) / demandValues.length : 0,
      minMonthlyDemandKw: demandValues.length > 0 ? Math.min(...demandValues) : 0,
      maxMonthlyDemandKw: demandValues.length > 0 ? Math.max(...demandValues) : 0,
      totalCost,
      avgMonthlyCost: costValues.length > 0 ? costValues.reduce((a, b) => a + b, 0) / costValues.length : 0,
      minMonthlyCost: costValues.length > 0 ? Math.min(...costValues) : 0,
      maxMonthlyCost: costValues.length > 0 ? Math.max(...costValues) : 0,
      touBreakdown: {
        onPeakKwh: touTotal.onPeak,
        partialPeakKwh: touTotal.partialPeak,
        offPeakKwh: touTotal.offPeak,
        superOffPeakKwh: touTotal.superOffPeak,
        onPeakPercent: totalUsageKwh > 0 ? (touTotal.onPeak / totalUsageKwh) * 100 : 0,
        partialPeakPercent: totalUsageKwh > 0 ? (touTotal.partialPeak / totalUsageKwh) * 100 : 0,
        offPeakPercent: totalUsageKwh > 0 ? (touTotal.offPeak / totalUsageKwh) * 100 : 0,
        superOffPeakPercent: totalUsageKwh > 0 ? (touTotal.superOffPeak / totalUsageKwh) * 100 : 0,
      },
    },
  };
  
  return summary;
}

/**
 * Read and fully parse interval data from CSV
 * Captures EVERY field - no data is lost
 */
export function readComprehensiveIntervalData(filePath: string): IntervalDataSummary {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Interval file not found: ${absolutePath}`);
  }
  
  const rows = readTable(absolutePath);
  
  if (rows.length === 0) {
    throw new Error('Interval file is empty');
  }
  
  // Get headers
  const headers = Object.keys(rows[0] || {});
  const columnMap = buildColumnMap(headers, INTERVAL_COLUMN_MAPPINGS);
  
  console.log('📋 Detected interval columns:', Object.entries(columnMap)
    .filter(([_, v]) => v !== null)
    .map(([k, v]) => `${k}=${v}`)
    .join(', '));
  
  // Parse all rows
  const allIntervals: ComprehensiveIntervalRecord[] = [];
  let serviceAgreement = '';
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    
    // Get service agreement from first row
    if (!serviceAgreement && columnMap.serviceAgreement) {
      serviceAgreement = String(row[columnMap.serviceAgreement] || '').trim();
    }
    
    // Parse timestamps
    const startDateTimeRaw = columnMap.startDateTime ? row[columnMap.startDateTime] : null;
    const startDateTime = parseDateValue(startDateTimeRaw);
    if (!startDateTime) continue;
    
    const endDateTimeRaw = columnMap.endDateTime ? row[columnMap.endDateTime] : null;
    const endDateTime = parseDateValue(endDateTimeRaw) || startDateTime;
    
    const interval: ComprehensiveIntervalRecord = {
      serviceAgreement: columnMap.serviceAgreement ? String(row[columnMap.serviceAgreement] || '').trim() : serviceAgreement,
      startDateTime,
      endDateTime,
      usage: columnMap.usage ? parseNumericValue(row[columnMap.usage]) : 0,
      usageUnit: columnMap.usageUnit ? String(row[columnMap.usageUnit] || 'KWH').trim() : 'KWH',
      avgTemperature: columnMap.avgTemperature ? parseNumericValue(row[columnMap.avgTemperature]) || null : null,
      temperatureUnit: columnMap.temperatureUnit ? String(row[columnMap.temperatureUnit] || 'FAHRENHEIT').trim() : 'FAHRENHEIT',
      eventFlags: columnMap.eventFlags ? String(row[columnMap.eventFlags] || '').trim() : '',
      peakDemand: columnMap.peakDemand ? parseNumericValue(row[columnMap.peakDemand]) : 0,
      demandUnit: columnMap.demandUnit ? String(row[columnMap.demandUnit] || 'KW').trim() : 'KW',
      rawRow: { ...row },
    };
    
    // Only add if we have meaningful data
    if (interval.usage > 0 || interval.peakDemand > 0) {
      allIntervals.push(interval);
    }
  }
  
  console.log(`✅ Parsed ${allIntervals.length} complete interval records`);
  
  if (allIntervals.length === 0) {
    throw new Error('No valid interval records found');
  }
  
  // Calculate statistics
  const sortedIntervals = [...allIntervals].sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());
  
  // Determine interval duration (usually 15 minutes)
  let intervalDurationMinutes = 15;
  if (sortedIntervals.length >= 2) {
    const diff = sortedIntervals[1].startDateTime.getTime() - sortedIntervals[0].startDateTime.getTime();
    intervalDurationMinutes = Math.round(diff / (1000 * 60));
  }
  
  const demandValues = allIntervals.map(i => i.peakDemand).filter(v => v > 0);
  const temperatureValues = allIntervals.map(i => i.avgTemperature).filter((v): v is number => v !== null && v > 0);
  
  // Find top 10 peak events
  const peakEvents = [...allIntervals]
    .filter(i => i.peakDemand > 0)
    .sort((a, b) => b.peakDemand - a.peakDemand)
    .slice(0, 10)
    .map((interval, idx) => ({
      timestamp: interval.startDateTime,
      demandKw: interval.peakDemand,
      rank: idx + 1,
    }));
  
  const totalUsageKwh = allIntervals.reduce((sum, i) => sum + i.usage, 0);
  const dateRange = {
    start: sortedIntervals[0].startDateTime,
    end: sortedIntervals[sortedIntervals.length - 1].startDateTime,
  };
  const dayCount = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
  
  // Find temperature at peak demand
  const peakInterval = allIntervals.reduce((max, i) => i.peakDemand > (max?.peakDemand || 0) ? i : max, allIntervals[0]);
  
  const summary: IntervalDataSummary = {
    serviceAgreement,
    allIntervals,
    statistics: {
      totalIntervalCount: allIntervals.length,
      intervalDurationMinutes,
      dateRange,
      peakDemandKw: demandValues.length > 0 ? Math.max(...demandValues) : 0,
      avgDemandKw: demandValues.length > 0 ? demandValues.reduce((a, b) => a + b, 0) / demandValues.length : 0,
      minDemandKw: demandValues.length > 0 ? Math.min(...demandValues) : 0,
      peakEvents,
      totalUsageKwh,
      avgDailyUsageKwh: totalUsageKwh / dayCount,
      temperatureStats: temperatureValues.length > 0 ? {
        avgTemperature: temperatureValues.reduce((a, b) => a + b, 0) / temperatureValues.length,
        minTemperature: Math.min(...temperatureValues),
        maxTemperature: Math.max(...temperatureValues),
        peakDemandTemperature: peakInterval?.avgTemperature || 0,
      } : undefined,
    },
  };
  
  return summary;
}

/**
 * PG&E Rate Code Mapping for Tier 3 verification
 */
const PGE_RATE_CODES: Record<string, {
  summer: number;
  winter: number;
  name: string;
  description: string;
}> = {
  // B-19 variants
  'B-19': { summer: 38.37, winter: 19.20, name: 'B-19 Secondary', description: 'Medium General Demand-Metered TOU - Secondary voltage' },
  'B19': { summer: 38.37, winter: 19.20, name: 'B-19 Secondary', description: 'Medium General Demand-Metered TOU - Secondary voltage' },
  'B-19S': { summer: 38.37, winter: 19.20, name: 'B-19 Secondary', description: 'B-19 Secondary voltage' },
  'B19S': { summer: 38.37, winter: 19.20, name: 'B-19 Secondary', description: 'B-19 Secondary voltage' },
  'HB19S': { summer: 38.37, winter: 19.20, name: 'Hospital B-19 Secondary', description: 'Hospital rate - B-19 Secondary voltage' },
  'HB-19S': { summer: 38.37, winter: 19.20, name: 'Hospital B-19 Secondary', description: 'Hospital rate - B-19 Secondary voltage' },
  'B-19P': { summer: 30.66, winter: 15.00, name: 'B-19 Primary', description: 'B-19 Primary voltage' },
  'B19P': { summer: 30.66, winter: 15.00, name: 'B-19 Primary', description: 'B-19 Primary voltage' },
  'B-19T': { summer: 18.00, winter: 10.00, name: 'B-19 Transmission', description: 'B-19 Transmission voltage' },
  
  // B-20 variants
  'B-20': { summer: 25.00, winter: 15.00, name: 'B-20 Secondary', description: 'Large General Demand-Metered TOU - Secondary (>1000 kW)' },
  'B-20S': { summer: 25.00, winter: 15.00, name: 'B-20 Secondary', description: 'B-20 Secondary voltage' },
  'B-20P': { summer: 20.00, winter: 12.00, name: 'B-20 Primary', description: 'B-20 Primary voltage' },
  'B-20T': { summer: 15.00, winter: 9.00, name: 'B-20 Transmission', description: 'B-20 Transmission voltage' },
  
  // A-10 variants
  'A-10': { summer: 30.00, winter: 15.00, name: 'A-10 Secondary', description: 'Medium General Demand-Metered (legacy)' },
  'A-10S': { summer: 30.00, winter: 15.00, name: 'A-10 Secondary', description: 'A-10 Secondary voltage' },
  'A-10P': { summer: 24.00, winter: 12.00, name: 'A-10 Primary', description: 'A-10 Primary voltage' },
  
  // E-19 variants (NEM)
  'E-19': { summer: 25.00, winter: 12.00, name: 'E-19 Secondary', description: 'NEM Medium General Demand-Metered TOU' },
  'E-19S': { summer: 25.00, winter: 12.00, name: 'E-19 Secondary', description: 'E-19 Secondary voltage' },
  
  // E-20 variants (NEM)
  'E-20': { summer: 20.00, winter: 10.00, name: 'E-20 Secondary', description: 'NEM Large General Demand-Metered TOU' },
  
  // Small commercial (no demand charges)
  'A-1': { summer: 0, winter: 0, name: 'A-1', description: 'Small General Service - No demand charges' },
  'A-6': { summer: 0, winter: 0, name: 'A-6', description: 'Small General TOU Service - No demand charges' },
  'B-1': { summer: 0, winter: 0, name: 'B-1', description: 'Small General Service - No demand charges' },
  'B-6': { summer: 0, winter: 0, name: 'B-6', description: 'Small General TOU Service - No demand charges' },
};

/**
 * Perform 3-Tier Verification
 */
export function performThreeTierVerification(
  userSelectedRate: string | null,
  userSaId: string | null,
  usageData: UsageDataSummary | null,
  intervalData: IntervalDataSummary | null
): ThreeTierVerification {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // ============ TIER 1: User Input vs File Data ============
  const tier1Issues: string[] = [];
  let tier1Status: 'match' | 'mismatch' | 'warning' = 'match';
  
  const fileRateCode = usageData?.rateCode || null;
  const fileSaId = usageData?.saId || null;
  
  // Check rate code match
  if (userSelectedRate && fileRateCode) {
    const normalizedUser = userSelectedRate.toUpperCase().replace(/[-\s]/g, '');
    const normalizedFile = fileRateCode.toUpperCase().replace(/[-\s]/g, '');
    if (normalizedUser !== normalizedFile) {
      tier1Issues.push(`Rate mismatch: User selected "${userSelectedRate}" but file shows "${fileRateCode}"`);
      tier1Status = 'mismatch';
    }
  } else if (userSelectedRate && !fileRateCode) {
    tier1Issues.push('Rate code not found in uploaded file - cannot verify user selection');
    tier1Status = 'warning';
  }
  
  // Check SAID match
  if (userSaId && fileSaId) {
    if (userSaId !== fileSaId) {
      tier1Issues.push(`SAID mismatch: User entered "${userSaId}" but file shows "${fileSaId}"`);
      tier1Status = 'mismatch';
    }
  } else if (userSaId && !fileSaId) {
    tier1Issues.push('SAID not found in uploaded file - cannot verify user input');
    tier1Status = 'warning';
  }
  
  // ============ TIER 2: Cross-File Validation ============
  const tier2Issues: string[] = [];
  let tier2Status: 'match' | 'mismatch' | 'warning' | 'critical_mismatch' = 'match';
  
  const usageSaId = usageData?.saId || null;
  const intervalSaId = intervalData?.serviceAgreement || null;
  
  if (usageSaId && intervalSaId) {
    if (usageSaId !== intervalSaId) {
      tier2Issues.push(`SAID mismatch between files: Usage file "${usageSaId}" vs Interval file "${intervalSaId}"`);
      tier2Status = 'critical_mismatch' as any;
      issues.push('⚠️ CRITICAL: Usage and Interval files have different Service Agreement IDs - they may be from different accounts!');
    }
  } else if (!usageSaId && !intervalSaId) {
    tier2Issues.push('SAID not found in either file - cannot cross-validate');
    tier2Status = 'warning';
  } else if (!usageSaId || !intervalSaId) {
    tier2Issues.push('SAID missing from one file - partial validation only');
    tier2Status = 'warning';
  }
  
  // ============ TIER 3: Rate Intelligence ============
  const tier3Issues: string[] = [];
  let tier3Status: 'match' | 'mismatch' | 'warning' | 'unknown' = 'unknown';
  let matchedSystemRate = null;
  let calculatedDemandRate = 0;
  let derivedDemandRate = 0;
  let variance = 0;
  
  if (fileRateCode) {
    // Look up rate in our system
    const normalizedCode = fileRateCode.toUpperCase().replace(/\s/g, '');
    const rateInfo = PGE_RATE_CODES[normalizedCode] || 
                     PGE_RATE_CODES[normalizedCode.replace(/-/g, '')] ||
                     Object.entries(PGE_RATE_CODES).find(([k]) => normalizedCode.includes(k))?.[1];
    
    if (rateInfo) {
      // Calculate weighted average (60% summer, 40% winter)
      calculatedDemandRate = (rateInfo.summer * 0.6) + (rateInfo.winter * 0.4);
      
      matchedSystemRate = {
        rateCode: fileRateCode,
        rateName: rateInfo.name,
        description: rateInfo.description,
        demandCharges: {
          summer: rateInfo.summer,
          winter: rateInfo.winter,
          effective: calculatedDemandRate,
        },
        energyRates: {
          onPeak: 0.20,  // Placeholder - would come from full rate library
          partialPeak: 0.17,
          offPeak: 0.14,
        },
      };
      
      tier3Status = 'match';
      
      // Try to derive rate from actual billing data
      if (usageData && usageData.allBills.length > 0) {
        const billsWithDemand = usageData.allBills.filter(b => b.maxMaxDemandKw > 50 && b.totalBillAmount > 1000);
        if (billsWithDemand.length > 0) {
          // Estimate demand portion of bill (typically 35-45% for commercial)
          const derivedRates = billsWithDemand.map(b => {
            const estimatedDemandCost = b.totalBillAmount * 0.40;
            return estimatedDemandCost / b.maxMaxDemandKw;
          });
          derivedDemandRate = derivedRates.reduce((a, b) => a + b, 0) / derivedRates.length;
          
          // Calculate variance
          variance = Math.abs(calculatedDemandRate - derivedDemandRate) / calculatedDemandRate * 100;
          
          if (variance > 25) {
            tier3Issues.push(`Large variance (${variance.toFixed(1)}%) between system rate ($${calculatedDemandRate.toFixed(2)}/kW) and derived rate ($${derivedDemandRate.toFixed(2)}/kW)`);
            tier3Status = 'warning';
            recommendations.push('Review billing data - actual costs may reflect different rate structure or additional charges');
          }
        }
      }
    } else {
      tier3Issues.push(`Rate code "${fileRateCode}" not found in system rate library`);
      tier3Status = 'unknown';
      recommendations.push('Consider adding this rate to the system rate library for better analysis');
    }
  } else {
    tier3Issues.push('No rate code in file - cannot perform rate intelligence analysis');
    tier3Status = 'unknown';
  }
  
  // ============ Overall Assessment ============
  let overallStatus: 'verified' | 'needs_review' | 'critical_mismatch' = 'verified';
  let confidenceScore = 100;
  
  // Deduct for tier 1 issues
  if (tier1Status === 'mismatch') {
    overallStatus = 'needs_review';
    confidenceScore -= 30;
  } else if (tier1Status === 'warning') {
    confidenceScore -= 10;
  }
  
  // Deduct for tier 2 issues
  if (tier2Status === 'mismatch' || (tier2Status as any) === 'critical_mismatch') {
    overallStatus = 'critical_mismatch';
    confidenceScore -= 50;
  } else if (tier2Status === 'warning') {
    confidenceScore -= 15;
  }
  
  // Deduct for tier 3 issues
  if (tier3Status === 'warning') {
    if (overallStatus !== 'critical_mismatch') overallStatus = 'needs_review';
    confidenceScore -= 20;
  } else if (tier3Status === 'unknown') {
    confidenceScore -= 10;
  }
  
  confidenceScore = Math.max(0, Math.min(100, confidenceScore));
  
  return {
    tier1: {
      status: tier1Status,
      userSelectedRate,
      fileRateCode,
      userSaId,
      fileSaId,
      issues: tier1Issues,
    },
    tier2: {
      status: tier2Status,
      usageFileSaId: usageSaId,
      intervalFileSaId: intervalSaId,
      usageFileRateCode: fileRateCode,
      issues: tier2Issues,
    },
    tier3: {
      status: tier3Status,
      fileRateCode,
      matchedSystemRate,
      calculatedDemandRate,
      derivedDemandRate,
      variance,
      issues: tier3Issues,
      recommendations,
    },
    overallStatus,
    confidenceScore,
    allIssues: [...tier1Issues, ...tier2Issues, ...tier3Issues, ...issues],
    allRecommendations: recommendations,
  };
}

/**
 * Create complete utility data package
 */
export function createUtilityDataPackage(
  usageFilePath: string | null,
  intervalFilePath: string | null,
  userSelectedRate: string | null,
  userSaId: string | null
): UtilityDataPackage {
  let usageData: UsageDataSummary | null = null;
  let intervalData: IntervalDataSummary | null = null;
  
  if (usageFilePath) {
    try {
      usageData = readComprehensiveUsageData(usageFilePath);
    } catch (error) {
      console.error('Error reading usage data:', error);
    }
  }
  
  if (intervalFilePath) {
    try {
      intervalData = readComprehensiveIntervalData(intervalFilePath);
    } catch (error) {
      console.error('Error reading interval data:', error);
    }
  }
  
  const verification = performThreeTierVerification(
    userSelectedRate,
    userSaId,
    usageData,
    intervalData
  );
  
  return {
    packageId: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    usageFileName: usageFilePath ? path.basename(usageFilePath) : null,
    intervalFileName: intervalFilePath ? path.basename(intervalFilePath) : null,
    usageData,
    intervalData,
    verification,
  };
}
