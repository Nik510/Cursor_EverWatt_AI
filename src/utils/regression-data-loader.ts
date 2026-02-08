import { detectColumns, parseDelimitedText, type DetectedSchema } from './data-column-detector';
import type { IntervalDataPoint } from './regression-analysis';

export interface RegressionColumnMapping {
  datetimeIndex?: number;
  dateIndex?: number;
  timeIndex?: number;
  usageIndex?: number;
  demandIndex?: number;
  temperatureIndex?: number;
  hddIndex?: number;
  cddIndex?: number;
}

export interface LoadIntervalCsvResult {
  detected: DetectedSchema;
  data: IntervalDataPoint[];
}

function compactMapping(override?: RegressionColumnMapping): RegressionColumnMapping {
  if (!override) return {};
  const entries = Object.entries(override).filter(([, v]) => v !== undefined);
  return Object.fromEntries(entries) as RegressionColumnMapping;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localHourKey(d: Date): string {
  return `${localDateKey(d)} ${pad2(d.getHours())}:00`;
}

function parseNumberLoose(value: string): number {
  const cleaned = String(value ?? '').trim().replace(/[$,\s]/g, '').replace(/\((.*?)\)/g, '-$1');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseTimestamp(
  row: string[],
  headers: string[],
  mapping: RegressionColumnMapping
): Date | null {
  if (mapping.datetimeIndex !== undefined) {
    const v = row[mapping.datetimeIndex] ?? '';
    const dt = new Date(v);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  if (mapping.dateIndex !== undefined && mapping.timeIndex !== undefined) {
    const dateStr = row[mapping.dateIndex] ?? '';
    const timeStr = row[mapping.timeIndex] ?? '';
    const dt = new Date(`${dateStr} ${timeStr}`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // Fallback: try best-effort scanning for a header that includes "date"
  const fallbackIdx = headers.findIndex((h) => h.toLowerCase().includes('date'));
  if (fallbackIdx >= 0) {
    const dt = new Date(row[fallbackIdx] ?? '');
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

function inferIntervalHours(timestamps: Date[]): number {
  if (timestamps.length < 2) return 0.25;
  const diffs: number[] = [];
  for (let i = 1; i < Math.min(timestamps.length, 2000); i++) {
    const dt = timestamps[i].getTime() - timestamps[i - 1].getTime();
    if (dt > 0 && Number.isFinite(dt)) diffs.push(dt);
  }
  if (!diffs.length) return 0.25;
  diffs.sort((a, b) => a - b);
  const mid = diffs[Math.floor(diffs.length / 2)];
  const minutes = mid / 60000;
  if (!Number.isFinite(minutes) || minutes <= 0) return 0.25;
  return minutes / 60;
}

export function loadIntervalCsv(
  csvText: string,
  override?: RegressionColumnMapping
): LoadIntervalCsvResult {
  const table = parseDelimitedText(csvText, ',');
  const detected = detectColumns(table);

  const mapping: RegressionColumnMapping = {
    ...detected.bestGuess,
    ...compactMapping(override),
  };

  const data: IntervalDataPoint[] = [];
  const timestamps: Date[] = [];

  for (const row of table.rows) {
    const ts = parseTimestamp(row, table.headers, mapping);
    if (!ts) continue;

    const usage = mapping.usageIndex !== undefined ? parseNumberLoose(row[mapping.usageIndex] ?? '0') : 0;
    const demand = mapping.demandIndex !== undefined ? parseNumberLoose(row[mapping.demandIndex] ?? '0') : 0;
    const temp = mapping.temperatureIndex !== undefined ? parseNumberLoose(row[mapping.temperatureIndex] ?? '0') : NaN;

    data.push({
      timestamp: ts,
      usage: usage >= 0 ? usage : 0,
      demand: demand >= 0 ? demand : 0,
      temperature: Number.isFinite(temp) ? temp : 65,
    });
    timestamps.push(ts);
  }

  // Derive demand if missing but usage exists
  if (mapping.demandIndex === undefined) {
    const intervalHours = inferIntervalHours(timestamps);
    for (const p of data) {
      p.demand = intervalHours > 0 ? p.usage / intervalHours : p.usage * 4;
    }
  }

  data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return { detected, data };
}

export function loadWeatherTemperatureMap(
  csvText: string,
  override?: RegressionColumnMapping
): { detected: DetectedSchema; byHour: Map<string, number>; byDay: Map<string, number> } {
  const table = parseDelimitedText(csvText, ',');
  const detected = detectColumns(table);
  const mapping: RegressionColumnMapping = { ...detected.bestGuess, ...compactMapping(override) };

  const byHour = new Map<string, number>();
  const byDay = new Map<string, number>();

  for (const row of table.rows) {
    const ts = parseTimestamp(row, table.headers, mapping);
    if (!ts) continue;
    const temp =
      mapping.temperatureIndex !== undefined ? parseNumberLoose(row[mapping.temperatureIndex] ?? '0') : NaN;
    if (!Number.isFinite(temp)) continue;

    byHour.set(localHourKey(ts), temp);
    byDay.set(localDateKey(ts), temp);
  }

  return { detected, byHour, byDay };
}

export function mergeWeatherIntoIntervalData(
  intervalData: IntervalDataPoint[],
  weather: { byHour: Map<string, number>; byDay: Map<string, number> }
): IntervalDataPoint[] {
  return intervalData.map((p) => {
    // Only overwrite if the interval data had no real temperature (default 65 is used as placeholder)
    const hasRealTemp = Number.isFinite(p.temperature) && p.temperature !== 65;
    if (hasRealTemp) return p;

    const keyHour = localHourKey(p.timestamp);
    const keyDay = localDateKey(p.timestamp);
    const temp = weather.byHour.get(keyHour) ?? weather.byDay.get(keyDay);
    if (temp === undefined) return p;
    return { ...p, temperature: temp };
  });
}


