import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { MAX_INTERVAL_ROWS, parseIntervalElectricCsvV1 } from '../src/modules/utilityIntelligence/intake/intervalElectricV1/parseIntervalElectricCsvV1';
import { IntervalElectricIngestReasonCodesV1 } from '../src/modules/utilityIntelligence/intake/intervalElectricV1/reasons';

type ExpectedFixtureMeta = {
  granularityMinutes: number;
  rowCount: number;
  expectedWarnings: string[];
};

function readFixtureText(filename: string): string {
  const fp = path.join(process.cwd(), 'tests', 'fixtures', filename);
  return readFileSync(fp, 'utf-8');
}

function readFixtureMeta(filename: string): ExpectedFixtureMeta {
  const fp = path.join(process.cwd(), 'tests', 'fixtures', `${filename}.meta.json`);
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

function warningCodes(res: any): string[] {
  return (res?.meta?.warnings || []).map((w: any) => String(w?.code || '')).filter(Boolean);
}

describe('parseIntervalElectricCsvV1', () => {
  it('parses PG&E interval CSV deterministically (fixture)', () => {
    const csvText = readFixtureText('pge_interval_small_v1.csv');
    const res = parseIntervalElectricCsvV1({ csvText, timezoneHint: 'America/Los_Angeles' });

    expect(res.ok).toBe(true);
    expect(Array.isArray(res.points)).toBe(true);
    expect(res.points.length).toBe(4);
    expect(res.meta.detectedFormat).toBe('pge_interval_csv_v1');
    expect(res.meta.meterKey).toBe('1234567890');
    expect(res.meta.inferredIntervalMinutes).toBe(15);

    const codes = (res.meta.warnings || []).map((w: any) => String(w?.code || ''));
    expect(codes).toContain(IntervalElectricIngestReasonCodesV1.CSV_DETECTED_PGE_INTERVAL);
    expect(codes).toContain(IntervalElectricIngestReasonCodesV1.PGE_CSV_PARSED_OK);

    // Basic point shape
    expect(String(res.points[0].timestampIso || '')).toMatch(/Z$/);
    expect(res.points[0].intervalMinutes).toBe(15);
    expect(Number(res.points[0].kWh)).toBeCloseTo(1.5, 6);
    expect(Number(res.points[0].kW)).toBeCloseTo(6.0, 6);
  });

  it.each([
    'client_interval_month_full.csv',
    'client_interval_month_gap.csv',
    'client_interval_month_headers.csv',
  ])('matches expected meta for %s', (fixtureName) => {
    const csvText = readFixtureText(fixtureName);
    const expected = readFixtureMeta(fixtureName);

    const res = parseIntervalElectricCsvV1({ csvText, timezoneHint: 'America/Los_Angeles' });
    expect(res.ok).toBe(true);

    expect(res.meta.inferredIntervalMinutes).toBe(expected.granularityMinutes);
    expect(res.meta.rowCount).toBe(expected.rowCount);

    const actualCodes = warningCodes(res).slice().sort();
    const expectedCodes = (expected.expectedWarnings || []).map(String).filter(Boolean).slice().sort();
    expect(actualCodes).toEqual(expectedCodes);
  });

  it(
    'enforces MAX_INTERVAL_ROWS=40000 guardrail (synthetic MAX+1 rows, CI-safe)',
    () => {
    function fmtUtc(d: Date): string {
      const m = d.getUTCMonth() + 1;
      const day = d.getUTCDate();
      const y = d.getUTCFullYear();
      const hh = d.getUTCHours();
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      return `${m}/${day}/${y} ${hh}:${mm}`;
    }

    const start = Date.UTC(2024, 0, 1, 0, 0, 0);
    const rowCount = MAX_INTERVAL_ROWS + 1;
    const rows: string[] = new Array(rowCount + 1);
    rows[0] = 'Service Agreement,Start Date Time,End Date Time,Usage,Peak Demand';
    for (let i = 0; i < rowCount; i++) {
      const a = new Date(start + i * 15 * 60_000);
      const b = new Date(start + (i + 1) * 15 * 60_000);
      rows[i + 1] = `999,\"${fmtUtc(a)}\",\"${fmtUtc(b)}\",1.0,4.0`;
    }
    const csvText = rows.join('\n');

    const res = parseIntervalElectricCsvV1({ csvText, timezoneHint: 'UTC' });
    expect(res.ok).toBe(true);
    expect(res.meta.rowCount).toBe(rowCount);
    expect(res.points.length).toBe(MAX_INTERVAL_ROWS);

    const codes = warningCodes(res);
    expect(codes).toContain(IntervalElectricIngestReasonCodesV1.INTERVAL_TOO_MANY_ROWS);
    expect(codes).toContain(IntervalElectricIngestReasonCodesV1.PGE_CSV_PARSED_OK);
    },
    60_000,
  );

  it('warns and deterministically dedupes duplicate timestamps (keep first)', () => {
    const csvText = [
      'Service Agreement,Start Date Time,End Date Time,Usage,Peak Demand',
      // Duplicate start timestamps -> duplicate timestampIso
      '999,"1/1/2026 0:00","1/1/2026 0:15",1.0,4.0',
      '999,"1/1/2026 0:00","1/1/2026 0:15",1.1,4.4',
      '999,"1/1/2026 0:15","1/1/2026 0:30",1.0,4.0',
    ].join('\n');

    const res = parseIntervalElectricCsvV1({ csvText, timezoneHint: 'UTC' });
    expect(res.ok).toBe(true);

    const codes = warningCodes(res);
    expect(codes).toContain(IntervalElectricIngestReasonCodesV1.INTERVAL_DUPLICATE_TIMESTAMPS);
    // Should keep first occurrence => 2 unique timestamps
    expect(res.points.length).toBe(2);
    expect(res.points[0].timestampIso).toMatch(/T00:00:00\.000Z$/);
  });

  it('fails fast on malformed timestamps with row index evidence', () => {
    const csvText = [
      'Service Agreement,Start Date Time,End Date Time,Usage,Peak Demand',
      '999,"BAD_TS","1/1/2026 0:15",1.0,4.0',
      '999,"1/1/2026 0:15","1/1/2026 0:30",1.0,4.0',
    ].join('\n');

    const res = parseIntervalElectricCsvV1({ csvText, timezoneHint: 'UTC' });
    expect(res.ok).toBe(false);

    const codes = warningCodes(res);
    expect(codes).toContain(IntervalElectricIngestReasonCodesV1.CSV_BAD_TIMESTAMP);

    const w = (res.meta.warnings || []).find((x: any) => String(x?.code || '') === IntervalElectricIngestReasonCodesV1.CSV_BAD_TIMESTAMP);
    expect(w).toBeTruthy();
    expect(Number((w as any)?.details?.rowIndex)).toBeGreaterThanOrEqual(0);
  });

  it('warns on non-uniform interval granularity', () => {
    const csvText = [
      'Service Agreement,Start Date Time,End Date Time,Usage,Peak Demand',
      // 15-minute interval
      '999,"1/1/2026 0:00","1/1/2026 0:15",1.0,4.0',
      // 30-minute interval (non-uniform)
      '999,"1/1/2026 0:15","1/1/2026 0:45",2.0,4.0',
    ].join('\n');

    const res = parseIntervalElectricCsvV1({ csvText, timezoneHint: 'UTC' });
    expect(res.ok).toBe(true);

    const codes = warningCodes(res);
    expect(codes).toContain(IntervalElectricIngestReasonCodesV1.INTERVAL_NON_UNIFORM_GRANULARITY);
  });
});

