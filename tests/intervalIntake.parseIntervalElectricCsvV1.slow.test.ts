import { describe, it, expect } from 'vitest';
import { MAX_INTERVAL_ROWS, parseIntervalElectricCsvV1 } from '../src/modules/utilityIntelligence/intake/intervalElectricV1/parseIntervalElectricCsvV1';
import { IntervalElectricIngestReasonCodesV1 } from '../src/modules/utilityIntelligence/intake/intervalElectricV1/reasons';

function warningCodes(res: any): string[] {
  return (res?.meta?.warnings || []).map((w: any) => String(w?.code || '')).filter(Boolean);
}

const runSlow = String(process.env.EVERWATT_RUN_SLOW_TESTS || '').trim() === '1';
const maybeDescribe = runSlow ? describe : describe.skip;

maybeDescribe('parseIntervalElectricCsvV1 (slow)', () => {
  it(
    'enforces MAX_INTERVAL_ROWS=40000 guardrail (synthetic 50k rows)',
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
      const rows: string[] = ['Service Agreement,Start Date Time,End Date Time,Usage,Peak Demand'];
      for (let i = 0; i < 50_000; i++) {
        const a = new Date(start + i * 15 * 60_000);
        const b = new Date(start + (i + 1) * 15 * 60_000);
        rows.push(`999,\"${fmtUtc(a)}\",\"${fmtUtc(b)}\",1.0,4.0`);
      }
      const csvText = rows.join('\n');

      const res = parseIntervalElectricCsvV1({ csvText, timezoneHint: 'UTC' });
      expect(res.ok).toBe(true);
      expect(res.meta.rowCount).toBe(50_000);
      expect(res.points.length).toBe(MAX_INTERVAL_ROWS);

      const codes = warningCodes(res);
      expect(codes).toContain(IntervalElectricIngestReasonCodesV1.INTERVAL_TOO_MANY_ROWS);
      expect(codes).toContain(IntervalElectricIngestReasonCodesV1.PGE_CSV_PARSED_OK);
    },
    120_000,
  );
});

