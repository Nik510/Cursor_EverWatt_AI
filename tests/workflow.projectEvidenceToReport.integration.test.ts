import { describe, it, expect, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { readFileSync } from 'node:fs';

import './helpers/mockHeavyServerDeps';

import { extractBillPdfTariffHintsV1 } from '../src/modules/utilityIntelligence/billPdf/extractBillPdfTariffHintsV1';
import { matchBillTariffToLibraryV1 } from '../src/modules/tariffLibrary/matching/matchBillTariffToLibraryV1';
import { analyzeUtility } from '../src/modules/utilityIntelligence/analyzeUtility';
import { parseIntervalElectricCsvV1 } from '../src/modules/utilityIntelligence/intake/intervalElectricV1/parseIntervalElectricCsvV1';
import { buildInternalEngineeringReportJsonV1 } from '../src/modules/reports/internalEngineering/v1/buildInternalEngineeringReportJsonV1';
import { renderInternalEngineeringReportHtmlV1 } from '../src/modules/reports/internalEngineering/v1/renderInternalEngineeringReportHtml';
import { mapTou } from '../src/modules/billingEngineV1/tou/mapTou';
import { TariffModelSchema, BillingPeriodSchema, IntervalRowSchema } from '../src/modules/tariffEngine/schema';
import { assignIntervalsToBillingCycles } from '../src/modules/tariffEngine/join';
import { calculateBillsPerCycle } from '../src/modules/tariffEngine/billing';
import { engineVersions } from '../src/modules/engineVersions';

describe('workflow: project evidence -> analysis -> internal engineering report (deterministic)', () => {
  it(
    'produces a deterministic report JSON + HTML with stable invariants',
    async () => {
    const tmpTariffs = mkdtempSync(path.join(os.tmpdir(), 'everwatt-tariffs-'));
    const prevTariffs = process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = tmpTariffs;

    const projectId = 'p_kitchen_sink';
    const orgId = 'o_test';

    try {
      // Save a minimal tariff snapshot so analyzeUtility can deterministically attach tariff metadata + bill match.
      vi.resetModules();
      const { saveSnapshot } = await import('../src/modules/tariffLibrary/storage');
      await saveSnapshot({
        utility: 'PGE',
        capturedAt: '2026-02-05T12:00:00.000Z',
        versionTag: '2026-02-05T1200Z',
        rates: [
          {
            utility: 'PGE',
            rateCode: 'E-19',
            sourceUrl: 'https://example.com/pge/e-19',
            sourceTitle: 'Schedule E-19',
            lastVerifiedAt: '2026-02-05T12:00:00.000Z',
          },
          {
            utility: 'PGE',
            rateCode: 'B-19',
            sourceUrl: 'https://example.com/pge/b-19',
            sourceTitle: 'Schedule B-19',
            lastVerifiedAt: '2026-02-05T12:00:00.000Z',
          },
        ],
        sourceFingerprints: [{ url: 'https://example.com/pge-index', contentHash: 'hash1' }],
      } as any);

      // Evidence: bill text (small fixture)
      const billText = readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'bill_text_small.txt'), 'utf-8');
      const hints = extractBillPdfTariffHintsV1(billText);
      expect(hints).toBeTruthy();
      expect(hints?.utilityHint).toBe('PG&E');
      expect(hints?.rateScheduleText).toBe('E-19');

      // Evidence: interval CSV month fixture -> canonical points/meta
      const csvText = readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'client_interval_month_full.csv'), 'utf-8');
      const parsed = parseIntervalElectricCsvV1({ csvText, timezoneHint: 'America/Los_Angeles' });
      expect(parsed.ok).toBe(true);
      expect(parsed.meta.inferredIntervalMinutes).toBe(15);
      expect(parsed.points.length).toBeGreaterThan(1000);

      // Add a deterministic evidence pointer (as would be stored in Vault ingestion).
      (parsed.meta as any).source = {
        kind: 'vaultFile',
        vaultFileId: 'vf_interval_csv_1',
        filename: 'client_interval_month_full.csv',
      };

      // Tariff match (explicit call) – should resolve to E-19 in our snapshot.
      const match = matchBillTariffToLibraryV1({
        utilityId: 'PGE',
        commodity: 'electric',
        rateScheduleText: hints?.rateScheduleText || null,
        snapshot: {
          versionTag: '2026-02-05T1200Z',
          capturedAt: '2026-02-05T12:00:00.000Z',
          rates: [
            { rateCode: 'E-19', sourceUrl: 'https://example.com/pge/e-19', sourceTitle: 'Schedule E-19' },
            { rateCode: 'B-19', sourceUrl: 'https://example.com/pge/b-19', sourceTitle: 'Schedule B-19' },
          ],
        },
      });
      expect(match.resolved?.rateCode).toBe('E-19');
      expect(match.resolved?.matchType).toBe('EXACT');

      // Deterministic utility analysis driven from stored evidence.
      const analysis = await analyzeUtility(
        {
          orgId,
          projectId,
          serviceType: 'electric',
          utilityTerritory: 'PGE',
          currentRate: { utility: 'PGE', rateCode: 'E-19' },
          billPdfText: billText,
          // No billingSummary: should conservatively generate missingInfo items.
        } as any,
        {
          intervalPointsV1: parsed.points as any,
          nowIso: '2026-02-10T00:00:00.000Z',
          idFactory: () => 'id_fixed',
        },
      );

      expect(analysis.insights).toBeTruthy();
      expect(Array.isArray(analysis.insights.missingInfo)).toBe(true);

      // Build report revision JSON (snapshot-only)
      const reportJson = buildInternalEngineeringReportJsonV1({
        projectId,
        generatedAtIso: '2026-02-10T00:00:00.000Z',
        analysisResults: { project: { id: projectId }, workflow: { utility: { insights: analysis.insights, inputs: { currentRate: { utility: 'PGE', rateCode: 'E-19' } } } }, summary: { markdown: '', json: {} } },
        telemetry: {
          intervalElectricPointsV1: parsed.points as any,
          intervalElectricMetaV1: parsed.meta as any,
        },
      });

      // Invariants: enforced projectId + interval evidence pointer + counts/warnings
      expect(String(reportJson.projectId)).toBe(projectId);
      expect(reportJson.engineVersions).toBeTruthy();
      expect((reportJson as any).engineVersions).toEqual(
        expect.objectContaining({
          intervalIntake: engineVersions.intervalIntake,
          determinants: engineVersions.determinants,
          tariffEngine: engineVersions.tariffEngine,
          billingEngineV1: engineVersions.billingEngineV1,
        }),
      );
      expect(String(reportJson?.telemetry?.intervalElectricMetaV1?.source?.vaultFileId || '')).toBe('vf_interval_csv_1');
      expect(Number(reportJson?.telemetry?.intervalElectricV1?.pointCount || 0)).toBe(parsed.points.length);
      expect(Array.isArray(reportJson?.telemetry?.intervalElectricMetaV1?.warnings)).toBe(true);
      expect(Array.isArray(reportJson?.missingInfo)).toBe(true);

      // MissingInfo should be stably sorted by severity/id/description.
      const sevRank = (s: any): number => {
        const x = String(s ?? '').toLowerCase();
        if (x === 'blocking') return 0;
        if (x === 'warning') return 1;
        return 2;
      };
      const cmp = (a: any, b: any): number => {
        const ra = sevRank(a?.severity);
        const rb = sevRank(b?.severity);
        if (ra !== rb) return ra - rb;
        const ida = String(a?.id ?? '');
        const idb = String(b?.id ?? '');
        if (ida !== idb) return ida.localeCompare(idb);
        return String(a?.description ?? '').localeCompare(String(b?.description ?? ''));
      };
      const items = reportJson.missingInfo as any[];
      for (let i = 1; i < items.length; i++) {
        expect(cmp(items[i - 1], items[i])).toBeLessThanOrEqual(0);
      }

      // Render HTML and assert key invariants (no huge snapshots)
      const html = renderInternalEngineeringReportHtmlV1({
        project: { id: projectId, name: 'Kitchen Sink' },
        revision: { id: 'rev_kitchen', createdAt: '2026-02-10T00:00:00.000Z', title: 'Kitchen Sink', reportJson, reportHash: 'h' },
      });

      expect(html).toContain('Data Quality');
      expect(html).toContain('Missing Evidence / Next Actions');
      expect(html).toContain(`/project-builder/${projectId}/intake/intervals`);
      expect(html).toContain(`/project-builder/${projectId}/intake/billing`);
      expect(html).toContain(`/analysis/v1/${projectId}`);
      expect(html).not.toContain(':projectId');

      // Deterministic holiday detection guardrail (TOU mapper treats holidays as weekend-like)
      const toyRate: any = {
        rateId: 'toy_tou',
        utilityTerritory: 'PGE',
        serviceClassTags: [],
        timezone: 'America/Los_Angeles',
        billing: { fixedCharges: [] },
        touPeriods: [
          { label: 'ON', weekday: [{ startHour: 16, endHour: 17 }], weekend: [] },
          { label: 'OFF', weekday: [{ startHour: 0, endHour: 24 }], weekend: [{ startHour: 0, endHour: 24 }] },
        ],
        energyCharges: { ON: 0.5, OFF: 0.1 },
        demandCharges: [],
        version: 'v_test',
      };
      const toyIntervals: any[] = [
        // 2026-07-02 16:00 local (Thu): weekday schedule -> ON
        { ts: '2026-07-02T23:00:00.000Z', kw: 10, kwhForInterval: 2.5, isValid: true },
        // 2026-07-03 16:00 local (Fri, observed Independence Day in 2026): treated as weekend -> OFF
        { ts: '2026-07-03T23:00:00.000Z', kw: 10, kwhForInterval: 2.5, isValid: true },
      ];
      const mappedToy = mapTou({ intervals: toyIntervals, rate: toyRate });
      expect(mappedToy.intervals.map((iv) => iv.touLabel)).toEqual(['ON', 'OFF']);

      // TariffEngine TOU completeness guardrail: kWh buckets sum to total and charges reconcile (no approximations)
      const teTariff = TariffModelSchema.parse({
        version: 'fixture-v1',
        tariffId: 'fixture:te-tou',
        rateCode: 'FIXTURE_TOU',
        utility: 'TEST',
        timezone: 'UTC',
        fixedMonthlyCharge: 0,
        energyCharges: [
          { id: 'OFF', season: 'all', pricePerKwh: 0.1, windows: [{ name: 'OFF', startMinute: 0, endMinute: 30, days: 'all' }] },
          { id: 'ON', season: 'all', pricePerKwh: 0.2, windows: [{ name: 'ON', startMinute: 30, endMinute: 1440, days: 'all' }] },
        ],
        demandDeterminants: [],
        ratchets: [],
      });
      const teBillingPeriods = [
        BillingPeriodSchema.parse({
          cycleId: 'acct:2026-01-01',
          accountId: 'acct',
          billStartDate: '2026-01-01',
          billEndDate: '2026-01-01',
          rateCode: 'FIXTURE_TOU',
        }),
      ];
      const teIntervals = [
        IntervalRowSchema.parse({ timestamp: '2026-01-01T00:00:00Z', kw: 10 }),
        IntervalRowSchema.parse({ timestamp: '2026-01-01T00:15:00Z', kw: 10 }),
        IntervalRowSchema.parse({ timestamp: '2026-01-01T00:30:00Z', kw: 20 }),
        IntervalRowSchema.parse({ timestamp: '2026-01-01T00:45:00Z', kw: 20 }),
      ];
      const teJoined = assignIntervalsToBillingCycles({ intervals: teIntervals, billingPeriods: teBillingPeriods });
      expect(teJoined.qa.unassignedIntervals).toBe(0);
      const teOut = calculateBillsPerCycle({
        tariff: teTariff,
        billingPeriods: teBillingPeriods,
        assignedBefore: teJoined.assigned,
        assignedAfter: teJoined.assigned,
      });
      const eb = teOut.cycles[0].energyBreakdown!;
      expect(eb).toBeTruthy();
      expect(eb.reconcile.ok).toBe(true);
      expect(eb.kwhTotal).toBeCloseTo((eb.kwhByTouPeriod.OFF || 0) + (eb.kwhByTouPeriod.ON || 0), 9);
      expect(eb.totalEnergyCharge).toBeCloseTo((eb.chargesByTouPeriod.OFF || 0) + (eb.chargesByTouPeriod.ON || 0), 9);
    } finally {
      if (typeof prevTariffs === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prevTariffs;
      else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
    }
    },
    60_000,
  );
});

describe('workflow: kitchen-sink failure modes (deterministic)', () => {
  it(
    'Case A: tariff ambiguous -> missingInfo includes ambiguity + report links to tariff browser',
    async () => {
      const tmpTariffs = mkdtempSync(path.join(os.tmpdir(), 'everwatt-tariffs-'));
      const prevTariffs = process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
      process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = tmpTariffs;

      const projectId = 'p_kitchen_sink_ambiguous';
      const orgId = 'o_test';

      try {
        vi.resetModules();
        const { saveSnapshot } = await import('../src/modules/tariffLibrary/storage');
        await saveSnapshot({
          utility: 'PGE',
          capturedAt: '2026-02-05T12:00:00.000Z',
          versionTag: '2026-02-05T1200Z',
          // Intentionally include two EXACT-equivalent codes to force ambiguity (E-19 vs E_19).
          rates: [
            { utility: 'PGE', rateCode: 'E-19', sourceUrl: 'https://example.com/pge/e-19', sourceTitle: 'Schedule E-19' },
            { utility: 'PGE', rateCode: 'E_19', sourceUrl: 'https://example.com/pge/e_19', sourceTitle: 'Schedule E_19' },
            { utility: 'PGE', rateCode: 'B-19', sourceUrl: 'https://example.com/pge/b-19', sourceTitle: 'Schedule B-19' },
          ],
          sourceFingerprints: [{ url: 'https://example.com/pge-index', contentHash: 'hash1' }],
        } as any);

        const billText = readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'bill_text_ambiguous.txt'), 'utf-8');
        const hints = extractBillPdfTariffHintsV1(billText);
        expect(hints?.utilityHint).toBe('PG&E');
        expect(hints?.rateScheduleText).toBe('E-19');

        const match = matchBillTariffToLibraryV1({
          utilityId: 'PGE',
          commodity: 'electric',
          rateScheduleText: hints?.rateScheduleText || null,
          snapshot: {
            versionTag: '2026-02-05T1200Z',
            capturedAt: '2026-02-05T12:00:00.000Z',
            rates: [
              { rateCode: 'E-19', sourceUrl: 'https://example.com/pge/e-19', sourceTitle: 'Schedule E-19' },
              { rateCode: 'E_19', sourceUrl: 'https://example.com/pge/e_19', sourceTitle: 'Schedule E_19' },
              { rateCode: 'B-19', sourceUrl: 'https://example.com/pge/b-19', sourceTitle: 'Schedule B-19' },
            ],
          },
        });
        expect(match.resolved).toBeFalsy();
        expect(match.candidates?.map((c) => c.rateCode)).toEqual(['E-19', 'E_19']);
        expect(match.warnings).toContain('BILL_TARIFF_AMBIGUOUS');

        // Keep intervals present so only the tariff-match issue is surfaced.
        const csvText = readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'client_interval_month_full.csv'), 'utf-8');
        const parsed = parseIntervalElectricCsvV1({ csvText, timezoneHint: 'America/Los_Angeles' });
        expect(parsed.ok).toBe(true);
        expect(parsed.points.length).toBeGreaterThan(1000);

        const analysis = await analyzeUtility(
          {
            orgId,
            projectId,
            serviceType: 'electric',
            utilityTerritory: 'PGE',
            currentRate: { utility: 'PGE', rateCode: 'E-19' },
            billPdfText: billText,
          } as any,
          {
            intervalPointsV1: parsed.points as any,
            nowIso: '2026-02-10T00:00:00.000Z',
            idFactory: () => 'id_fixed',
          },
        );

        const missing = Array.isArray((analysis.insights as any)?.missingInfo) ? ((analysis.insights as any).missingInfo as any[]) : [];
        expect(missing.some((it: any) => String(it?.id || '').includes('BILL_TARIFF_AMBIGUOUS'))).toBe(true);

        const reportJson = buildInternalEngineeringReportJsonV1({
          projectId,
          generatedAtIso: '2026-02-10T00:00:00.000Z',
          analysisResults: {
            project: { id: projectId },
            workflow: { utility: { insights: analysis.insights, inputs: { currentRate: { utility: 'PGE', rateCode: 'E-19' } } } },
            summary: { markdown: '', json: {} },
          },
          telemetry: { intervalElectricPointsV1: parsed.points as any, intervalElectricMetaV1: parsed.meta as any },
        });

        expect(Array.isArray(reportJson.missingInfo)).toBe(true);
        expect((reportJson.missingInfo as any[]).some((it: any) => String(it?.id || '').includes('BILL_TARIFF_AMBIGUOUS'))).toBe(true);

        const html = renderInternalEngineeringReportHtmlV1({
          project: { id: projectId, name: 'Kitchen Sink (Ambiguous Tariff)' },
          revision: { id: 'rev_kitchen_a', createdAt: '2026-02-10T00:00:00.000Z', title: 'Kitchen Sink', reportJson, reportHash: 'h' },
        });

        // Next Actions should include a tariff browser link + the ambiguity reason code somewhere in the rendered JSON.
        expect(html).toContain('Missing Evidence / Next Actions');
        expect(html).toContain('/utilities/tariffs-ca');
        expect(html).toContain('BILL_TARIFF_AMBIGUOUS');
        expect(html).toContain(`/analysis/v1/${projectId}`);
      } finally {
        if (typeof prevTariffs === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prevTariffs;
        else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
      }
    },
    60_000,
  );

  it(
    'Case B: missing intervals -> missingInfo includes interval missing + Next Actions links to interval upload; analysis does not claim interval-derived insights',
    async () => {
      const tmpTariffs = mkdtempSync(path.join(os.tmpdir(), 'everwatt-tariffs-'));
      const prevTariffs = process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
      process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = tmpTariffs;

      const projectId = 'p_kitchen_sink_no_intervals';
      const orgId = 'o_test';

      try {
        vi.resetModules();
        const { saveSnapshot } = await import('../src/modules/tariffLibrary/storage');
        await saveSnapshot({
          utility: 'PGE',
          capturedAt: '2026-02-05T12:00:00.000Z',
          versionTag: '2026-02-05T1200Z',
          rates: [
            { utility: 'PGE', rateCode: 'E-19', sourceUrl: 'https://example.com/pge/e-19', sourceTitle: 'Schedule E-19' },
            { utility: 'PGE', rateCode: 'B-19', sourceUrl: 'https://example.com/pge/b-19', sourceTitle: 'Schedule B-19' },
          ],
          sourceFingerprints: [{ url: 'https://example.com/pge-index', contentHash: 'hash1' }],
        } as any);

        const billText = readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'bill_text_small.txt'), 'utf-8');

        const analysis = await analyzeUtility(
          {
            orgId,
            projectId,
            serviceType: 'electric',
            utilityTerritory: 'PGE',
            currentRate: { utility: 'PGE', rateCode: 'E-19' },
            billPdfText: billText,
          } as any,
          {
            // Intentionally do not attach interval points/series.
            nowIso: '2026-02-10T00:00:00.000Z',
            idFactory: () => 'id_fixed',
          },
        );

        const missing = Array.isArray((analysis.insights as any)?.missingInfo) ? ((analysis.insights as any).missingInfo as any[]) : [];
        expect(missing.some((it: any) => String(it?.id || '') === 'interval.intervalElectricV1.missing')).toBe(true);

        // Guardrail: interval-derived bill intelligence should be unavailable without intervals.
        expect(Boolean((analysis.insights as any)?.billIntelligenceV1?.intervalInsightsV1?.available)).toBe(false);
        expect((analysis.insights as any)?.provenTouExposureSummary).toBeUndefined();

        const reportJson = buildInternalEngineeringReportJsonV1({
          projectId,
          generatedAtIso: '2026-02-10T00:00:00.000Z',
          analysisResults: {
            project: { id: projectId },
            workflow: { utility: { insights: analysis.insights, inputs: { currentRate: { utility: 'PGE', rateCode: 'E-19' } } } },
            summary: { markdown: '', json: {} },
          },
          telemetry: { intervalElectricPointsV1: [], intervalElectricMetaV1: null },
        });

        expect(Boolean(reportJson?.telemetry?.intervalElectricV1?.present)).toBe(false);
        expect(Number((reportJson?.telemetry?.intervalElectricV1?.pointCount ?? -1) as any)).toBe(0);
        expect((reportJson.missingInfo as any[]).some((it: any) => String(it?.id || '') === 'interval.intervalElectricV1.missing')).toBe(true);
        expect(Boolean((reportJson as any)?.workflow?.utility?.insights?.billIntelligenceV1?.intervalInsightsV1?.available)).toBe(false);

        const html = renderInternalEngineeringReportHtmlV1({
          project: { id: projectId, name: 'Kitchen Sink (No Intervals)' },
          revision: { id: 'rev_kitchen_b', createdAt: '2026-02-10T00:00:00.000Z', title: 'Kitchen Sink', reportJson, reportHash: 'h' },
        });

        expect(html).toContain('Missing Evidence / Next Actions');
        expect(html).toContain('interval.intervalElectricV1.missing');
        expect(html).toContain(`/project-builder/${projectId}/intake/intervals`);
        expect(html).toContain(`/analysis/v1/${projectId}`);
      } finally {
        if (typeof prevTariffs === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prevTariffs;
        else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
      }
    },
    30_000,
  );
});

describe('workflow: kitchen-sink ratchet guardrail (deterministic)', () => {
  it(
    'surfaces DETERMINANT_RATCHET_NEEDS_HISTORY when ratchet tariff lacks prior history',
    async () => {
      const tmpTariffs = mkdtempSync(path.join(os.tmpdir(), 'everwatt-tariffs-'));
      const prevTariffs = process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
      process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = tmpTariffs;

      const projectId = 'p_kitchen_sink_ratchet_no_history';
      const orgId = 'o_test';

      try {
        vi.resetModules();
        const { saveSnapshot } = await import('../src/modules/tariffLibrary/storage');
        await saveSnapshot({
          utility: 'PGE',
          capturedAt: '2026-02-05T12:00:00.000Z',
          versionTag: '2026-02-05T1200Z',
          rates: [
            { utility: 'PGE', rateCode: 'B-19', sourceUrl: 'https://example.com/pge/b-19', sourceTitle: 'Schedule B-19' },
          ],
          sourceFingerprints: [{ url: 'https://example.com/pge-index', contentHash: 'hash1' }],
        } as any);

        const billText = readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'bill_text_small.txt'), 'utf-8');
        const csvText = readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'client_interval_month_full.csv'), 'utf-8');
        const parsed = parseIntervalElectricCsvV1({ csvText, timezoneHint: 'America/Los_Angeles' });
        expect(parsed.ok).toBe(true);

        const analysis = await analyzeUtility(
          {
            orgId,
            projectId,
            serviceType: 'electric',
            utilityTerritory: 'PGE',
            currentRate: { utility: 'PGE', rateCode: 'B-19' },
            billPdfText: billText,
          } as any,
          {
            intervalPointsV1: parsed.points as any,
            nowIso: '2026-02-10T00:00:00.000Z',
            idFactory: () => 'id_fixed',
          },
        );

        const missing = Array.isArray((analysis.insights as any)?.missingInfo) ? ((analysis.insights as any).missingInfo as any[]) : [];
        expect(missing.some((it: any) => String(it?.id || '').includes('DETERMINANT_RATCHET_NEEDS_HISTORY'))).toBe(true);

        // Deterministic output surface: determinantsPackSummary includes ratchet fields (null when history missing).
        const m0 = (analysis.insights as any)?.determinantsPackSummary?.meters?.[0]?.last12Cycles?.[0];
        expect(m0).toBeTruthy();
        // If partial history exists, we may still compute a floor; the critical guardrail is the explicit NEEDS_HISTORY missingInfo.
        expect(m0?.ratchetDemandKw === null || Number.isFinite(Number(m0?.ratchetDemandKw))).toBe(true);
        expect(String(m0?.billingDemandMethod || '')).toContain('pge_ratchet_common_v1');
      } finally {
        if (typeof prevTariffs === 'string') process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR = prevTariffs;
        else delete process.env.EVERWATT_TARIFF_LIBRARY_BASEDIR;
      }
    },
    60_000,
  );
});

describe('workflow: kitchen-sink ratchet (history present, deterministic)', () => {
  it(
    'computes ratchetHistoryMaxKw / ratchetDemandKw and billingDemandKw correctly when prior history exists',
    async () => {
      const projectId = 'p_kitchen_sink_ratchet_history_present';
      const orgId = 'o_test';

      // Synthetic two-month series to guarantee deterministic history + peaks.
      // Jan peak = 200kW, Feb peak = 100kW -> ratchet floor = 0.9*200=180kW -> billingDemandFeb = 180kW.
      const points: any[] = [
        { timestampIso: '2026-01-15T20:00:00.000Z', intervalMinutes: 15, kW: 50 },
        { timestampIso: '2026-01-16T20:00:00.000Z', intervalMinutes: 15, kW: 200 },
        { timestampIso: '2026-02-15T20:00:00.000Z', intervalMinutes: 15, kW: 80 },
        { timestampIso: '2026-02-16T20:00:00.000Z', intervalMinutes: 15, kW: 100 },
      ];

      const analysis = await analyzeUtility(
        {
          orgId,
          projectId,
          serviceType: 'electric',
          utilityTerritory: 'PGE',
          currentRate: { utility: 'PGE', rateCode: 'B-19' },
          billPdfText: 'Rate Schedule: B-19',
        } as any,
        {
          intervalPointsV1: points as any,
          nowIso: '2026-02-10T00:00:00.000Z',
          idFactory: () => 'id_fixed',
        },
      );

      const cycles = (analysis.insights as any)?.determinantsPackSummary?.meters?.[0]?.last12Cycles || [];
      const feb = cycles.find((c: any) => String(c?.cycleLabel || '') === '2026-02') || null;
      expect(feb).toBeTruthy();

      expect(Number(feb.kWMax)).toBeCloseTo(100, 9);
      expect(String(feb.billingDemandMethod)).toBe('pge_ratchet_common_v1');
      expect(Number(feb.ratchetHistoryMaxKw)).toBeCloseTo(200, 9);
      expect(Number(feb.ratchetFloorPct)).toBeCloseTo(0.9, 12);
      expect(Number(feb.ratchetDemandKw)).toBeCloseTo(180, 9);
      expect(Number(feb.billingDemandKw)).toBeCloseTo(180, 9);
    },
    30_000,
  );
});

