import Papa from 'papaparse';

import { zonedLocalToUtcDate } from '../../../billingEngineV1/time/zonedTime';
import type { EvidenceItemV1 } from '../../types';
import type { MissingInfoItemV0 } from '../../../utilityIntelligence/missingInfo/types';

export type PgeIntervalRowV1 = {
  meterKey: string;
  timestampIso: string;
  intervalMinutes: number;
  kWh?: number;
  kW?: number;
  temperatureF?: number;
};

export type PgeIntervalSeriesParsedV1 = {
  meterKey: string;
  intervals: PgeIntervalRowV1[];
  sourceMeta: {
    rowCount: number;
    timezoneUsed: string;
    inferredIntervalMinutes: number | null;
    hasTemp: boolean;
    hasKwColumn: boolean;
  };
  warnings: string[];
  missingInfo: MissingInfoItemV0[];
  evidence: EvidenceItemV1[];
};

function normHeader(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function firstHeaderMatch(headers: string[], candidates: string[]): string | null {
  const byNorm = new Map(headers.map((h) => [normHeader(h), h]));
  for (const c of candidates) {
    const hit = byNorm.get(normHeader(c));
    if (hit) return hit;
  }
  return null;
}

function parseNumberLoose(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const str = raw.replace(/[$,]/g, '').replace(/[()]/g, '-').trim();
  const n = Number(str);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseUsDateTimeToUtcIso(args: { raw: string; timeZone: string }): { iso: string | null; because: string } {
  const s = String(args.raw || '').trim();
  if (!s) return { iso: null, because: 'blank timestamp' };

  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?$/.exec(s);
  if (!m) return { iso: null, because: 'unrecognized timestamp format' };

  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  let hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6] || '0');
  const ampm = String(m[7] || '').toLowerCase();

  if (
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(year) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    return { iso: null, because: 'non-finite timestamp parts' };
  }

  if (ampm) {
    const isPm = ampm === 'pm';
    if (hour === 12) hour = isPm ? 12 : 0;
    else hour = isPm ? hour + 12 : hour;
  }

  try {
    const d = zonedLocalToUtcDate({
      local: { year, month, day, hour, minute, second },
      timeZone: args.timeZone,
    });
    return { iso: d.toISOString(), because: `parsed as local ${args.timeZone}` };
  } catch {
    return { iso: null, because: 'zoned conversion failed' };
  }
}

function modeIntervalMinutes(values: number[]): number | null {
  const xs = values.filter((n) => Number.isFinite(n) && n > 0);
  if (!xs.length) return null;
  const counts = new Map<number, number>();
  for (const v of xs) counts.set(v, (counts.get(v) || 0) + 1);
  let best: { v: number; c: number } | null = null;
  for (const [v, c] of counts.entries()) {
    if (!best || c > best.c || (c === best.c && v < best.v)) best = { v, c };
  }
  return best ? best.v : null;
}

export function parsePgeIntervalCsvV1(args: {
  csvTextOrBuffer: string | Buffer;
  timezoneHint?: string;
}): { meters: PgeIntervalSeriesParsedV1[]; warnings: string[] } {
  const tz = String(args.timezoneHint || 'America/Los_Angeles').trim() || 'America/Los_Angeles';

  const isBuf = typeof Buffer !== 'undefined' && Buffer.isBuffer(args.csvTextOrBuffer as any);
  const text = isBuf ? (args.csvTextOrBuffer as any).toString('utf-8') : String(args.csvTextOrBuffer || '');
  const parsed = Papa.parse<Record<string, any>>(text, { header: true, skipEmptyLines: 'greedy' });
  const headers = Array.isArray(parsed?.meta?.fields) ? parsed.meta.fields : [];

  const warnings: string[] = [];
  if (!headers.length) return { meters: [], warnings: ['No CSV headers detected in interval export.'] };

  const colServiceAgreement = firstHeaderMatch(headers, ['Service Agreement', 'SA ID', 'SAID']);
  const colStart = firstHeaderMatch(headers, ['Start Date Time', 'Interval Start', 'Start']);
  const colEnd = firstHeaderMatch(headers, ['End Date Time', 'Interval End', 'End']);
  const colUsage = firstHeaderMatch(headers, ['Usage', 'Usage (kWh)']);
  const colUsageUnit = firstHeaderMatch(headers, ['Usage Unit']);
  const colPeakDemand = firstHeaderMatch(headers, ['Peak Demand', 'Demand (kW)', 'kW', 'KW']);
  const colDemandUnit = firstHeaderMatch(headers, ['Demand Unit']);
  const colTemp = firstHeaderMatch(headers, ['Avg. Temperature', 'Avg Temperature', 'Temperature']);
  const colTempUnit = firstHeaderMatch(headers, ['Temperature Unit']);

  const evidenceCommon: EvidenceItemV1[] = [];
  evidenceCommon.push({ kind: 'assumption', pointer: { source: 'pgeIntervalCsv', key: 'timezoneUsed', value: tz } });
  if (colUsage) evidenceCommon.push({ kind: 'assumption', pointer: { source: 'pgeIntervalCsv', key: 'columnMap.Usage', value: `${colUsage} -> kWh` } });
  if (colPeakDemand) evidenceCommon.push({ kind: 'assumption', pointer: { source: 'pgeIntervalCsv', key: 'columnMap.PeakDemand', value: `${colPeakDemand} -> kW` } });
  if (colTemp) evidenceCommon.push({ kind: 'assumption', pointer: { source: 'pgeIntervalCsv', key: 'columnMap.AvgTemperature', value: `${colTemp} -> temperature` } });

  const byMeter = new Map<
    string,
    {
      rows: PgeIntervalRowV1[];
      intervalMinutes: number[];
      hasTemp: boolean;
      hasKw: boolean;
      missing: MissingInfoItemV0[];
      warnings: string[];
      evidence: EvidenceItemV1[];
    }
  >();

  const dataRows = Array.isArray(parsed.data) ? parsed.data : [];
  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];
    if (!row) continue;
    const hasAny = Object.values(row).some((v) => String(v ?? '').trim() !== '');
    if (!hasAny) continue;

    const meterKey = String((colServiceAgreement ? row[colServiceAgreement] : '') || '').trim();
    if (!meterKey) continue;

    const startRaw = String((colStart ? row[colStart] : '') || '').trim();
    const endRaw = String((colEnd ? row[colEnd] : '') || '').trim();
    const startParsed = parseUsDateTimeToUtcIso({ raw: startRaw, timeZone: tz });
    const endParsed = parseUsDateTimeToUtcIso({ raw: endRaw, timeZone: tz });
    if (!startParsed.iso || !endParsed.iso) {
      const m = byMeter.get(meterKey) || { rows: [], intervalMinutes: [], hasTemp: false, hasKw: false, missing: [], warnings: [], evidence: [...evidenceCommon] };
      m.missing.push({
        id: 'pge.interval.timestamp.unparseable',
        category: 'tariff',
        severity: 'warning',
        description: 'Interval row has an unparseable Start/End Date Time timestamp; row was skipped.',
        details: {
          rowIndex,
          startRaw,
          endRaw,
          startBecause: startParsed.because,
          endBecause: endParsed.because,
        },
      } as any);
      m.warnings.push(`Unparseable timestamp at rowIndex=${rowIndex} for meterKey=${meterKey}: start="${startRaw}" end="${endRaw}".`);
      byMeter.set(meterKey, m);
      continue;
    }

    const intervalMinutes = Math.round((new Date(endParsed.iso).getTime() - new Date(startParsed.iso).getTime()) / 60_000);
    if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0 || intervalMinutes > 24 * 60) {
      const m = byMeter.get(meterKey) || { rows: [], intervalMinutes: [], hasTemp: false, hasKw: false, missing: [], warnings: [], evidence: [...evidenceCommon] };
      m.missing.push({
        id: 'pge.interval.intervalMinutes.invalid',
        category: 'tariff',
        severity: 'warning',
        description: 'Interval minutes could not be computed from Start/End Date Time.',
      });
      m.evidence.push({
        kind: 'intervalCalc',
        pointer: { source: 'pgeIntervalCsv', key: 'intervalMinutes.compute', value: intervalMinutes, snippet: `start="${startRaw}" end="${endRaw}"` },
      });
      byMeter.set(meterKey, m);
      continue;
    }

    const usageUnit = String((colUsageUnit ? row[colUsageUnit] : '') || 'KWH').trim().toUpperCase();
    const demandUnit = String((colDemandUnit ? row[colDemandUnit] : '') || 'KW').trim().toUpperCase();
    const tempUnit = String((colTempUnit ? row[colTempUnit] : '') || 'FAHRENHEIT').trim().toUpperCase();

    const kwh = colUsage ? parseNumberLoose(row[colUsage]) : null;
    const kw = colPeakDemand ? parseNumberLoose(row[colPeakDemand]) : null;
    const temp = colTemp ? parseNumberLoose(row[colTemp]) : null;

    const m = byMeter.get(meterKey) || { rows: [], intervalMinutes: [], hasTemp: false, hasKw: false, missing: [], warnings: [], evidence: [...evidenceCommon] };

    m.intervalMinutes.push(intervalMinutes);
    m.evidence.push({ kind: 'intervalCalc', pointer: { source: 'pgeIntervalCsv', key: 'startDateTimeRaw', value: startRaw } });
    m.evidence.push({ kind: 'intervalCalc', pointer: { source: 'pgeIntervalCsv', key: 'endDateTimeRaw', value: endRaw } });
    m.evidence.push({ kind: 'intervalCalc', pointer: { source: 'pgeIntervalCsv', key: 'timestampIso', value: startParsed.iso } });
    m.evidence.push({ kind: 'intervalCalc', pointer: { source: 'pgeIntervalCsv', key: 'intervalMinutes', value: intervalMinutes } });

    if (colUsage && usageUnit !== 'KWH') {
      m.missing.push({
        id: 'pge.interval.usageUnit.unsupported',
        category: 'tariff',
        severity: 'warning',
        description: `Usage Unit is not KWH (got "${usageUnit}"); kWh will not be trusted.`,
      });
      m.warnings.push(`Unsupported Usage Unit "${usageUnit}" for meterKey=${meterKey}.`);
    }
    if (colPeakDemand && demandUnit !== 'KW') {
      m.missing.push({
        id: 'pge.interval.demandUnit.unsupported',
        category: 'tariff',
        severity: 'warning',
        description: `Demand Unit is not KW (got "${demandUnit}"); kW will not be trusted.`,
      });
      m.warnings.push(`Unsupported Demand Unit "${demandUnit}" for meterKey=${meterKey}.`);
    }
    if (colTemp && tempUnit && tempUnit !== 'FAHRENHEIT' && tempUnit !== 'F') {
      m.missing.push({
        id: 'pge.interval.temperatureUnit.unsupported',
        category: 'tariff',
        severity: 'info',
        description: `Temperature Unit is not FAHRENHEIT (got "${tempUnit}"); temperatureF will be omitted.`,
      });
      m.warnings.push(`Unsupported Temperature Unit "${tempUnit}" for meterKey=${meterKey}.`);
    }

    const outRow: PgeIntervalRowV1 = {
      meterKey,
      timestampIso: startParsed.iso,
      intervalMinutes,
      ...(kwh !== null && colUsage && usageUnit === 'KWH' ? { kWh: kwh } : {}),
      ...(kw !== null && colPeakDemand && demandUnit === 'KW' ? { kW: kw } : {}),
      ...(temp !== null && colTemp && (tempUnit === 'FAHRENHEIT' || tempUnit === 'F') ? { temperatureF: temp } : {}),
    };

    if (outRow.temperatureF !== undefined) m.hasTemp = true;
    if (outRow.kW !== undefined) m.hasKw = true;

    m.rows.push(outRow);
    byMeter.set(meterKey, m);
  }

  const meters: PgeIntervalSeriesParsedV1[] = [];
  for (const [meterKey, m] of byMeter.entries()) {
    const inferred = modeIntervalMinutes(m.intervalMinutes);
    const hasTemp = m.hasTemp;
    const hasKw = m.hasKw;
    meters.push({
      meterKey,
      intervals: m.rows,
      sourceMeta: {
        rowCount: m.rows.length,
        timezoneUsed: tz,
        inferredIntervalMinutes: inferred,
        hasTemp,
        hasKwColumn: hasKw,
      },
      warnings: Array.from(new Set(m.warnings)),
      missingInfo: m.missing,
      evidence: m.evidence,
    });
  }

  return { meters, warnings };
}

