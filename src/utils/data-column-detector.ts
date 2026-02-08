/**
 * Data Column Detector
 *
 * Goal: given a CSV (or CSV-like) table, infer which columns represent:
 * - timestamp (or date + time)
 * - usage/energy
 * - demand
 * - temperature
 * - HDD / CDD
 *
 * This is used by the Regression Report Generator to support:
 * - interval files where weather is embedded
 * - separate interval + weather files
 * - user override via column mapping UI
 */

export type ColumnRole =
  | 'datetime'
  | 'date'
  | 'time'
  | 'usage'
  | 'energy'
  | 'demand'
  | 'temperature'
  | 'hdd'
  | 'cdd'
  | 'unknown';

export interface DetectedColumn {
  index: number;
  header: string;
  role: ColumnRole;
  confidence: number; // 0-100
  unitHint?: string; // "kWh", "kW", "°F", etc.
  sampleValues: Array<string | number>;
}

export interface DetectedSchema {
  columns: DetectedColumn[];
  bestGuess: {
    datetimeIndex?: number;
    dateIndex?: number;
    timeIndex?: number;
    usageIndex?: number;
    demandIndex?: number;
    temperatureIndex?: number;
    hddIndex?: number;
    cddIndex?: number;
  };
}

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

function normalizeHeader(h: string): string {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((v) => v.replace(/^\s*"\s*|\s*"\s*$/g, '').trim());
}

export function parseDelimitedText(text: string, delimiter: string = ','): ParsedTable {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0], delimiter);
  const rows = lines.slice(1).map((l) => parseCSVLine(l, delimiter));

  return { headers, rows };
}

function parseNumberLoose(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  const cleaned = str.replace(/[$,\s]/g, '').replace(/\((.*?)\)/g, '-$1');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function looksLikeDate(value: unknown): boolean {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  const str = String(value || '').trim();
  if (!str) return false;
  // Common patterns: 2024-01-31, 1/31/2024, 1/31/24 13:00, 2024-01-31T13:00
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str)) return true;
  return false;
}

function looksLikeTime(value: unknown): boolean {
  const str = String(value || '').trim();
  if (!str) return false;
  // 13:00, 13:00:00, 1:00 PM
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) return true;
  if (/^\d{1,2}:\d{2}\s*(am|pm)$/i.test(str)) return true;
  return false;
}

function analyzeSamples(samples: string[]): {
  isDatetime: boolean;
  isDate: boolean;
  isTime: boolean;
  isNumeric: boolean;
  avg: number;
  min: number;
  max: number;
} {
  let dateCount = 0;
  let timeCount = 0;
  let numericCount = 0;
  const nums: number[] = [];

  for (const s of samples) {
    if (looksLikeDate(s)) dateCount++;
    if (looksLikeTime(s)) timeCount++;
    const n = parseNumberLoose(s);
    if (n !== null) {
      numericCount++;
      nums.push(n);
    }
  }

  const isDate = dateCount > samples.length * 0.5;
  const isTime = timeCount > samples.length * 0.5;
  const isDatetime = isDate && samples.some((s) => /\d{1,2}:\d{2}/.test(String(s)));
  const isNumeric = numericCount > samples.length * 0.6;

  const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 0;

  return { isDatetime, isDate, isTime, isNumeric, avg, min, max };
}

function headerHints(headerNorm: string): { role: ColumnRole; confidence: number; unitHint?: string } {
  const h = headerNorm;

  // datetime / date / time
  if (/(date\s*time|datetime|timestamp|start\s*date\s*time|end\s*date\s*time)/.test(h)) {
    return { role: 'datetime', confidence: 85 };
  }
  if (/(start\s*date|end\s*date|\bdate\b)/.test(h)) {
    return { role: 'date', confidence: 70 };
  }
  if (/(start\s*time|end\s*time|\btime\b)/.test(h)) {
    return { role: 'time', confidence: 70 };
  }

  // energy / usage
  if (/(kwh|kw-hr|kilowatt[-\s]*hour)/.test(h)) return { role: 'usage', confidence: 80, unitHint: 'kWh' };
  if (/\busage\b|\bconsumption\b|\benergy\b|\bactual\s*usage\b/.test(h)) return { role: 'usage', confidence: 65 };

  // demand
  if (/(kw\b|kilowatt\b)/.test(h) && /(demand|peak)/.test(h)) return { role: 'demand', confidence: 85, unitHint: 'kW' };
  if (/\bdemand\b|\bpeak\s*demand\b/.test(h)) return { role: 'demand', confidence: 70, unitHint: 'kW' };

  // temperature
  if (/(temperature|temp|oat|outdoor\s*air|dry\s*bulb)/.test(h)) return { role: 'temperature', confidence: 75, unitHint: '°F' };

  // degree days
  if (/\bhdd\b|heating\s*degree/.test(h)) return { role: 'hdd', confidence: 85 };
  if (/\bcdd\b|cooling\s*degree/.test(h)) return { role: 'cdd', confidence: 85 };

  return { role: 'unknown', confidence: 10 };
}

function dataHints(headerRole: ColumnRole, stats: ReturnType<typeof analyzeSamples>): { role: ColumnRole; confidenceDelta: number; unitHint?: string } {
  // Temperature: typically 0-130 F
  if (stats.isNumeric && stats.max <= 200 && stats.min >= -50 && stats.avg > 0 && stats.avg < 120) {
    if (headerRole === 'unknown' || headerRole === 'temperature') {
      return { role: 'temperature', confidenceDelta: headerRole === 'temperature' ? 10 : 35, unitHint: '°F' };
    }
  }

  // Demand kW: generally smaller magnitude than kWh totals (but interval kWh can also be small)
  if (stats.isNumeric && stats.max > 0 && stats.max < 20000 && stats.avg < 5000) {
    if (headerRole === 'unknown' || headerRole === 'demand') {
      return { role: 'demand', confidenceDelta: headerRole === 'demand' ? 10 : 20, unitHint: 'kW' };
    }
  }

  // Usage kWh: can vary widely; if clearly larger than typical kW demand or has decimals
  if (stats.isNumeric && stats.max >= 100 && stats.avg >= 10) {
    if (headerRole === 'unknown' || headerRole === 'usage') {
      return { role: 'usage', confidenceDelta: headerRole === 'usage' ? 10 : 20, unitHint: 'kWh' };
    }
  }

  // Date/time
  if (stats.isDatetime && (headerRole === 'unknown' || headerRole === 'datetime')) {
    return { role: 'datetime', confidenceDelta: headerRole === 'datetime' ? 10 : 40 };
  }
  if (stats.isDate && (headerRole === 'unknown' || headerRole === 'date')) {
    return { role: 'date', confidenceDelta: headerRole === 'date' ? 10 : 30 };
  }
  if (stats.isTime && (headerRole === 'unknown' || headerRole === 'time')) {
    return { role: 'time', confidenceDelta: headerRole === 'time' ? 10 : 30 };
  }

  return { role: headerRole, confidenceDelta: 0 };
}

export function detectColumns(table: ParsedTable, sampleSize: number = 50): DetectedSchema {
  const headers = table.headers || [];
  const rows = table.rows || [];

  const columns: DetectedColumn[] = headers.map((h, idx) => {
    const header = String(h || '');
    const hn = normalizeHeader(header);
    const samples = rows.slice(0, sampleSize).map((r) => String(r[idx] ?? '')).filter((v) => v.trim().length > 0);
    const base = headerHints(hn);
    const stats = analyzeSamples(samples.slice(0, Math.max(10, Math.min(samples.length, sampleSize))));
    const dh = dataHints(base.role, stats);

    const role = dh.role;
    const confidence = Math.max(0, Math.min(100, base.confidence + dh.confidenceDelta));
    const unitHint = dh.unitHint ?? base.unitHint;

    // Provide parsed numeric samples when possible for UI
    const sampleValues: Array<string | number> = samples.slice(0, 5).map((s) => {
      const n = parseNumberLoose(s);
      return n === null ? s : n;
    });

    return { index: idx, header, role, confidence, unitHint, sampleValues };
  });

  const pickBest = (role: ColumnRole): DetectedColumn | undefined => {
    const candidates = columns.filter((c) => c.role === role).sort((a, b) => b.confidence - a.confidence);
    return candidates[0];
  };

  const bestDatetime = pickBest('datetime');
  const bestDate = pickBest('date');
  const bestTime = pickBest('time');
  const bestUsage = pickBest('usage') ?? pickBest('energy');
  const bestDemand = pickBest('demand');
  const bestTemp = pickBest('temperature');
  const bestHdd = pickBest('hdd');
  const bestCdd = pickBest('cdd');

  // If we have a strong datetime column, prefer it and ignore separate date/time
  const datetimeIndex = bestDatetime && bestDatetime.confidence >= 70 ? bestDatetime.index : undefined;
  const dateIndex = datetimeIndex === undefined && bestDate && bestDate.confidence >= 55 ? bestDate.index : undefined;
  const timeIndex = datetimeIndex === undefined && bestTime && bestTime.confidence >= 55 ? bestTime.index : undefined;

  return {
    columns,
    bestGuess: {
      datetimeIndex,
      dateIndex,
      timeIndex,
      usageIndex: bestUsage && bestUsage.confidence >= 40 ? bestUsage.index : undefined,
      demandIndex: bestDemand && bestDemand.confidence >= 40 ? bestDemand.index : undefined,
      temperatureIndex: bestTemp && bestTemp.confidence >= 40 ? bestTemp.index : undefined,
      hddIndex: bestHdd && bestHdd.confidence >= 40 ? bestHdd.index : undefined,
      cddIndex: bestCdd && bestCdd.confidence >= 40 ? bestCdd.index : undefined,
    },
  };
}


