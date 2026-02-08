/**
 * Smart Excel Reader for Utility Billing Data
 * Auto-detects headers and extracts monthly billing information
 * 
 * INTELLIGENT COLUMN DETECTION:
 * - Analyzes header names for hints
 * - Samples actual data values to infer column types
 * - Uses heuristics: date patterns, numeric ranges, units, etc.
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { parseCsv } from './csv-parser';
import type { MonthlyBill } from './types';
import type { IntervalDataPoint } from '../core/types';
import type { LoadProfile, LoadInterval } from '../modules/battery/types';

/**
 * Detected column types
 */
type ColumnType = 
  | 'datetime'      // Timestamp/date column
  | 'demand_kw'     // kW demand (power)
  | 'energy_kwh'    // kWh energy consumption
  | 'temperature'   // Temperature readings
  | 'cost'          // Dollar amounts
  | 'id'            // Account/meter/SA IDs
  | 'text'          // Text/descriptive
  | 'unknown';

interface DetectedColumn {
  index: number;
  headerName: string;
  type: ColumnType;
  confidence: number;  // 0-100
  unit?: string;       // e.g., "kW", "kWh", "°F"
  sampleValues: any[];
}

interface SmartColumnDetection {
  columns: DetectedColumn[];
  dateColumn: DetectedColumn | null;
  demandColumn: DetectedColumn | null;
  energyColumn: DetectedColumn | null;
  temperatureColumn: DetectedColumn | null;
  costColumn: DetectedColumn | null;
}

/**
 * SMART COLUMN DETECTOR
 * Analyzes headers + sample data to intelligently identify column types
 */
function detectColumnsSmartly(headers: string[], sampleRows: any[][]): SmartColumnDetection {
  const columns: DetectedColumn[] = [];
  
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] || '').toLowerCase().trim();
    const samples = sampleRows.map(row => row[i]).filter(v => v !== undefined && v !== null && v !== '');
    
    const detected = inferColumnType(header, samples, i);
    columns.push(detected);
  }
  
  // Pick best column for each type (highest confidence)
  const dateColumn = pickBestColumn(columns, 'datetime');
  const demandColumn = pickBestColumn(columns, 'demand_kw');
  const energyColumn = pickBestColumn(columns, 'energy_kwh');
  const temperatureColumn = pickBestColumn(columns, 'temperature');
  const costColumn = pickBestColumn(columns, 'cost');
  
  return { columns, dateColumn, demandColumn, energyColumn, temperatureColumn, costColumn };
}

function pickBestColumn(columns: DetectedColumn[], type: ColumnType): DetectedColumn | null {
  const matches = columns.filter(c => c.type === type).sort((a, b) => b.confidence - a.confidence);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Infer column type from header name + sample data
 */
function inferColumnType(header: string, samples: any[], index: number): DetectedColumn {
  let type: ColumnType = 'unknown';
  let confidence = 0;
  let unit: string | undefined;
  
  // === HEADER-BASED HINTS ===
  const headerLower = header.toLowerCase();
  
  // DateTime patterns
  if (/date|time|timestamp|period|when|start|end/i.test(headerLower)) {
    type = 'datetime';
    confidence = 60;
  }
  
  // Demand (kW) patterns - must NOT contain "kwh" or "energy"
  if (/demand|peak\s*kw|power|load|kw\b/i.test(headerLower) && !/kwh|energy|usage/i.test(headerLower)) {
    type = 'demand_kw';
    confidence = 70;
    unit = 'kW';
  }
  
  // Energy (kWh) patterns
  if (/kwh|energy|usage|consumption|total\s*usage/i.test(headerLower) && !/demand|peak/i.test(headerLower)) {
    type = 'energy_kwh';
    confidence = 70;
    unit = 'kWh';
  }
  
  // Temperature patterns
  if (/temp|temperature|outdoor|ambient|weather|fahrenheit|celsius|°f|°c/i.test(headerLower)) {
    type = 'temperature';
    confidence = 80;
    unit = headerLower.includes('celsius') || headerLower.includes('°c') ? '°C' : '°F';
  }
  
  // Cost patterns
  if (/cost|amount|bill|charge|revenue|price|\$/i.test(headerLower) && !/kwh|kw|demand/i.test(headerLower)) {
    type = 'cost';
    confidence = 70;
    unit = '$';
  }
  
  // ID patterns
  if (/id|account|meter|sa\s*id|service\s*agreement|number|#/i.test(headerLower)) {
    type = 'id';
    confidence = 60;
  }
  
  // === DATA-BASED ANALYSIS ===
  if (samples.length > 0) {
    const dataHints = analyzeDataValues(samples);
    
    // Override or boost confidence based on actual data
    if (dataHints.isDatetime && (type === 'unknown' || type === 'datetime')) {
      type = 'datetime';
      confidence = Math.max(confidence, dataHints.confidence);
    }
    
    if (dataHints.isNumeric) {
      // Distinguish kW vs kWh based on value ranges
      if (type === 'unknown' || type === 'demand_kw' || type === 'energy_kwh') {
        // kW demand: typically 0-5000 for commercial
        // kWh usage: typically 0-50000+ for commercial
        // Temperature: typically 0-120
        
        if (dataHints.avgValue > 0 && dataHints.avgValue < 150 && dataHints.maxValue < 200) {
          // Likely temperature (0-120°F typical range)
          if (type === 'unknown') {
            type = 'temperature';
            confidence = 50;
            unit = '°F';
          }
        } else if (dataHints.avgValue > 0 && dataHints.avgValue < 2000 && dataHints.maxValue < 10000) {
          // Likely kW demand
          if (type === 'unknown' || (type === 'demand_kw' && confidence < 80)) {
            if (type === 'unknown') type = 'demand_kw';
            confidence = Math.max(confidence, 55);
            unit = 'kW';
          }
        } else if (dataHints.avgValue > 500) {
          // Likely kWh energy or cost
          if (type === 'unknown') {
            // Check if values look like currency (large whole numbers or 2 decimal places)
            if (dataHints.hasCurrencyFormat) {
              type = 'cost';
              confidence = 60;
              unit = '$';
            } else {
              type = 'energy_kwh';
              confidence = 50;
              unit = 'kWh';
            }
          }
        }
      }
    }
  }
  
  return {
    index,
    headerName: header,
    type,
    confidence,
    unit,
    sampleValues: samples.slice(0, 5),
  };
}

/**
 * Analyze sample values to determine data characteristics
 */
function analyzeDataValues(samples: any[]): {
  isDatetime: boolean;
  isNumeric: boolean;
  avgValue: number;
  minValue: number;
  maxValue: number;
  hasCurrencyFormat: boolean;
  confidence: number;
} {
  let dateCount = 0;
  let numericCount = 0;
  let currencyCount = 0;
  const numericValues: number[] = [];
  
  for (const sample of samples) {
    // Check if it's a date
    if (sample instanceof Date) {
      dateCount++;
      continue;
    }
    
    if (typeof sample === 'number') {
      // Excel serial date (30000-50000 range for 1982-2036)
      if (sample > 30000 && sample < 60000 && Number.isFinite(sample)) {
        dateCount++;
      } else {
        numericCount++;
        numericValues.push(sample);
      }
      continue;
    }
    
    const str = String(sample).trim();
    
    // Check for date patterns
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str) || 
        /^\d{4}-\d{2}-\d{2}/.test(str) ||
        /^\w{3}\s+\d{1,2},?\s+\d{4}/.test(str)) {
      dateCount++;
      continue;
    }
    
    // Check for numeric/currency
    const cleaned = str.replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      numericCount++;
      numericValues.push(num);
      if (/^\$/.test(str) || /\.\d{2}$/.test(str)) {
        currencyCount++;
      }
    }
  }
  
  const isDatetime = dateCount > samples.length * 0.5;
  const isNumeric = numericCount > samples.length * 0.5;
  
  const avgValue = numericValues.length > 0 
    ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length 
    : 0;
  const minValue = numericValues.length > 0 ? Math.min(...numericValues) : 0;
  const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 0;
  const hasCurrencyFormat = currencyCount > samples.length * 0.3;
  
  return {
    isDatetime,
    isNumeric,
    avgValue,
    minValue,
    maxValue,
    hasCurrencyFormat,
    confidence: isDatetime ? 80 : (isNumeric ? 60 : 30),
  };
}

/**
 * Column detection configuration
 */
interface ColumnIndices {
  dateIndex: number;
  usageIndex: number;
  demandIndex: number;
  costIndex: number;
  headerRow: number;
}

/**
 * Find header row by looking for keyword matches
 */
function findHeaderRow(worksheet: XLSX.WorkSheet, maxRows: number = 10): number | null {
  const keywords = ['kwh', 'usage', 'bill', 'amount', 'demand', 'kw', 'therms', 'date', 'end date'];
  
  for (let row = 0; row < maxRows; row++) {
    const rowData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      range: { s: { c: 0, r: row }, e: { c: 50, r: row } },
    }) as any[][];
    
    if (rowData.length === 0 || rowData[0].length === 0) continue;
    
    const headerCells = rowData[0].map((cell: any) => 
      String(cell || '').toLowerCase()
    );
    
    const matches = headerCells.filter((cell: string) =>
      keywords.some(keyword => cell.includes(keyword))
    ).length;
    
    if (matches >= 3) {
      return row;
    }
  }
  
  return null;
}

/**
 * Parse a value to number, handling currency, commas, and negatives
 */
function parseNumber(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value !== 'string') {
    return 0;
  }
  
  let cleaned = value
    .replace(/[$,\s]/g, '')
    .replace(/\(/g, '-')
    .replace(/\)/g, '')
    .trim();
  
  if (cleaned.startsWith('-')) {
    cleaned = '-' + cleaned.substring(1).replace(/-/g, '');
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse date from various formats
 */
function parseDate(value: any): Date | null {
  if (value instanceof Date) {
    return value;
  }
  
  let dateStr = String(value || '').trim();
  
  if (!dateStr) {
    return null;
  }
  
  if (typeof value === 'number') {
    if (value > 0 && value < 100000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
      return date;
    }
    if (value > 1000000000000) {
      return new Date(value);
    }
  }
  
  const mmddyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const month = parseInt(mmddyyyy[1]) - 1;
    const day = parseInt(mmddyyyy[2]);
    const year = parseInt(mmddyyyy[3]);
    return new Date(year, month, day);
  }
  
  const yyyymmdd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1]);
    const month = parseInt(yyyymmdd[2]) - 1;
    const day = parseInt(yyyymmdd[3]);
    return new Date(year, month, day);
  }
  
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    if (year >= 2000 && year <= 2100) {
      return parsed;
    }
  }
  
  return null;
}

/**
 * Read interval data from Excel or CSV file (15-minute intervals)
 * Returns IntervalDataPoint[] which can be converted to LoadProfile
 */
export function readIntervalData(filePath: string, sheetIndex: number = 0): IntervalDataPoint[] {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  
  const ext = path.extname(absolutePath).toLowerCase();
  const isCsv = ext === '.csv';
  
  if (isCsv) {
    // Use CSV parser
    const rows = parseCsv(absolutePath);
    
    if (rows.length === 0) {
      throw new Error('CSV file is empty or could not be parsed');
    }
    
    // Find header row
    let headerRowIndex = 0;
    const keywords = ['date', 'time', 'timestamp', 'demand', 'kw', 'usage', 'power', 'temp'];
    
    let maxMatches = 0;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      if (!rows[i]) continue;
      const rowKeys = Object.keys(rows[i]).map(k => k.toLowerCase());
      const matches = rowKeys.filter(key => keywords.some(kw => key.includes(kw))).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        headerRowIndex = i;
      }
    }
    
    const headerRow = rows[headerRowIndex];
    if (!headerRow) {
      throw new Error('Could not find header row');
    }
    
    const headerKeys = Object.keys(headerRow);
    const headerKeysLower = headerKeys.map(k => k.toLowerCase());
    
    // Find date/time and demand columns
    // For interval data, look for "start date time" or "end date time"
    const startDateKeyIndex = headerKeysLower.findIndex(k => /start.*date.*time|start.*date/i.test(k));
    const endDateKeyIndex = headerKeysLower.findIndex(k => /end.*date.*time|end.*date/i.test(k));
    const dateKeyIndex = startDateKeyIndex !== -1 ? startDateKeyIndex : endDateKeyIndex !== -1 ? endDateKeyIndex : headerKeysLower.findIndex(k => /date/i.test(k));
    const timeKeyIndex = headerKeysLower.findIndex(k => /time/i.test(k) && !/date/i.test(k));
    // Look for peak demand specifically
    const demandKeyIndex = headerKeysLower.findIndex(k => /peak\s*demand|demand\s*kw|demand|\bkw\b|load/i.test(k) && !/kwh|energy|usage\s*unit/i.test(k));
    const tempKeyIndex = headerKeysLower.findIndex(k => /temp|temperature|outdoor.*temp|oat|dry.?bulb|db/i.test(k));
    
    if (dateKeyIndex === -1 || demandKeyIndex === -1) {
      throw new Error('Could not find required columns: date, demand/kW');
    }
    
    const dateKey = headerKeys[dateKeyIndex];
    const timeKey = timeKeyIndex !== -1 ? headerKeys[timeKeyIndex] : null;
    const demandKey = headerKeys[demandKeyIndex];
    const tempKey = tempKeyIndex !== -1 ? headerKeys[tempKeyIndex] : null;
    
    const intervals: IntervalDataPoint[] = [];
    
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      
      // Get date value - could be in dateKey or combined in dateKey if it's "start date time"
      let dateStr = String(row[dateKey] || '').trim();
      
      // If dateKey already contains time (like "start date time"), use it directly
      if (!dateStr && timeKey && row[timeKey]) {
        // If we have separate time, combine them
        const dateOnly = String(row[dateKey] || '').trim();
        dateStr = dateOnly + ' ' + String(row[timeKey]).trim();
      }
      
      if (!dateStr || !row[demandKey]) continue;
      
      const timestamp = parseDate(dateStr);
      if (!timestamp) continue;
      
      const demand = parseNumber(row[demandKey]);
      if (isNaN(demand) || demand < 0) continue;
      const temperature = tempKey ? parseNumber(row[tempKey]) : undefined;
      
      intervals.push({
        timestamp,
        demand,
        temperature: isNaN(temperature as number) ? undefined : temperature,
      });
    }
    
    intervals.sort((a, b) => {
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime();
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime();
      return timeA - timeB;
    });
    
    return intervals;
  }
  
  // For Excel files, use xlsx with SMART COLUMN DETECTION
  const workbook = XLSX.readFile(absolutePath, { cellDates: true });
  
  if (workbook.SheetNames.length === 0) {
    throw new Error('Excel file has no sheets');
  }
  
  if (sheetIndex >= workbook.SheetNames.length) {
    throw new Error(`Sheet index ${sheetIndex} out of range`);
  }
  
  const sheetName = workbook.SheetNames[sheetIndex];
  const worksheet = workbook.Sheets[sheetName];
  
  // Find header row
  const headerRowNum = findHeaderRow(worksheet, 15);
  if (headerRowNum === null) {
    throw new Error('Could not find header row');
  }
  
  // Get headers
  const headerData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    range: { s: { c: 0, r: headerRowNum }, e: { c: 100, r: headerRowNum } },
  }) as any[][];
  
  if (headerData.length === 0) {
    throw new Error('Could not read header row');
  }
  
  const headers = headerData[0].map((h: any) => String(h || ''));
  
  // Read sample data for smart detection (first 20 rows)
  const sampleData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    range: { s: { c: 0, r: headerRowNum + 1 }, e: { c: 100, r: headerRowNum + 21 } },
    raw: true,
  }) as any[][];
  
  // === SMART COLUMN DETECTION ===
  const detection = detectColumnsSmartly(headers, sampleData);
  
  console.log('🔍 Smart Column Detection Results:');
  console.log(`   Date column: ${detection.dateColumn?.headerName || 'NOT FOUND'} (confidence: ${detection.dateColumn?.confidence || 0}%)`);
  console.log(`   Demand (kW) column: ${detection.demandColumn?.headerName || 'NOT FOUND'} (confidence: ${detection.demandColumn?.confidence || 0}%)`);
  console.log(`   Energy (kWh) column: ${detection.energyColumn?.headerName || 'NOT FOUND'} (confidence: ${detection.energyColumn?.confidence || 0}%)`);
  console.log(`   Temperature column: ${detection.temperatureColumn?.headerName || 'NOT FOUND'} (confidence: ${detection.temperatureColumn?.confidence || 0}%)`);
  
  // Require at least a date column
  if (!detection.dateColumn) {
    // Try to find any column with date-like data
    const fallbackDateCol = detection.columns.find(c => {
      const samples = c.sampleValues;
      return samples.some(s => s instanceof Date || (typeof s === 'number' && s > 30000 && s < 60000));
    });
    if (fallbackDateCol) {
      console.log(`   ⚠️ Using fallback date column: ${fallbackDateCol.headerName}`);
      (detection as any).dateColumn = fallbackDateCol;
    } else {
      throw new Error('Could not find a date/timestamp column in the file');
    }
  }
  
  // For demand column: if not found by header, look at data
  if (!detection.demandColumn) {
    // Find a numeric column that looks like kW values (reasonable range 0-5000)
    const fallbackDemandCol = detection.columns.find(c => {
      if (c.type === 'datetime' || c.type === 'id' || c.type === 'text') return false;
      const numericSamples = c.sampleValues.filter(v => typeof v === 'number' && v > 0);
      if (numericSamples.length === 0) return false;
      const avg = numericSamples.reduce((a, b) => a + b, 0) / numericSamples.length;
      // kW demand: typically 1-5000, not tiny decimals, not huge numbers
      return avg > 1 && avg < 5000 && numericSamples.every(v => v < 10000);
    });
    if (fallbackDemandCol) {
      console.log(`   ⚠️ Using fallback demand column: ${fallbackDemandCol.headerName}`);
      (detection as any).demandColumn = fallbackDemandCol;
    } else {
      throw new Error('Could not find a demand/kW column in the file. Please ensure your file has a column with power values.');
    }
  }
  
  const dateIndex = detection.dateColumn.index;
  const demandIndex = detection.demandColumn.index;
  const tempIndex = detection.temperatureColumn?.index ?? -1;
  
  // Read all data
  const data = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    range: { s: { c: 0, r: headerRowNum + 1 }, e: { c: 100, r: 100000 } },
    raw: true,
  }) as any[][];
  
  const intervals: IntervalDataPoint[] = [];
  
  for (const row of data) {
    if (!row || row.length === 0) continue;
    
    // Get the date value - could be Date object, Excel serial, or string
    const dateValue = row[dateIndex];
    if (!dateValue && dateValue !== 0) continue;
    
    const timestamp = parseDate(dateValue);
    if (!timestamp) continue;
    
    const demand = parseNumber(row[demandIndex]);
    if (isNaN(demand) || demand < 0) continue;
    const temperature = tempIndex !== -1 ? parseNumber(row[tempIndex]) : undefined;
    
    intervals.push({
      timestamp,
      demand,
      temperature: isNaN(temperature as number) ? undefined : temperature,
    });
  }
  
  console.log(`✅ Parsed ${intervals.length} interval records`);
  
  intervals.sort((a, b) => {
    const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime();
    const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime();
    return timeA - timeB;
  });
  
  return intervals;
}

/**
 * Convert IntervalDataPoint[] to LoadProfile
 */
export function intervalDataToLoadProfile(data: IntervalDataPoint[]): LoadProfile {
  const intervals: LoadInterval[] = data.map(point => ({
    timestamp: point.timestamp,
    kw: point.demand,
  }));
  
  return { intervals };
}

/**
 * Detect columns for monthly billing data
 */
function detectColumns(worksheet: XLSX.WorkSheet, headerRow: number): ColumnIndices | null {
  const rowData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    range: { s: { c: 0, r: headerRow }, e: { c: 100, r: headerRow } },
  }) as any[][];
  
  if (rowData.length === 0) return null;
  
  const headers = rowData[0].map((cell: any) => String(cell || '').toLowerCase());
  
  const dateIndex = headers.findIndex((h: string) => /date|bill.*end|end.*date/i.test(h));
  const usageIndex = headers.findIndex((h: string) => /total.*usage|usage.*kwh|kwh/i.test(h) && !/therm/i.test(h));
  const demandIndex = headers.findIndex((h: string) => /max.*demand|demand.*kw|max.*max.*demand|peak.*demand/i.test(h));
  const costIndex = headers.findIndex((h: string) => /total.*bill|bill.*amount|total.*amount|total.*cost|revenue.*amount/i.test(h) && !/kwh|kw|therm/i.test(h));
  
  if (dateIndex === -1 || usageIndex === -1) {
    return null;
  }
  
  return {
    dateIndex,
    usageIndex,
    demandIndex: demandIndex !== -1 ? demandIndex : -1,
    costIndex: costIndex !== -1 ? costIndex : -1,
    headerRow,
  };
}

/**
 * Read monthly billing data from Excel or CSV file
 */
export function readMonthlyBills(filePath: string, sheetIndex: number = 0): MonthlyBill[] {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  
  const ext = path.extname(absolutePath).toLowerCase();
  const isCsv = ext === '.csv';
  
  // For CSV files, use our CSV parser
  if (isCsv) {
    const rows = parseCsv(absolutePath);
    
    if (rows.length === 0) {
      throw new Error('CSV file is empty or could not be parsed');
    }
    
    let headerRowIndex = 0;
    const keywords = ['kwh', 'usage', 'bill', 'amount', 'demand', 'kw', 'date'];
    
    let maxMatches = 0;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      if (!rows[i]) continue;
      const rowKeys = Object.keys(rows[i]).map(k => k.toLowerCase());
      const matches = rowKeys.filter(key => keywords.some(kw => key.includes(kw))).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        headerRowIndex = i;
      }
    }
    
    const headerRow = rows[headerRowIndex];
    if (!headerRow) {
      throw new Error('Could not find header row in CSV');
    }
    
    const headerKeys = Object.keys(headerRow);
    const headerKeysLower = headerKeys.map(k => k.toLowerCase());
    
    // Exclude "year of bill end date" - we want the full date, not just the year
    const dateKeyIndex = headerKeysLower.findIndex(k => 
      (/bill.*end.*date|end.*date/i.test(k) && !/year.*of/i.test(k)) || 
      (k === 'date' || k === 'bill date')
    );
    const usageKeyIndex = headerKeysLower.findIndex(k => /total.*usage.*kwh|total.*usage/i.test(k) && !/therm/i.test(k));
    const demandKeyIndex = headerKeysLower.findIndex(k => /max.*max.*demand|max.*demand.*kw|demand.*kw/i.test(k));
    const costKeyIndex = headerKeysLower.findIndex(k => /total.*bill.*amount|esp.*total.*revenue|total.*bill/i.test(k) && !/kwh|kw|therm/i.test(k));
    const rateKeyIndex = headerKeysLower.findIndex(k => /^rate$/i.test(k) || /rate.*schedule|rate.*code/i.test(k));
    
    const dateKey = dateKeyIndex !== -1 ? headerKeys[dateKeyIndex] : null;
    const usageKey = usageKeyIndex !== -1 ? headerKeys[usageKeyIndex] : null;
    const demandKey = demandKeyIndex !== -1 ? headerKeys[demandKeyIndex] : null;
    const costKey = costKeyIndex !== -1 ? headerKeys[costKeyIndex] : null;
    const rateKey = rateKeyIndex !== -1 ? headerKeys[rateKeyIndex] : null;
    
    if (!dateKey || !usageKey) {
      throw new Error(`Could not detect required columns. Found: ${headerKeys.join(', ')}`);
    }
    
    const bills: MonthlyBill[] = [];
    
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || Object.keys(row).length === 0) continue;
      
      const dateValue = row[dateKey];
      if (!dateValue || String(dateValue).trim() === '') continue;
      
      const billDate = parseDate(dateValue);
      if (!billDate) continue;
      
      const totalUsage = parseNumber(row[usageKey]);
      const peakDemand = demandKey ? parseNumber(row[demandKey]) : 0;
      const totalCost = costKey ? parseNumber(row[costKey]) : 0;
      const rateCode = rateKey ? String(row[rateKey] || '').trim() : undefined;
      
      if (totalUsage === 0 && peakDemand === 0) continue;
      
      bills.push({
        date: billDate,
        totalUsageKwh: totalUsage,
        peakDemandKw: peakDemand,
        totalCost: Math.abs(totalCost),
        rateCode,
      });
    }
    
  // Choose highest cost per month
  const grouped = new Map<string, MonthlyBill>();
  bills.forEach((bill) => {
    const key = `${bill.date.getFullYear()}-${bill.date.getMonth()}`;
    const existing = grouped.get(key);
    if (!existing || bill.totalCost > existing.totalCost) {
      grouped.set(key, bill);
    }
  });
  
  const filtered = Array.from(grouped.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  return filtered;
  }
  
  // For Excel files
  const workbook = XLSX.readFile(absolutePath, { 
    cellDates: false,
    cellNF: false,
    cellText: false,
  });
  
  if (workbook.SheetNames.length === 0) {
    throw new Error('Excel file has no sheets');
  }
  
  if (sheetIndex >= workbook.SheetNames.length) {
    throw new Error(`Sheet index ${sheetIndex} out of range. File has ${workbook.SheetNames.length} sheet(s)`);
  }
  
  const sheetName = workbook.SheetNames[sheetIndex];
  const worksheet = workbook.Sheets[sheetName];
  
  const headerRow = findHeaderRow(worksheet, 15);
  if (headerRow === null) {
    throw new Error('Could not find header row. Expected columns: date, usage (kWh), demand (kW), cost ($)');
  }
  
  const columns = detectColumns(worksheet, headerRow);
  if (!columns) {
    throw new Error('Could not detect required columns. Need at least: date, total usage (kWh)');
  }
  
  // Extract bills from Excel
  const bills: MonthlyBill[] = [];
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  for (let rowNum = columns.headerRow + 1; rowNum <= range.e.r; rowNum++) {
    const dateCellAddress = XLSX.utils.encode_cell({ r: rowNum, c: columns.dateIndex });
    const dateCell = worksheet[dateCellAddress];
    
    if (!dateCell) continue;
    
    const dateRawValue = dateCell.w || dateCell.v;
    if (!dateRawValue) continue;
    
    const billDate = parseDate(dateRawValue);
    if (!billDate) continue;
    
    const usageCellAddress = XLSX.utils.encode_cell({ r: rowNum, c: columns.usageIndex });
    const usageCell = worksheet[usageCellAddress];
    const usageValue = usageCell ? (usageCell.w || usageCell.v) : 0;
    
    const demandCellAddress = columns.demandIndex !== -1 
      ? XLSX.utils.encode_cell({ r: rowNum, c: columns.demandIndex })
      : null;
    const demandCell = demandCellAddress ? worksheet[demandCellAddress] : null;
    const demandValue = demandCell ? (demandCell.w || demandCell.v) : 0;
    
    const costCellAddress = columns.costIndex !== -1
      ? XLSX.utils.encode_cell({ r: rowNum, c: columns.costIndex })
      : null;
    const costCell = costCellAddress ? worksheet[costCellAddress] : null;
    const costValue = costCell ? (costCell.w || costCell.v) : 0;
    
    const totalUsage = parseNumber(usageValue);
    const peakDemand = columns.demandIndex !== -1 ? parseNumber(demandValue) : 0;
    const totalCost = columns.costIndex !== -1 ? parseNumber(costValue) : 0;
    
    if (totalUsage === 0 && peakDemand === 0) continue;
    
    bills.push({
      date: billDate,
      totalUsageKwh: totalUsage,
      peakDemandKw: peakDemand,
      totalCost: Math.abs(totalCost),
    });
  }
  
  // Choose highest cost per month
  const grouped = new Map<string, MonthlyBill>();
  bills.forEach((bill) => {
    const key = `${bill.date.getFullYear()}-${bill.date.getMonth()}`;
    const existing = grouped.get(key);
    if (!existing || bill.totalCost > existing.totalCost) {
      grouped.set(key, bill);
    }
  });
  
  const filtered = Array.from(grouped.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  
  if (filtered.length === 0) {
    throw new Error('No billing data found in file');
  }
  
  return filtered;
}
