import { describe, it, expect } from 'vitest';
import { renderInternalEngineeringReportHtmlV1 } from '../src/modules/reports/internalEngineering/v1/renderInternalEngineeringReportHtml';

describe('renderInternalEngineeringReportHtmlV1', () => {
  it('renders deterministic HTML with stable JSON key ordering', () => {
    const html = renderInternalEngineeringReportHtmlV1({
      project: { id: 'p_test', name: 'Test Project' },
      revision: {
        id: 'rev_1',
        createdAt: '2026-01-01T00:00:00.000Z',
        title: 'Internal Engineering Report • 2026-01-01',
        reportHash: 'abc123',
        reportJson: { b: 1, a: { d: 4, c: 3 } },
      },
    });

    expect(html).toContain('<!doctype html>');
    // Stable ordering: a should appear before b at top level
    const idxA = html.indexOf('&quot;a&quot;');
    const idxB = html.indexOf('&quot;b&quot;');
    expect(idxA).toBeGreaterThan(0);
    expect(idxB).toBeGreaterThan(0);
    expect(idxA).toBeLessThan(idxB);
    // Nested stable ordering: c should appear before d
    const idxC = html.indexOf('&quot;c&quot;');
    const idxD = html.indexOf('&quot;d&quot;');
    expect(idxC).toBeGreaterThan(0);
    expect(idxD).toBeGreaterThan(0);
    expect(idxC).toBeLessThan(idxD);
  });

  it('renders Data Quality + Missing Evidence sections with deep links when present', () => {
    const projectId = 'p_test';
    const html = renderInternalEngineeringReportHtmlV1({
      project: { id: projectId, name: 'Test Project' },
      revision: {
        id: 'rev_2',
        createdAt: '2026-02-01T00:00:00.000Z',
        title: 'Internal Engineering Report • 2026-02-01',
        reportHash: 'deadbeef',
        reportJson: {
          schemaVersion: 'internalEngineeringReportV1',
          generatedAtIso: '2026-02-01T00:00:00.000Z',
          projectId,
          engineVersions: {
            intervalIntake: 'interval_csv_v1',
            determinants: 'determinants_pack_v1.0',
            tariffEngine: 'tariff_engine_v1.0',
            billingEngineV1: 'billing_v1.0',
          },
          telemetry: {
            intervalElectricV1: { present: true, pointCount: 2880, warningCount: 2 },
            intervalElectricMetaV1: {
              timezoneUsed: 'America/Los_Angeles',
              inferredIntervalMinutes: 15,
              rowCount: 2888,
              range: { startIso: '2024-01-01T00:00:00.000Z', endIso: '2024-01-31T23:45:00.000Z' },
              warnings: [
                { code: 'interval.csv.detected.pge_interval', details: { confidence: 0.9 } },
                { code: 'interval.points.large_gaps', details: { gapsCount: 1, largestGapMinutes: 120, missingIntervalsTotal: 8 } },
              ],
              missingInfo: [
                { id: 'pge.interval.usageUnit.unsupported', category: 'tariff', severity: 'warning', description: 'Usage Unit is not KWH.' },
              ],
            },
          },
          intervalInsightsV1: {
            schemaVersion: 'intervalIntelligenceV1',
            available: true,
            timezoneUsed: 'America/Los_Angeles',
            coverageDays: 31,
            granularityMinutes: 15,
            pointsReturnedCount: 2880,
            totalKwh: 12345,
            avgDailyKwh: 398.226,
            avgKw: 16.593,
            baseloadKw: 5.123,
            baseloadMethod: 'p10_night_v1',
            baseloadConfidence: 'high',
            peakKw: 42.5,
            peakTimestampIso: '2024-01-15T00:00:00.000Z',
            weekdayAvgKw: 17.1,
            weekendAvgKw: 14.9,
            weekdayWeekendDeltaPct: 14.765,
            dailyProfileBuckets: [],
            dailyProfileBucketsMethod: 'avg_kw_by_4h_bucket_v1',
            topPeakEvents: [],
            topPeakEventsMethod: 'top_kw_points_v1',
            warnings: ['interval.points.large_gaps'],
          },
          weatherRegressionV1: {
            schemaVersion: 'weatherRegressionV1',
            modelType: 'HDD_CDD_LINEAR_V1',
            coverageDays: 90,
            overlapDays: 90,
            hddBaseF: 65,
            cddBaseF: 65,
            intercept: 100,
            slopeHdd: 0,
            slopeCdd: 5,
            r2: 0.8123,
            confidenceTier: 'MEDIUM',
            annualization: {
              annualKwhEstimate: 36500,
              method: 'annualize_method_v1',
              confidenceTier: 'LOW',
            },
            warnings: ['weather.v1.outliers_clipped'],
          },
          workflow: {
            utility: {
              inputs: { currentRate: { utility: 'PGE', rateCode: 'E-19', capturedAt: '2026-01-15T00:00:00.000Z' } },
              insights: {
                missingInfo: [{ id: 'utility.billingRecords.missing', category: 'billing', severity: 'blocking', description: 'Billing records missing.' }],
              },
            },
          },
          summary: { markdown: '', json: {} },
        },
      },
    });

    expect(html).toContain('Data Quality');
    expect(html).toContain('Missing Evidence / Next Actions');

    // Engine versions line (deterministic; read from reportJson.engineVersions)
    expect(html).toContain('Engine Versions:');
    expect(html).toContain('interval_csv_v1');
    expect(html).toContain('determinants_pack_v1.0');
    expect(html).toContain('tariff_engine_v1.0');
    expect(html).toContain('billing_v1.0');

    // Data quality fields (deterministic)
    expect(html).toContain('coverageDays');
    expect(html).toContain('gapCount');
    expect(html).toContain('maxGapMinutes');
    expect(html).toContain('timezoneKnown');
    expect(html).toContain('granularityMinutes');
    expect(html).toContain('pointsReturnedCount');

    // Interval Insights card (snapshot-only)
    expect(html).toContain('Interval Insights');
    expect(html).toContain('baseloadMethod');
    expect(html).toContain('p10_night_v1');
    expect(html).toContain('peakTimestampIso');
    expect(html).toContain('interval.points.large_gaps');

    // Weather Regression card (snapshot-only)
    expect(html).toContain('Weather Regression');
    expect(html).toContain('HDD_CDD_LINEAR_V1');
    expect(html).toContain('annualKwhEstimate');
    expect(html).toContain('weather.v1.outliers_clipped');

    // Deep links
    expect(html).toContain(`/project-builder/${projectId}/intake/intervals`);
    expect(html).toContain(`/project-builder/${projectId}/intake/billing`);
    expect(html).toContain(`/analysis/v1/${projectId}`);
    expect(html).not.toContain(':projectId');
    expect(html).toContain('/utilities/tariffs-ca?');
    expect(html).toContain('utility=PGE');
    expect(html).toContain('rate=E-19');
  });

  it('does not emit project-scoped links when projectId is unavailable', () => {
    const html = renderInternalEngineeringReportHtmlV1({
      project: { id: '', name: 'No Project' },
      revision: {
        id: 'rev_3',
        createdAt: '2026-02-02T00:00:00.000Z',
        title: 'Internal Engineering Report • no projectId',
        reportHash: 'beadfeed',
        reportJson: {
          schemaVersion: 'internalEngineeringReportV1',
          generatedAtIso: '2026-02-02T00:00:00.000Z',
          telemetry: {
            intervalElectricV1: { present: false, pointCount: 0, warningCount: 0 },
            intervalElectricMetaV1: { warnings: [], missingInfo: [{ id: 'x', category: 'billing', severity: 'warning', description: 'Missing billing.' }] },
          },
          workflow: { utility: { inputs: { currentRate: { utility: 'PGE', rateCode: 'E-19' } }, insights: { missingInfo: [] } } },
          summary: { markdown: '', json: {} },
        },
      },
    });

    expect(html).toContain('Project ID unavailable');
    expect(html).not.toContain('//intake');
    expect(html).not.toContain('/project-builder//');
  });
});

