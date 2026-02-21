import { buildDailyUsageAndWeatherSeriesFromIntervalPointsV1, regressUsageVsWeatherV1 } from '../../weatherRegressionV1/regressUsageVsWeatherV1';
import { exceptionName } from '../internals';
import type { AnalyzeUtilityV1Delta, AnalyzeUtilityV1State, NormalizedInputsV1, StepContextV1 } from '../types';

export function stepWeatherRegression(args: {
  state: AnalyzeUtilityV1State;
  normalizedInputs: NormalizedInputsV1;
  ctx: StepContextV1;
}): AnalyzeUtilityV1Delta {
  const { deps, warn, beginStep, endStep } = args.ctx as any;
  const tz = (args.state as any).tz;

  const weatherRegressionV1 = (() => {
    beginStep('weatherRegressionV1');
    try {
      const pts = Array.isArray(deps?.intervalPointsV1) ? (deps?.intervalPointsV1 as any[]) : null;
      if (!pts || !pts.length) {
        endStep('weatherRegressionV1', { skipped: true, reasonCode: 'NO_INTERVAL_POINTS_V1' });
        return undefined;
      }
      const anyTemp = pts.some((p) => Number.isFinite(Number((p as any)?.temperatureF)));
      if (!anyTemp) {
        endStep('weatherRegressionV1', { skipped: true, reasonCode: 'NO_TEMPERATURE_IN_INTERVALS' });
        return undefined;
      }
      const daily = buildDailyUsageAndWeatherSeriesFromIntervalPointsV1({ points: pts as any, timezoneHint: tz });
      const out = regressUsageVsWeatherV1({
        usageByDay: daily.usageByDay,
        weatherByDay: daily.weatherByDay,
        hddBaseF: 65,
        cddBaseF: 65,
        minOverlapDays: 10,
        timezoneHint: tz,
      }).weatherRegressionV1;
      endStep('weatherRegressionV1');
      return out;
    } catch (e) {
      warn({
        code: 'UIE_WEATHER_REGRESSION_V1_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'regressUsageVsWeatherV1',
        exceptionName: exceptionName(e),
        contextKey: 'weatherRegressionV1',
      });
      endStep('weatherRegressionV1');
      return undefined;
    }
  })();

  return { weatherRegressionV1 };
}

