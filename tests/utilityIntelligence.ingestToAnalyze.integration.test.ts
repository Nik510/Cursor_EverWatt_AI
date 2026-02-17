import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { parseIntervalElectricCsvV1 } from '../src/modules/utilityIntelligence/intake/intervalElectricV1/parseIntervalElectricCsvV1';
import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';
import type { UtilityInputs } from '../src/modules/utilityIntelligence/types';

describe('utility engine integration: ingest -> analyzeUtility (stable)', () => {
  it('parses fixture CSV and produces interval-derived evidence in outputs', async () => {
    const fp = path.join(process.cwd(), 'tests', 'fixtures', 'pge_interval_small_v1.csv');
    const csvText = readFileSync(fp, 'utf-8');
    const parsed = parseIntervalElectricCsvV1({ csvText, timezoneHint: 'America/Los_Angeles' });
    expect(parsed.ok).toBe(true);
    expect(parsed.points.length).toBeGreaterThan(0);

    const intervalPointsV1 = parsed.points;
    const intervalKwSeries = intervalPointsV1
      .map((p) => {
        const kwExplicit = Number((p as any)?.kW);
        const kWh = Number((p as any)?.kWh);
        const mins = Number((p as any)?.intervalMinutes);
        const kwDerived = !Number.isFinite(kwExplicit) && Number.isFinite(kWh) && Number.isFinite(mins) && mins > 0 ? kWh * (60 / mins) : NaN;
        const kw = Number.isFinite(kwExplicit) ? kwExplicit : kwDerived;
        return { timestampIso: String((p as any)?.timestampIso || '').trim(), kw };
      })
      .filter((x) => x.timestampIso && Number.isFinite(Number(x.kw)));

    const inputs: UtilityInputs = {
      orgId: 'o_test',
      projectId: 'p_test',
      serviceType: 'electric',
      utilityTerritory: 'PGE',
      currentRate: { utility: 'PGE', rateCode: 'E-19', effectiveDate: '2026-01-01' },
    };

    const res = await analyzeUtility(inputs, {
      intervalPointsV1,
      intervalKwSeries,
      nowIso: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      idFactory: () => 'id_fixed',
    });

    expect(res?.insights).toBeTruthy();
    const missingInfo = Array.isArray((res as any)?.insights?.missingInfo) ? (res as any).insights.missingInfo : [];
    expect(missingInfo.some((it: any) => String(it?.id || '') === 'interval.intervalElectricV1.missing')).toBe(false);

    const billIntel = (res as any)?.insights?.billIntelligenceV1;
    expect(billIntel).toBeTruthy();
    const intervalInsights = (billIntel as any)?.intervalInsightsV1;
    expect(intervalInsights).toBeTruthy();
    // With a tiny fixture, we don't expect full hourly distributions, but we should still compute at least peakDayOfWeek.
    expect(String((intervalInsights as any)?.peakDayOfWeek || '')).toMatch(/Sun|Mon|Tue|Wed|Thu|Fri|Sat/);
  });
});

