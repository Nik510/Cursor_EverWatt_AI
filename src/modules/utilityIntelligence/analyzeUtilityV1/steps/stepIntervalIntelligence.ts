import { analyzeIntervalIntelligenceV1 } from '../../intervalIntelligenceV1/analyzeIntervalIntelligenceV1';
import { exceptionName } from '../internals';
import type { AnalyzeUtilityV1Delta, AnalyzeUtilityV1State, NormalizedInputsV1, StepContextV1 } from '../types';

export function stepIntervalIntelligence(args: {
  state: AnalyzeUtilityV1State;
  normalizedInputs: NormalizedInputsV1;
  ctx: StepContextV1;
}): AnalyzeUtilityV1Delta {
  const { deps, warn, beginStep, endStep } = args.ctx as any;
  const tz = (args.state as any).tz;

  const intervalIntelligenceV1 = (() => {
    beginStep('intervalIntelligenceV1');
    try {
      const pts = Array.isArray(deps?.intervalPointsV1) ? (deps?.intervalPointsV1 as any[]) : null;
      if (!pts || !pts.length) {
        endStep('intervalIntelligenceV1', { skipped: true, reasonCode: 'NO_INTERVAL_POINTS_V1' });
        return undefined;
      }
      const out = analyzeIntervalIntelligenceV1({
        points: pts as any,
        timezoneHint: tz,
        topPeakEventsCount: 7,
      }).intervalIntelligenceV1;
      endStep('intervalIntelligenceV1');
      return out;
    } catch (e) {
      warn({
        code: 'UIE_INTERVAL_INTELLIGENCE_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'analyzeIntervalIntelligenceV1',
        exceptionName: exceptionName(e),
        contextKey: 'intervalIntelligenceV1',
      });
      endStep('intervalIntelligenceV1');
      return undefined;
    }
  })();

  return { intervalIntelligenceV1 };
}

