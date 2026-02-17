import type { MissingInfoItemV0 } from '../../../utilityIntelligence/missingInfo/types';
import { engineVersions, intervalIntakeVersion } from '../../../engineVersions';
import { analyzeIntervalIntelligenceV1 } from '../../../utilityIntelligence/intervalIntelligenceV1/analyzeIntervalIntelligenceV1';
import {
  buildDailyUsageAndWeatherSeriesFromIntervalPointsV1,
  regressUsageVsWeatherV1,
} from '../../../utilityIntelligence/weatherRegressionV1/regressUsageVsWeatherV1';

function sortMissingInfo(a: any, b: any): number {
  const sevRank = (s: any): number => {
    const x = String(s ?? '').toLowerCase();
    if (x === 'blocking') return 0;
    if (x === 'warning') return 1;
    return 2;
  };
  const ra = sevRank(a?.severity);
  const rb = sevRank(b?.severity);
  if (ra !== rb) return ra - rb;
  const ida = String(a?.id ?? '');
  const idb = String(b?.id ?? '');
  if (ida !== idb) return ida.localeCompare(idb);
  return String(a?.description ?? '').localeCompare(String(b?.description ?? ''));
}

export type BuildInternalEngineeringReportJsonV1Args = {
  projectId: string;
  generatedAtIso: string;
  analysisResults: { project: any; workflow: any; summary: any };
  telemetry?: {
    intervalElectricPointsV1?: Array<{ timestampIso: string; intervalMinutes: number; kWh?: number; kW?: number; temperatureF?: number }> | null;
    intervalElectricMetaV1?: any | null;
  };
};

/**
 * Deterministic snapshot builder for Internal Engineering Report v1.
 *
 * CRITICAL:
 * - No AI, no inference, no network calls.
 * - Purely packages already-computed analysis + stored telemetry into an append-only JSON revision.
 * - Adds a stable, sorted `missingInfo` aggregation for operator navigation.
 */
export function buildInternalEngineeringReportJsonV1(args: BuildInternalEngineeringReportJsonV1Args): any {
  const projectId = String(args.projectId || '').trim();
  const nowIso = String(args.generatedAtIso || '').trim();

  const intervalPts = Array.isArray(args.telemetry?.intervalElectricPointsV1) ? args.telemetry?.intervalElectricPointsV1 : [];
  const intervalMeta = args.telemetry?.intervalElectricMetaV1 ?? null;
  const intervalWarnCount = Array.isArray((intervalMeta as any)?.warnings) ? (intervalMeta as any).warnings.length : 0;

  const intervalInsightsV1 = (() => {
    try {
      if (!intervalPts.length) return null;
      return analyzeIntervalIntelligenceV1({
        points: intervalPts as any,
        meta: intervalMeta as any,
        timezoneHint: String((intervalMeta as any)?.timezoneUsed || 'America/Los_Angeles'),
        topPeakEventsCount: 7,
      }).intervalIntelligenceV1;
    } catch {
      return null;
    }
  })();

  const weatherRegressionV1 = (() => {
    try {
      if (!intervalPts.length) return null;
      const anyTemp = intervalPts.some((p: any) => Number.isFinite(Number(p?.temperatureF)));
      if (!anyTemp) return null;
      const tz = String((intervalMeta as any)?.timezoneUsed || 'America/Los_Angeles');
      const daily = buildDailyUsageAndWeatherSeriesFromIntervalPointsV1({ points: intervalPts as any, meta: intervalMeta as any, timezoneHint: tz });
      return regressUsageVsWeatherV1({
        usageByDay: daily.usageByDay,
        weatherByDay: daily.weatherByDay,
        hddBaseF: 65,
        cddBaseF: 65,
        minOverlapDays: 10,
        timezoneHint: tz,
      }).weatherRegressionV1;
    } catch {
      return null;
    }
  })();

  const missingFromInterval: MissingInfoItemV0[] = Array.isArray((intervalMeta as any)?.missingInfo) ? ((intervalMeta as any).missingInfo as any[]) : [];
  const missingFromInsights: MissingInfoItemV0[] = Array.isArray(args.analysisResults?.workflow?.utility?.insights?.missingInfo)
    ? (args.analysisResults.workflow.utility.insights.missingInfo as any[])
    : [];
  const missingFromTariffApplicability: MissingInfoItemV0[] = Array.isArray(args.analysisResults?.workflow?.utility?.insights?.rateFit?.tariffApplicability?.missingInfo)
    ? (args.analysisResults.workflow.utility.insights.rateFit.tariffApplicability.missingInfo as any[])
    : [];

  const missingInfo: MissingInfoItemV0[] = [...missingFromInterval, ...missingFromInsights, ...missingFromTariffApplicability]
    .filter((it: any) => it && typeof it === 'object')
    .slice()
    .sort(sortMissingInfo);

  return {
    schemaVersion: 'internalEngineeringReportV1',
    generatedAtIso: nowIso,
    projectId,
    project: args.analysisResults?.project,
    engineVersions: {
      ...engineVersions,
      // Prefer the parserVersion stored with the interval meta when available.
      intervalIntake: String((intervalMeta as any)?.parserVersion || '').trim() || intervalIntakeVersion,
    },
    telemetry: {
      intervalElectricV1: {
        present: intervalPts.length > 0,
        pointCount: intervalPts.length,
        warningCount: intervalWarnCount,
      },
      intervalElectricMetaV1: intervalMeta,
    },
    intervalInsightsV1,
    weatherRegressionV1,
    workflow: args.analysisResults?.workflow,
    summary: args.analysisResults?.summary,
    missingInfo,
  };
}

